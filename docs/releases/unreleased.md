# Skill Loom Foundry - Unreleased

**Release status:** Not published or tagged. The package manifest's `0.1.0`
version is private repository metadata, not a service release.

## Summary

The repository now contains a locally validated authenticated HTTP API and a
buildable non-root container image for the chain-and-skill service. This is
not a deployable service release: no image has been published, no API has
been deployed, and live Azure integration has not been validated.

## Highlights

- Added the OpenAPI v1 contract and Entra token-verification and
  operation-role-policy helpers.
- Added versioned Azure Blob persistence with schema validation, application
  revisions, and ETag-conditional writes.
- Added the Admin-reviewed skill catalog, bounded file validation,
  deterministic fingerprints, and bundle snapshots.
- Added authenticated HTTP routing, bounded requests, conditional writes,
  safe error responses, and structured audit logging that excludes secrets,
  request content, and skill files.
- Added the service entrypoint, non-root Docker image, probe endpoints, and a
  standalone P2 Container App template. Azure deployment remains pending.
- Added scoped architecture decisions and user and administrator guidance.

## Compatibility and Prerequisites

- Local development requires Node.js 24 or later.
- Chain data uses schema version 3; bundle schema versions 1 and 2 are
  supported. Persisted JSON is versioned and schema-validated.
- The package is private and no installable service artifact is published.
- The authentication helper requires explicit tenant, audience, and token
  version configuration. The Blob adapter requires an HTTPS endpoint and a
  managed identity client ID.

## Installation or Upgrade

There is no published package, container image, deployed service endpoint, or
upgrade path. For repository development, run `npm ci` followed by
`npm run check`. Do not deploy the P2 infrastructure template without an
owner-approved plan.

## Known Limitations

- The HTTP API, request limits, structured audit events, container image, and
  Container App template have local evidence only. No Azure API deployment or
  live P3-G checks have run.
- No separate MCP server is deployed; Foundry Toolbox exposes the API through
  its managed MCP endpoint. A Copilot CLI configuration sample is available
  in the [user guide](../user-guide.md#copilot-cli-toolbox-configuration);
  Copilot CLI 1.0.114 currently fails OAuth metadata discovery before
  interactive sign-in, and live client operations remain unverified.
- Remote repository skill pulls are not supported. Skill and tool content
  remains untrusted.
- Hosted chain execution is disabled until P3-G, P4-G, and P5-G pass.
- The cost-first PoC network posture uses public endpoints; it is not a
  production network boundary.
- Storage recovery is manual, with no automatic retention or guaranteed RPO.

## Validation

- `npm run check` - passed; lint, typecheck, 36 tests, and configured
  Markdown checks all passed.
- `npx markdownlint-cli2 README.md docs/user-guide.md docs/admin-guide.md
  docs/releases/unreleased.md docs/articles/azure-skills-experiment.md` -
  passed.
- `npm run build` - passed.
- `podman build --tag skill-loom-foundry:local .` - passed; image runs as
  UID/GID `10001:10001`.
- Local container smoke test - passed; liveness/readiness returned `204`, and
  unauthenticated `/v1/health` returned `401`.
- `az bicep build --file infra/p2/api.bicep --stdout` and
  `az bicep build --file infra/p2/main.bicep --stdout` - passed; static
  compilation only.
- `git diff --check` - not yet run for this update.
- `az bicep build --file infra/p2/main.bicep --stdout` — static Bicep
  compilation was recorded as passed in implementation-plan evidence
  E-038/E-040/E-050; it was not rerun for this documentation update and does
  not verify a deployment.
- Live Azure Entra, managed-identity, Blob, deployed HTTP, MCP, and client
  integration checks - not run.

## Security and Privacy

The code includes Entra verification and Admin-role policies, but they are
not wired to a deployed request handler. The catalog is Admin-managed and
does not pull from remote repositories. Do not store credentials in chains or
skills, and do not treat catalog content as safe to execute. Report suspected
vulnerabilities privately through [`SECURITY.md`](../../SECURITY.md).

## Documentation

- [User Guide](../user-guide.md)
- [Administrator Guide](../admin-guide.md)
- [Architecture Decision Records](../adr/README.md)
- [Changelog](../../CHANGELOG.md)
