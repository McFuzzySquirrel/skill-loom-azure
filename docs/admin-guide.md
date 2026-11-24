# Administrator Guide

## Responsibilities and Architecture

The non-production proof of concept through the Foundry/Copilot integration
provides an Entra-protected API, Blob persistence, Foundry and Copilot MCP
clients, and an Admin-managed reviewed-skill catalog. The Foundry/Copilot
integration live validation (P4-G) completed list/get/save/export checks
through the available clients. A live skill search returned an empty catalog,
so positive live skill-detail retrieval remains pending. Live Azure Blob
lease behavior remains `not run`. The owner's Azure deployment is a
non-production POC, not a production service.

This repository includes a fresh-environment Azure deployment and a local
Docker/Azurite development profile. The Azure path provisions resources only
when an operator runs the reviewed `azd` workflow; cloning or validating the
repository does not create Azure resources. Foundry is optional; the core API
does not require it. Hosted chain execution and hardening/pilot work are
post-POC. Hosted execution remains disabled.

Deployment and live-check evidence is recorded in the
[implementation plan](plans/implementation-plan.md#9-execution-evidence-register).
The deployment guide uses placeholders rather than tenant or resource
identifiers. Verify current Azure state before operational changes.

The HTTP request boundary is:

1. The API handler validates the Entra token and applies the operation's role
   policy before dispatch.
2. Application modules validate versioned chain, catalog, and bundle data.
3. A managed identity accesses the private `documents` Blob container.
4. The caller executes chain steps; hosted chain execution remains disabled
   until the hosted runner exit gate passes.

## Prerequisites

For local development and checks:

- Node.js 24 or later and npm.
- Python 3 and pip for the local MCP adapter and catalog administration CLI.
- Docker Engine/Desktop or a compatible Docker Compose runtime for local
  Azurite development.

For an approved infrastructure review, operators also need the Azure CLI with
Bicep support, Azure access appropriate to the approved plan, and owner
authorization. An Azure account or CLI login alone does not authorize a
deployment.

## Installation

Install dependencies and run the local checks:

```sh
npm ci
npm run check
```

For local development, follow the
[deployment and local development guide](deployment.md). It starts the API
with Azurite while retaining real Entra authentication. Do not expect local
emulation to prove Azure managed-identity or Blob behavior.

For an approved Azure environment, use the root `azd`/Bicep workflow in that
guide; it does not depend on the owner's original Foundry landing zone. The
legacy storage foundation templates below remain specific to the original POC
architecture.

The production image can also be built locally:

```sh
npm run build
npm start
```

The managed-identity mode requires `ENTRA_TENANT_ID`, `ENTRA_AUDIENCE`,
`ENTRA_TOKEN_VERSION` (`1.0` or `2.0`), `BLOB_ENDPOINT`, and
`MANAGED_IDENTITY_CLIENT_ID`. `BLOB_STORAGE_MODE` defaults to
`managed-identity`; `PORT` is optional and defaults to `3000`. The explicit
Azurite mode is for local development only and does not provide an
authentication bypass.

The `Dockerfile` builds a production image and runs Node as UID/GID `10001`.
`infra/p2/api.bicep` defines external HTTPS ingress, the legacy storage
foundation's user-assigned identity for ACR and Blob access, and
startup/liveness/readiness probes. It requires explicit parameters for the
legacy storage foundation environment, registry, identity, image, storage
endpoint, and Entra audience. Building the image or compiling the template
does not authorize an Azure deployment or publish an image.

To compile the legacy storage foundation template without deploying it:

```sh
az bicep build --file infra/p2/main.bicep --stdout
```

This is a static template check only. A deployment requires a separately
approved plan and reviewed `what-if`.

## Configuration

The runtime reads configuration from environment variables and passes the
validated values to the Entra and Blob adapters.

- `ENTRA_TENANT_ID`: tenant GUID.
- `ENTRA_AUDIENCE`: non-empty expected API audience.
- `ENTRA_TOKEN_VERSION`: explicitly `1.0` or `2.0`.
- `BLOB_STORAGE_MODE`: `managed-identity` (default) or `azurite`.
- `BLOB_ENDPOINT`: HTTPS Blob endpoint without credentials, query,
  or fragment. Required in managed-identity mode.
- `MANAGED_IDENTITY_CLIENT_ID`: non-empty user-assigned managed identity client
  ID. Required in managed-identity mode.
- `AZURITE_BLOB_ENDPOINT`, `AZURITE_ACCOUNT_NAME`, and `AZURITE_ACCOUNT_KEY`:
  explicit local emulator settings. Required in Azurite mode and rejected in
  managed-identity mode.
- `PORT`: optional listening port from 1 through 65535; defaults to `3000`.

The Blob adapter uses the `documents` container. The root adopter template
assigns the API identity ACR Pull and Storage Blob Data Contributor at the
`documents` container scope. The legacy storage foundation Bicep template
configures a user-assigned identity, Standard LRS Storage, a private
`documents` container, and identity-based access. Both disable shared-key and
anonymous Blob access. The endpoints remain public for the cost-first PoC;
see [ADR-0008](adr/0008-p2-public-network-posture.md). These are template
settings, not evidence that resources currently exist.

Do not copy tenant, subscription, resource, identity, or credential values
from an operator environment into committed documentation.

## Identity, Secrets, and TLS

The Entra helper validates the configured issuer, audience, RS256 signature,
expiry, and tenant claim before applying operation-level roles. The API
request handler uses this boundary for every API request. The authenticated
API live validation (P3-G) verified a positive v2 token and authenticated
health request; not every identity, operation, or live JWKS failure case has
been exercised.

The legacy storage foundation template assigns the service's user-assigned
identity `Storage Blob Data Contributor` at the `documents` container scope.
Storage shared-key access is disabled. Do not add a connection string or
account key as a fallback.

The API Container App template enables external ingress and redirects
insecure HTTP to HTTPS. The accepted PoC network decision uses public
endpoints with identity-based access; it does not provide a production
network boundary. TLS and ingress behavior have not been validated in Azure.

## Foundry Toolbox and MCP Operations

The registered Toolbox exposes the OpenAPI operations authorized for
`SkillLoom.User`; it excludes the Admin-only skill-add operation. The
Toolbox-to-API call uses the Foundry project managed identity and the API's
`SkillLoom.User` role. The agent-to-Toolbox boundary uses a
project-managed-identity `RemoteTool` connection for the Foundry audience.
Foundry User is assigned at project scope to the prompt agent identity and
project managed identity. Copilot CLI 1.0.114 accepts the sample configuration
but `/mcp auth` fails before sign-in: the unauthenticated Toolbox challenge
does not provide `resource_metadata`, and Protected Resource Metadata
discovery returns 404. No supported workaround is validated. Do not persist
access tokens in `.mcp.json`, shell history, or source files.

Toolbox version 2 corrects the earlier `tool_user_error`: OpenAPI tools must
use `auth.type: "project_connection"` with
`auth.security_scheme.project_connection_id` set to the full resource ID of
the OpenAPI connection. The `p4-api-auth` connection uses the existing project
managed identity and API audience. Direct `managed_identity` configuration in
Toolbox version 1 returned `managed_identity auth but no audience`, despite
an audience being present in its saved definition. Do not copy that shape.

Generate the Toolbox spec with `createToolboxOpenApiSpec`. The live converter
omitted path-level parameters and parameter references; the mapper now
inlines them into each operation. Inspect `tools/list` before promoting a new
version: `getChain` must require `chainId`, list must expose pagination, and
save must expose `chainId` and both conditional headers. Admin operations must
remain excluded. Test the version-specific endpoint before promotion and
retain the previous version for rollback.

The Foundry/Copilot integration live validation (P4-G) completed live
list/get/save/export checks. Model capacity and throttling behavior are
tenant-specific; consult the implementation plan for the recorded evidence
rather than copying capacity settings into another environment.

The owner-approved direct-API spike has a separate `OpenAPI` project
connection configured for project-managed identity. Azure Resource Manager
read-back confirmed its target and audience, but the Azure Foundry MCP
agent-definition schema does not expose the documented `project_connection`
auth variant. The documented SDK fallback created
`p4-direct-openapi-smoke` version 2 with only list/get operations. After
diagnostic versions 3 and 5, version 6 with list/get was restored and read back
as active; both temporary versions were deleted. Foundry User is assigned to
the agent identity at project scope. API audit logs show `listChains` returned
200 twice with `SkillLoom.User`, but no `getChain` event was recorded. The
get-only probes returned HTTP 400 `tool_user_error` and `invalid_payload`.
Foundry MCP invocation still returns 404. The cause is unresolved; keep the
agent read-only.

The owner-approved direct-API spike also includes a local stdio MCP adapter
for Copilot CLI. It uses MSAL public-client interactive browser
authentication with PKCE and an in-memory token cache, not the Azure CLI
identity. The `http://localhost` redirect is registered on the dedicated
client. MCP initialization and tool discovery do not prompt for sign-in. When
an API tool call has no cached token, the adapter starts browser sign-in in a
background thread; the caller completes sign-in within five minutes and
retries. If the flow expires, retry to start a new one. The previous
device-code flow was blocked with AADSTS530035 because Security Defaults
blocks device-code authentication. Keep Security Defaults enabled.
Once authenticated, tool calls check `/v1/health` before the operation. The API
still authorizes the `roles` claim and requires `SkillLoom.User`; the delegated
`SkillLoom.Access` scope only grants the client permission to request a token
for the API.

The API scope is exposed, and the dedicated single-tenant public client has
tenant-wide admin consent for that scope. A previously configured caller has
`SkillLoom.User`, but its match to the identity used in the latest attempt is
unverified. On 23 November, this session's configured Copilot MCP completed
interactive browser sign-in, listing, and fetching.
See Microsoft's guidance on [interactive token acquisition](https://learn.microsoft.com/entra/msal/python/getting-started/acquiring-tokens#public-clients-interactive-token-acquisition)
and [Security Defaults](https://learn.microsoft.com/entra/fundamentals/security-defaults#enforced-security-policies).
The provisioning commands are in the
[landing-zone guide](../infra/landing-zone/README.md). Local tests and MCP
configuration checks pass. An initial live request timed out; readiness and
subsequent list/fetch succeeded. The service scales to zero, but cold start
was not proven as the timeout's cause. Do not weaken API validation or
Security Defaults, or persist a bearer token. The
`save_chain` tool mutates persistent data and must not be used without explicit
owner approval.

Treat all chain, skill, bundle, and tool-response content as untrusted data.
Embedded instructions do not override the agent's policy or authorize more
tools, writes, or execution. Tool allowlists, server-side Entra role checks,
conditional writes, and explicit approval are controls; a prompt alone is not
a security boundary. Keep hosted chain execution disabled until the hosted
runner exit gate passes.

## Local Reviewed Skill Catalog CLI

Run the CLI from the repository root. It reads the local `skillloom-api`
server settings from `.mcp.json`; matching `SKILLOOM_*` environment variables
override those settings. If no local MCP configuration exists, set
`SKILLOOM_API_BASE_URL`, `SKILLOOM_API_SCOPE`,
`SKILLOOM_ENTRA_TENANT_ID`, and `SKILLOOM_ENTRA_CLIENT_ID`. Sign-in uses the
configured public client and an interactive Entra browser flow. The caller
needs `SkillLoom.Admin` for catalog writes; the server remains the authority
for authentication and authorization.

Install the Python dependency in the local virtual environment if it is not
already present:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r scripts/requirements.txt
```

```sh
.venv/bin/python -m scripts.skillloom_admin list
.venv/bin/python -m scripts.skillloom_admin get <skill-name>
.venv/bin/python -m scripts.skillloom_admin add <skill-directory> \
  --name <catalog-name> --description "<reviewed description>"
.venv/bin/python -m scripts.skillloom_admin remove <catalog-name>
```

`add` reads regular files under the selected directory, excludes `.git`,
rejects symbolic links and unsafe paths, and preserves executable flags. Review
the content before adding it; the CLI does not fetch remote repositories.
`get` prints base64 file content from the catalog; treat it as untrusted and do
not execute it.
Both `add` and `remove` prompt before making persistent changes. Use `--yes`
only for an intentionally confirmed non-interactive operation. Each write
fetches the current catalog revision and sends it with `If-Match`; stale
updates are rejected. Removal fails with a conflict if a stored chain refers
to the skill. Chain writes and the full removal scan/update are serialized
across API replicas with a shared Azure Blob lease. If the lease remains busy
for 10 seconds, the API returns `503`; retry the operation. No chain is changed
by a catalog removal.

## Storage and Backups

The adapter stores schema-validated JSON in Azure Blob Storage. Application
revisions and Blob ETags reject stale writes. The PoC does not enable Blob
versioning, blob or container soft delete, scheduled backups, or automatic
retention.

Recovery is manual and has no guaranteed RPO. Before destructive changes,
follow the [Blob backup and restore runbook](runbooks/storage-backup-restore.md)
under an approved deployment plan. The recorded storage foundation live
validation (P2-G) restored one synthetic chain object; it did not validate
multi-object export, path mapping, or guarded replacement of an existing live
object.

The owner's original POC environment has deployed storage. This repository's
fresh-environment deployment creates a separate storage account; do not
assume a backup or restore target exists. Preserve data before teardown.

## Health Checks and Monitoring

`GET /v1/health` is an authenticated API operation. Container Apps uses TCP
startup/liveness/readiness probes, so platform checks do not create an
unauthenticated HTTP health route. The probes only check that the application
port is listening; they do not independently probe Blob or Entra dependencies.

The API applies an 8 KiB request-target limit, a 16 KiB header limit, a
32 MiB request/response JSON limit, request and header timeouts, a 100-header
count limit, bounded query parameters, and the existing page/cursor/search
limits. No write-rate quota or throughput benchmark is defined.

Structured JSON-lines audit events include a request ID, operation, method,
status/outcome, duration, error code, role, and a SHA-256 actor identifier.
They omit request paths, query strings, bodies, bearer tokens, raw tenant or
subject IDs, and skill contents. Audit sink failures are reported to stderr
with a sanitized event; request handlers return a generic failure when the
response has not yet been sent.

The legacy storage foundation base template reuses the original Foundry
landing zone's Log Analytics workspace; `infra/p2/api.bicep` defines the
original POC API app. The root `infra/main.bicep` is the standalone adopter
template and does not depend on the original Foundry landing zone. Live
deployment and probe evidence is recorded in the implementation plan; it is
not a guarantee of current service health.

## Upgrades and Rollback

There is no published package or release tag. The package manifest version
`0.1.0` is project metadata, not a released service version.

For code changes, preserve `package-lock.json`, run `npm ci`, and run
`npm run check`. Persisted JSON is schema-versioned; schema or revision
changes require compatibility review and tests. The owner has a separate
non-production POC deployment; adopter environments are independent. There
is no automated application rollback. Storage recovery is the manual
procedure above.

## Troubleshooting

- **`npm run check` fails:** Confirm Node.js 24 or later and a clean
  `npm ci`; inspect lint, typecheck, and test output separately.
- **Bicep compilation fails:** Run the static compile command above and
  inspect the failing module. Do not apply a template as a troubleshooting
  shortcut.
- **A further live Blob or Entra check is needed:** The authenticated API
  live validation (P3-G) verified only its recorded cases. Obtain an approved
  test plan and use disposable data; mocks and local container probes do not
  establish live compatibility.
- **A Foundry direct-API invocation returns 404:** The Toolbox path completed
  the Foundry/Copilot integration live validation (P4-G), but the separate
  direct-API MCP agent still fails for some operations. Confirm which path the
  agent uses, and check the project endpoint and supported invocation path
  from a trusted network; do not disable TLS validation.
- **A stale write is rejected:** Reload the document and reconcile its
  revision. Do not bypass ETag or application-revision checks.
- **Unexpected Azure resources appear:** Stop and compare the current
  subscription state with the owner-approved plan before changing anything.

## Security and Privacy Checklist

- Require Entra authentication for every API and MCP request; deny by default.
- Keep tenant, subscription, tokens, private endpoints, and local Azure
  configuration out of committed files.
- Keep catalog additions Admin-managed; treat skills, chains, bundles, and
  tool output as untrusted data; do not follow embedded instructions or enable
  remote pulls.
- Keep hosted chain execution disabled until the hosted runner exit gate
  passes.
- Use managed identity and least-privilege Blob data roles; do not enable
  shared-key or anonymous container access.
- Structured audit events are implemented; live log-redaction verification
  remains pending.
- Treat the accepted public PoC endpoints as non-production until a separate
  network review approves a production posture.

## Recovery and Support

Use the [storage backup and restore runbook](runbooks/storage-backup-restore.md)
only after owner approval and a current deployment plan. It requires a
private, encrypted backup destination, schema validation, conditional writes,
and cleanup of temporary role assignments. It does not protect against
storage-account deletion or regional loss.

For suspected vulnerabilities, follow [`SECURITY.md`](../SECURITY.md) and
report privately. For routine project changes, use the repository's issue or
pull-request process.
