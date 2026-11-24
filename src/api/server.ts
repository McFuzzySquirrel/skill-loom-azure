import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { performance } from "node:perf_hooks";

import { z } from "zod";

import {
  ApiRouteNotFoundError,
  AuthenticationError,
  AuthorizationError,
  authenticateApiRequest,
  type ApiOperationId,
  type AuthenticatedPrincipal,
} from "../auth/entra.js";
import {
  auditActor,
  createApiAuditLogger,
  type ApiAuditEvent,
  type ApiAuditLogger,
  type AuditMethod,
} from "../audit/logger.js";
import {
  CorruptStoredDocumentError,
  MutationLockUnavailableError,
  PersistenceConflictError,
  type ChainPage,
  type PersistedDocument,
} from "../persistence/blob.js";
import { ChainSchema, type Chain } from "../schemas/chain.js";
import { MAX_SERIALIZED_OBJECT_BYTES } from "../schemas/serialized-object.js";
import {
  BundlePayloadTooLargeError,
  ChainNotFoundError,
  CorruptCatalogSkillError,
  InvalidSkillSearchCursorError,
  SkillAlreadyExistsError,
  SkillCatalogLimitError,
  SkillCatalogService,
  SkillInUseError,
  SkillNotFoundError,
  SkillPayloadTooLargeError,
  UnsupportedSkillSnapshotError,
} from "../skills/catalog.js";

const MAX_REQUEST_TARGET_BYTES = 8 * 1024;
const MAX_HEADER_BYTES = 16 * 1024;
const MAX_QUERY_PARAMETERS = 4;
const HTTP_HEADERS_TIMEOUT_MS = 10_000;
const HTTP_REQUEST_TIMEOUT_MS = 30_000;
const HTTP_KEEP_ALIVE_TIMEOUT_MS = 5_000;
const MAX_PAGE_SIZE = 100;
const MAX_CURSOR_LENGTH = 2_048;
const MAX_SEARCH_QUERY_LENGTH = 256;
const RevisionETagSchema = z.string().regex(/^"([1-9]\d*)"$/);

interface ApiChainPersistence {
  getChain(chainId: string): Promise<PersistedDocument<Chain> | undefined>;
  listChains(options?: { limit?: number; cursor?: string }): Promise<ChainPage>;
  saveChain(chain: Chain, expectedRevision: number | null): Promise<PersistedDocument<Chain>>;
}

interface ApiServerDependencies {
  verifyToken: (token: string) => Promise<AuthenticatedPrincipal>;
  chains: ApiChainPersistence;
  catalog: Pick<
    SkillCatalogService,
    | "searchSkills"
    | "getSkill"
    | "addReviewedSkill"
    | "removeReviewedSkill"
    | "exportChainBundle"
  >;
  auditLogger?: ApiAuditLogger;
  now?: () => Date;
}

interface ApiFailure {
  statusCode: number;
  code: string;
  message: string;
  closeConnection?: boolean;
}

class BadRequestError extends Error {
  constructor() {
    super("The request is malformed or contains an invalid parameter.");
    this.name = "BadRequestError";
  }
}

class InvalidDocumentError extends Error {
  constructor() {
    super("The request document is invalid.");
    this.name = "InvalidDocumentError";
  }
}

class PreconditionRequiredError extends Error {
  constructor() {
    super("A valid conditional request header is required.");
    this.name = "PreconditionRequiredError";
  }
}

class RequestBodyTooLargeError extends Error {
  constructor() {
    super("The request body exceeds the allowed size.");
    this.name = "RequestBodyTooLargeError";
  }
}

class ResponseBodyTooLargeError extends Error {
  constructor() {
    super("The response exceeds the allowed size.");
    this.name = "ResponseBodyTooLargeError";
  }
}

class UnsupportedMediaTypeError extends Error {
  constructor() {
    super("The request content type must be application/json.");
    this.name = "UnsupportedMediaTypeError";
  }
}

function headerValue(request: IncomingMessage, name: string) {
  const value = request.headers[name];
  if (Array.isArray(value)) {
    throw new BadRequestError();
  }
  return value;
}

