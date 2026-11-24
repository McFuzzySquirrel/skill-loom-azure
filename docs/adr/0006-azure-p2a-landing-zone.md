---
id: ADR-0006
applies_to:
  - "infra/landing-zone/**"
status: Accepted
---

# ADR-0006: Pinned Basic Foundry landing zone

- **Deciders:** Project owner (@McFuzzySquirrel)
- **Date:** 2026-11-21

**Technical Story:** The landing zone setup verification, Basic template
provisioning, and exit gate (P2A-C1, P2A-C6, P2A-G).

## Agent Rules

- **MUST:** Keep the original Foundry landing zone template based on the
  reviewed `Azure-Samples/azd-ai-starter-basic` source pinned at
  `5bf59a056c41ff37801dea334ba6a141e2dc5f67`.
- **MUST NOT:** Enable hosted agents, capability host, ACR, Storage, or Search
  in this Basic landing-zone deployment.
- **MUST:** Require owner approval and a reviewed preview before provisioning
  or tearing down the landing zone.
- **MUST NOT:** Describe the proof-of-concept landing zone as production-ready.

## Verify

- **Check:** Review `infra/landing-zone/README.md` and inspect the preview
  under an approved Azure plan:

  ```sh
  AZURE_DEV_USER_AGENT=microsoft_foundry_skill azd provision --preview --no-prompt
  ```

- **Expected:** The preview matches the Basic footprint and leaves optional
  hosted services disabled; no unapproved resource changes are proposed.

## Context and Problem Statement

The original Foundry landing zone needed a repeatable environment before the
storage foundation work. Which baseline can be used without creating optional
services or implying a production security posture?

## Decision Drivers

- Keep the initial footprint small and repeatable.
- Use a reviewed, pinned deployment template.
- Separate PoC constraints from production requirements.

## Considered Options

- Use the Basic Azure Developer CLI template.
- Build a custom Foundry deployment template.
- Provision optional services with the initial Foundry environment.

## Decision Outcome

Chosen option: "Use the pinned Basic template for the original Foundry
landing zone," because it supplies the required Foundry account and project
while leaving optional hosted services disabled. Model, region, budget,
identity, and break-glass evidence remain in the implementation plan and
landing-zone runbook rather than being treated as part of this template
decision.

### Positive Consequences

- The environment can be provisioned and reviewed through a repeatable
  template.
- Optional resources are not created before their use is approved.

### Negative Consequences

- The original Foundry landing zone configuration remains a proof of concept,
  including an accepted break-glass exception.
- Azure account, quota, and cost state must be rechecked before provisioning.

## Pros and Cons of the Options

### Pinned Basic template

- Good, because its footprint is documented and reproducible.
- Bad, because it does not provide a production landing zone.

### Custom or expanded template

- Good, because it could include more deployment controls.
- Bad, because it would add cost and scope before the PoC needs them.

## Links

- Template and operator instructions:
  [`infra/landing-zone/README.md`](../../infra/landing-zone/README.md).
- Related: [ADR-0008](0008-p2-public-network-posture.md).
- Historical validation: the landing zone evidence (E-016 through E-029 and
  E-042/E-043) in the
  [implementation plan](../plans/implementation-plan.md).
