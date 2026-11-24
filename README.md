# Skill Loom Foundry

Skill Loom Foundry is an Entra-authenticated Azure proof of concept for
discovering and transferring Skill Loom chains and reviewed skills through an
HTTP API and MCP clients. It does not execute chains in the cloud: the caller
executes steps in its own session.

## Status

The P0–P4 proof-of-concept exit gates have passed. The owner's non-production
POC deployment has been decommissioned after a verified backup of its stored
chain data. This repository includes a guided, fresh-environment Azure
deployment and a local Docker/Azurite development profile. Foundry is
optional. P5 hosted execution and P6 hardening/pilot work are post-POC; hosted
execution remains disabled.

The implementation plan is the status and evidence source:
[implementation plan](docs/plans/implementation-plan.md). P4-C10 positive
live skill-detail retrieval remains pending because the live catalog was
empty. Live Azure Blob lease behavior remains `not run`; local lease tests do
not prove live behavior. The POC is not production-ready.

## What users can do

- **Users** can discover and fetch chains and reviewed skills, and list, save,
  and export chains through the available API/MCP clients.
- **Administrators** can add reviewed skills and remove skills only when no
  stored chain references them. Server-side Entra roles, revision checks, and
  shared Blob mutation locking protect changes.
- **Every chain step runs in the caller's session.** Hosted chain execution
  is not available.

See the [user guide](docs/user-guide.md) and
[administrator guide](docs/admin-guide.md).
Follow the [end-to-end demo script](docs/demo-script.md) to demonstrate skill
review, discovery, chain transfer, and the hosted-execution boundary.

## Quick start

Use Node.js 24 or later:

```sh
npm ci
npm run check
```

For local development, create a local-only Azurite key, set the Entra values,
and start the API and emulator:

```sh
npm run dev:setup
# Edit .env.local: set ENTRA_TENANT_ID and ENTRA_AUDIENCE.
npm run dev:up
```

The local API still requires real Entra authentication for API operations;
Azurite replaces only Blob Storage. See the [deployment and local development
guide](docs/deployment.md) for setup details and verification.

## Deploy to your Azure environment

The core deployment uses `azd` and Bicep to create a fresh resource-group
environment, build the image remotely, and deploy the API. Tenant-specific
Entra app registration, consent, and role assignment remain explicit
operator-managed steps. Review expected resources, cost, network posture, and
cleanup before provisioning. Start with the
[deployment guide](docs/deployment.md).

The optional Foundry landing zone has separate prerequisites and cost
implications; see [`infra/landing-zone/README.md`](infra/landing-zone/README.md).

## Security and project boundaries

- API operations and MCP calls require Entra authentication and role checks.
  Public HTTPS ingress is not an authorization boundary.
- Treat chains, skills, bundles, and tool output as untrusted input.
- Catalog additions are Admin-managed; remote skill pulls are unsupported.
- The cost-first POC uses public Azure endpoints and manual backup/restore.
  It does not establish a production network or recovery posture.
- Keep tenant values, credentials, local `.azure` environments, `.mcp.json`,
  and generated artifacts out of commits. Report vulnerabilities through
  [`SECURITY.md`](SECURITY.md).

See [`CONTRIBUTING.md`](CONTRIBUTING.md) before proposing a change.

## License

MIT. See [`LICENSE`](LICENSE).
