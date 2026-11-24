---
id: ADR-0008
applies_to:
  - "infra/p2/**"
  - "src/auth/**"
  - "docs/openapi.json"
status: Accepted
---

# ADR-0008: Public endpoints for the PoC

- **Deciders:** Project owner (@McFuzzySquirrel)
- **Date:** 2026-11-21

**Technical Story:** Implementation plan P2-C3 and P2-C4.

## Agent Rules

- **MUST:** Require Entra authentication and authorization for every API and
  MCP operation, regardless of public reachability.
- **MUST:** Keep Blob access private, disable anonymous Blob access and
  Storage shared-key access, and require HTTPS/TLS 1.2 or later.
- **MUST NOT:** Treat public network access as the production security
  boundary or add private endpoints without a new decision.
- **MUST:** Keep runner egress restrictions as a P5-C3 prerequisite.

## Verify

- **Check:** `npm run check` and
  `az bicep build --file infra/p2/main.bicep --stdout`; manually inspect the
  Bicep access and network properties.
- **Expected:** Auth-policy tests and Bicep compilation pass; Blob public
  access and shared keys remain disabled while the PoC endpoints remain
  publicly reachable.

## Context and Problem Statement

The cost-first PoC needs public endpoints for the future API, Storage, and Key
Vault. Should private networking be added now, or should Entra/RBAC protect
the public endpoints?

## Decision Drivers

- Avoid private-network costs and provisioning complexity during the PoC.
- Preserve identity-based access control.
- Keep the production security gap visible.

## Considered Options

- Public endpoints protected by Entra/RBAC.
- Private endpoints and private ingress.
- Network allow-listing as the primary authorization control.

## Decision Outcome

Chosen option: "Public endpoints with identity-based authorization for the
PoC," because it meets the current cost posture without treating network
location as identity. The future API ingress is intended to use public HTTPS;
Storage and Key Vault use public endpoints, while the `documents` container
remains private.

### Positive Consequences

- The PoC avoids private endpoint and VNet dependencies.
- Blob and Key Vault authorization remains identity/RBAC-based.

### Negative Consequences

- Endpoints are publicly reachable and need application-level authentication.
- This network posture is not a production boundary.
- Runner egress controls remain deferred to P5-C3.

## Pros and Cons of the Options

### Public endpoints with Entra/RBAC

- Good, because the PoC can be operated with less network infrastructure.
- Bad, because public reachability increases the exposed attack surface.

### Private endpoints or network-only controls

- Good, because private routing can reduce public exposure.
- Bad, because it adds cost and cannot replace per-request authorization.

## Links

- Related: [ADR-0002](0002-authentication-and-authorization.md) and
  [ADR-0007](0007-p2-foundation-infrastructure.md).
- IaC: [`infra/p2/main.bicep`](../../infra/p2/main.bicep).
- Historical decision: E-037 in the
  [implementation plan](../plans/implementation-plan.md).
