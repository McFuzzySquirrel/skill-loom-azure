---
id: ADR-0003
applies_to:
  - "src/**"
  - "infra/p2/**"
status: Accepted
---

# ADR-0003: Gate hosted chain execution

- **Deciders:** Project owner (@McFuzzySquirrel)
- **Date:** 2026-11-21

**Technical Story:** The phased serve-then-run decision (D-6) and the hosted
runner exit gate (P5-G).

## Agent Rules

- **MUST:** Keep hosted chain execution disabled until the authenticated API
  live validation, the Foundry/Copilot integration live validation, and the
  hosted runner exit gate have passed (P3-G, P4-G, P5-G).
- **MUST NOT:** Execute chains inside the serve-mode request process.
- **MUST:** Before implementing a runner, define per-run isolation,
  concurrency, resource and wall-clock limits, cancellation, egress, and
  credential handling.
- **MUST:** Spawn processes with an executable and argument array; keep
  user-controlled values out of shell command strings.

## Verify

- **Check:** `npm run check`, then manually review the hosted runner
  checklist (P5) and deployment template before enabling any runner resource.
- **Expected:** Local tests pass; the plan's hosted runner exit gate (P5-G) is
  not marked passed and no runner is deployed.

## Context and Problem Statement

Hosted jobs would execute agent-controlled chains and may handle credentials.
Skill Loom's single-active-run process model is not a safe default for a
multi-caller cloud service. Should execution be enabled in the API or wait for
an isolated runner?

## Decision Drivers

- Keep request serving separate from untrusted execution.
- Require isolation, cancellation, limits, and credential controls.
- Avoid claiming live execution from mocks or contract tests.

## Considered Options

- Execute chains in the API process.
- Use a separate Container Apps Job after the service and MCP gates.
- Keep hosted execution out of scope.

## Decision Outcome

Chosen option: "Defer hosted execution to a separate Container Apps Job,"
because serving and execution have different trust and resource boundaries.
The runner remains disabled until its own design and live exit gate pass.

### Positive Consequences

- The initial API can remain data-oriented and avoid executing skill content.
- Runner isolation can be reviewed independently.

### Negative Consequences

- Users cannot ask the hosted service to execute a chain until the hosted
  runner (P5) is complete.
- Job isolation and credential behavior remain unresolved.

## Pros and Cons of the Options

### Separate, gated Container Apps Job

- Good, because it can isolate workspaces, resources, and cancellation.
- Bad, because it needs additional infrastructure and operational controls.

### Execute in the API or omit a runner

- Good, because it reduces deployment components or execution risk.
- Bad, because API-process execution couples untrusted workloads to serving;
  omitting the runner removes the planned hosted capability.

## Links

- Related hosting choice: [ADR-0001](0001-hosting-model.md).
- Trust boundary: [ADR-0009](0009-reviewed-skill-trust-boundary.md).
- Future work: the hosted runner (P5) in the
  [implementation plan](../plans/implementation-plan.md).
