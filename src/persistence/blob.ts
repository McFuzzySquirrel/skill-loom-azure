import { AsyncLocalStorage } from "node:async_hooks";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import { ManagedIdentityCredential } from "@azure/identity";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  type BlobLeaseClient,
  type ContainerClient,
} from "@azure/storage-blob";
import { z } from "zod";

import { CatalogSchema, CATALOG_VERSION, type Catalog } from "../schemas/catalog.js";
import { ChainSchema, type Chain } from "../schemas/chain.js";
import {
  MAX_SERIALIZED_OBJECT_BYTES,
  withSerializedObjectLimit,
} from "../schemas/serialized-object.js";

const STORAGE_CHAIN_VERSION = 1;
const CHAIN_PREFIX = "chains/";
const CATALOG_BLOB_NAME = "catalog/catalog.json";
const MUTATION_LOCK_BLOB_NAME = "locks/chain-catalog-mutations.lock";
const MUTATION_LOCK_DURATION_SECONDS = 60;
const MUTATION_LOCK_RENEW_INTERVAL_MS = 20_000;
const MUTATION_LOCK_RENEW_TIMEOUT_MS = 10_000;
const MUTATION_LOCK_RETRY_INTERVAL_MS = 100;
const MUTATION_LOCK_WAIT_MS = 10_000;
const MAX_PAGE_SIZE = 100;
const MAX_CURSOR_LENGTH = 2_048;
const ChainIdSchema = z.string().trim().min(1);

const StoredChainSchema = withSerializedObjectLimit(z.strictObject({
  storageVersion: z.literal(STORAGE_CHAIN_VERSION),
  revision: z.number().int().positive(),
  chain: ChainSchema,
}));

export interface PersistedDocument<T> {
  document: T;
  revision: number;
  etag: string | null;
}

export interface ChainSummary {
  id: string;
  name: string;
  harness: Chain["harness"];
  sessionMode: Chain["sessionMode"];
  stepCount: number;
  revision: number;
  updatedAt: string;
}

export interface ChainPage {
  items: ChainSummary[];
  nextCursor?: string;
}

export class PersistenceConflictError extends Error {
  constructor() {
    super("The document changed since it was read.");
    this.name = "PersistenceConflictError";
  }
}

export class CorruptStoredDocumentError extends Error {
  constructor(blobName: string, cause?: unknown) {
    super(
      `Stored document ${blobName} is invalid.`,
      cause === undefined ? undefined : { cause },
    );
    this.name = "CorruptStoredDocumentError";
  }
}

export class BlobStorageProtocolError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "BlobStorageProtocolError";
  }
}

export class MutationLockUnavailableError extends Error {
  constructor() {
    super("A shared chain mutation lock could not be acquired in time.");
    this.name = "MutationLockUnavailableError";
  }
}

interface MutationLockContext {
  leaseClient: BlobLeaseClient;
  lastRenewedAt: number;
  abortController: AbortController;
  renewalError?: unknown;
  renewal?: Promise<void>;
  renewalFailed: boolean;
}

function storageErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) {
    return undefined;
  }

  const statusCode = error.statusCode;
  const code = "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
  return typeof statusCode === "number" ? { statusCode, code } : undefined;
}

function isBlobNotFound(error: unknown) {
  const details = storageErrorDetails(error);
  return details?.statusCode === 404 && details.code === "BlobNotFound";
}

function isConditionalWriteFailure(error: unknown) {
  const details = storageErrorDetails(error);
  return details?.statusCode === 412
    || (details?.statusCode === 409
      && (details.code === "BlobAlreadyExists" || details.code === "ConditionNotMet"));
}

function isExistingMutationLockBlob(error: unknown) {
  const details = storageErrorDetails(error);
  return details?.statusCode === 412
    || (details?.statusCode === 409 && details.code === "BlobAlreadyExists");
}

function isLeaseAlreadyPresent(error: unknown) {
  const details = storageErrorDetails(error);
  return details?.statusCode === 409 && details.code === "LeaseAlreadyPresent";
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function renewMutationLease(context: MutationLockContext) {
  if (context.renewalFailed) {
    return;
  }
  if (context.renewal) {
    return context.renewal;
  }

  const renewal = context.leaseClient.renewLease({
    abortSignal: AbortSignal.timeout(MUTATION_LOCK_RENEW_TIMEOUT_MS),
  })
    .then(() => {
      context.lastRenewedAt = Date.now();
    })
    .catch((error: unknown) => {
      context.renewalFailed = true;
      context.renewalError = error;
      context.abortController.abort();
    })
    .finally(() => {
      context.renewal = undefined;
    });
  context.renewal = renewal;
  return renewal;
}

function assertRevision(revision: number) {
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new TypeError("Revision must be a positive safe integer.");
  }
}