function requestHasBody(request: IncomingMessage) {
  const contentLength = headerValue(request, "content-length");
  return (contentLength !== undefined && contentLength !== "0")
    || headerValue(request, "transfer-encoding") !== undefined;
}

function parsePageOptions(url: URL, allowedParameters: readonly string[]) {
  const allowed = new Set(allowedParameters);
  const seen = new Set<string>();
  for (const [name] of url.searchParams) {
    if (!allowed.has(name) || seen.has(name)) {
      throw new BadRequestError();
    }
    seen.add(name);
  }
  if (seen.size > MAX_QUERY_PARAMETERS) {
    throw new BadRequestError();
  }

  const rawLimit = url.searchParams.get("limit");
  let limit = 50;
  if (rawLimit !== null) {
    if (!/^[1-9]\d*$/.test(rawLimit)) {
      throw new BadRequestError();
    }
    limit = Number(rawLimit);
    if (!Number.isSafeInteger(limit) || limit > MAX_PAGE_SIZE) {
      throw new BadRequestError();
    }
  }

  const cursor = url.searchParams.get("cursor") ?? undefined;
  if (cursor !== undefined && (cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH)) {
    throw new BadRequestError();
  }
  return { limit, ...(cursor === undefined ? {} : { cursor }) };
}

function parseRevisionETag(value: string | undefined) {
  if (value === undefined) {
    throw new PreconditionRequiredError();
  }
  const result = RevisionETagSchema.safeParse(value);
  if (!result.success) {
    throw new BadRequestError();
  }
  const revision = Number(result.data.slice(1, -1));
  if (!Number.isSafeInteger(revision)) {
    throw new BadRequestError();
  }
  return revision;
}

function parseChainWriteCondition(request: IncomingMessage) {
  const ifMatch = headerValue(request, "if-match");
  const ifNoneMatch = headerValue(request, "if-none-match");
  if (ifMatch === undefined && ifNoneMatch === undefined) {
    throw new PreconditionRequiredError();
  }
  if (ifMatch !== undefined && ifNoneMatch !== undefined) {
    throw new BadRequestError();
  }
  if (ifNoneMatch !== undefined) {
    if (ifNoneMatch !== "*") {
      throw new BadRequestError();
    }
    return { expectedRevision: null, create: true };
  }
  return { expectedRevision: parseRevisionETag(ifMatch), create: false };
}

function parseChainId(url: URL) {
  const match = /^\/v1\/chains\/([^/]+)$/.exec(url.pathname);
  if (!match) {
    throw new ApiRouteNotFoundError();
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    throw new BadRequestError();
  }
}

function parseSkillName(url: URL) {
  const match = /^\/v1\/skills\/([^/]+)$/.exec(url.pathname);
  if (!match) {
    throw new ApiRouteNotFoundError();
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    throw new BadRequestError();
  }
}

function parseAdminSkillName(url: URL) {
  const match = /^\/v1\/admin\/skills\/([^/]+)$/.exec(url.pathname);
  if (!match) {
    throw new ApiRouteNotFoundError();
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    throw new BadRequestError();
  }
}

function parseBundleChainId(url: URL) {
  const match = /^\/v1\/chains\/([^/]+)\/bundle$/.exec(url.pathname);
  if (!match) {
    throw new ApiRouteNotFoundError();
  }
  try {
    return decodeURIComponent(match[1]);
  } catch {
    throw new BadRequestError();
  }
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const contentLength = headerValue(request, "content-length");
  if (contentLength !== undefined) {
    if (!/^(0|[1-9]\d*)$/.test(contentLength)) {
      throw new BadRequestError();
    }
    const declaredBytes = Number(contentLength);
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes > MAX_SERIALIZED_OBJECT_BYTES) {
      throw new RequestBodyTooLargeError();
    }
  }

  const contentType = headerValue(request, "content-type");
  if (!contentType || !/^\s*application\/json(?:\s*;|$)/i.test(contentType)) {
    throw new UnsupportedMediaTypeError();
  }

  const chunks: Buffer[] = [];
  let byteLength = 0;
  const json = await new Promise<string>((resolve, reject) => {
    const cleanup = () => {
      request.off("data", onData);
      request.off("end", onEnd);
      request.off("aborted", onAborted);
      request.off("error", onError);
    };
    const onData = (chunk: Buffer | string) => {
      const bytes = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
      byteLength += bytes.byteLength;
      if (byteLength > MAX_SERIALIZED_OBJECT_BYTES) {
        cleanup();
        request.pause();
        reject(new RequestBodyTooLargeError());
        return;
      }
      chunks.push(bytes);
    };
    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks, byteLength).toString("utf8"));
    };
    const onAborted = () => {
      cleanup();
      reject(new BadRequestError());
    };
    const onError = () => {
      cleanup();
      reject(new BadRequestError());
    };

    request.on("data", onData);
    request.once("end", onEnd);
    request.once("aborted", onAborted);
    request.once("error", onError);
  });

  try {
    return JSON.parse(json) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new BadRequestError();
    }
    throw error;
  }
}

