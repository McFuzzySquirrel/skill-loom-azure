---
id: ADR-0012
applies_to:
  - "infra/main.bicep"
  - "infra/main.parameters.json"
  - "azure.yaml"
  - "scripts/enable-azure-ingress.mjs"
status: Accepted
---

# ADR-0012: Standalone adopter deployment

- **Deciders:** Project owner (@McFuzzySquirrel)
- **Date:** 2026-11-24

**Technical Story:** Implementation plan D-12, D-13, AR-2, and E-172.

## Agent Rules

- **MUST:** Use the root `infra/main.bicep` and `azure.yaml` for a fresh
  adopter environment.
- **MUST NOT:** Make the root template depend on the original P2A Log
  Analytics workspace, the owner's subscription, or any P2A resource name.
- **MUST:** Keep Entra app registration, consent, and app-role assignment as
  operator-managed prerequisites; the template must not create or modify them.
- **MUST NOT:** Enable external Container Apps ingress before the API image
  is deployed by the post-deploy hook.
- **SHOULD:** Keep Foundry optional so the core API can deploy without a
  Foundry landing zone.

## Verify

- **Check:** `az bicep build --file infra/main.bicep --stdout` and inspect
  `azure.yaml` plus `scripts/enable-azure-ingress.mjs`.
- **Expected:** Bicep compilation succeeds; `azure.yaml` deploys the API
  service from this repository; the ingress hook enables external HTTPS only
  after deployment; no P2A or owner-specific resource identifier appears in
  the root template.

## Context and Problem Statement

The original POC foundation reuses the P2A Log Analytics workspace and
owner-specific landing-zone resources. An adopter needs a repeatable path to
a fresh Azure resource group without inheriting those dependencies. Should
the adopter path reuse the legacy templates or be independent?

## Decision Drivers

- A new adopter must be able to deploy without access to the owner's
  environment.
- The deployment must stay reviewable and reproducible with familiar Azure
  tooling.
- Tenant-specific Entra setup cannot be safely automated as part of the
  service template.
- The cost-first POC should not require a Foundry landing zone.

## Considered Options

- A standalone root `azd`/Bicep deployment with operator-managed Entra setup.
- Reuse the legacy P2 templates and require a P2A workspace.
- Hand-authored deployment scripts per adopter environment.

## Decision Outcome

Chosen option: "A standalone root `azd`/Bicep deployment," because it creates
its own monitoring workspace and resources, keeps the legacy P2 templates as
historical evidence, and leaves Entra consent and role assignment with the
operator. Foundry remains an optional overlay.

### Positive Consequences

- A fresh adopter environment does not depend on the owner's subscription or
  P2A resources.
- The deployment uses one reviewed entry point, `azd up`, with a preview and
  a post-deploy ingress step.
- The legacy templates remain available for the original POC without being
  mistaken for the adopter path.

### Negative Consequences

- The repository now maintains two infrastructure paths: the root adopter
  template and the legacy `infra/p2/` templates.
- Adopters must perform Entra registration, consent, and role assignment
  themselves before the API is usable.
- The live adopter deployment remains unverified; only static packaging and
  local checks have run.

## Pros and Cons of the Options

### Standalone root `azd`/Bicep deployment

- Good, because it is reproducible, reviewable, and independent of P2A.
- Bad, because it adds a second infrastructure path and more documentation to
  keep accurate.

### Reuse the legacy P2 templates

- Good, because it would reuse already-tested modules.
- Bad, because it couples every adopter to the owner's workspace and landing
  zone, and it obscures which template is authoritative.

### Hand-authored deployment scripts

- Good, because scripts can encode narrow adopter-specific steps.
- Bad, because they are harder to review, drift from Azure resource state, and
  duplicate what Bicep and `azd` already provide.

## Links

- Deployment: [`infra/main.bicep`](../../infra/main.bicep),
  [`azure.yaml`](../../azure.yaml), and
  [`scripts/enable-azure-ingress.mjs`](../../scripts/enable-azure-ingress.mjs).
- Guide: [`docs/deployment.md`](../deployment.md).
- Related: [ADR-0007](0007-p2-foundation-infrastructure.md) for the legacy P2
  foundation and [ADR-0008](0008-p2-public-network-posture.md) for the public
  endpoint posture.
- Evidence: E-172 and E-173 in the
  [implementation plan](../plans/implementation-plan.md).