function nextRevision(revision: number) {
  assertRevision(revision);
  if (revision === Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Document revision is exhausted.");
  }
  return revision + 1;
}

function chainBlobName(chainId: string) {
  const digest = createHash("sha256").update(chainId, "utf8").digest("hex");
  return `${CHAIN_PREFIX}${digest}.json`;
}

function parseJson<T extends z.ZodType>(
  schema: T,
  bytes: Buffer,
  blobName: string,
): z.output<T> {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CorruptStoredDocumentError(blobName, error);
    }
    throw error;
  }

  const result = schema.safeParse(value);
  if (!result.success) {
    throw new CorruptStoredDocumentError(blobName, result.error);
  }
  return result.data;
}

function validateCursor(cursor: string | undefined) {
  if (cursor !== undefined && (cursor.length === 0 || cursor.length > MAX_CURSOR_LENGTH)) {
    throw new TypeError(`Cursor must contain 1 to ${MAX_CURSOR_LENGTH} characters.`);
  }
}

export class BlobPersistenceAdapter {
  private readonly mutationLockContext = new AsyncLocalStorage<MutationLockContext>();

  constructor(private readonly container: ContainerClient) {}

  async getChain(chainId: string): Promise<PersistedDocument<Chain> | undefined> {
    await this.assertMutationLease();
    const normalizedId = ChainIdSchema.parse(chainId);
    const blobName = chainBlobName(normalizedId);
    const stored = await this.readChainBlob(blobName);
    if (!stored) {
      return undefined;
    }
    if (stored.document.id !== normalizedId) {
      throw new CorruptStoredDocumentError(blobName);
    }
    return stored;
  }

  async saveChain(
    chain: Chain,
    expectedRevision: number | null,
  ): Promise<PersistedDocument<Chain>> {
    const document = ChainSchema.parse(chain);
    return this.withChainMutationLock(async () => {
      await this.assertMutationLease();
      const blobName = chainBlobName(document.id);
      let revision: number;
      let conditions: { ifMatch?: string; ifNoneMatch?: string };

      if (expectedRevision === null) {
        revision = 1;
        conditions = { ifNoneMatch: "*" };
      } else {
        assertRevision(expectedRevision);
        const current = await this.getChain(document.id);
        if (!current || current.revision !== expectedRevision) {
          throw new PersistenceConflictError();
        }
        if (!current.etag) {
          throw new BlobStorageProtocolError("The stored chain is missing its ETag.");
        }
        revision = nextRevision(current.revision);
        conditions = { ifMatch: current.etag };
      }

      const stored = StoredChainSchema.parse({
        storageVersion: STORAGE_CHAIN_VERSION,
        revision,
        chain: document,
      });
      const etag = await this.uploadJson(blobName, stored, conditions);
      return { document, revision, etag };
    });
  }

  async withChainMutationLock<T>(operation: () => Promise<T>): Promise<T> {
    const activeContext = this.mutationLockContext.getStore();
    if (activeContext) {
      await this.assertMutationLease();
      return operation();
    }

    const lockBlob = this.container.getBlockBlobClient(MUTATION_LOCK_BLOB_NAME);
    try {
      await lockBlob.uploadData(Buffer.alloc(0), {
        conditions: { ifNoneMatch: "*" },
      });
    } catch (error) {
      if (!isExistingMutationLockBlob(error)) {
        throw error;
      }
    }

    const leaseClient = lockBlob.getBlobLeaseClient();
    const deadline = Date.now() + MUTATION_LOCK_WAIT_MS;
    while (true) {
      try {
        await leaseClient.acquireLease(MUTATION_LOCK_DURATION_SECONDS);
        break;
      } catch (error) {
        if (!isLeaseAlreadyPresent(error)) {
          throw error;
        }
        if (Date.now() >= deadline) {
          throw new MutationLockUnavailableError();
        }
        await wait(MUTATION_LOCK_RETRY_INTERVAL_MS);
      }
    }

    const context: MutationLockContext = {
      leaseClient,
      lastRenewedAt: Date.now(),
      abortController: new AbortController(),
      renewalError: undefined,
      renewalFailed: false,
    };
    const renewalTimer = setInterval(
      () => void renewMutationLease(context),
      MUTATION_LOCK_RENEW_INTERVAL_MS,
    );
    renewalTimer.unref();
    let outcome: { status: "success"; value: T } | { status: "failure"; error: unknown };
    try {
      outcome = {
        status: "success",
        value: await this.mutationLockContext.run(context, operation),
      };
    } catch (error) {
      outcome = { status: "failure", error };
    }

    clearInterval(renewalTimer);
    if (context.renewal) {
      await context.renewal;
    }
    let releaseError: unknown;
    let releaseFailed = false;
    try {
      await leaseClient.releaseLease();
    } catch (error) {
      releaseFailed = true;
      releaseError = error;
    }
    if (releaseFailed) {
      if (outcome.status === "failure") {
        throw new AggregateError(
          [outcome.error, releaseError],
          "The chain mutation failed and its shared lock could not be released.",
          { cause: outcome.error },
        );
      }
      throw releaseError;
    }
    if (outcome.status === "failure") {
      throw outcome.error;
    }
    return outcome.value;
  }