function toApiFailure(error: unknown): ApiFailure {
  if (error instanceof AuthenticationError) {
    return {
      statusCode: 401,
      code: "unauthorized",
      message: "A valid Entra access token is required.",
    };
  }
  if (error instanceof AuthorizationError) {
    return {
      statusCode: 403,
      code: "forbidden",
      message: "The caller does not have the required app role.",
    };
  }
  if (error instanceof ApiRouteNotFoundError || error instanceof ChainNotFoundError
    || error instanceof SkillNotFoundError) {
    return { statusCode: 404, code: "not_found", message: "The requested resource was not found." };
  }
  if (error instanceof BadRequestError || error instanceof TypeError) {
    return {
      statusCode: 400,
      code: "invalid_request",
      message: "The request is malformed or contains an invalid parameter.",
    };
  }
  if (error instanceof PreconditionRequiredError) {
    return {
      statusCode: 428,
      code: "precondition_required",
      message: "A valid conditional request header is required.",
    };
  }
  if (error instanceof PersistenceConflictError) {
    return {
      statusCode: 412,
      code: "precondition_failed",
      message: "The supplied revision is stale.",
    };
  }
  if (error instanceof MutationLockUnavailableError) {
    return {
      statusCode: 503,
      code: "storage_busy",
      message: "Another chain or catalog change is in progress. Retry the request.",
    };
  }
  if (error instanceof SkillInUseError) {
    return {
      statusCode: 409,
      code: "skill_in_use",
      message: error.message,
    };
  }
  if (error instanceof SkillAlreadyExistsError || error instanceof SkillCatalogLimitError) {
    return {
      statusCode: 409,
      code: "conflict",
      message: "The requested catalog change conflicts with its current state.",
    };
  }
  if (error instanceof RequestBodyTooLargeError || error instanceof ResponseBodyTooLargeError
    || error instanceof SkillPayloadTooLargeError || error instanceof BundlePayloadTooLargeError) {
    return {
      statusCode: 413,
      code: "payload_too_large",
      message: "The request or response exceeds the allowed size.",
    };
  }
  if (error instanceof UnsupportedMediaTypeError) {
    return {
      statusCode: 415,
      code: "unsupported_media_type",
      message: "The request content type must be application/json.",
    };
  }
  if (error instanceof InvalidDocumentError || error instanceof z.ZodError
    || error instanceof UnsupportedSkillSnapshotError) {
    return {
      statusCode: 422,
      code: "invalid_document",
      message: "The request document is invalid or uses an unsupported binding.",
    };
  }
  if (error instanceof InvalidSkillSearchCursorError) {
    return {
      statusCode: 400,
      code: "invalid_request",
      message: "The search cursor is invalid for this query.",
    };
  }
  if (error instanceof CorruptCatalogSkillError || error instanceof CorruptStoredDocumentError) {
    return {
      statusCode: 500,
      code: "internal_error",
      message: "The service could not process the request.",
    };
  }
  return {
    statusCode: 500,
    code: "internal_error",
    message: "The service could not process the request.",
  };
}

function jsonResponseBody(value: unknown) {
  const body = Buffer.from(JSON.stringify(value), "utf8");
  if (body.byteLength > MAX_SERIALIZED_OBJECT_BYTES) {
    throw new ResponseBodyTooLargeError();
  }
  return body;
}

