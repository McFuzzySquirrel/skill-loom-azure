# Changelog

All notable changes to this project are recorded here.

## [Unreleased]

### Added

- Bootstrap repository governance and validation skeleton.
- OpenAPI v1 contract, Entra token-verification and operation-role helpers,
  versioned Blob persistence, and an Admin-reviewed skill catalog with pinned
  bundle snapshots. These modules are not wired to HTTP or MCP request
  handlers.
- User and administrator guides, release notes, and scoped architecture
  decisions.

### Security

- Enforce tenant, issuer, audience, signature, expiry, and role checks in the
  authentication helper; keep catalog additions Admin-only and reject
  unsupported external skill bindings.