  async listChains(options: {
    limit?: number;
    cursor?: string;
  } = {}): Promise<ChainPage> {
    await this.assertMutationLease();
    const limit = options.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new TypeError(`Limit must be an integer from 1 to ${MAX_PAGE_SIZE}.`);
    }
    validateCursor(options.cursor);

    const pageIterator = this.container.listBlobsFlat({ prefix: CHAIN_PREFIX }).byPage({
      continuationToken: options.cursor,
      maxPageSize: limit,
    });
    const { value: page } = await pageIterator.next();
    const blobItems: Array<{ name: string }> = page?.segment?.blobItems ?? [];
    const storedItems = await Promise.all(blobItems.map(async (blobItem) => {
      await this.assertMutationLease();
      const { name } = blobItem;
      if (!/^chains\/[a-f0-9]{64}\.json$/.test(name)) {
        throw new CorruptStoredDocumentError(name);
      }
      return this.readChainBlob(name);
    }));

    const items = storedItems.flatMap((stored) => {
      if (!stored) {
        return [];
      }
      return [{
        id: stored.document.id,
        name: stored.document.name,
        harness: stored.document.harness,
        sessionMode: stored.document.sessionMode,
        stepCount: stored.document.steps.length,
        revision: stored.revision,
        updatedAt: stored.document.updatedAt,
      }];
    });

    return {
      items,
      ...(page?.continuationToken ? { nextCursor: page.continuationToken } : {}),
    };
  }

  async getCatalog(): Promise<PersistedDocument<Catalog>> {
    await this.assertMutationLease();
    const stored = await this.readCatalogBlob();
    if (stored) {
      return stored;
    }

    return {
      document: CatalogSchema.parse({
        version: CATALOG_VERSION,
        revision: 1,
        skills: [],
      }),
      revision: 1,
      etag: null,
    };
  }

  async saveCatalog(
    catalog: Catalog,
    expectedRevision: number,
  ): Promise<PersistedDocument<Catalog>> {
    await this.assertMutationLease();
    assertRevision(expectedRevision);
    const current = await this.getCatalog();
    if (current.revision !== expectedRevision) {
      throw new PersistenceConflictError();
    }

    const revision = nextRevision(current.revision);
    const document = CatalogSchema.parse({
      ...catalog,
      revision,
    });
    const conditions = current.etag
      ? { ifMatch: current.etag }
      : { ifNoneMatch: "*" };
    const etag = await this.uploadJson(CATALOG_BLOB_NAME, document, conditions);
    return { document, revision, etag };
  }

  private async readChainBlob(
    blobName: string,
  ): Promise<PersistedDocument<Chain> | undefined> {
    const downloaded = await this.downloadJson(blobName);
    if (!downloaded) {
      return undefined;
    }
    const stored = parseJson(StoredChainSchema, downloaded.bytes, blobName);
    assertRevision(stored.revision);
    if (chainBlobName(stored.chain.id) !== blobName) {
      throw new CorruptStoredDocumentError(blobName);
    }
    return {
      document: stored.chain,
      revision: stored.revision,
      etag: downloaded.etag,
    };
  }

  private async readCatalogBlob(): Promise<PersistedDocument<Catalog> | undefined> {
    const downloaded = await this.downloadJson(CATALOG_BLOB_NAME);
    if (!downloaded) {
      return undefined;
    }
    const document = parseJson(CatalogSchema, downloaded.bytes, CATALOG_BLOB_NAME);
    assertRevision(document.revision);
    return {
      document,
      revision: document.revision,
      etag: downloaded.etag,
    };
  }

  private async downloadJson(blobName: string) {
    let response;
    try {
      response = await this.container.getBlobClient(blobName).download();
    } catch (error) {
      if (isBlobNotFound(error)) {
        return undefined;
      }
      throw error;
    }

    if (!response.etag || !response.readableStreamBody) {
      throw new BlobStorageProtocolError(
        `Blob download for ${blobName} did not return an ETag and readable body.`,
      );
    }

    const chunks: Buffer[] = [];
    let byteLength = 0;
    for await (const chunk of response.readableStreamBody) {
      const bytes = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : Buffer.from(chunk);
      byteLength += bytes.byteLength;
      if (byteLength > MAX_SERIALIZED_OBJECT_BYTES) {
        throw new CorruptStoredDocumentError(blobName);
      }
      chunks.push(bytes);
    }
    return {
      bytes: Buffer.concat(chunks, byteLength),
      etag: response.etag,
    };
  }

  private async uploadJson(
    blobName: string,
    document: unknown,
    conditions: { ifMatch?: string; ifNoneMatch?: string },
  ) {
    await this.assertMutationLease();
    const body = Buffer.from(JSON.stringify(document), "utf8");
    if (body.byteLength > MAX_SERIALIZED_OBJECT_BYTES) {
      throw new RangeError(
        `Serialized JSON object exceeds ${MAX_SERIALIZED_OBJECT_BYTES} bytes.`,
      );
    }

    let response;
    try {
      response = await this.container.getBlockBlobClient(blobName).uploadData(body, {
        abortSignal: this.mutationLockContext.getStore()?.abortController.signal,
        blobHTTPHeaders: {
          blobContentType: "application/json; charset=utf-8",
        },
        conditions,
      });
    } catch (error) {
      if (isConditionalWriteFailure(error)) {
        throw new PersistenceConflictError();
      }
      throw error;
    }

    if (!response.etag) {
      throw new BlobStorageProtocolError(`Blob upload for ${blobName} returned no ETag.`);
    }
    return response.etag;
  }

  private async assertMutationLease() {
    const context = this.mutationLockContext.getStore();
    if (!context) {
      return;
    }
    if (context.renewalFailed) {
      throw new BlobStorageProtocolError(
        "The shared chain mutation lock was lost.",
        context.renewalError,
      );
    }
    if (Date.now() - context.lastRenewedAt >= MUTATION_LOCK_RENEW_INTERVAL_MS) {
      await renewMutationLease(context);
    }
    if (context.renewalFailed) {
      throw new BlobStorageProtocolError(
        "The shared chain mutation lock was lost.",
        context.renewalError,
      );
    }
  }
}

