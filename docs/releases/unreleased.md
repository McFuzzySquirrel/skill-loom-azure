# Skill Loom Azure - Unreleased

**Release status:** Not published or tagged. The package manifest's `0.1.0`
version is private repository metadata, not a service release. This document
describes the current POC baseline and the validation boundary for it.

## Summary

The proof-of-concept exit gates for project setup, the storage foundation,
the authenticated API, and the Foundry/Copilot integration have passed. The
repository now provides an Entra-authenticated chain and reviewed-skill
service, a Foundry/Copilot integration path, a local Docker/Azurite profile,
and a standalone `azd`/Bicep deployment for a fresh Azure environment. The
original POC API and clients have been deployed and exercised in a live Azure
environment, including live Entra-authenticated API operations and Foundry
and Copilot list/get/save/export checks. The owner also has a deployed
non-production POC. The service still does not execute chains: callers run
chain steps in their own sessions.

Hosted execution is deferred and hardening, pilot, and release work has not
started. This is not a production release.

## Highlights

- Added the authenticated HTTP API and OpenAPI v1 contract for health, chain
  list/get/save, chain bundle export, reviewed-skill search/detail, and
  Admin-only catalog changes.
- Added Entra token verification and operation-role policies for
  `SkillLoom.User` and `SkillLoom.Admin`.
- Added versioned Azure Blob persistence with schema validation, application
  revisions, ETag-conditional writes, and a shared mutation lease.
- Added the Admin-reviewed skill catalog with bounded file validation,
  deterministic fingerprints, and pinned bundle snapshots.
- Added a Foundry Toolbox OpenAPI mapping and a local Python MCP adapter for
  Copilot CLI.
- Added structured audit logging, bounded request handling, a non-root
  container image, and a local Azurite development profile.
- Added the standalone adopter deployment, the legacy storage foundation
  templates, and the optional Foundry landing zone.
- Added user and administrator guides, architecture decisions, a storage
  recovery runbook, an end-to-end demo script, and example data.

## Compatibility and Prerequisites

- Node.js 24 or later and npm for the service and repository checks.
- Python 3 and pip for the local MCP adapter and catalog administration CLI.
- Docker Engine/Desktop or a compatible Compose runtime for local Azurite.
- Chain documents use schema version 3; exported bundles support versions 1
  and 2. Persisted JSON is versioned and schema-validated.
- API callers need a single-tenant Entra app registration, the configured
  audience, and `SkillLoom.User`; catalog writes also need `SkillLoom.Admin`.
- Managed-identity storage requires `ENTRA_TENANT_ID`, `ENTRA_AUDIENCE`,
  `ENTRA_TOKEN_VERSION`, `BLOB_ENDPOINT`, and
  `MANAGED_IDENTITY_CLIENT_ID`.
- The local Azurite mode requires its explicit emulator settings and cannot be
  mixed with managed-identity settings.

## Installation or Upgrade

There is no published package, container image, release tag, or deployed
service endpoint. For repository development, run `npm ci` followed by
`npm run check`.

For an independent Azure environment, follow the
[deployment guide](../deployment.md). The `azd` path creates a fresh resource
group and does not depend on the owner's original Foundry landing zone.
Entra registration, consent, and role assignment remain operator-managed
steps. Review
`azd provision --preview` and obtain resource-owner approval before running
`azd up`.

There is no automated application rollback. Storage recovery is the manual
procedure in the
[backup and restore runbook](../runbooks/storage-backup-restore.md). Preserve
data before `azd down`.

## Known Limitations

- The POC is not production-ready. It uses public Azure endpoints and a public
  Container Apps ingress; this is not a production network boundary.
- Hosted chain execution is disabled until the hosted runner exit gate
  passes. The hosted runner is deferred and hardening/release has not started.
- Positive live reviewed-skill detail retrieval remains pending because the
  live catalog was empty.
- Live Azure Blob lease expiry, renewal, and managed-identity behavior remain
  `not run`; local tests use mocks and a local emulator.
- The Foundry Toolbox completed live list/get/save/export checks in the
  Foundry/Copilot integration live validation (P4-G). The separate Foundry
  direct-API MCP agent path still fails for some operations, and Copilot CLI
  1.0.114 cannot complete Toolbox OAuth metadata discovery. The validated
  Copilot path is the local stdio adapter.
- Foundry model capacity and throttling are tenant-specific and not guaranteed.
- There is no chain-delete API, no write-rate quota, and no hosted client
  retry or idempotency policy.
- Blob versioning, blob/container soft delete, scheduled backups, automatic
  retention, private endpoints, and a spending cap are not configured.
- Break-glass access is not configured, and live audit log-redaction
  verification remains pending.
- The generated container image is not published, and `azd package` reported
  no artifacts in the recorded check.

## Validation

Validation for this documentation refresh:

- `npm run check` — passed: ESLint, the TypeScript type check, 56 tests, and
  `markdownlint-cli2` on 17 configured files.
- `az bicep build --file infra/main.bicep --stdout` and
  `az bicep build --file infra/p2/main.bicep --stdout` — passed; static
  compilation only.
- `npx markdownlint-cli2` on the refreshed guides and release notes — passed.
- `git diff --check` — passed.

Previously recorded live environment evidence, not re-run for this
documentation update:

- The original non-production POC API was deployed to Azure Container Apps.
- The authenticated API live validation (P3-G) recorded live
  Entra-authenticated API, RBAC, Blob, stale-revision, traversal, and oversize
  checks.
- The Foundry/Copilot integration live validation (P4-G) recorded live
  Foundry and Copilot list/get/save/export operations (E-128, E-161).
- The storage foundation live validation (P2-G) restored one synthetic Blob
  object. Multi-object export, path mapping, and guarded replacement of a live
  object were not validated.

Other recorded checks:

- The local container smoke test, `azd package`, and legacy Bicep build/lint
  checks passed as recorded.

The prior live checks establish behavior for the original POC environment.
They do not validate a new adopter deployment. Live deployment for a new
adopter environment, live Azure lease behavior, authenticated local API
calls, and positive live skill-detail retrieval remain `not run` or pending.

## Security and Privacy

Every API and MCP operation requires Entra authentication and an app role.
Catalog additions are Admin-managed and reviewed, and the service does not
pull from remote repositories. Do not store credentials in chains or skills,
and do not treat catalog content as safe to execute. Report suspected
vulnerabilities privately through [`SECURITY.md`](../../SECURITY.md).

## Documentation

- [User Guide](../user-guide.md)
- [Administrator Guide](../admin-guide.md)
- [Deployment and Local Development](../deployment.md)
- [Architecture Decision Records](../adr/README.md)
- [Changelog](../../CHANGELOG.md)