function sendJson(
  request: IncomingMessage,
  response: ServerResponse,
  requestId: string,
  statusCode: number,
  value: unknown,
  headers: Readonly<Record<string, string>> = {},
  closeConnection = false,
) {
  if (response.destroyed || response.writableEnded) {
    return;
  }
  const body = jsonResponseBody(value);
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("x-request-id", requestId);
  response.setHeader("content-length", body.byteLength);
  for (const [name, header] of Object.entries(headers)) {
    response.setHeader(name, header);
  }
  if (closeConnection || !request.complete) {
    response.shouldKeepAlive = false;
    response.setHeader("connection", "close");
    response.once("finish", () => {
      if (!request.complete && !request.socket.destroyed) {
        request.socket.destroy();
      }
    });
  }
  response.end(body);
}

function auditMethod(method: string | undefined): AuditMethod {
  if (method === "GET" || method === "PUT" || method === "POST") {
    return method;
  }
  return "OTHER";
}

function hasNoQueryParameters(url: URL) {
  return url.search.length === 0;
}

async function dispatch(
  operationId: ApiOperationId,
  principal: AuthenticatedPrincipal,
  request: IncomingMessage,
  url: URL,
  dependencies: ApiServerDependencies,
) {
  if (Buffer.byteLength(request.url ?? "", "utf8") > MAX_REQUEST_TARGET_BYTES) {
    throw new BadRequestError();
  }

  if (operationId === "getHealth") {
    if (!hasNoQueryParameters(url)) {
      throw new BadRequestError();
    }
    return { statusCode: 200, body: { status: "ok" } };
  }

  if (operationId === "listChains") {
    const options = parsePageOptions(url, ["limit", "cursor"]);
    return {
      statusCode: 200,
      body: await dependencies.chains.listChains(options),
    };
  }

  if (operationId === "getChain") {
    if (!hasNoQueryParameters(url)) {
      throw new BadRequestError();
    }
    const stored = await dependencies.chains.getChain(parseChainId(url));
    if (!stored) {
      throw new ChainNotFoundError();
    }
    return {
      statusCode: 200,
      body: stored.document,
      headers: { etag: `"${stored.revision}"` },
    };
  }

  if (operationId === "saveChain") {
    if (!hasNoQueryParameters(url)) {
      throw new BadRequestError();
    }
    const condition = parseChainWriteCondition(request);
    const body = await readJsonBody(request);
    const parsedChain = ChainSchema.safeParse(body);
    if (!parsedChain.success || parsedChain.data.id !== parseChainId(url)) {
      throw new InvalidDocumentError();
    }
    const saved = await dependencies.chains.saveChain(
      parsedChain.data,
      condition.expectedRevision,
    );
    return {
      statusCode: condition.create ? 201 : 200,
      body: saved.document,
      headers: { etag: `"${saved.revision}"` },
    };
  }

  if (operationId === "exportChainBundle") {
    if (!hasNoQueryParameters(url)) {
      throw new BadRequestError();
    }
    return {
      statusCode: 200,
      body: await dependencies.catalog.exportChainBundle(parseBundleChainId(url)),
    };
  }

  if (operationId === "searchSkills") {
    const options = parsePageOptions(url, ["q", "limit", "cursor"]);
    const queryValues = url.searchParams.getAll("q");
    if (queryValues.length > 1 || (queryValues[0]?.length ?? 0) > MAX_SEARCH_QUERY_LENGTH) {
      throw new BadRequestError();
    }
    const result = await dependencies.catalog.searchSkills({
      ...options,
      ...(queryValues[0] === undefined ? {} : { query: queryValues[0] }),
    });
    return {
      statusCode: 200,
      body: result,
      headers: { etag: `"${result.revision}"` },
    };
  }

  if (operationId === "getSkill") {
    if (!hasNoQueryParameters(url)) {
      throw new BadRequestError();
    }
    const skill = await dependencies.catalog.getSkill(parseSkillName(url));
    return {
      statusCode: 200,
      body: skill,
      headers: { etag: `"${skill.fingerprint}"` },
    };
  }

  if (operationId === "addReviewedSkill") {
    if (!hasNoQueryParameters(url)) {
      throw new BadRequestError();
    }
    const expectedRevision = parseRevisionETag(headerValue(request, "if-match"));
    const body = await readJsonBody(request);
    const added = await dependencies.catalog.addReviewedSkill(
      principal,
      body,
      expectedRevision,
    );
    return {
      statusCode: 201,
      body: added.skill,
      headers: { etag: `"${added.catalogRevision}"` },
    };
  }

  if (operationId === "removeReviewedSkill") {
    if (!hasNoQueryParameters(url)) {
      throw new BadRequestError();
    }
    const expectedRevision = parseRevisionETag(headerValue(request, "if-match"));
    const removed = await dependencies.catalog.removeReviewedSkill(
      principal,
      parseAdminSkillName(url),
      expectedRevision,
    );
    return {
      statusCode: 200,
      body: removed,
      headers: { etag: `"${removed.catalogRevision}"` },
    };
  }

  throw new ApiRouteNotFoundError();
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  dependencies: ApiServerDependencies,
) {
  const requestId = randomUUID();
  const startedAt = performance.now();
  const now = dependencies.now ?? (() => new Date());
  const auditLogger = dependencies.auditLogger ?? createApiAuditLogger();
  let operationId: ApiOperationId | undefined;
  let principal: AuthenticatedPrincipal | undefined;
  let statusCode = 500;
  let errorCode: string | undefined;

  try {
    const authenticated = await authenticateApiRequest(
      request.method ?? "",
      request.url ?? "",
      request.headers.authorization,
      dependencies.verifyToken,
    );
    operationId = authenticated.operationId;
    principal = authenticated.principal;
    const url = new URL(request.url ?? "", "http://localhost");
    if (request.method !== "PUT" && request.method !== "POST" && requestHasBody(request)) {
      throw new BadRequestError();
    }
    const result = await dispatch(operationId, principal, request, url, dependencies);
    statusCode = result.statusCode;
    sendJson(
      request,
      response,
      requestId,
      result.statusCode,
      result.body,
      result.headers,
    );
  } catch (error) {
    const failure = toApiFailure(error);
    statusCode = failure.statusCode;
    errorCode = failure.code;
    sendJson(
      request,
      response,
      requestId,
      failure.statusCode,
      { code: failure.code, message: failure.message },
      {},
      failure.closeConnection ?? !request.complete,
    );
  } finally {
    const actor = principal ? auditActor(principal) : undefined;
    const event: ApiAuditEvent = {
      schemaVersion: 1,
      event: "api.request",
      requestId,
      timestamp: now().toISOString(),
      ...(operationId === undefined ? {} : { operationId }),
      method: auditMethod(request.method),
      statusCode,
      outcome: statusCode < 400 ? "success" : "failure",
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      ...(actor === undefined ? {} : actor),
      ...(errorCode === undefined ? {} : { errorCode }),
    };
    auditLogger.write(event);
  }
}

export function createApiServer(dependencies: ApiServerDependencies): Server {
  const server = createServer({ maxHeaderSize: MAX_HEADER_BYTES }, (request, response) => {
    void handleRequest(request, response, dependencies).catch((error: unknown) => {
      const errorName = error instanceof Error ? error.name : "";
      const errorType = /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(errorName)
        ? errorName
        : "UnknownError";
      process.stderr.write(`${JSON.stringify({ event: "api.handler.failure", errorType })}\n`);
      if (!response.destroyed && !response.writableEnded) {
        if (response.headersSent) {
          response.destroy();
        } else {
          sendJson(
            request,
            response,
            randomUUID(),
            500,
            { code: "internal_error", message: "The service could not process the request." },
            {},
            true,
          );
        }
      }
    });
  });
  server.headersTimeout = HTTP_HEADERS_TIMEOUT_MS;
  server.requestTimeout = HTTP_REQUEST_TIMEOUT_MS;
  server.keepAliveTimeout = HTTP_KEEP_ALIVE_TIMEOUT_MS;
  server.maxHeadersCount = 100;
  return server;
}

export type { ApiServerDependencies };
