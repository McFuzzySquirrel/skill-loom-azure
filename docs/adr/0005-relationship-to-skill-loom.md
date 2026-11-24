---
id: ADR-0005
applies_to:
  - "src/**"
  - "docs/openapi.json"
status: Accepted
---

# ADR-0005: Keep the cloud project separate

- **Deciders:** Project owner (@McFuzzySquirrel)
- **Date:** 2026-11-21

**Technical Story:** Implementation plan D-7 and the separate-project
decision.

## Agent Rules

- **MUST NOT:** Expose, reconfigure, or add cloud runtime dependencies to the
  local Skill Loom application.
- **MUST:** Reuse only reviewed portable interchange formats at the chain and
  bundle boundary.
- **MUST:** Give the hosted service its own Entra identity and authorization.

## Verify

- **Check:** `npm run check`, then review changes to confirm they remain in
  this repository and do not import Skill Loom server runtime modules.
- **Expected:** Pinned interchange tests pass and cloud auth is owned by this
  project.

## Context and Problem Statement

Skill Loom is a local, single-user application with a loopback-only server and
an SSH-backed remote model. The cloud project serves multiple authenticated
clients. Should the cloud project adapt Skill Loom's server or keep a strict
repository and runtime boundary?

## Decision Drivers

- Preserve the existing local application's behavior and security model.
- Avoid treating a remote Skill Loom connection as API authentication.
- Reuse only formats that are portable and testable.

## Considered Options

- Modify Skill Loom to host cloud requests.
- Expose or tunnel the local server.
- Keep a separate cloud project and adapt only portable formats.

## Decision Outcome

Chosen option: "Keep a separate cloud project and adapt only portable
formats," because the cloud service has a different identity, tenancy, and
runtime boundary.

### Positive Consequences

- Skill Loom can evolve independently of the Azure service.
- The cloud service owns its authentication, persistence, and deployment.

### Negative Consequences

- Compatibility must be maintained through fixtures instead of shared
  runtime types.
- The cloud service cannot rely on Skill Loom's local remote-access model.

## Pros and Cons of the Options

### Separate project with a portable boundary

- Good, because it preserves independent security and release lifecycles.
- Bad, because it requires deliberate interchange testing.

### Modify or expose Skill Loom

- Good, because it could reuse more existing code.
- Bad, because it would change a local single-user system into a cloud trust
  boundary it was not designed to provide.

## Links

- Related: [ADR-0001](0001-hosting-model.md) and
  [ADR-0004](0004-schema-ownership-and-interchange.md).
- Security: [ADR-0002](0002-authentication-and-authorization.md).