export interface ManagedIdentityBlobConfiguration {
  endpoint: string;
  clientId: string;
}

export function createManagedIdentityBlobPersistence(
  configuration: ManagedIdentityBlobConfiguration,
) {
  const endpoint = new URL(configuration.endpoint);
  if (
    endpoint.protocol !== "https:"
    || endpoint.username !== ""
    || endpoint.password !== ""
    || endpoint.search !== ""
    || endpoint.hash !== ""
  ) {
    throw new TypeError("Blob endpoint must be an HTTPS URL without credentials or query data.");
  }
  const clientId = configuration.clientId.trim();
  if (clientId.length === 0) {
    throw new TypeError("Managed identity client ID must not be empty.");
  }

  const serviceClient = new BlobServiceClient(
    endpoint.toString(),
    new ManagedIdentityCredential({ clientId }),
  );
  return new BlobPersistenceAdapter(serviceClient.getContainerClient("documents"));
}

export interface AzuriteBlobConfiguration {
  endpoint: string;
  accountName: string;
  accountKey: string;
}

export async function createAzuriteBlobPersistence(
  configuration: AzuriteBlobConfiguration,
) {
  const endpoint = new URL(configuration.endpoint);
  const accountName = configuration.accountName.trim();
  const accountKey = configuration.accountKey.trim();
  const localHosts = new Set(["azurite", "localhost", "127.0.0.1", "[::1]"]);
  const keyBytes = Buffer.from(accountKey, "base64");

  if (
    endpoint.protocol !== "http:"
    || !localHosts.has(endpoint.hostname)
    || endpoint.port !== "10000"
    || endpoint.username !== ""
    || endpoint.password !== ""
    || endpoint.pathname !== `/${accountName}`
    || endpoint.search !== ""
    || endpoint.hash !== ""
  ) {
    throw new TypeError("Azurite endpoint must target the local emulator on port 10000.");
  }
  if (!/^[a-z0-9]{3,24}$/.test(accountName)) {
    throw new TypeError("Azurite account name must contain 3 to 24 lowercase letters or digits.");
  }
  if (keyBytes.byteLength !== 64 || keyBytes.toString("base64") !== accountKey) {
    throw new TypeError("Azurite account key must be a canonical base64-encoded 64-byte key.");
  }

  const serviceClient = new BlobServiceClient(
    endpoint.toString(),
    new StorageSharedKeyCredential(accountName, accountKey),
  );
  const container = serviceClient.getContainerClient("documents");
  await container.createIfNotExists();
  return new BlobPersistenceAdapter(container);
}
