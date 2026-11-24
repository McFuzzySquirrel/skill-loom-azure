# Changelog

All notable changes to this project are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project has no
published release or release tag; everything below is under `Unreleased`.

## [Unreleased]

### Added

- Authenticated HTTP API for health, chain list/get/save, chain bundle export,
  reviewed-skill search/detail, and Admin-only skill add/remove operations.
- Entra token verification and operation-role policies for `SkillLoom.User`
  and `SkillLoom.Admin`, including tenant, issuer, audience, signature,
  expiry, and role checks.
- Versioned Azure Blob persistence with schema validation, application
  revisions, ETag-conditional writes, pagination, and a shared mutation lease
  that serializes chain writes with reviewed-skill removal.
- Admin-managed reviewed-skill catalog with bounded file validation,
  deterministic fingerprints, pinned bundle snapshots, and removal blocked
  while a stored chain references the skill.
- Foundry Toolbox OpenAPI mapping for the User-authorized operations, with
  inlined parameters and project-connection authentication guidance.
- Local Python MCP adapter and reviewed-skill administration CLI using MSAL
  interactive browser authentication and PKCE.
- Structured JSON-lines audit events with sanitized actor identifiers and no
  request paths, bodies, tokens, raw tenant/subject IDs, or skill contents.
- Non-root production container image, Docker/Azurite local profile, and
  bounded request, header, body, response, query, page, and cursor limits.
- Standalone `azd`/Bicep deployment for a fresh Azure resource group and the
  legacy storage foundation templates plus optional Foundry landing zone.
- User guide, administrator guide, deployment and demo guides, release notes,
  scoped architecture decisions, storage recovery runbook, and OpenAPI v1
  contract.
- Example version-3 chains and a harmless reviewed skill for demonstrations.

### Changed

- Reworked the README into the project entry point, with links to the guides,
  ADR index, and release notes instead of duplicated operational detail.
- Replaced the earlier "not wired to HTTP or MCP" project state with the
  implemented API and client integration status recorded in the
  implementation plan.

### Fixed

- Corrected the Foundry Toolbox authentication shape to use a
  `project_connection` and inlined operation parameters after the live
  converter omitted them.
- Removed unauthenticated HTTP health routes; Container Apps probes use TCP,
  so every API operation remains behind Entra authentication.

### Security

- Deny access by default and enforce the required app role before dispatch.
- Keep catalog additions administrator-managed and reviewed; do not pull
  skills from remote repositories.
- Treat chains, skills, bundles, and tool output as untrusted input.
- Keep hosted chain execution disabled until the hosted runner exit gate
  passes.
