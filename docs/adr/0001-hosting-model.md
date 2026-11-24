---
id: ADR-0001
applies_to:
  - "infra/p2/**"
  - "docs/openapi.json"
status: Accepted
---

# ADR-0001: Azure Container Apps hosting

- **Deciders:** Project owner (@McFuzzySquirrel)
- **Date:** 2026-11-21

**Technical Story:** Implementation plan D-2 and P2 foundation design.

## Agent Rules

- **MUST:** Keep the cloud service in a separate Azure hosting boundary.
- **MUST NOT:** Treat a Container Apps environment as proof that an API app
  or ingress is deployed; the P2 template creates neither.
- **MUST NOT:** Enable hosted chain execution before the P5 exit gate.

## Verify

- **Check:** `npm run check`, then review `infra/p2/main.bicep` for the
  absence of an API app and Container Apps Jobs.
- **Expected:** Local checks pass; the template contains infrastructure only,
  and hosted execution remains absent.

## Context and Problem Statement

The project needs a cloud service for authenticated chain operations without
changing Skill Loom's existing loopback-only application. Should the service
share Skill Loom's host or use a separate Azure deployment boundary?

## Decision Drivers

- Keep the cloud trust boundary independent from the local application.
- Support a later hosted runner without placing chain execution in the API.
- Keep the proof of concept within the existing Azure plan.

## Considered Options

- A separate Azure Container Apps service.
- Extending or exposing the local Skill Loom server.
- Running chain execution in the API from the beginning.

## Decision Outcome

Chosen option: "A separate Azure Container Apps service," because it gives the
cloud API its own identity, persistence, and deployment boundary. Serve mode
returns data to callers; a later runner may use Container Apps Jobs only after
the required gates.

### Positive Consequences

- The local Skill Loom server remains unchanged.
- API and runner deployment can be reviewed and gated independently.

### Negative Consequences

- The API and client integration still need implementation and live validation.
- Container Apps Jobs require a separate isolation and operations design.

## Pros and Cons of the Options

### Separate Azure Container Apps service

- Good, because it establishes an independent cloud boundary.
- Bad, because it adds deployment and identity work.

### Extend Skill Loom or execute in the API

- Good, because it could reduce initial component count.
- Bad, because it couples cloud access to a local single-user server or mixes
  serving with unisolated execution.

## Links

- Related: [ADR-0003](0003-run-isolation.md) for the hosted-runner gate.
- Implemented in part: [`infra/p2/main.bicep`](../../infra/p2/main.bicep).
- Status: [implementation plan](../plans/implementation-plan.md).
