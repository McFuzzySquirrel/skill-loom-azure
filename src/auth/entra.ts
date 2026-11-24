import {
  createRemoteJWKSet,
  errors,
  jwtVerify,
  type JWTVerifyGetKey,
  type JWTPayload,
} from "jose";

const TENANT_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export const APP_ROLES = {
  user: "SkillLoom.User",
  admin: "SkillLoom.Admin",
} as const;

export type EntraTokenVersion = "1.0" | "2.0";

export interface EntraTokenConfiguration {
  tenantId: string;
  audience: string;
  tokenVersion: EntraTokenVersion;
}

export interface AuthenticatedPrincipal {
  tenantId: string;
  subject: string;
  roles: readonly string[];
}

export class AuthenticationError extends Error {
  constructor() {
    super("A valid Entra access token is required.");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor() {
    super("The caller does not have the required app role.");
    this.name = "AuthorizationError";
  }
}

export class ApiRouteNotFoundError extends Error {
  constructor() {
    super("The authenticated API route was not found.");
    this.name = "ApiRouteNotFoundError";
  }
}

export const API_OPERATION_POLICIES = {
  getHealth: APP_ROLES.user,
  listChains: APP_ROLES.user,
  getChain: APP_ROLES.user,
  saveChain: APP_ROLES.user,
  exportChainBundle: APP_ROLES.user,
  searchSkills: APP_ROLES.user,
  getSkill: APP_ROLES.user,
  addReviewedSkill: APP_ROLES.admin,
  removeReviewedSkill: APP_ROLES.admin,
} as const;

export type ApiOperationId = keyof typeof API_OPERATION_POLICIES;

const API_ROUTES: ReadonlyArray<{
  method: string;
  path: RegExp;
  operationId: ApiOperationId;
}> = [
  { method: "GET", path: /^\/v1\/health$/, operationId: "getHealth" },
  { method: "GET", path: /^\/v1\/chains$/, operationId: "listChains" },
  { method: "GET", path: /^\/v1\/chains\/[^/]+\/bundle$/, operationId: "exportChainBundle" },
  { method: "GET", path: /^\/v1\/chains\/[^/]+$/, operationId: "getChain" },
  { method: "PUT", path: /^\/v1\/chains\/[^/]+$/, operationId: "saveChain" },
  { method: "GET", path: /^\/v1\/skills$/, operationId: "searchSkills" },
  { method: "GET", path: /^\/v1\/skills\/[^/]+$/, operationId: "getSkill" },
  { method: "POST", path: /^\/v1\/admin\/skills$/, operationId: "addReviewedSkill" },
  { method: "DELETE", path: /^\/v1\/admin\/skills\/[^/]+$/, operationId: "removeReviewedSkill" },
];

function issuerFor(tenantId: string, tokenVersion: EntraTokenVersion) {
  return tokenVersion === "2.0"
    ? `https://login.microsoftonline.com/${tenantId}/v2.0`
    : `https://sts.windows.net/${tenantId}/`;
}

function jwksUrlFor(tenantId: string, tokenVersion: EntraTokenVersion) {
  return tokenVersion === "2.0"
    ? new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`)
    : new URL(`https://login.microsoftonline.com/${tenantId}/discovery/keys`);
}

function validateConfiguration(configuration: EntraTokenConfiguration) {
  const tenantId = configuration.tenantId.toLowerCase();
  if (!TENANT_ID_PATTERN.test(tenantId)) {
    throw new TypeError("ENTRA_TENANT_ID must be a tenant GUID.");
  }
  if (configuration.audience.trim().length === 0) {
    throw new TypeError("ENTRA_AUDIENCE must not be empty.");
  }
  if (configuration.tokenVersion !== "1.0" && configuration.tokenVersion !== "2.0") {
    throw new TypeError("ENTRA_TOKEN_VERSION must be 1.0 or 2.0.");
  }
  return {
    tenantId,
    audience: configuration.audience,
    tokenVersion: configuration.tokenVersion,
  };
}

function principalFromPayload(payload: JWTPayload, tenantId: string): AuthenticatedPrincipal {
  if (typeof payload.tid !== "string" || payload.tid.toLowerCase() !== tenantId) {
    throw new AuthenticationError();
  }

  const subject = typeof payload.oid === "string"
    ? payload.oid
    : typeof payload.sub === "string"
      ? payload.sub
      : undefined;
  if (!subject) {
    throw new AuthenticationError();
  }

  return {
    tenantId,
    subject,
    roles: Array.isArray(payload.roles)
      ? payload.roles.filter((role): role is string => typeof role === "string")
      : [],
  };
}

export function createEntraTokenVerifier(
  configuration: EntraTokenConfiguration,
  trustedKeySet?: JWTVerifyGetKey,
) {
  const policy = validateConfiguration(configuration);
  const keySet = trustedKeySet ?? createRemoteJWKSet(
    jwksUrlFor(policy.tenantId, policy.tokenVersion),
  );
  const issuer = issuerFor(policy.tenantId, policy.tokenVersion);

  return async (token: string): Promise<AuthenticatedPrincipal> => {
    try {
      const { payload } = await jwtVerify(token, keySet, {
        algorithms: ["RS256"],
        audience: policy.audience,
        issuer,
        requiredClaims: ["exp", "tid"],
      });
      return principalFromPayload(payload, policy.tenantId);
    } catch (error) {
      if (error instanceof errors.JOSEError) {
        throw new AuthenticationError();
      }
      throw error;
    }
  };
}

export async function authenticateBearerToken(
  authorization: string | undefined,
  verifyToken: (token: string) => Promise<AuthenticatedPrincipal>,
) {
  const match = /^\s*Bearer[ \t]+([A-Za-z0-9\-._~+/]+=*)\s*$/i.exec(authorization ?? "");
  if (!match) {
    throw new AuthenticationError();
  }
  return verifyToken(match[1]);
}

export async function authenticateApiRequest(
  method: string,
  requestTarget: string,
  authorization: string | undefined,
  verifyToken: (token: string) => Promise<AuthenticatedPrincipal>,
) {
  const principal = await authenticateBearerToken(authorization, verifyToken);
  if (!requestTarget.startsWith("/") || requestTarget.startsWith("//")) {
    throw new ApiRouteNotFoundError();
  }
  const path = new URL(requestTarget, "https://api.invalid").pathname;
  const route = API_ROUTES.find((candidate) => (
    candidate.method === method.toUpperCase() && candidate.path.test(path)
  ));
  if (!route) {
    throw new ApiRouteNotFoundError();
  }

  authorizeWorkspaceRole(principal, API_OPERATION_POLICIES[route.operationId]);
  return { operationId: route.operationId, principal };
}

export function authorizeWorkspaceRole(
  principal: AuthenticatedPrincipal,
  requiredRole: typeof APP_ROLES.user | typeof APP_ROLES.admin,
) {
  let isAuthorized: boolean;
  if (requiredRole === APP_ROLES.admin) {
    isAuthorized = principal.roles.includes(APP_ROLES.admin);
  } else if (requiredRole === APP_ROLES.user) {
    isAuthorized = principal.roles.includes(APP_ROLES.admin)
      || principal.roles.includes(APP_ROLES.user);
  } else {
    throw new TypeError("Unknown app role.");
  }

  if (!isAuthorized) {
    throw new AuthorizationError();
  }
}
