---
id: ADR-0002
applies_to:
  - "src/auth/**"
  - "docs/openapi.json"
  - "tests/auth.test.js"
status: Accepted
---

# ADR-0002: Entra authentication and app-role authorization

- **Deciders:** Project owner (@McFuzzySquirrel)
- **Date:** 2026-11-21

**Technical Story:** Implementation plan D-9 and P3-C2.

## Agent Rules

- **MUST:** Require a valid Entra access token for every API and MCP request.
- **MUST:** Validate the configured tenant, issuer, audience, RS256 signature,
  expiry, and explicit token version before authorization.
- **MUST:** Deny access by default; `SkillLoom.Admin` may perform normal
  operations and reviewed catalog additions, while `SkillLoom.User` may
  perform normal operations only.
- **MUST NOT:** Treat public network reachability as authorization or infer
  token version from untrusted token claims.

## Verify

- **Check:** `npm run check`
- **Expected:** Generated-key tests pass for issuer, audience, signature,
  expiry, tenant binding, bearer parsing, and operation role coverage. These
  local tests do not prove live Entra/JWKS behavior.

## Context and Problem Statement

The service is intended for multiple managed-identity and user callers.
Host-account access and network location cannot establish caller identity.
Which identity and authorization boundary should protect service operations?

## Decision Drivers

- Enforce tenant and audience isolation.
- Support managed identities and user tokens without a shared service key.
- Separate ordinary workspace use from catalog administration.

## Considered Options

- Entra JWT validation with app roles.
- A shared API key or a network allow-list.
- Anonymous access behind public HTTPS.

## Decision Outcome

Chosen option: "Entra JWT validation with app roles," because it binds each
request to the configured tenant and audience and supports deny-by-default
authorization. Configuration explicitly supplies `tenantId`, `audience`, and
`tokenVersion` (`1.0` or `2.0`). `SkillLoom.User` permits normal operations;
`SkillLoom.Admin` also permits reviewed catalog additions.

### Positive Consequences

- Tokens are checked against tenant-specific issuer and signing-key discovery.
- API and MCP operation policies can be tested against the OpenAPI contract.

### Negative Consequences

- A remote JWKS and live Entra negative-case check are still required before
  the P3 exit gate.
- The API request handlers are not implemented, so this helper is not yet a
  deployed enforcement boundary.

## Pros and Cons of the Options

### Entra JWT validation with app roles

- Good, because callers receive tenant-bound identities and least-privilege
  role checks.
- Bad, because token and identity configuration must be provisioned correctly.

### Shared key, network allow-list, or anonymous access

- Good, because initial client setup may be simpler.
- Bad, because a shared credential or network boundary does not provide the
  required per-caller authorization.

## Links

- Implemented helper: [`src/auth/entra.ts`](../../src/auth/entra.ts).
- Operation contract: [`docs/openapi.json`](../openapi.json).
- Related: [ADR-0008](0008-p2-public-network-posture.md).
- Status: [implementation plan](../plans/implementation-plan.md).
