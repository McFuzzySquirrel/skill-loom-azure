---
id: ADR-0007
applies_to:
  - "infra/p2/**"
status: Accepted
---

# ADR-0007: Bicep for the legacy storage foundation

- **Deciders:** Project owner (@McFuzzySquirrel)
- **Date:** 2026-11-21

**Technical Story:** The storage foundation Bicep work and live validation
(P2-C2, P2-G).

## Agent Rules

- **MUST:** Define legacy storage foundation resources in Bicep and reuse the
  existing original Foundry landing zone's Log Analytics workspace.
- **MUST NOT:** Deploy the legacy storage foundation template without an
  approved plan and a reviewed resource-group `what-if`.
- **MUST NOT:** Emit workspace keys or environment-specific credentials as
  deployment outputs.

## Verify

- **Check:** `az bicep build --file infra/p2/main.bicep --stdout`
- **Expected:** Bicep compilation succeeds. Before any deployment, inspect the
  `what-if` and obtain owner approval for its exact resource scope.

## Context and Problem Statement

The original storage foundation required a Container Apps environment,
registry, managed identity, Key Vault, monitoring, and Blob Storage while
reusing the original Foundry landing zone's workspace. Which
infrastructure-as-code approach should define this foundation?

## Decision Drivers

- Keep the foundation repeatable and reviewable.
- Reuse the deployed original Foundry landing zone's monitoring workspace.
- Avoid changing resources outside the approved resource group.

## Considered Options

- Bicep.
- Terraform.
- Hand-authored ARM JSON.

## Decision Outcome

Chosen option: "Bicep for the legacy storage foundation," because it
integrates with the existing Azure workflow and supports a reviewable
resource-group deployment. The template defines infrastructure only; it does
not create an API application.

### Positive Consequences

- Infrastructure can be compiled and reviewed before deployment.
- Resource scopes and identity role assignments are represented in code.

### Negative Consequences

- The legacy storage foundation template depends on the existing original
  Foundry landing zone's Log Analytics workspace.
- A deployment still requires owner approval, quota checks, and live
  authorization validation.

## Pros and Cons of the Options

### Bicep

- Good, because it is native to Azure Resource Manager and already used by
  the landing zone.
- Bad, because the template is Azure-specific.

### Terraform or ARM JSON

- Good, because Terraform is multi-cloud and ARM JSON is universally
  understood by Resource Manager.
- Bad, because either would add a second IaC pattern or reduce maintainability
  compared with Bicep for this Azure-only PoC.

## Links

- Template: [`infra/p2/main.bicep`](../../infra/p2/main.bicep).
- Related: [ADR-0008](0008-p2-public-network-posture.md),
  [ADR-0010](0010-blob-storage-persistence.md), and
  [ADR-0011](0011-manual-only-storage-recovery.md).
- Historical checks: the storage foundation evidence (E-038, E-040, E-050,
  and E-051) in the
  [implementation plan](../plans/implementation-plan.md).
