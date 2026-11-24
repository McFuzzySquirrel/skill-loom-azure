import assert from "node:assert/strict";
import test from "node:test";

import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";

import {
  APP_ROLES,
  AuthenticationError,
  AuthorizationError,
  authenticateBearerToken,
  authorizeWorkspaceRole,
  createEntraTokenVerifier,
} from "../src/auth/entra.ts";

const tenantId = "01234567-89ab-cdef-0123-456789abcdef";
const audience = "api://skill-loom-foundry-test";

async function createToken(
  {
    issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`,
    tokenAudience = audience,
    tokenTenantId = tenantId,
    roles = [APP_ROLES.user],
    expiresAt = Math.floor(Date.now() / 1000) + 300,
    includeExpiration = true,
    privateKey,
  },
) {
  const builder = new SignJWT({ tid: tokenTenantId, roles })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(issuer)
    .setAudience(tokenAudience)
    .setSubject("test-subject")
    .setIssuedAt();

  if (includeExpiration) {
    builder.setExpirationTime(expiresAt);
  }
  return builder.sign(privateKey);
}

async function createTestVerifier(tokenVersion = "2.0") {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  const keySet = createLocalJWKSet({
    keys: [{ ...publicJwk, alg: "RS256", kid: "test-key", use: "sig" }],
  });
  return {
    privateKey,
    verify: createEntraTokenVerifier({ tenantId, audience, tokenVersion }, keySet),
  };
}

test("Entra verifier validates signature, tenant, audience, issuer, and expiry", async () => {
  const { privateKey, verify } = await createTestVerifier();
  const token = await createToken({ privateKey });
  const principal = await verify(token);

  assert.deepEqual(principal, {
    tenantId,
    subject: "test-subject",
    roles: [APP_ROLES.user],
  });

  const invalidCases = [
    { tokenAudience: "api://another-api" },
    { issuer: "https://login.microsoftonline.com/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/v2.0" },
    { tokenTenantId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
    { expiresAt: Math.floor(Date.now() / 1000) - 30 },
    { includeExpiration: false },
  ];

  for (const claims of invalidCases) {
    const invalidToken = await createToken({ ...claims, privateKey });
    await assert.rejects(verify(invalidToken), AuthenticationError);
  }
});

test("Entra verifier rejects signatures from unknown keys and wrong token versions", async () => {
  const { privateKey, verify } = await createTestVerifier();
  const otherKeys = await generateKeyPair("RS256");
  const invalidSignature = await createToken({ privateKey: otherKeys.privateKey });
  await assert.rejects(verify(invalidSignature), AuthenticationError);

  const versionOneToken = await createToken({
    issuer: `https://sts.windows.net/${tenantId}/`,
    privateKey,
  });
  await assert.rejects(verify(versionOneToken), AuthenticationError);
});

test("Entra verifier accepts the configured v1 issuer", async () => {
  const { privateKey, verify } = await createTestVerifier("1.0");
  const token = await createToken({
    issuer: `https://sts.windows.net/${tenantId}/`,
    privateKey,
  });

  assert.equal((await verify(token)).tenantId, tenantId);
});

test("bearer authentication rejects missing or malformed authorization headers", async () => {
  const verify = async () => ({
    tenantId,
    subject: "test-subject",
    roles: [APP_ROLES.user],
  });

  await assert.rejects(authenticateBearerToken(undefined, verify), AuthenticationError);
  await assert.rejects(authenticateBearerToken("Basic abc", verify), AuthenticationError);
  await assert.rejects(authenticateBearerToken("Bearer ", verify), AuthenticationError);
  assert.equal(
    (await authenticateBearerToken("Bearer valid.token", verify)).subject,
    "test-subject",
  );
});

test("workspace authorization allows User and Admin callers, but gates admin operations", () => {
  const user = { tenantId, subject: "user", roles: [APP_ROLES.user] };
  const admin = { tenantId, subject: "admin", roles: [APP_ROLES.admin] };
  const unassigned = { tenantId, subject: "other", roles: [] };

  assert.doesNotThrow(() => authorizeWorkspaceRole(user, APP_ROLES.user));
  assert.doesNotThrow(() => authorizeWorkspaceRole(admin, APP_ROLES.user));
  assert.doesNotThrow(() => authorizeWorkspaceRole(admin, APP_ROLES.admin));
  assert.throws(() => authorizeWorkspaceRole(user, APP_ROLES.admin), AuthorizationError);
  assert.throws(() => authorizeWorkspaceRole(unassigned, APP_ROLES.user), AuthorizationError);
  assert.throws(() => authorizeWorkspaceRole(user, "unexpected-role"), TypeError);
});

test("Entra verifier configuration fails closed for invalid tenant or audience", async () => {
  const keySet = createLocalJWKSet({ keys: [] });
  assert.throws(
    () => createEntraTokenVerifier({ tenantId: "not-a-tenant", audience, tokenVersion: "2.0" }, keySet),
    TypeError,
  );
  assert.throws(
    () => createEntraTokenVerifier({ tenantId, audience: " ", tokenVersion: "2.0" }, keySet),
    TypeError,
  );
});
