# Azure-hosted Skill Loom (`skill-loom-foundry`): implementation plan

**Current status:** The POC's P0/P1, P2A-G, P2-G, P3-G, and P4-G gates have
passed (P4-G: E-128 and E-161). The POC implementation exposes
Entra-protected chain and reviewed-skill discovery, chain transfer, and
Admin-managed catalog changes.
P4-C10 positive live skill-detail retrieval remains pending because the live
catalog was empty; live Azure lease behavior remains `not run`. P5 is deferred
and P6 is not started. Both are post-POC adoption work; hosted execution stays
disabled until P5-G passes. The former non-production POC deployment has
been decommissioned after its stored chain data was backed up (E-184). A
standalone adopter deployment and local Azurite profile are implemented; the
new paths have not provisioned Azure resources.
Static and local verification passed, but no live Azure deployment or
authenticated local API request was performed. The current public-candidate
scan and isolated rewritten-history scan each report only the known Azure
Key Vault built-in role-definition GUID false positive. Targeted historical
documentation checks found no owner-specific amounts, expiry details, concrete
tenant/subscription identifiers, or generated resource names in the audited
files; generic tenant terminology remains. The three sanitized branch heads
have been pushed, but GitHub's read-only merged pull-request refs #2 and #3
still retain older history with owner-specific budget/expiry details and Azure
resource names. The owner selected a new public snapshot repository,
`McFuzzySquirrel/skill-loom-azure`, with a fresh root commit and no imported
history or PR refs. The new repository has been created privately for final
snapshot verification. Its audited fresh-root snapshot is public, with the
remote default branch and refs verified. The original repository remains
private because its merged PR refs retain older history.

**Status details:** Execution underway (P0/P1 complete; P2A-C1, C4-C7, and C8-C11
passed; P2A-G and P2-G passed; P3-C1 passed with local contract tests;
P3-C2 passed local operation-policy tests; P3-C3 passed local Blob-adapter
tests; P3-C4 passed local skill-catalog tests; P3-C5 passed local API tests;
P3-C6 implementation, P2 foundation/API deployments, and live probe/auth
rejection checks passed (E-059 to E-065). The first API deployment failed on an
ARM64 image and was corrected. In P3-G, unauthenticated and wrong-audience
requests returned 401; the initial v1 test-client token was not sent
(E-066–E-068). The approved v2 configuration was validated and deployed.
Positive authentication, live RBAC, Blob create/read, stale-revision,
traversal, and oversize checks passed (E-069–E-074). Per owner decision, one
unique test record remains in Blob Storage. C2 has an accepted
PoC-only exception; C3 offer and budget are recorded but the upgrade decision
remains open). The Basic
landing zone was deployed, torn down after P2A-G
passed, and re-provisioned for P2 validation. The subscription budget and
tenant-scoped API registration remain.
The normal caller has a verified Foundry User assignment at project scope, and
the current Foundry project identity has `SkillLoom.User`. The disposable Blob
test account was deleted after its live spike. Break-glass accounts are not
configured; production use remains out of scope until the gap is resolved.
The 32 MiB application-level serialized-object cap is enforced by document
schemas; P2-C2/C3 decisions are recorded, and the temporary Bicep foundation
was deployed, restore-tested, and torn down (E-050–E-053). P2-C4 live results
support Blob, and the owner selected Azure Blob Storage as the final PoC
backend (E-047). The
decision and supporting evidence are in
[`p2-c4-storage-backend-research.md`](p2-c4-storage-backend-research.md).
The owner authorized and approved the temporary P2-G deployment plan.
Validation passed (E-050); detailed what-if proposes 10 P2 resources and
ignores the five existing P2A resources. Deployment and the disposable Blob
restore passed (E-051). Scoped teardown initially stalled because the
Container Apps environment remained `ScheduledForDelete`; a follow-up ARM
delete completed teardown (E-053). Final inventory contains only P2A
resources, and the budget and API registration remain intact.
P4-C4 has a registered Toolbox, project-managed-identity connection, and
read-only Toolbox smoke agent, but its invocation and chain list/fetch remain
unverified. Direct OpenAPI agent version 6 has only list/get tools. Its API
audit logs show `listChains` succeeded twice as `SkillLoom.User`, while
`getChain` was not logged and a get-only probe returned `tool_user_error`.
Foundry User is assigned to its runtime identity at project scope; the MCP
helper still returns 404, and a get-only parameter-placement probe returned
`invalid_payload` without a chain API event (E-094–E-097). The active
prompt agent has a stable endpoint, but its metadata GET succeeds while a POST
to the documented Responses endpoint returns 404
`Subdomain does not map to a resource` (E-089). The Copilot CLI configuration
sample is documented, but the CLI reports `needs-auth`; Copilot CLI 1.0.114
reproduces a pre-sign-in OAuth metadata discovery failure. The Toolbox
challenge omits `resource_metadata`, and its Protected Resource Metadata
endpoints return 404 (E-085, E-087–E-088). The owner approved a reversible
direct-API spike: Foundry OpenAPI tools and a local Copilot CLI stdio adapter
will bypass the Foundry Toolbox (E-090). The adapter passes mocked protocol
and API checks, but the current Azure CLI identity cannot acquire an API token;
no live Copilot chain operation has run. The project-managed-identity
OpenAPI connection is registered, and direct agent version 6 is active. Its
list operation succeeded twice, but get/fetch still fails before an API audit
event; MCP invocation returned 404 (E-091–E-097). The owner-approved Foundry
User assignment is confirmed at project scope (E-094). The owner selected a
dedicated single-tenant public client using device-code authentication, with
no client secret. The MSAL adapter passes focused local tests, but live
sign-in now reaches Entra and returns AADSTS530035 (`BlockedBySecurityDefaults`).
Microsoft documents that Security Defaults blocks device-code flow. No token,
API request, or chain result is confirmed. The `SkillLoom.Access` delegated
scope is applied; the
single-tenant public client and its admin consent are configured and read
back. A previously configured caller's `SkillLoom.User` assignment is also
read back, but its match to the identity used in this attempt is unverified.
The workspace MCP configuration is recognized by Copilot CLI, and a local
initialize/tools-list handshake advertises four User-scoped tools. Live
`list_chains` returned `MCP transport closed before the tool responded`; no
live API result is confirmed. Interactive `/mcp list` and `/mcp get` now report
the server failed with `MCP connection closed unexpectedly`, with tools
unavailable. The owner reloaded all MCP servers and Copilot reported six
connected, but a subsequent `list_chains` call still closed its transport
before responding. The owner reports no device-code prompt was shown
(E-098–E-111), and the server still reported connected after the failed call
(E-112); the cause remains unknown. Owner-approved temporary request/auth/API
diagnostic markers are in the local adapter; six focused tests and compilation
pass. In the owner's follow-up, no markers or device prompt were observed and
the server remained connected; the list call then reported `MCP error -32001:
Request timed out` on both attempts, including `limit: 10` (E-113–E-118).
The provided client trace shows a 180-second invoke-stage timeout and
cancellation cleanup (E-119). The local debug archive confirms two invoke
timeouts, but its process log contains no adapter markers (E-120).
The owner initially selected a nonblocking, two-step device-code flow that
preserved the dedicated public client and in-memory token cache (E-121). It
was implemented to return instructions promptly while MSAL polled in a
background thread (E-122). The live attempt returned AADSTS530035
(`BlockedBySecurityDefaults`), which Microsoft identifies as Security Defaults
blocking device-code flow (E-124). No token, API response, or chain list is
confirmed at that stage. The owner approved switching to interactive browser
authentication with PKCE. The adapter now uses that flow, and the public
client's `http://localhost` redirect was registered and read back. In a
separate session, the owner subsequently reports `list_chains(limit=10)`
returned one chain (E-126). This was one live list result. The current session
verified Copilot-side list, save, get, and export through the available
`skillloom-api` MCP (E-128); the local stdio adapter and Foundry invocation
remain open. Temporary debug markers have been removed.
A subsequent live list attempt after browser sign-in timed out; a targeted get
returned `example-feature-planning` at revision 1. The enabled full-smoke
Foundry agent's version 2 invocation returned HTTP 400 `tool_user_error`.
No Foundry save/export result is confirmed (E-140).
Follow-up API audit showed the Foundry run completed list/get, then save failed
with HTTP 400 `invalid_request`; no export request was recorded. A later get
confirmed the tested chain remains at revision 1 (E-141).
The owner-approved version 3 smoke agent also completed list/get, but its save
failed with HTTP 422 `invalid_document`; no export request was recorded. Its
tool call included `If-Match: "\"1\""` and an empty `If-None-Match` value.
A subsequent get confirmed the tested chain remains at revision 1 (E-142).
The separate Portal storage denial is for
the owner's user identity and does not establish an API managed-identity
failure (E-116).
On 23 November, the Toolbox returned a precise managed-identity configuration
error. Toolbox version 2 uses an OpenAPI project connection and inline
operation parameters; direct Toolbox health/list/fetch and Copilot list/fetch
now pass. A streamed Foundry response completed listing but then hit the
model rate limit (E-137). With renewed owner approval, capacity was temporarily
raised to 10; the Foundry agent completed list/fetch and the overall response.
Capacity 1 and the original deployment settings were restored and verified
(E-138). The owner subsequently approved keeping capacity at 10; the live
deployment and unchanged model/policies were verified (E-139). P4-C4 is
complete.
Three generic instruction-only chain examples are now in `examples/chains/`
and pass the v3 schema tests. The available `skillloom-api` MCP completed live
list, create, get, and export operations and persisted all three owner-approved
examples (E-128). A later local stdio adapter retry completed interactive auth
and returned a live list result (E-134). The Foundry v4 smoke later completed
list/get/save/export; all four API audit operations returned HTTP 200, and a
post-save read confirmed revision 2 (E-161). Together with the Copilot-side
operations in E-128, this passes P4-G. Unauthorized-identity denial remains
`not run`, as permitted by the exit gate. P4-C6/C7 untrusted-output and client
documentation are complete to their documentation-only boundaries (E-083–E-084).
Moved here from `skill-loom` PR #35. The target repository was created empty
by the owner after tool-based creation failed with `403`. See
[Execution evidence](#9-execution-evidence-register) entries E-001 and E-002.
Q-1 to Q-9 are answered or explicitly deferred (section 1.2).

**Purpose:** Plan a separate project that hosts Skill Loom chains on Azure so
Foundry agents and Copilot CLI/SDK agents can build, pull, and run chains
through an authenticated API and MCP tool layer.

**Evidence rule:** A phase is not complete until its exit gate is backed by a
register entry. Mark unrun checks `not run`; do not infer a live result from a
unit or contract test.

**Sub-agent rule:** Sub-agent opportunities below are proposals. One bounded
research task for P2-C4 completed; its source-backed note is recorded in E-031.
The live storage spike has not run.

## 1. Confirmed decisions and open questions

### 1.1 Confirmed by the requester

| ID | Decision |
| --- | --- |
| D-1 | Separate repository `McFuzzySquirrel/skill-loom-foundry`, initially private; the owner intends public release after a full content/history audit and final visibility confirmation. |
| D-2 | Build **both** a container host and an MCP/API tool layer. |
| D-3 | Primary clients: Foundry Agent Service (MCP or OpenAPI tool) and Copilot CLI/SDK agents (MCP), treated equally. |
| D-4 | Compute: Azure Container Apps, with Container Apps Jobs for runs. |
| D-5 | v1 tenancy: single tenant, one shared workspace. |
| D-6 | Phased execution: **serve** chains first (the calling agent executes steps in its own session); a **hosted runner** that drives a harness CLI comes later. |
| D-7 | Reuse (supersedes the earlier "published package consumed by both repos"): the cloud repo **owns its schemas as an internal module**, with no published package. Skill Loom keeps its own schemas. Compatibility is enforced only at the exported chain/bundle interchange format via pinned golden fixtures from Skill Loom. |
| D-8 | The hosted catalog is **host-managed only**; an **admin role** can add new skills (reviewed, not anonymous). No remote-repository pulls in v1. |
| D-9 | Auth: Entra ID app registration with app roles. Callers are managed identities (Foundry project, Copilot host) and user tokens. |
| D-10 | Runner harness: Copilot CLI first, OpenCode later. |
| D-11 | Dev/PoC environment: use free or lowest-cost Azure services where possible; subscription, region, naming, and cost ceiling are chosen at execution time. |
| D-12 | The original POC target was a **brand-new free tenant** with nothing pre-provisioned, using P2A before P2. For adopters, the core API must deploy to a fresh user-selected Azure environment without P2A; the Foundry landing zone is optional. |
| D-13 | Public adopter path: guided `azd`/Bicep deployment to Azure plus a Docker/Azurite local profile. Entra tenant registration, consent, and role assignment stay explicit operator actions; local API requests still require real Entra authentication. Foundry is optional. |
| D-14 | Classify P5 hosted execution and P6 hardening/pilot/release as post-POC. Keep hosted execution disabled until P5-G passes. |
| D-15 | Publish the audited source snapshot as `McFuzzySquirrel/skill-loom-azure` with a fresh root commit, not inherited history, branches, tags, or pull requests. Keep `McFuzzySquirrel/skill-loom-foundry` private because its read-only merged PR refs retain older data. |

### 1.2 Open questions (status)

| ID | Question | Status | Blocks | Owner |
| --- | --- | --- | --- | --- |
| Q-1 | Repo creation credential | **Resolved**: owner created the empty private repo | P0 | — |
| Q-2 | Shared package registry | **Closed**: no published package (D-7) | none | — |
| Q-3 | Entra tenant, app registration, caller identities | **Partly resolved** (D-9). The single-tenant API registration is owned and its app roles are configured; the normal caller has Foundry User at project scope (E-029). Break-glass access remains unconfigured under the PoC-only exception (E-017). | P2A | Project owner (@McFuzzySquirrel) |
| Q-4 | Storage backend (Azure Files, Blob, or both) | **Resolved: Azure Blob Storage only** (owner decision, E-047). Owner confirms no filesystem mount is needed, prefers a cost-first PoC, and sets a 32 MiB maximum serialized-object size. B1-B7 and X1 passed against a disposable Blob account; B8 lease-ID checks passed but expiry/renewal were not run. B9 managed-identity hosting and B10 application retry/idempotency remain deferred. Throughput benchmarking is skipped without a write-rate target; manual-only backup/restore remains the policy (P2-C5). The test account was deleted after the spike (E-044, E-045). | P2 | Project owner (@McFuzzySquirrel) |
| Q-5 | Foundry tool registration surface | **Resolved (E-076):** owner selected a Foundry Toolbox. E-075 records the alternatives and remote transport requirements. | P4 | Project owner (@McFuzzySquirrel) |
| Q-6 | Skill sources | **Resolved** (D-8). Admin-only reviewed-skill add/remove workflows are implemented (P4-C9); live search succeeded, but positive detail retrieval remains pending P4-C10 because the catalog was empty (E-166–E-167). | none | Project owner |
| Q-7 | Runner harness and credentials | Harness **resolved** (D-10). The owner keeps their personal account local and has deferred hosted execution; P5 credential and runner-design work is deferred until reauthorized (E-162–E-164). | P5 | Project owner (@McFuzzySquirrel) |
| Q-8 | Subscription, region, naming, cost ceiling | **Deferred to execution** (D-11); decided in P2A against free-offer limits | P2A | Project owner (@McFuzzySquirrel) |
| Q-9 | Skill Loom adopts the package | **Resolved**: no (D-7) | none | — |

## 2. Codebase grounding (verified in `McFuzzySquirrel/skill-loom`)

| Concern | Where it lives | Implication for the new project |
| --- | --- | --- |
| Loopback-only, single-user server | [ADR-0001](https://github.com/McFuzzySquirrel/skill-loom/blob/main/docs/adr/0001-loopback-only-single-user-server.md), `src/server/app.ts` | The server must not be exposed. The cloud service is a new service, not a reconfiguration. |
| Remote access via SSH-backed Podman | [ADR-0033](https://github.com/McFuzzySquirrel/skill-loom/blob/main/docs/adr/0033-podman-ssh-remote-clients.md), [ADR-0035](https://github.com/McFuzzySquirrel/skill-loom/blob/main/docs/adr/0035-persistent-rootless-podman-host.md) | Existing remote model is host-account access, not authentication. Azure needs real Entra auth and must not claim to replace those ADRs. |
| Shared schemas | `src/shared/chain.ts`, `bundles.ts`, `api.ts`, `remote-catalog.ts`, `project-run-records.ts` | Candidates to copy into the cloud repo's internal module (D-7). |
| Portable bundle and run logic | `src/portable/bundle.ts`, `runtime.ts`, `run-schema.ts`, `cli.ts` | Likely reuse for "serve" mode. |
| Persistence | [ADR-0005](https://github.com/McFuzzySquirrel/skill-loom/blob/main/docs/adr/0005-atomic-versioned-json-persistence.md), `src/server/config`, `src/server/chains`, `src/server/runs/store.ts` | Same versioned, atomic-replace rules apply; Azure Files semantics must be verified (Phase 2). |
| Harness adapters and spawn rules | `src/server/harness/*`, [ADR-0002](https://github.com/McFuzzySquirrel/skill-loom/blob/main/docs/adr/0002-harness-capability-descriptors.md), [ADR-0011](https://github.com/McFuzzySquirrel/skill-loom/blob/main/docs/adr/0011-shell-free-process-and-pty-transport.md) | Runner must spawn executable plus argument array; no shell strings. |
| Run model | `src/server/runs/*`, [ADR-0004](https://github.com/McFuzzySquirrel/skill-loom/blob/main/docs/adr/0004-frozen-run-snapshots-and-bounded-tails.md), [ADR-0006](https://github.com/McFuzzySquirrel/skill-loom/blob/main/docs/adr/0006-single-active-run-and-interrupt-recovery.md), [ADR-0007](https://github.com/McFuzzySquirrel/skill-loom/blob/main/docs/adr/0007-explicit-advancement-signals.md) | Single active run, snapshots, and advancement signals must be re-decided for concurrent job runs. |
| Skill semantics | [ADR-0003](https://github.com/McFuzzySquirrel/skill-loom/blob/main/docs/adr/0003-model-invoked-skill-prompts.md) | Chain order is prompt order; the hosted layer must not promise a skill is loaded. |
| Catalog and install review | `src/server/catalog/*`, [ADR-0029](https://github.com/McFuzzySquirrel/skill-loom/blob/main/docs/adr/0029-catalog-resolved-global-skill-reuse.md), [ADR-0031](https://github.com/McFuzzySquirrel/skill-loom/blob/main/docs/adr/0031-reviewed-skill-installation.md), [ADR-0015](https://github.com/McFuzzySquirrel/skill-loom/blob/main/docs/adr/0015-pinned-remote-skill-snapshots.md) | Reviewed install and pinned snapshots are the model for any remote skill pull. |
| Existing container image | `Containerfile` (Node 24, non-root, loopback) | Reference only; the Azure image needs a different bind policy. |
| Docs/ADR gates | `AGENTS.md`, `npm run check`, `docs/adr/README.md` | New repo should adopt equivalent gates. |

## 3. Phase map and dependencies

| Phase | Name | Depends on | Primary output |
| --- | --- | --- | --- |
| P0 | Repository bootstrap and decisions | none | Initialized repo, governance, ADR set |
| P1 | Internal schema module and interchange compatibility | P0 | Internal schemas, pinned-fixture contract tests |
| P2A | Optional Foundry landing zone | P0 | Foundry resource/project, RBAC, identities, smoke agent |
| P2 | Azure foundation and storage (original POC environment) | P0, P2A for the original Foundry-integrated PoC | IaC, identity, storage, logging, pilot environment |
| P3 | Authenticated API (serve mode) | P1, P2 | Entra-protected API for chains, skills, bundles |
| P4 | MCP server and Foundry/Copilot integration | P3 | MCP tools, Foundry registration, Copilot config |
| P5 | Hosted runner (Jobs; post-POC) | P3, P4 | Isolated run execution with run records |
| P6 | Hardening, pilot rollout, release (post-POC) | P4, P5 | Threat model, pilot evidence, release notes |

P1 and P2A may proceed in parallel after P0; the original POC's P2 deployment
followed P2A. P2A is not a prerequisite for the fresh-environment adopter path
tracked in Section 11. P4 can begin once P3 has a stable OpenAPI contract. P5
is deferred until serve mode (P3/P4) passes its gates (D-6), and remains
post-POC under D-14.

Per owner decision E-030, non-destructive P2 planning may proceed while P2A-C11
is deferred; P2 deployment remains blocked until P2A-G is resolved.

## 4. Phases

Conventions: checklist items carry IDs (`P1-C2`) for traceability to exit gates
(`P1-G`) and acceptance criteria (section 5).

### P0: Repository bootstrap and decisions

**Goal:** Establish the new private repo and the decisions that later phases
depend on.

#### P0 checklist

- [x] P0-C1: Verify the owner-created empty private repo
      `McFuzzySquirrel/skill-loom-foundry`; enable default branch protection
      where available, or record the owner's exception before pushing the
      initial skeleton.
- [x] P0-C2: Add `AGENTS.md` invariants (auth required, no shell-string
      spawning, versioned atomic JSON, harness trust rules).
- [x] P0-C3: Add README, LICENSE, CHANGELOG (`[Unreleased]`), SECURITY, and
      `docs/adr/` with README index.
- [x] P0-C4: Write ADRs: hosting model, authentication, run isolation, schema
      ownership and interchange compatibility (D-7), relationship to Skill Loom
      ADR-0001/0033/0035 (state which are not inherited).
- [x] P0-C5: Add CI skeleton (lint, typecheck, test, docs check) and PR template.
- [x] P0-C6: Assign owners and phases for the deferred items in section 1.2
      (Q-3, Q-4, Q-5, Q-7, Q-8).

**Exit gate P0-G:** Repo exists and is private; CI runs green on an empty
skeleton; ADRs accepted; deferred questions in section 1.2 have owners and
target phases.

**Sub-agent opportunities (proposed, not started):** one `explore` agent to
inventory reusable modules and their dependency edges in `skill-loom`; one
`rubber-duck` agent to review ADR drafts against the invariants.

### P1: Internal schema module and interchange compatibility

**Goal:** The cloud repo owns an internal schema module (chain, bundle, run
record, catalog) and stays compatible with Skill Loom only at the exported
chain/bundle format (D-7). `skill-loom` is not changed.

#### P1 checklist

- [x] P1-C1: Inventory candidates in `src/shared/*` and `src/portable/*` in
      `skill-loom`; list non-portable dependencies (Fastify, node-pty,
      filesystem); record the source commit copied from.
- [x] P1-C2: Copy and adapt pure Zod schemas and types into the cloud repo with
      no server, PTY, or filesystem imports; keep persisted `version` fields
      unchanged unless a cloud-specific ADR changes them.
- [x] P1-C3: Pin golden fixtures (exported bundles and chains) from Skill Loom
      at a recorded commit; add contract tests that import them and round-trip
      export.
- [x] P1-C4: Document the compatibility policy: which format versions are
      supported, and the process to refresh fixtures when Skill Loom changes its
      interchange format.

**Exit gate P1-G:** Pinned fixtures import and re-export in the cloud repo's
tests; module has no server/PTY/filesystem imports; source commit and policy
documented. No change is made in `skill-loom`.

**Sub-agent opportunities:** `explore` for the import-graph inventory;
`general-purpose` for the copy-and-adapt work in a branch of the cloud repo;
`code-review` on the diff for persisted-format drift.

### P2A: Landing zone bootstrap (new tenant)

**Goal:** Take a brand-new free tenant to a usable Azure and Foundry landing
zone (D-12), following the [Learn
guide](https://learn.microsoft.com/azure/foundry/agents/environment-setup). The
plan was drafted from a mirror and official samples while Learn was unavailable.
P2A-C1 re-verified the live page on 2026-11-18 (page date 2026-08-21; updated
2026-08-26); the role names and deployment guidance have changed.

**Setup options (guide and samples):**

| Option | What it is | PoC fit |
| --- | --- | --- |
| Basic (current template name to verify in C6) | Foundry resource, project, model deployment; platform-managed agent storage | **Chosen for the PoC.** Lowest provisioning cost; no BYO Cosmos DB, Storage, or Foundry IQ. |
| Standard (current template name to verify in C6) | Adds BYO Azure Storage, Cosmos DB, and Foundry IQ (Azure AI Search) | Not for the PoC; adds resource and RBAC costs. Revisit for production data ownership. |
| Standard with private network | Standard plus BYO virtual network for secured outbound traffic | Out of scope for the PoC; production option. Inbound private endpoints can apply to all setups. |

Bicep samples are also available in Terraform. The live Learn page no longer
names the `40-basic-agent-setup`, `41-standard-agent-setup`, or
`15-private-network-standard-agent-setup` templates from the draft. Verify
current sample paths and deployment steps in C6 before using them.

#### P2A checklist

- [x] P2A-C1: Re-verify this phase against the live environment-setup doc;
      record page date and any deltas (R-12). Choose the setup option from the
      table above: Basic by default; Standard or private network only via ADR.
- [ ] P2A-C2: Tenant and account: confirm tenant, a named admin plus break-glass
      account, MFA or security defaults, and that the account may create app
      registrations (needed for D-9). Tenant readiness, owner role, MFA, and
      app-registration permission are user-confirmed. A normal caller and an
      administrator were added; only the normal caller's Foundry role was
      verified. Break-glass accounts are not configured; this is a PoC-only
      exception. Do not use this environment for production until break-glass
      access is provisioned and verified (E-017, E-028).
- [ ] P2A-C3: Subscription: owner-reported trial status and an advisory
      subscription cost budget with notifications. Amounts, credit balance,
      and expiry details are omitted from this public plan. Budget alerts do
      not cap spending; confirm the current subscription terms before use.
- [x] P2A-C4: Verify provider requirements against the pinned Basic template and
      register those needed for it and the planned P2 infrastructure.
      `Microsoft.CognitiveServices`, `Microsoft.App`,
      `Microsoft.ContainerRegistry`, `Microsoft.KeyVault`,
      `Microsoft.OperationalInsights`, `Microsoft.Storage`,
      `Microsoft.ManagedIdentity`, `Microsoft.Insights`,
      `Microsoft.Authorization`, and `Microsoft.Resources` are registered.
      `Microsoft.Search` and `Microsoft.DocumentDB` remain unregistered because
      the Basic setup does not use them.
- [x] P2A-C5: Region and quota: East US is the only region confirmed for both
      the selected model and Container Apps. The user chose `gpt-4.1-mini`,
      version `2025-04-14`, `GlobalStandard`, capacity 1, in East US; its model
      quota limit is 200 in East US and East US 2. East US has a
      `ManagedEnvironmentCount` limit of 1, usage 0. East US 2 is a model-quota
      fallback candidate, but its Container Apps quota was not returned; recheck
      before using it as a combined fallback. `gpt-4.1` GlobalStandard quota is
      0 in both regions.
- [x] P2A-C6: The pinned Basic template created a Foundry account and project,
      a GPT-4.1-mini GlobalStandard deployment, Application Insights,
      and Log Analytics in the selected region. Hosted agents, capability
      host, ACR, Storage, and Search were not provisioned. The account has
      public network access enabled and local authentication disabled.
- [x] P2A-C7: The bootstrap deployer is the subscription Owner and has a
      verified Foundry User assignment at project scope. The separate daily-use
      identity has a verified Foundry User assignment at project
      scope; its broader account-level assignment was removed after the project
      assignment was confirmed (E-029). No Role Based Access Control
      Administrator is needed for Basic.
- [x] P2A-C8: The single-tenant `skill-loom-foundry-api` registration defines
      `SkillLoom.User` for normal API/MCP operations and `SkillLoom.Admin` for
      normal operations plus reviewed catalog additions. The Foundry project's
      system-assigned identity is assigned `SkillLoom.User`. `SkillLoom.Admin`
      remains unassigned until the P3 admin workflow is implemented; the Copilot
      host identity will be added in P2. No client secret or certificate was
      created.
- [x] P2A-C9: The pinned Basic Bicep template is under `infra/landing-zone/` and
      deployed. ADR-0006 and the repeatable runbook are recorded there; tenant
      and subscription creation are the only portal setup steps. P2-C2 modules
      deploy into this landing zone.
- [x] P2A-C10: Created prompt agent `p2a-entra-smoke` and invoked it once
      against GPT-4.1-mini. The Foundry endpoint reported Entra authorization
      and the resource has local authentication disabled; the response was `P2A
      smoke check succeeded.` No API key was used.
- [x] P2A-C11: Teardown and reset: after the owner's 2026-11-20 confirmation,
      `azd down` deleted the tagged resource group and the soft-deleted Foundry
      account was purged. No Key Vault was in the resource group or the
      soft-deleted list. The API registration and subscription budget remain
      (E-042). The old project-identity assignment was absent after teardown;
      the new project identity's assignment was restored after reprovisioning
      (E-043). This supersedes the earlier deferment in E-030.

#### P2A RBAC matrix

| Principal | Scope | Role | Status |
| --- | --- | --- | --- |
| Bootstrap deployer | Subscription/project | Owner; Foundry User | Owner is user-reported; project Foundry User assignment verified (E-017, E-024) |
| Normal caller | Foundry project | Foundry User | Verified; broader account-level assignment was removed (E-029) |
| Foundry project system identity | `skill-loom-foundry-api` app | `SkillLoom.User` | Current identity assigned for normal API/MCP operations; the old assignment was deleted at teardown and restored after reprovisioning (E-027, E-042, E-043) |
| Administrator | Not verified | Not reported | No role assignment was reported (E-028) |
| Break-glass identity | — | — | Not configured; accepted PoC-only exception, not approved for production (E-017) |
| Any principal | `skill-loom-foundry-api` app | `SkillLoom.Admin` | Unassigned until the P3 admin workflow is implemented (E-027) |

**Exit gate P2A-G:** Passed. The landing zone was provisioned from the pinned
runbook; the smoke agent succeeded with Entra auth; RBAC, quota, and free-offer
limits are documented; teardown and purge were verified. P2A-C2 remains only the
recorded PoC exception in E-017; this does not authorize production use. E-042
records the gate completion and supersedes the earlier not-run placeholder
E-011. The landing zone was subsequently re-provisioned for P2 validation
(E-043).

**Sub-agent opportunities (proposed, not started):** `task` for provider and
quota checks; `security-review` on RBAC and identity; `general-purpose` for the
Bicep and runbook.

### P2: Azure foundation and storage

**Goal:** Reproducible Azure environment and storage semantics.

#### P2 checklist

- [x] P2-C1: Confirm P2A outputs (Q-3, Q-8) and decide Q-4 (via P2-C4); free or
      lowest-cost services first (D-11). P2A outputs were verified after
      reprovisioning (E-043), and the owner selected Blob as the final PoC
      backend (E-047).
- [x] P2-C2: Bicep for the Container Apps environment, Basic registry,
  user-assigned service identity, Key Vault, and Standard_LRS Blob storage;
  reuse the P2A Log Analytics workspace. ADR-0007 and
  [`infra/p2/`](../../infra/p2/) record the design. Initial compilation was
  static only (E-037, E-038); P2-G validation, deployment, and teardown later
  passed (E-050–E-053).
- [x] P2-C3: Owner chose public HTTPS ingress for the future API with
  mandatory Entra validation, and public Storage/Key Vault endpoints with
  Entra/RBAC access and no private endpoints for the cost-first PoC. Defer
  hosted-runner egress allow-listing to P5-C3. Recorded in ADR-0007; the
  P2-G temporary infrastructure deployment included no API or hosted chain
  runner (E-037, E-051).
- [x] P2-C4: Microsoft Learn review is recorded in
  [`p2-c4-storage-backend-research.md`](p2-c4-storage-backend-research.md)
  (E-031). With no filesystem-mount requirement, the owner selected Blob as
  the final PoC backend (E-047);
  B1-B7 and X1 passed with `@azure/storage-blob` 12.34.0 against a disposable
  Standard LRS account. B8 lease-ID enforcement passed, but lease expiry and
  renewal were not tested. B9 (managed identity) and B10 (application retry
  and idempotency) remain not run because their host and persistence logic do
  not exist yet; `upload()` and `syncUploadFromURL` were not tested. The exact
  32 MiB serialized-JSON boundary, ETag conditional writes, concurrency,
  read-back consistency, and schema validation were exercised (E-044). B7
  confirmed versioning, blob/container soft delete, and lifecycle policy are
  disabled or absent. The account was deleted after the spike (E-045).
  Run-record summaries also have per-summary, reason, attempt-count, and
  step-count bounds (E-036); API request-body limits must still be enforced
  before parsing in P3-C5. The owner has not set a write-rate target, so
  throughput benchmarking remains skipped; manual-only backup/restore with
  no automatic retention is documented in P2-C5. P2-C4 is complete with the
  B8 expiry/renewal limitation and the agreed B9/B10 deferrals recorded;
  the later P2-G IaC deployment, disposable-data restore, and teardown passed
  (E-051, E-053).
- [x] P2-C5: Document the manual-only backup/restore policy in
  [`storage-backup-restore.md`](../runbooks/storage-backup-restore.md). There
  is no scheduled backup or automatic retention; exports are kept until the
  operation and restore are verified. Restores require schema validation and
  ETag conditions, and must preserve application revision rules. Live restore
  was not run when the policy was recorded (E-039); the disposable P2-G
  restore later passed with synthetic data (E-051).
- [x] P2-C6: The subscription has an owner-configured advisory cost budget
  with notifications (E-021). It is not a spending cap; current terms and
  budget settings must be confirmed by each adopter.

**Exit gate P2-G: passed (E-051, E-053).** The environment deployed from IaC
into the P2A landing zone and was torn down without removing P2A resources;
storage spike evidence is recorded, and restore was tested on disposable
synthetic data.

**Sub-agent opportunities:** `general-purpose` to author IaC modules; `task` to
run `what-if`/lint validations; `security-review` on identity and network
configuration.

### P3: Authenticated API (serve mode)

**Goal:** HTTP API exposing chain, skill, and bundle operations to authorized
callers; the calling agent executes steps.

#### P3 checklist

- [x] P3-C1: Define the OpenAPI contract in
  [`docs/openapi.json`](../openapi.json): list/get/save chains, bundle export,
  catalog search and review, admin-only reviewed skill addition (D-8), and
  authenticated health. It mirrors the P1 chain, bundle, and catalog schemas;
  chain and catalog writes require conditional revision headers. Local
  contract tests pass; no API implementation or live auth check is implied.
- [x] P3-C2: Add tenant-bound Entra token verification and deny-by-default
  app-role authorization in `src/auth/entra.ts`. `authenticateApiRequest`
  maps every OpenAPI operation to its role gate and authenticates before
  resolving unknown routes; operation coverage and generated-key validation
  tests pass (E-055). No live Entra/JWKS check has run; deployed negative
  cases remain in P3-G.
- [x] P3-C3: Implement versioned Blob persistence following the P2-C4 backend
  decision and P2-C5 recovery policy. Chain blobs use SHA-256 names and
  versioned envelopes; chain and catalog writes use application revisions and
  ETag conditions. Fake-container tests cover schema validation, stale and
  concurrent writes, the virtual catalog revision, corrupt/oversized reads,
  and bounded pagination (E-056). Live Azure checks remain in P3-G.
- [x] P3-C4: Implement the admin-reviewed catalog and pinned skill snapshots
  in `src/skills/catalog.ts`. Additions require `SkillLoom.Admin`, cannot
  overwrite existing names, and receive a deterministic SHA-256 fingerprint.
  Bundle schemas enforce canonical base64, 2,000 files and 20 MiB per skill,
  portable collision-free paths, and content integrity. Export resolves only
  reviewed catalog entries and rejects unsupported external bindings; local
  tests pass (E-057). No remote repository pulls are supported in v1.
- [x] P3-C5: Enforce request/body/header/timeout limits and emit structured
  audit events without paths, queries, tokens, request bodies, raw actor
  identifiers, or skill content. Local API tests pass (E-058). No write-rate
  target was set; throughput benchmarking remains skipped.
- [x] P3-C6: Build a non-root container with separate health probes and add
  the P2 Container App module. Local checks, foundation and API deployment,
  live probe checks, and unauthenticated API rejection passed (E-059–E-065).
  The first API attempt failed due to an ARM64 image and was corrected with a
  digest-pinned AMD64 image. P3-G wrong-audience rejection returned 401
  (E-066); P3-G v2 positive authentication, live RBAC, Blob create/read,
  stale-revision, traversal, and oversize checks passed (E-072–E-074).

**Exit gate P3-G — passed (E-066–E-074):** Contract tests pass;
unauthenticated and wrong-audience requests are rejected in the deployed
environment; positive v2 authentication and Blob create/read pass; the
stale-revision write is rejected; traversal and oversize checks pass. One
uniquely named test record remains in Blob Storage per owner decision.

**Sub-agent opportunities:** `general-purpose` per endpoint group; `rubber-duck`
on the API contract; `security-review` on auth and skill-pull paths.

### P4: MCP server and Foundry/Copilot integration

**Goal:** Expose the P3 operations as MCP tools and register with both client
types (D-3).

#### P4 checklist

- [x] P4-C1: Resolve Q-5 and confirm current Foundry registration options and
      MCP transport requirements; see E-075–E-076.
- [x] P4-C2: Map User-authorized API operations into the Toolbox OpenAPI
      contract; preserve the API schemas and bounds while excluding Admin
      operations (E-077–E-079).
- [x] P4-C3: Document the separate Toolbox and API identities for Foundry and
      Copilot callers, including the unverified direct-client token refresh
      boundary (E-080).
- [x] P4-C4: Foundry registration and a smoke agent that lists and fetches a
      chain (Toolbox registered; stable endpoint invocation blocked; a
      project-managed-identity OpenAPI connection and list/get-only direct
      agent are registered. `listChains` returned 200 twice, but `getChain`
      is unverified; MCP invocation returns 404 and SDK get probes returned
      `tool_user_error` and `invalid_payload`, E-081–E-082, E-086, E-089,
      E-092–E-097. The active direct agent was read back as version 6; the
      latest invocation returned `tool_user_error`, and the stable Responses
      retry was rate-limited, E-129. A separate four-operation smoke agent was
      created with owner approval, but its invocation also returned
      `tool_user_error`, E-132. The owner later approved and the agent's
      project-scope Foundry User assignment was read back successfully, but
      invocation still returned `tool_user_error`; its connection uses the
      project managed identity, which also has Foundry User, E-135. The save
      instruction was corrected to match the OpenAPI `If-Match` contract; the
      active version 2 still returned `tool_user_error`, E-136).
      E-137 corrects Toolbox auth and parameter mapping; direct Toolbox
      list/fetch passes. The read-only agent now targets Toolbox version 2,
      but that invocation returned HTTP 429. E-138 completed the end-to-end
      agent list/fetch at owner-approved temporary capacity 10, then restored
      and verified capacity 1. E-139 subsequently set and verified capacity 10
      as the owner-approved ongoing allocation.
- [x] P4-C5: Copilot CLI/SDK MCP configuration sample and smoke test (the
      reversible local stdio adapter passes mocked protocol/API checks; live
      token acquisition and tool calls remain unverified, E-085, E-087–E-088,
      E-091, E-098–E-099; dedicated public-client device-code authentication
      selected; focused MSAL/MCP unit tests and syntax checks pass
      (E-100, E-105), but live sign-in and tool calls remain unverified. The delegated
      `SkillLoom.Access` scope, client permission/admin consent, and caller
      `SkillLoom.User` assignment are configured (E-101–E-104). The local
      workspace server is recognized by `copilot mcp list` (E-106), and local
      initialize/tools-list passes (E-107); live sign-in and tool calls remain
      unverified. The live `list_chains` attempt closed its MCP transport
      before a response (E-108). Interactive status confirms the server fails
      with `MCP connection closed unexpectedly`, and its tools are unavailable
      (E-109). Reload reports the server connected, but a new `list_chains`
      call again closes the transport before a response (E-110). The owner
      reports no device-code prompt was shown (E-111); this does not establish
      whether auth was reached or whether stderr was surfaced. The owner
      reports the server remained connected after the failed call (E-112).
      Temporary safe diagnostics are added and local tests pass; live probe
      produced no visible markers or device prompt, while the server remained
      connected. The owner then reported `MCP error -32001: Request timed out`
      on both list attempts, including one limited to 10 chains. The client
      trace shows an approximately 180-second invoke timeout (E-113–E-119).
      The local debug archive contains two invoke timeouts but no adapter
      markers (E-120). The owner selected nonblocking, two-step device-code
      authentication without a client secret (E-121). The adapter now returns
      instructions promptly and polls in the background; focused tests and
      docs checks pass. The owner now reports Entra access denied after
      successful account sign-in with AADSTS530035; Microsoft identifies this
      as `BlockedBySecurityDefaults` and documents that Security Defaults
      blocks device-code flow. No token or API result is confirmed (E-124).
      The owner approved the interactive browser alternative; the adapter now
      uses MSAL interactive authentication with PKCE, and the localhost
      redirect is registered/read back. Live sign-in and API verification
      remain pending (E-125). The owner then reported a successful
      `list_chains` call with `limit: 10` in another session, returning one
      chain (E-126); fetch and other P4 operations remain unverified.
      Temporary diagnostics were removed (E-122). Three generic instruction-
      only examples pass the v3 schema tests (E-127); an approved live-seed
      attempt timed out at `/v1/health` before listing or writing. The
      available `skillloom-api` MCP later listed four chains, created the
      three examples, fetched one, and exported it (E-128). This does not
      verify the local stdio adapter's auth path. The current Foundry direct
      agent is active with list/get only, but its invocation returned
      `tool_user_error`; the stable Responses retry was rate-limited (E-129).
      A separate agent with only list/get/save/export was created with owner
      approval, but its invocation also returned `tool_user_error` (E-132).
      The local stdio adapter initialized, then remained in interactive auth
      pending state and did not return a list result within 15 seconds
      (E-133). A later retry completed interactive auth and returned
      `list_chains(limit=10)` successfully (E-134).
- [x] P4-C6: Treat tool output as untrusted prompt context; document
  prompt-injection handling given ADR-0003 (E-083).
- [x] P4-C7: User and admin docs for both clients, including unverified client
  boundaries (E-084).
- [x] P4-C8: Expose reviewed-skill search/get tools through the local Copilot
  MCP adapter and document user-directed local transfer of skills and
  portable chain bundles. Keep retrieved content untrusted; the adapter
  must not write to local repository paths (E-165). The original P4-G
  remains passed; this follow-up does not reopen the gate.
- [x] P4-C9: Provide a local administrator CLI to list, add, inspect, and
  remove reviewed skills. Require `SkillLoom.Admin` for writes, preserve
  catalog revision preconditions, reject removal while any stored chain
  references the skill, and exercise the live search/detail routes (E-166–E-167).
- [ ] P4-C10: Verify successful live skill-detail retrieval after an
  administrator-approved skill is present in the catalog. E-166–E-167 found
  the catalog empty, so only search and the expected not-found detail response
  were verified; no catalog write was authorized for testing.
- [x] P4-C11: Coordinate chain writes with reviewed-skill removal so a
  concurrent chain save cannot race the reference scan. Use a shared renewable
  Blob lease across API replicas and fail with 503 if it cannot be acquired
  (E-168–E-171).

**Exit gate P4-G:** One Foundry agent and one Copilot agent each list, fetch,
save, and export a chain against the deployed service with evidence recorded;
denial case for an unauthorized identity recorded (or marked `not run`).
**Status through E-160:** Not passed. E-137 corrected Toolbox authentication and
parameter mapping; direct Toolbox health/list/fetch and Copilot list/fetch
passed on 23 November. E-138 subsequently completed a live Foundry agent
list/fetch turn at owner-approved temporary capacity 10. The read-only agent
targets Toolbox version 2; deployment capacity 1 and the original model and
policies were restored and verified. E-139 subsequently raised capacity to 10
as the owner-approved ongoing allocation, preserving the model and policies.
P4-C4 is complete. Foundry save/export
remain unverified, and unauthorized-identity denial remains `not run`.
E-140 records a later Copilot list timeout and Foundry full-smoke invocation
failure. A subsequent Copilot get returned the tested example at revision 1;
the invocation returned no operation-level result, so Foundry save/export
remain unverified. P4-G remains not passed.
Follow-up API audit records Foundry `listChains` and `getChain` successes,
then `saveChain` failed with HTTP 400 `invalid_request`; no
`exportChainBundle` request was recorded. A subsequent get confirmed revision
1, so the save did not commit (E-141). P4-G remains not passed.
The owner-approved version 3 smoke agent also completed list/get, then
`saveChain` failed with HTTP 422 `invalid_document`; its tool arguments
included `If-Match: "\"1\""` and an empty `If-None-Match` value. No
`exportChainBundle` request was recorded, and the tested chain remains at
revision 1 (E-142). P4-G remains not passed.
E-143 records a Toolbox-only save-schema correction and passing local
regression tests. The API schema and enforcement are unchanged; no live
Toolbox version was created and Foundry save/export remain unverified.
Unauthorized-identity denial remains `not run`, so P4-G remains not passed.
E-144 records a passing Azure preflight but a detailed API what-if with
out-of-scope traffic, probe, and scale changes. No API deployment will run;
Foundry Toolbox version promotion and save/export remain pending.
E-145 and E-146 record two unpromoted Toolbox versions with manually
transcribed specification mismatches. E-147–E-149 record version 5 created
from the exact local generator output, read back, validated through its
version-specific `tools/list`, and promoted; version 2 remains the rollback.
The single approved full-smoke invocation then returned HTTP 400
`tool_user_error` without a matching API request or AppTraces result (E-150).
A post-failure `skillloom-api` MCP read confirmed the chain remains at revision
1 (E-151), but it is not Foundry agent save/export evidence. The approved
smoke attempt recorded in E-150 was consumed. The owner has since approved
one additional Foundry invocation (E-152), which was run and is recorded in
E-153. Foundry list/get returned 200, save returned
422 `invalid_document`, and no export request was recorded. A post-failure
read confirmed revision 1. The submitted body is unavailable, so the specific
validation failure remains unknown. E-152's additional attempt is consumed.
E-154 records the owner's authorization for one further focused Toolbox
save-schema diagnosis/correction, promotion of a new version if its validation
passes, and exactly one additional Foundry smoke. E-155 records a local
schema-contract correction and passing targeted checks; the original save
failure cause remains unconfirmed because its body is unavailable. Remote
version 6 was read back exactly, passed version-specific initialize/tools/list,
and is now default with version 5 retained for rollback (E-156). The one
authorized final smoke is recorded in E-157: list/get passed, save again
returned 422 `invalid_document`, no export was recorded, and the post-failure
chain read remains revision 1. The owner later supplied the request body.
Local API replay reproduced the 422 with invalid `agent.revision`,
`agent.repositoryPath`, `agent.agentPath`, and `agent.fingerprint`; using the
same `If-Match: "1"` with schema-valid synthetic agent metadata passed locally
(E-158). The local seed example has no `agent` field, and the exporter rejects
any chain containing it, so the next save/export body must omit that field.
This is local mock-backed evidence, not a live retry. A follow-up live get
timed out; the latest verified revision remains 1 from E-157. That invocation
is consumed. E-159 authorized one prompt-only correction and one live
attempt; E-160 confirms active version 4 read-back preserved the existing
model, tools, endpoint, and connection while adding the no-synthesized-`agent`
rule. API, Toolbox-schema, deployment, and authentication changes remain
excluded, and evaluation-suite generation was skipped. The single authorized
smoke is pending; no further attempt is authorized. P4-G remains not passed,
and unauthorized-identity denial remains `not run`.

Earlier pre-E-161 evidence: the Copilot-side `skillloom-api` MCP listed
four chains, created the three owner-approved examples, fetched one, and
exported it (E-128). The workspace's local stdio adapter later completed
interactive auth and returned a live list result, satisfying the P4-C5 smoke
test (E-134). Foundry `listChains` succeeded twice in earlier evidence, but
the current direct agent invocation returned `tool_user_error`; a stable
Responses retry was rate-limited, and a later stable-route retry returned
`tool_user_error`. The separate agent has only list/get/save/export, but its
invocation also returned `tool_user_error`. The owner approved and the
runtime identity received Foundry User at project scope, but that did not
resolve invocation; the Toolbox connection uses the project managed identity,
which also has Foundry User. The agent's save instruction was corrected to use
the OpenAPI `If-Match` ETag contract; version 2 still returned
`tool_user_error`. No matching chain-operation audit event or trace was
returned in narrow queries after the retry. Foundry fetch, save, and export
remain unverified in that earlier evidence (E-129, E-131, E-132, E-134–E-136).
Unauthorized-identity denial is `not run`. The local adapter's earlier
health-preflight timeout and the device-code `AADSTS530035`
(`BlockedBySecurityDefaults`) remain recorded; the adapter now uses
interactive browser authentication with PKCE and its localhost redirect was
read back (E-124, E-125, E-127).

**Current status (E-161):** Passed. The authorized Foundry v4 smoke completed
list/get/save/export with HTTP 200 audit results for all four operations; the
post-save read confirmed revision 2. Copilot-side list/save/get/export is
recorded in E-128. Unauthorized-identity denial remains `not run`, which the
exit gate allows. No further smoke or API deployment was run, and hosted chain
execution remains disabled until the P5 exit gate passes.

**Sub-agent opportunities:** `research` agent to verify current Foundry/MCP
docs; `general-purpose` for tool wiring; `task` for smoke runs.

### P5: Hosted runner (Jobs; post-POC)

**Goal:** Execute chains by driving a harness CLI in an isolated job (D-6).
Starts only after P3-G and P4-G.

**P5 status (E-164):** Deferred by the owner after the P5-C1 authentication
review. The owner keeps their personal account local and wants to focus on
P4 discovery and chain transfer workflows. No P5 runner implementation,
credential provisioning, Azure resource changes, or hosted execution is
authorized. P5 is post-POC adoption work; hosted chain execution remains
disabled until P5-G passes.

#### P5 checklist

- [ ] P5-C1: Decide Copilot CLI credential and licensing model for jobs (Q-7);
      ADR for run isolation, concurrency, and how ADR-0006 single-active-run
      semantics change. OpenCode support is later.
- [ ] P5-C2: Runner image with pinned harness CLI versions; spawn via executable
      plus argument array only.
- [ ] P5-C3: Per-run ephemeral workspace, resource and wall-clock limits, egress
      allow-list.
- [ ] P5-C4: Harness credential injection from Key Vault scoped per run; never
      logged or persisted.
- [ ] P5-C5: Run records as versioned JSON with frozen snapshots and bounded
      tails (ADR-0004); explicit advancement signals (ADR-0007).
- [ ] P5-C6: Start/status/cancel API and MCP tools; orphan-free cleanup on
      timeout and cancel.
- [ ] P5-C7: Permission and trust defaults aligned with ADR-0009; refuse to
      widen without explicit approval.

**Exit gate P5-G:** A multi-step chain completes in a job; cancel and timeout
leave no running job or leaked workspace; run record validates against the
schema; live harness result recorded, never inferred from mocks.

**Sub-agent opportunities:** `general-purpose` for runner and job orchestration;
`rubber-duck` on the isolation ADR; `security-review` on credential and egress
handling.

### P6: Hardening, pilot rollout, release (post-POC)

#### P6 checklist

- [ ] P6-C1: Threat model covering token theft, malicious skills, prompt
      injection, tenant-boundary assumptions, and cost abuse.
- [ ] P6-C2: Pilot with named users; rollback and disable procedure rehearsed.
- [ ] P6-C3: Admin guide, user guide, operations runbook, release notes with
      limitations and unverified items.
- [ ] P6-C4: Dependency, container, and IaC scans with findings triaged.

**Exit gate P6-G:** Pilot completed; rollback rehearsed; all gates in the
register are `passed` or explicitly `accepted exception` or `not run`; release
notes list unverified combinations.

**Sub-agent opportunities:** `security-review` for the full surface;
`code-review` before release; `general-purpose` for documentation drafts.

## 5. Acceptance criteria

| ID | Criterion | Verified in |
| --- | --- | --- |
| AC-1 | Every API and MCP call requires a valid Entra token for the expected audience; unauthenticated requests fail. | P3-G, P4-G |
| AC-2 | A Foundry agent and a Copilot agent can each list, fetch, save, and export a chain. | P4-G |
| AC-3 | Persisted JSON is versioned, atomically replaced, and rejects stale revisions. | P2-G, P3-G |
| AC-4 | Pinned Skill Loom bundle/chain fixtures import and re-export in the cloud service with no interchange drift. | P1-G |
| AC-5 | Skill pull enforces reviewed-install limits and path safety. | P3-G |
| AC-6 | Runs spawn without shell strings, are time-bounded, cancellable, and leave no orphans. | P5-G |
| AC-7 | Secrets are never written to logs, run records, or images. | P3-G, P5-G, P6-G |
| AC-8 | The environment deploys and tears down from IaC; data restore is demonstrated. | P2-G |
| AC-9 | Docs state that chain order is prompt order and does not guarantee skill loading. | P4-G, P6-G |
| AC-10 | The landing zone deploys from an empty tenant by runbook and a smoke agent runs with Entra auth. | P2A-G |

## 6. Risks

| ID | Risk | Mitigation | Phase |
| --- | --- | --- | --- |
| R-1 | Exposing a tool built around local trust invites misuse. | New service with mandatory auth; do not reuse the loopback server. | P3 |
| R-2 | Azure Files may not provide the rename/locking semantics ADR-0005 relies on. | Spike and ADR before committing to a backend. | P2 |
| R-3 | Malicious or injected skill content steers agents. | Reviewed pull, size limits, untrusted-content guidance. | P3, P4 |
| R-4 | Harness credential exposure in runner jobs. | Key Vault, per-run scope, no logging. | P5 |
| R-5 | Foundry/MCP product surfaces change. | Re-verify docs at P4 start; keep the API contract independent. | P4 |
| R-6 | Copied schemas drift from the persisted/interchange format. | Pinned golden-fixture contract tests; no version changes without an ADR. | P1 |
| R-7 | Concurrent runs break single-active-run assumptions. | Dedicated ADR and tests in P5. | P5 |
| R-8 | Cost overrun from long or looping runs. | Budgets, wall-clock limits, concurrency caps. | P2, P5 |
| R-9 | Repo creation permission was unavailable to tools. | Resolved: owner created the repo (E-002). | P0 |
| R-10 | The two repos' schemas diverge and bundles stop interchanging. | Pinned golden-fixture contract tests at the interchange boundary and a documented refresh policy (D-7). | P1 |
| R-12 | The Learn page was unreachable at drafting; content came from a third-party mirror and the samples repo, and the product is renaming and changing quickly. | Re-verify at P2A-C1; record page date. | P2A |
| R-13 | Free-tier quota or trial expiry blocks model deployment or Container Apps. | Check quota in P2A-C5; fallback region/model; pay-as-you-go decision. | P2A |
| R-14 | Soft-deleted Foundry/Key Vault names block rebuilds. | Purge step in P2A-C11. | P2A |
| R-15 | Break-glass access is not configured for the current PoC. | Accepted exception for this PoC only; provision and verify emergency access before production use. | P2A |
| R-11 | Admin add-skill flow lets a malicious skill into the shared catalog. | Admin app role only, reviewed install rules per ADR-0031, size and path limits, audit log. | P3 |

## 7. Migration and rollout

- **Existing users:** No change to `skill-loom` behavior; Skill Loom keeps its
  own schemas (D-7). Interchange compatibility is checked only in the cloud
  repo.
- **Data migration:** None initially. Chains and bundles move between
  environments via the existing bundle export/import, reviewed on import.
- **Rollout order:** P0 to P2A to P2 (no users) then P3 (API pilot, read-only
  first) then P4 (agents) then P5 (runner, opt-in per chain) then P6 (wider
  use).
- **Rollback:** Disable ingress or revoke app role assignments; redeploy the
  previous image tag; restore storage from the P2 backup. Rehearse in P6-C2.
- **Feature gating:** Runner stays disabled by default until P5-G passes.

## 8. Validation

| Layer | Check |
| --- | --- |
| Schema | Pinned-fixture import/re-export contract tests (P1) |
| API | Contract tests from OpenAPI, auth negative tests, limits tests (P3) |
| MCP | Tool schema tests and client smoke runs (P4) |
| Landing zone | Provider and quota checks, smoke agent with Entra auth (P2A) |
| Infra | IaC lint, `what-if`, deploy and teardown in a clean subscription (P2) |
| Runner | Live harness run, cancel, timeout, and orphan checks (P5) |
| Security | Dependency, container, and IaC scans; `security-review` (P6) |
| Repo hygiene | In `skill-loom`: `npm run check`, `npm run typecheck`, `npm test`, `git diff --check`. In this repo: equivalent gates defined in P0-C5. |

Live checks need real Azure credentials and harness CLIs; record them as `not
run` when unavailable.

## 9. Execution evidence register

Add one row per executed gate or notable event. Do not edit past rows; append corrections.

| ID | Date | Phase/Gate | Check or event | Result | Evidence link or output | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| E-001 | 2026-11-18 | P0-C1 | Create private repo `McFuzzySquirrel/skill-loom-foundry` via `gh repo create` and GitHub MCP `create_repository` | failed | `403 Resource not accessible by integration` from both | Needs a credential with repo-creation rights or manual creation (Q-1). |
| E-002 | 2026-11-18 | Planning | Requester decisions D-1 to D-7 recorded; owner created empty private repo `McFuzzySquirrel/skill-loom-foundry` | recorded | [GitHub repository](https://github.com/McFuzzySquirrel/skill-loom-foundry) (owner-reported, not independently verified) | Resolves Q-1 workaround for P0-C1 pending default-branch protection. |
| E-010 | 2026-11-18 | Planning | Q-2 to Q-9 answered; D-7 revised, D-8 to D-11 added | recorded | Section 1 | Deferred items listed in section 1.2. |
| E-003 | 2026-11-18 | P0-G | Confirm P0 exit gate: private repo, CI green, ADRs, deferred owners/phases | passed | [GitHub Actions CI run 44368842816](https://github.com/McFuzzySquirrel/skill-loom-foundry/actions/runs/44368842816); Q-3, Q-4, Q-5, Q-7, and Q-8 assigned in section 1.2 | Branch protection is an owner-accepted exception recorded in E-012; initial skeleton pushed to `main`. |
| E-004 | 2026-11-18 | P1-G | Fixture round-trip, dependency inventory, version and policy check | passed | `npm run check` (4 contract tests passed); `docs/schemas/README.md`; fixtures pinned to Skill Loom commit `a608c2853a83a017b46b24383bc5d81b4d22f1a9` | Schema modules contain no server, PTY, or filesystem imports. |
| E-011 | | P2A-G | not run | not run | | |
| E-005 | | P2-G | not run | not run | | |
| E-006 | | P3-G | not run | not run | | |
| E-007 | | P4-G | not run | not run | | |
| E-008 | | P5-G | not run | not run | | |
| E-009 | | P6-G | not run | not run | | |
| E-012 | 2026-11-18 | P0-C1 | Verify repository protection availability and record owner's decision | accepted exception | `gh repo view` reports `PRIVATE`, default branch `main`; branch-protection API returns 403; user chose `push_without_protection` | GitHub reports that private-repository branch protection requires GitHub Pro. User authorized pushing without protection; skeleton push is pending. |
| E-013 | 2026-11-18 | P0-C2 to P0-C6 | Local bootstrap validation | passed | `npm ci`; `npm run check`; `npm audit`; `git diff --check` all passed | The test runner currently discovers zero tests. GitHub Actions has not run because the skeleton has not been pushed. |
| E-014 | 2026-11-18 | P0-C1 | Push initial skeleton to `main` | passed | Commit `38626e0af39964540ec740652067b23dc9ccc705`; GitHub Actions CI run 44368842816 succeeded | Pushed with the owner's explicit exception to branch protection. This supersedes E-012's push-pending note and E-013's CI-not-run note. |
| E-015 | 2026-11-18 | P1-G | GitHub Actions validation for schema module and fixture commit | passed | [GitHub Actions CI run 44370731480](https://github.com/McFuzzySquirrel/skill-loom-foundry/actions/runs/44370731480) | `npm ci` and `npm run check` passed on the pinned Skill Loom fixtures. |
| E-016 | 2026-11-18 | P2A-C1 | Re-verify Foundry environment setup guidance | passed | [Microsoft Learn environment setup](https://learn.microsoft.com/en-us/azure/foundry/agents/environment-setup); page date `2026-08-21`, updated `2026-08-26` | Basic remains the PoC choice. Roles are now named Foundry Account Owner, Foundry User, and Foundry Agent Consumer; template defaults remain GPT-4.1, version `2025-04-14`, `GlobalStandard`, `eastus`. The provider and pinned-template checks were later completed in E-019 and E-023. |
| E-017 | 2026-11-18 | P2A-C2 | Tenant and account readiness check | accepted exception | User reports the signed-in account is Owner, the tenant is ready, MFA is enabled, and app registration is permitted; Azure subscription list showed one enabled default subscription | User ran the temporary checklist and accepts a PoC-only exception; break-glass accounts are not present or verified, and production use remains out of scope until this is resolved. No account names, IDs, or credentials were recorded. |
| E-018 | 2026-11-18 | P2A-C3 | Check subscription policy and existing budgets | recorded | `az account show` returned null `quotaId` and `spendingLimit`; `az consumption budget list` returned no budgets | The offer, credit, expiry, and budget were unconfirmed at this check; E-021 supersedes that status with the owner's trial details and the configured budget. |
| E-019 | 2026-11-18 | P2A-C4 | Verify and register providers for the Basic template and planned P2 infrastructure | passed | [`azd-ai-starter-basic` template at commit `5bf59a056c41ff37801dea334ba6a141e2dc5f67`](https://github.com/Azure-Samples/azd-ai-starter-basic/tree/5bf59a056c41ff37801dea334ba6a141e2dc5f67); Azure CLI provider state | Required providers are registered. Search and DocumentDB remain unregistered because Basic does not use them. Microsoft.Quota is registered for quota checks. |
| E-020 | 2026-11-18 | P2A-C5 | Check Foundry model and Container Apps availability | recorded | `az cognitiveservices model list` and `az cognitiveservices usage list` for East US and East US 2; quota script for Microsoft.App in East US | GPT-4.1 GlobalStandard has 0 quota in both regions; GPT-4.1-mini has 200 in both. East US has `ManagedEnvironmentCount` limit 1, usage 0. East US 2 Container Apps quota and Cognitive Services quota via `az quota` were not returned; model-specific usage results were used. E-022 later records the East US model and region selection. |
| E-021 | 2026-11-18 | P2A-C3 | Record trial offer and create monthly cost budget | passed | Owner-reported trial and budget status; `Microsoft.Consumption/budgets` response | An advisory subscription cost budget with notifications was configured. Exact credit, amount, and expiry details are omitted from this public record. Budget alerts are not a spending cap. The pay-as-you-go decision remained open. |
| E-022 | 2026-11-18 | P2A-C5 | Select model and region; assess fallback quota | passed | `az cognitiveservices model list` and `az cognitiveservices usage list` for East US/East US 2; `az quota list` for Microsoft.App | GPT-4.1-mini v2025-04-14 / OpenAI format supports GlobalStandard; selected capacity 1 in East US. East US is the only region confirmed for both model and Container Apps. East US 2 has model quota but no Container Apps quota record; Central US returned no result and West US 2 returned no matching quota. |
| E-023 | 2026-11-18 | P2A-C6 | Preview and provision the Basic landing zone | passed | Pinned [`azd-ai-starter-basic` template](https://github.com/Azure-Samples/azd-ai-starter-basic/tree/5bf59a056c41ff37801dea334ba6a141e2dc5f67); `azd provision --preview --no-prompt`; `azd provision --no-prompt` | Created the resource group, Foundry account/project, GPT-4.1-mini deployment, Application Insights, and Log Analytics in East US. Hosted agents and capability host were disabled. The initial preview exposed that the model JSON must be escaped in the azd environment; corrected preview and deployment succeeded. |
| E-024 | 2026-11-18 | P2A-C7 | Verify bootstrap project role assignment | recorded | `az role assignment list` at the Foundry project scope | Foundry User is assigned to a User principal at project scope. The separate daily-use identity has not been added; C7 remains open. The deployment warning that target-scope role-assignment permissions were not verified was followed by this live assignment check. |
| E-025 | 2026-11-18 | P2A-C10 | Create and invoke the Entra-authenticated smoke agent | passed | Foundry `agent_update` and `agent_invoke`; `az cognitiveservices account show` | The prompt agent returned `P2A smoke check succeeded.` The agent endpoint reports Entra authorization, the Foundry account has `disableLocalAuth=true`, and no API key was used. |
| E-026 | 2026-11-18 | P2A-C9 | Record landing-zone ADR, source license, and repeatable runbook | passed | [ADR-0006](../adr/0006-azure-p2a-landing-zone.md); [`infra/landing-zone/README.md`](../../infra/landing-zone/README.md); retained upstream `LICENSE.md` | The runbook covers azd environment configuration, preview, provisioning, verification, and owner-confirmed teardown/purge. Subscription-specific values remain in ignored `.azure/` files. |
| E-027 | 2026-11-18 | P2A-C8 | Create the API registration and assign the Foundry project caller | passed | `az ad app create`, `az ad app update`, `az ad sp create`, `az ad app owner add`; Microsoft Graph `servicePrincipals/{project-identity}/appRoleAssignments` POST and read-back; role schema in [`infra/landing-zone/app-roles.json`](../../infra/landing-zone/app-roles.json) | The single-tenant `skill-loom-foundry-api` registration uses `api://<application-id>` and defines `SkillLoom.User` and `SkillLoom.Admin` for users and applications. The signed-in project owner owns the registration. The Foundry project system identity has `SkillLoom.User`; no principal has `SkillLoom.Admin`. No client credential was created. Daily-use identity assignment remains open under C7. Live API token validation was not run; the API is implemented in P3. Tenant-specific IDs were not recorded. |
| E-028 | 2026-11-19 | P2A-C2/C7 | Record user-reported Entra account creation and role assignment | recorded | User report: normal-user and administrator test identities were added; the normal caller was assigned Foundry User | Assignment scope had not been independently verified. No administrator role assignment was reported. Break-glass access remains unconfigured under the accepted PoC-only exception; production remains out of scope until verified. |
| E-029 | 2026-11-19 | P2A-C7 | Verify and correct the daily-use identity's Foundry role scope | passed | `az ad user list`; `az role assignment list` at project scope and for the principal | The initial Foundry User assignment was at Foundry account scope. Added Foundry User at project scope, verified it, then removed the broader account-scoped assignment. The normal caller now has Foundry User at project scope only. |
| E-030 | 2026-11-19 | P2A-C11 / planning | Decide whether to retain or tear down the current PoC | deferred | Owner chose to keep the PoC running and defer teardown/purge | No destructive cleanup was performed. Non-destructive P2 planning may proceed, but P2 deployment and P2A-G remain blocked pending resolution of C11. The pay-as-you-go decision remains open under C3. |
| E-031 | 2026-11-19 | P2-C4 | Review primary-source Azure Files and Blob storage semantics | recorded | [`p2-c4-storage-backend-research.md`](p2-c4-storage-backend-research.md); Microsoft Learn REST and concurrency documentation | Preliminary recommendation is Blob with ETag conditional writes. The review corrected the Files rename detail: the REST Rename File operation is SMB-only, not NFS. No Azure resources were created or modified; the live check matrix, exact SDK behavior, and owner decisions remain open. |
| E-032 | 2026-11-19 | P2-C4 / planning | Record storage requirements for the PoC spike | recorded | Owner input: no filesystem mount; cost-first recovery posture; document profile unknown | Blob is the live-spike candidate, not a final backend selection. Set size/write limits and decide concrete recovery policy before the live spike; no storage resources or tests were run. |
| E-033 | 2026-11-19 | P2-C4 / planning | Inspect chain, bundle, and run-record schema size bounds | recorded | `src/schemas/bundle.ts:11-32`; `src/schemas/run-record.ts:5-72` | Existing schemas cap individual bundle content and bound step/attempt counts but define no aggregate serialized-document limit. Set a storage/API cap before the live spike. No Azure resources or live tests were used. |
| E-034 | 2026-11-19 | P2-C4 / planning | Set the PoC serialized-object size cap | recorded | Owner selected 32 MiB maximum serialized-object size | This is an application-level cap, not a Blob service limit. The current schemas do not enforce it; implementation and near-limit live checks remain pending. Write-rate target and concrete recovery policy remain open. |
| E-035 | 2026-11-19 | P2-C4 / planning | Confirm storage-spike guardrails | recorded | Owner confirmed the current PoC stays running, skipped throughput benchmarking without a write-rate target, and deferred recovery settings to P2-C5 | No disposable storage resources were authorized or created; live checks remain not run. P2 deployment remains blocked until P2A-G is resolved. |
| E-036 | 2026-11-19 | P2-C4 / application limit | Enforce the serialized-object cap in document schemas | passed | `npm run check`; boundary and UTF-8 byte-count tests in `tests/schemas.test.js` | Chain, bundle v1/v2, catalog, and run-record schemas enforce a 32 MiB limit on compact serialized JSON. Exact-limit acceptance, overflow rejection, Unicode byte counting, and pinned chain/bundle round-trips passed. Live Azure SDK and storage checks remain not run. |
| E-037 | 2026-11-19 | P2-C2/C3 / planning | Record P2 IaC and network decisions | recorded | Owner selected Bicep; public HTTPS API ingress with mandatory Entra auth; public Storage/Key Vault endpoints with Entra/RBAC and no private endpoints; runner egress deferred to P5-C3 | Decisions recorded in ADR-0007. No Azure resources were created. |
| E-038 | 2026-11-19 | P2-C2 | Compile P2 foundation Bicep | passed | `az bicep build --file infra/p2/main.bicep --stdout` | The template defines the Container Apps environment, Basic ACR, user-assigned service identity, Key Vault, Blob Storage, and least-privilege role assignments while reusing P2A Log Analytics. Static compilation only; no what-if or deployment was run. |
| E-039 | 2026-11-19 | P2-C5 | Record manual-only backup/restore policy | recorded | Owner chose manual export/restore with no automated versioning or retention; [`storage-backup-restore.md`](../runbooks/storage-backup-restore.md) | The procedure requires Entra data roles, schema validation, ETag conditions, and revision-safe restoration. No backup or live restore was run; disposable-data restore remains a P2-G check. |
| E-040 | 2026-11-19 | P2-C2/C5 | Compile Bicep with automatic recovery disabled | passed | `az bicep build --file infra/p2/main.bicep --stdout` | The Blob service explicitly disables versioning and blob/container soft delete to match the manual-only PoC policy. Static compilation only; no what-if or deployment was run. |
| E-041 | 2026-11-19 | P2-C5 / verification | Validate the manual-only recovery docs and current changes | passed | `npm run check`; `npx markdownlint-cli2 docs/runbooks/storage-backup-restore.md`; `az bicep build --file infra/p2/main.bicep --stdout`; `git diff --check` | All commands passed. No what-if, deployment, backup, restore, or live storage checks were run. |
| E-042 | 2026-11-20 | P2A-C11 / P2A-G | Tear down and verify the P2A landing zone | passed | `azd down --force --environment <environment-name>`; purge the exact soft-deleted Foundry account using locally resolved resource identifiers; post-checks with `az group exists`, `az cognitiveservices account list-deleted`, `az cognitiveservices account list`, `az keyvault list-deleted`, `az ad app show`, Microsoft Graph `appRoleAssignedTo`, and `az consumption budget list` | Owner authorized teardown/purge. The resource group and Foundry account were absent; no Key Vault required purge; the API registration remained; the old project identity assignment was absent. Budget details are omitted from this public record. P2A-G passed. No P2 what-if/deployment or disposable storage checks were run at this point. |
| E-043 | 2026-11-20 | P2A-C6/C7/C8 | Re-provision the approved Basic landing zone for P2 validation | passed | `azd provision --preview --no-prompt --environment <environment-name>`; `azd provision --no-prompt --environment <environment-name>`; project-scope `az role assignment` and Microsoft Graph `appRoleAssignments` read-backs | Owner authorized reprovisioning. The preview's default project name was corrected to the runbook name before provisioning. The landing zone is running again with local auth disabled; the normal caller has project-scope Foundry User and the new project identity has `SkillLoom.User`. A deployment warning about role-assignment permissions was followed by live read-back verification. |
| E-044 | 2026-11-20 | P2-C4 | Run the approved live Blob SDK spike | passed with deferrals | `@azure/storage-blob` 12.34.0; temporary runner used `DefaultAzureCredential`; SDK checks B1-B7 and X1; B8 lease checks; Azure CLI account and blob-service-property queries | B1-B7 and X1 passed. B8 acquired a 15-second lease, rejected a write without the lease ID, and accepted a write with it; lease expiry/renewal were not tested. B5 covered `uploadData` only. B9 managed identity and B10 application retry/idempotency remain not run; `upload()` and `syncUploadFromURL` were not tested. Data access used a container-scoped `Storage Blob Data Contributor` role, with shared-key access disabled. |
| E-045 | 2026-11-20 | P2-C4 / cleanup | Remove disposable Blob spike resources | passed | `az group delete --name <disposable-resource-group> --yes`; `az group exists --name <disposable-resource-group>`; post-checks confirmed only P2A resources remain | The disposable account and its container-scoped test role assignment were removed. No P2 deployment or what-if was run. |
| E-046 | 2026-11-20 | P2-C4 / repository verification | Validate the recorded spike and article updates | passed | `npm run check`; `npx markdownlint-cli2 docs/articles/azure-skills-experiment.md`; `git diff --check` | All passed after `npm ci` restored the locked project dependencies. Azure SDK packages were not added to project manifests. |
| E-047 | 2026-11-20 | Q-4 / P2-C4 | Select the final PoC storage backend | recorded | Owner decision via ask-user tool: Azure Blob Storage only | The owner selected Blob after reviewing the live spike results (E-044). Azure Files and a dual-backend design are excluded. The documented B8 limitation and B9/B10 deferrals remain; P2-G still requires deployment and a disposable-data restore test. |
| E-048 | 2026-11-20 | P2-G / authorization | Authorize a temporary P2 validation deployment and teardown | authorized | Owner approved the P2-G what-if, deployment, disposable-data restore test, and teardown; confirmed the existing subscription, `eastus`, and budget posture; selected a temporary Key Vault purge-protection exception for an empty test vault | No P2 resources or data have been created. The finalized deployment plan is awaiting owner approval; P2A, the subscription budget, and the Entra API registration remain out of scope. |
| E-049 | 2026-11-20 | P2-G / plan approval | Approve the finalized temporary deployment plan | approved | Owner approved `.azure/deployment-plan.md` after reviewing the resource scope, documented quotas, cost alert limitation, and Key Vault cleanup exception | Validation is next. No P2 what-if or deployment has run yet; P2A, the subscription budget, and the Entra API registration remain out of scope. |
| E-050 | 2026-11-20 | P2-G / validation | Complete the approved Azure validation workflow and inspect detailed what-if | passed | `.azure/deployment-plan.md` Section 8; `validate-deployment.sh`; detailed `az deployment group what-if`; `az bicep lint`; `az policy assignment list`; `npm run check` | Core validation, Bicep lint, static RBAC, policy fallback, and repository checks passed. Detailed what-if shows 10 P2 creates, five P2A resources ignored, and no modifications/deletions. The helper's Create: 11 summary counts its `+ Create` legend; Azure Policy MCP timed out and the read-only CLI fallback returned `[]`. Plan status is Validated. No P2 resources have been created; deployment, restore, and teardown remain pending. |
| E-051 | 2026-11-20 | P2-G / deployment and restore | Deploy the validated foundation and restore a disposable schema-valid Blob | passed | `az deployment group create --name <deployment-name> --resource-group <approved-resource-group> --subscription <approved-subscription> --template-file infra/p2/main.bicep --parameters .azure/p2.parameters.json --mode Incremental`; live RBAC; conditional Blob operations; `ChainSchema.parse`; encrypted backup checksum | Deployment succeeded with 10 P2 resources; all three service-identity roles were live at their approved scopes. The operator's temporary container-scoped Blob Data Contributor role was removed after testing. A synthetic ChainSchema object was conditionally uploaded, encrypted/checksummed off-repo, deleted by ETag after separate owner confirmation, restored with `If-None-Match: *`, read back, and schema-validated. P2A resources remain present. Scoped teardown is underway; Container Apps environment deletion is pending, while ACR, storage, identity, and Key Vault deletion/purge completed. |
| E-052 | 2026-11-20 | P2-G / teardown | Verify P2-only cleanup and preserve P2A dependencies | blocked | `az containerapp env delete`; `az resource show`; `az containerapp list`; `az resource list`; budget and Entra registration read-backs; [Microsoft Learn troubleshooting](https://learn.microsoft.com/azure/container-apps/troubleshooting#manually-delete-the-vnet-being-used-by-the-azure-container-apps-environment) | ACR, storage account, user-assigned identity, service-identity role assignments, and Key Vault were removed; the empty Key Vault was purged after separate owner confirmation. The environment delete command reported success, but ARM still reports `ScheduledForDelete` and the resource remains listed. No apps, `infrastructureSubnetId`, or environment VNet were found, so the documented manual-VNet remedy does not apply; no additional resource was deleted. The resource group still contains the five P2A resources. An advisory budget and one Entra API registration remain. Final P2-G teardown verification is pending Azure-side resolution. |
| E-053 | 2026-11-20 | P2-G / teardown correction | Complete deletion of the scheduled Container Apps environment and verify final scope | passed | `az resource delete --ids <managed-environment-resource-id> --api-version 2024-03-01 --subscription <approved-subscription> --no-wait`; final `az resource list`, `az containerapp env list`, `az keyvault list-deleted`, budget, and app-registration checks | The follow-up ARM delete cleared the environment; the targeted resource now returns `ResourceNotFound`. The resource group contains only the five P2A resources; no Container Apps environments or deleted P2 Key Vault remain. An advisory budget and one Entra API registration remain intact. This supersedes E-052's pending cleanup state; P2-G teardown is complete. |
| E-054 | 2026-11-21 | P3-C1 | Define and check the authenticated serve-mode OpenAPI contract | passed | `docs/openapi.json`; `npm run check` (passed); `npx markdownlint-cli2 docs/articles/azure-skills-experiment.md` (passed); `git diff --check` (passed); `npx markdownlint-cli2 docs/plans/implementation-plan.md` (failed: MD013) | Tests verify route/auth declarations, conditional-write behavior, bounded pagination, and local references. The plan lint has extensive line-length violations in its long evidence tables; no broad reformat was made. API implementation, Entra token checks, and deployed negative cases remain not run. |
| E-055 | 2026-11-21 | P3-C2 | Implement Entra verification and operation-level role authorization | passed | `src/auth/entra.ts`; `tests/auth.test.js`; `tests/openapi-contract.test.js`; `docs/adr/0002-authentication-and-authorization.md`; `npm run check` (passed, 18 tests); `npx markdownlint-cli2 docs/articles/azure-skills-experiment.md docs/adr/0002-authentication-and-authorization.md` (passed); `git diff --check` (passed) | Tests use generated RSA keys and a local JWK set to verify issuer/version, audience, signature, expiry, tenant binding, bearer parsing, and role gates for every OpenAPI operation. No HTTP handlers or MCP server exist yet; live Entra/JWKS checks and deployed negative cases remain not run (P3-G). |
| E-056 | 2026-11-21 | P3-C3 | Implement and test versioned Blob persistence with conditional revisions | passed | `src/persistence/blob.ts`; `tests/blob-persistence.test.js`; `npm run check` (passed, 23 tests); `npx markdownlint-cli2 docs/articles/azure-skills-experiment.md` (passed); `npx markdownlint-cli2 docs/plans/implementation-plan.md` (failed: 190 MD013 line-length errors); `git diff --check` (passed) | Fake-container tests cover create/update races, stale revisions, schema validation, catalog initialization, pagination, corrupt data, and the 32 MiB read cap. The plan has extensive MD013 issues in its long evidence tables; no broad reformat was made. The disposable Azure storage account was deleted; live managed-identity/Blob checks and P3-G remain not run. Application retry/idempotency behavior remains deferred under E-044 B10. |
| E-057 | 2026-11-21 | P3-C4 | Implement reviewed catalog additions, safe file validation, and pinned bundle snapshots | passed | `src/skills/catalog.ts`; `src/schemas/bundle.ts`; `tests/skills-catalog.test.js`; `tests/schemas.test.js`; `tests/openapi-contract.test.js`; `npm run check` (passed, 32 tests); `npx markdownlint-cli2 docs/articles/azure-skills-experiment.md` (passed); `npx markdownlint-cli2 docs/plans/implementation-plan.md` (failed: 190 MD013 errors); `git diff --check` (passed) | Local tests cover Admin-only additions, immutable fingerprints/names, safe paths and content limits, metadata-only search, stale revisions, and bundle snapshots. The plan has extensive MD013 issues in its long evidence tables; no broad reformat was made. Remote repository pulls remain excluded by D-8. No API handler or live Azure check was run; those remain for P3-G. |
| E-058 | 2026-11-21 | P3-C5 | Add bounded HTTP request handling and redacted structured audit events | passed | `src/api/server.ts`; `src/audit/logger.ts`; `tests/api-server.test.js`; `npm run check` (passed, 36 tests); `npm run build` (passed); Markdown lint for README, user/admin guides, release notes, and article (passed); `git diff --check` (passed) | Local HTTP tests cover authenticated probe separation, conditional writes and stale revisions, rejection of oversized declared bodies before parsing, and audit redaction of paths, queries, tokens, principals, and skill content. Limits include request/response sizes, headers, timeouts, query parameters, page size, cursor length, and search length. The owner set no write-rate target; throughput benchmarking remains skipped. |
| E-059 | 2026-11-21 | P3-C6 / local validation | Add service runtime, non-root image, probes, and P2 Container App template | passed (local checks only) | `src/main.ts`; `Dockerfile`; `.dockerignore`; `infra/p2/api.bicep`; `npm run build` (passed); `podman build --tag skill-loom-foundry:local .` (passed); `podman inspect --format '{{.Config.User}}' skill-loom-foundry:local` (`10001:10001`); local container smoke test (probe paths `204`, unauthenticated `/v1/health` `401`); `az bicep lint --file infra/p2/api.bicep` and Bicep compilation of both P2 templates (passed); `git diff --check` (passed) | Local image, probes, and static template checks passed. No image was pushed and no Azure resources were provisioned; P3-C6 deployment and P3-G live Entra/Blob/API checks remain not run pending explicit owner authorization. |
| E-060 | 2026-11-21 | P3-C6 / foundation deployment | Provision the approved P2 foundation without changing P2A resources | passed | Foundation what-if and policy validation passed; `az deployment group create --name <deployment-name> --resource-group <approved-resource-group> --subscription <approved-subscription> --template-file infra/p2/main.bicep --parameters .azure/p2.parameters.json --mode Incremental` (Succeeded); `az containerapp env show`; `az resource list`; `az acr show`; `az storage account show`; `az keyvault show`; scoped `az role assignment list` | The environment is `Succeeded`; registry admin is disabled, Storage shared-key access is disabled, and Key Vault purge protection is enabled. ACR Pull, container-scoped Storage Blob Data Contributor, and vault-scoped Key Vault Secrets User are present for the P2 identity. All five P2A resources remain. The ACR role assignment was present for more than 15 minutes before image push; app image-pull verification remains for API deployment. No API app exists yet. |
| E-061 | 2026-11-21 | P3-C6 / initial image publish | Build and publish the first API image to the P2 ACR by immutable digest | passed (push only) | `podman build --tag skill-loom-foundry:local .`; `podman inspect --format '{{.Config.User}}' skill-loom-foundry:local`; `az acr login --expose-token` piped to `podman login`; `podman push --digestfile .azure/api-image.digest`; `az acr repository show` | The first image was present in ACR as `skill-loom-foundry:p3-c6-20261121` with digest `sha256:6f2f2c602046e8559f87d52bf52be7f13ba56ca5a38d74f0650e9b88de02523f`, but was `linux/arm64` and could not run in Container Apps. The deployment failure and correction are recorded in E-062–E-063. |
| E-062 | 2026-11-21 | P3-C6 / initial API deployment | Deploy the validated API Container App with the first digest | failed | `az deployment group create --name <deployment-name> --resource-group <approved-resource-group> --subscription <approved-subscription> --template-file infra/p2/api.bicep --parameters .azure/api.parameters.json --mode Incremental`; `az deployment operation group list`; `az containerapp show` | Azure rejected the image because the manifest was `linux/arm64` but Container Apps requires `linux/amd64`. The Container App resource became `Failed` with no ready revision; the failure was not an ACR role or P2A resource issue. This was later resolved by revalidating and deploying a corrected image incrementally, without deleting the resource (E-063–E-065). |
| E-063 | 2026-11-21 | P3-C6 / AMD64 image correction | Rebuild and publish an image matching the Container Apps runtime platform | passed (build and push only) | `podman build --platform linux/amd64 --tag skill-loom-foundry:amd64 .`; `podman inspect --format '{{.Os}}/{{.Architecture}} {{.Config.User}}' skill-loom-foundry:amd64`; `podman push --digestfile .azure/api-image-amd64.digest`; `az acr repository show` | Dockerfile builds on `$BUILDPLATFORM` and the final image targets `$TARGETPLATFORM`. The pushed `skill-loom-foundry:p3-c6-20261121-amd64` digest is `sha256:4f9219d2cf68caa2cd164422e1775b6e53bd77e46438759dd8ee339407b24bf4`; local inspection reports `linux/amd64`, UID/GID `10001:10001`. This ARM64 host has no AMD64 emulation, so the corrected image was not run locally. Corrected-image validation and deployed runtime checks passed in E-064–E-065. |
| E-064 | 2026-11-21 | P3-C6 / corrected API validation | Revalidate the API template and digest-pinned AMD64 image before retry | passed | `npm run build`; `az bicep lint --file infra/p2/api.bicep`; `validate-deployment.sh` with `.azure/api.parameters.json`; detailed `az deployment group what-if`; target resource-group policy query; static RBAC review | Validation passed. The helper summary printed Modify 5, but detailed raw what-if showed one Modify to the failed API Container App, ten existing resources ignored, no deletes, and only the container image changed. Policy query returned `[]`; the P2 identity roles remain correctly scoped. The azure-validate workflow set the plan status to `Validated`. |
| E-065 | 2026-11-21 | P3-C6 / API deployment and live checks | Deploy the corrected API revision and verify ingress, probes, image pull, and anonymous rejection | passed | `az deployment group create --name <deployment-name> --resource-group <approved-resource-group> --subscription <approved-subscription> --template-file infra/p2/api.bicep --parameters .azure/api.parameters.json --mode Incremental`; `az containerapp show`; `az containerapp revision list`; HTTPS `curl` checks; scoped `az role assignment list` | Deployment succeeded. The active revision is `Healthy`/`Provisioned`, uses the AMD64 digest, and its successful startup verifies managed-identity ACR pull. HTTPS liveness/readiness returned 204; unauthenticated `/v1/health` returned 401. External ingress requires HTTPS, target port is 3000, and the app scales 0–1. No bearer token was sent. Live Entra/JWKS positive/wrong-audience checks and Blob data operations remain not run for P3-G. |
| E-066 | 2026-11-22 | P3-G / deployed wrong-audience rejection | Verify deployed API rejects a wrong-audience token and attempt API-audience authentication | passed (partial gate) | `az account get-access-token --resource <configured API audience>` (failed: AADSTS65001); `az account get-access-token --resource https://management.azure.com/` (passed); authenticated and unauthenticated `GET /v1/health`; `GET /_health/ready` | The wrong-audience request returned 401; unauthenticated health returned 401 and readiness returned 204. The first wrong-audience request timed out after 30 seconds; after readiness returned 204, the retry returned 401. No positive API-audience token was acquired, so positive JWKS acceptance, Blob data operations, stale-revision, traversal, and oversize checks remain not run. No token was logged or retained. |
| E-067 | 2026-11-22 | P3-G / test-client token request | Use the approved test client to request an API-audience token | blocked | OAuth 2.0 client-credentials request to the tenant v2 token endpoint using the local client credential; `az ad app show` lookup did not verify the client in the active tenant | Entra returned AADSTS700016; no token was issued and no API request was made. The credential file was outside the repository and its permissions were restricted from 664 to 600 before use. Credential contents were not logged or retained. Verify the client application ID and tenant before retrying. |
| E-068 | 2026-11-22 | P3-G / test-client token claims | Verify the corrected client credential produces a token usable by the deployed API | blocked | OAuth 2.0 client-credentials request to the v2 token endpoint; local claim comparison against `.azure/api.parameters.json` and `ENTRA_TOKEN_VERSION` | Token acquisition succeeded; audience matched and `SkillLoom.User` was present, but Entra issued `ver: 1.0` with an STS issuer while the deployed API expects the v2 issuer. The token was not sent to the API. No API or Blob operation ran. Align the API registration's requested token version or the deployed API's issuer configuration before retrying. No token or credential was logged or retained. |
| E-069 | 2026-11-22 | P3-G / token-policy decision | Select a consistent v2 token and audience policy | approved | Owner selected v2; Microsoft Learn guidance on app registration token versions; `.azure/deployment-plan.md` Section 12 | Keep strict validation. Set the API resource application's `requestedAccessTokenVersion` to 2 and configure the deployed API audience as the API Application (client) ID; retain `ENTRA_TOKEN_VERSION=2.0`. The owner reconfirmed the existing subscription and East US target. Validation and deployment remain pending. |
| E-070 | 2026-11-22 | P3-G / v2 token-alignment validation | Validate the approved API audience configuration before changing Entra or deploying | passed (validation only) | `npm run build`; `az bicep lint --file infra/p2/api.bicep`; `validate-deployment.sh` for `infra/p2/api.bicep` and `.azure/api.parameters.json`; detailed `az deployment group what-if`; target resource-group policy query; static RBAC review; azure-validate workflow | The first validation-helper run failed because `management.azure.com` did not resolve; after DNS/HTTPS reachability recovered, retry passed CLI authentication, Bicep compilation, group validation, and what-if. Its summary (Create 3, Modify 20, Delete 6) disagreed with detailed ARM output: root `changes` showed one Modify to the existing API Container App and ten Ignore results, with no creates or deletes. An optional `potentialChanges` query failed; the root `changes` query succeeded. The policy query returned 0 assignments. Static review confirmed the service identity's least-privilege roles. No Entra manifest change, deployment, positive API authentication, or Blob-backed P3-G test ran. |
| E-071 | 2026-11-22 | P3-G / API resource token version | Set the API resource application's requested access-token version to v2 | passed (manifest only) | `az ad app show` (verified API app identity and prior setting); `az ad app update --id <api-app-id> --requested-access-token-version 2`; `az ad app show` read-back | The first update attempt used unsupported generic `--set api.requestedAccessTokenVersion=2` syntax and made no change. The dedicated CLI option succeeded; read-back confirmed `requestedAccessTokenVersion=2` on `skill-loom-foundry-api`. No secret/token was used or logged, and the Container App has not yet been redeployed. |
| E-072 | 2026-11-22 | P3-G / v2 API deployment and live verification | Deploy the validated v2 audience configuration and verify the revision, probes, anonymous rejection, and live RBAC | passed (deployment and read-only checks) | `az deployment group create --name slf-p3g-v2-apply-20261122 --resource-group <approved-resource-group> --subscription <approved-subscription> --template-file infra/p2/api.bicep --parameters .azure/api.parameters.json --mode Incremental`; `az containerapp show`; `az containerapp revision list`; HTTPS `curl`; scoped `az role assignment list` | Deployment succeeded with the existing API Container App as the only resource modified. The latest ready revision is Healthy/Provisioned and receives 100% traffic. Liveness/readiness returned 204; anonymous `/v1/health` returned 401. Live roles were present at expected scopes: ACR Pull on the registry, Storage Blob Data Contributor on `documents`, and Key Vault Secrets User on the vault. No write operation ran. |
| E-073 | 2026-11-22 | P3-G / positive v2 API authentication | Verify the approved test client can authenticate to the deployed API under the v2 policy | passed (read-only API request) | Owner-only local credential file (mode 600); v2 client-credentials request with `api://<api-app-id>/.default`; local claim checks; authenticated `GET /v1/health` | Token version, audience, issuer, tenant, expiry, and `SkillLoom.User` role matched the API policy; the deployed API returned HTTP 200. The secret and access token were not printed, logged, or retained. Blob writes, stale-revision, traversal, and oversize checks remain not run pending the owner's decision about test-record cleanup. |
| E-074 | 2026-11-22 | P3-G / live Blob and edge-case checks | Verify API-backed Blob create/read, stale-revision rejection, path-traversal handling, and request-size limits | passed | Owner chose to leave one uniquely named test record; v2 client-credentials token; `PUT /v1/chains/{id}` with `If-None-Match: *`; authenticated `GET`; stale `PUT` with `If-Match: "2"`; encoded traversal `GET /v1/skills/..%2F..%2Fetc%2Fpasswd`; oversized `Content-Length` probe | Create returned 201 with ETag `"1"` and read-back returned 200. The stale write returned 412 `precondition_failed`, traversal returned 404 `not_found`, and oversized request returned 413. A final read confirmed the record remains at revision 1; its ID is recorded only in the local deployment plan. The test was API-backed; the access token and credential were not logged or retained. |
| E-075 | 2026-11-22 | P4-C1 / Foundry MCP registration and transport research | Verify current Foundry MCP registration choices, remote transport requirements, and authentication modes | passed (research only) | [Connect agents to MCP servers](https://learn.microsoft.com/azure/foundry/agents/how-to/tools/model-context-protocol); [Build and register an MCP server](https://learn.microsoft.com/azure/foundry/mcp/build-your-own-mcp-server); [MCP tool authentication](https://learn.microsoft.com/azure/foundry/agents/how-to/mcp-authentication) | Foundry accepts remote MCP endpoints; configure a unique `server_url`/`server_label`, optionally restrict `allowed_tools`, and use the default `require_approval: always` for calls. Registration can be a custom MCP connection, API Center organizational catalog, or Toolbox. Current hosting guidance requires HTTP POST/GET for Container Apps and streamable HTTP with chunked transfer for Functions. Entra supports per-agent identity or shared project managed identity. Recommend custom connection for this PoC; API Center/Toolbox remain alternatives if broader governance/reuse is needed. No MCP server or Foundry connection was created. |
| E-076 | 2026-11-22 | P4-C1 / Foundry registration decision | Select the Foundry MCP registration surface for P4 | approved | Owner selected Foundry Toolbox through `ask_user`; research options and references in E-075 | The Toolbox is the selected registration surface. No Toolbox or Foundry resource has been created; P4-C2 tool mapping and authentication work remain. |
| E-077 | 2026-11-22 | P4-C2 / OpenAPI Toolbox compatibility and authentication review | Assess the existing API contract and identities for the selected Toolbox | passed (research only; output-limit choice pending) | [Connect agents to OpenAPI tools](https://learn.microsoft.com/azure/foundry/agents/how-to/tools/openapi); [Toolbox authentication](https://learn.microsoft.com/azure/foundry/agents/how-to/tools/tool-authentication); `docs/openapi.json`; `src/schemas/serialized-object.ts`; `src/schemas/bundle.ts`; Foundry tool discovery and AI best-practice lookup | Foundry supports OpenAPI 3.0/3.1 tools in a Toolbox; the current 3.1.1 contract uses compatible operation IDs. OpenAPI tools use project connections; the existing Foundry project identity has `SkillLoom.User`, so the `SkillLoom.Admin` operation must be excluded. The Toolbox endpoint has a separate Entra authentication boundary. Existing service limits bound chain objects to 32 MiB and bundles to 20 MiB, which may still be too large for model context. Decide between direct OpenAPI tools with current bounds and a thin MCP adapter with a smaller tool-output cap. No Toolbox, connection, or Azure resource was created. |
| E-078 | 2026-11-22 | P4-C2 / direct OpenAPI Toolbox decision | Select the tool mapping and output-size boundary for the cost-first PoC | approved | Owner selected direct OpenAPI tools inside the Foundry Toolbox through `ask_user` | Use the existing API contract and service limits; exclude the `SkillLoom.Admin` operation. The Toolbox's project managed identity calls the API with `SkillLoom.User`. No separate MCP adapter or lower tool-specific output cap will be added for this PoC. Toolbox registration and live checks remain pending. |
| E-079 | 2026-11-22 | P4-C2 / User-scoped Toolbox OpenAPI mapping | Produce a reusable Toolbox spec from the API contract with only User-authorized operations and bounded schemas | passed (local contract tests; no Foundry registration) | `npm test -- tests/openapi-contract.test.js`; `npm run typecheck`; `npm run build`; `npx eslint src/foundry/openapi-toolbox.ts tests/openapi-contract.test.js`; `npx markdownlint-cli2 docs/articles/azure-skills-experiment.md`; `git diff --check` | Added `createToolboxOpenApiSpec` to replace the placeholder server with a validated HTTPS origin, retain operations whose role policy includes `SkillLoom.User`, validate operation IDs, and omit `/v1/admin/skills`. The OpenAPI contract now documents the 32 MiB serialized-object and 20 MiB decoded-bundle limits and correctly distinguishes the v2 token audience (`aud` is the API client ID) from the requested `api://<application-id>/.default` scope. The targeted test/build/typecheck/lint checks passed. A broader markdownlint run over the plan and article reported 208 MD013 line-length issues; the article-only lint passed after shortening the new heading. No Foundry resource or live Toolbox call was created. |
| E-080 | 2026-11-22 | P4-C3 / Foundry and Copilot identity boundaries | Document each client's identity at the Toolbox and API boundaries | passed (documentation only; direct Copilot auth not live-tested) | [OpenAPI Toolbox flow](https://learn.microsoft.com/azure/foundry/agents/how-to/tools/openapi); [Toolbox authentication](https://learn.microsoft.com/azure/foundry/agents/how-to/tools/tool-authentication); Copilot CLI 1.0.114 MCP documentation; `docs/user-guide.md`; `docs/admin-guide.md`; `npx markdownlint-cli2 docs/user-guide.md docs/admin-guide.md docs/articles/azure-skills-experiment.md` | Foundry's documented Toolbox flow uses an Entra token for the `https://ai.azure.com` Toolbox boundary; its OpenAPI connection calls the API as the shared Foundry project managed identity with `SkillLoom.User`. A direct Copilot CLI connection also needs a bearer token at the Toolbox boundary; the CLI documents OAuth and static bearer headers, but automatic refresh and direct Toolbox compatibility are not verified. The API does not receive the user's identity through the project-managed-identity connection. Markdown lint passed. No tokens or credentials were stored, and no live Toolbox call ran. |
| E-081 | 2026-11-22 | P4-C4 / Toolbox registration and smoke-agent invocation | Register the User-scoped API Toolbox and verify a prompt agent can list and fetch a chain | blocked (resources created; smoke not verified) | `createToolboxOpenApiSpec`; `AZURE_DEV_USER_AGENT=microsoft_foundry_skill AZD_AGENT_SKIP_ROLE_ASSIGNMENTS=true azd ai toolbox create`; `AZURE_DEV_USER_AGENT=microsoft_foundry_skill azd ai connection create`; Azure Foundry MCP `agent_update`, `agent_get`, and `agent_invoke`; `az role assignment list`; Microsoft Graph app-role read-back; `az rest` Responses API attempt; [Toolbox authentication/RBAC](https://learn.microsoft.com/azure/foundry/agents/how-to/tools/tool-authentication); [MCP agent invocation](https://learn.microsoft.com/azure/foundry/agents/how-to/tools/model-context-protocol) | Created Toolbox `skillloom-api` version 1 with the existing User-role-filtered OpenAPI contract; version 1 is default. Created `p4-toolbox-auth` as a `RemoteTool` connection using `ProjectManagedIdentity` for the Toolbox endpoint, and created active prompt agent `p4-chain-smoke` with only list/get tools allowed. Read-back confirmed the Foundry project identity has the API's `SkillLoom.User` app role; the project identity lacks project-scoped Foundry User, and the new agent identity has no Foundry role assignment. Foundry MCP invocation returned 404 for both the new agent and the existing P2A control. A direct REST fallback failed TLS/SSL through the local proxy. No Toolbox tool call reached the API; chain listing/fetch, the downstream managed-identity call, and any required RBAC grant remain unverified. No client secret or access token was read, stored, or logged. |
| E-082 | 2026-11-22 | P4-C4 / runtime identity roles and invocation retry | Grant the documented Foundry role to the approved runtime identities and retry the smoke agent | passed (role assignments); blocked (invocation) | Owner authorization through `ask_user`; `az role definition list`; `az role assignment create --role <Foundry-User-role-id> --assignee-object-id <principal-id> --assignee-principal-type ServicePrincipal --scope <project-resource-id>` for the prompt agent and project identity; identity-specific `az role assignment list` read-backs; Azure Foundry MCP `agent_invoke` | Owner approved Foundry User at the Foundry project scope for the `p4-chain-smoke` identity and the project managed identity. Both assignments were created and read back at that scope. A subsequent invocation still returned 404 `ResourceNotFound` (“Subdomain does not map to a resource”). No tool call reached the Toolbox; chain listing/fetch remains not run. The prior local REST attempt failed TLS/SSL through the proxy, so the exact runtime authentication path is still unverified. |
| E-083 | 2026-11-22 | P4-C6 / untrusted tool output | Document prompt-injection handling for chain, skill, bundle, and MCP content under ADR-0003 and ADR-0009 | passed (documentation and agent prompt only; runtime behavior not tested) | ADR-0003 and ADR-0009; `p4-chain-smoke` instruction and tool allowlist; `docs/user-guide.md`; `docs/admin-guide.md`; Markdown lint | Documented that returned content is data, not policy; embedded instructions do not authorize new tools, writes, or execution. The smoke agent prompt treats chain content as untrusted and allows only list/fetch tools. API role checks and conditional writes remain the enforcement boundary; no successful live agent invocation occurred. |
| E-084 | 2026-11-22 | P4-C7 / Foundry and Copilot user/admin documentation | Document both client boundaries, current setup state, operator controls, and evidence limits | passed (documentation only; Copilot setup and Foundry smoke remain unverified) | `docs/user-guide.md`; `docs/admin-guide.md`; [Foundry MCP authentication](https://learn.microsoft.com/azure/foundry/agents/how-to/mcp-authentication); [Toolbox authentication](https://learn.microsoft.com/azure/foundry/agents/how-to/tools/tool-authentication); `npx markdownlint-cli2 docs/plans/implementation-plan.md docs/user-guide.md docs/admin-guide.md docs/articles/azure-skills-experiment.md`; `git diff --check` | Updated user and administrator guidance for the registered Toolbox, managed-identity boundaries, project-scoped roles, least-privilege tool use, and current invocation failure. Copilot CLI's safe Entra refresh path is explicitly not verified; no access token or client secret is included. Initial plan lint findings were corrected by wrapping prose and list items, fixing checklist headings/spacing and the bare URL, and exempting structural tables from MD013; all four files now lint clean. |
| E-085 | 2026-11-22 | P4-C5 / Copilot CLI Toolbox configuration | Add a least-privilege remote Toolbox MCP configuration sample and verify Copilot CLI setup | blocked (configuration recognized; OAuth pending) | `docs/user-guide.md`; `docs/admin-guide.md`; `docs/releases/unreleased.md`; Copilot CLI 1.0.114 `--additional-mcp-config` JSONL status; unauthenticated Toolbox MCP initialize request; [Toolbox with GitHub Copilot](https://learn.microsoft.com/azure/foundry/agents/how-to/tools/use-toolbox-vs-code); [Toolbox endpoint](https://learn.microsoft.com/azure/foundry/agents/how-to/tools/toolbox); Copilot CLI MCP authentication documentation | Added a placeholder-based configuration exposing only list, get, save, and export operations. Copilot CLI accepted the temporary remote HTTP server configuration but reported `needs-auth`; the endpoint returned 401 with a Foundry Entra challenge. No OAuth sign-in or tool call occurred, so the client smoke test remains not run. No token was stored or logged. |
| E-086 | 2026-11-22 | P4-C4 / Foundry invocation troubleshooting | Retry the read-only smoke agent through the default MCP tool, explicit Responses protocol, and documented REST endpoint | blocked | Azure Foundry MCP `agent_get` and `agent_invoke`; Microsoft Learn prompt-agent REST example; `az account get-access-token` piped to `curl` without printing the token | `agent_get` confirmed the smoke agent is active and points to the Toolbox consumer endpoint. Default invocation returned 404 `ResourceNotFound` (“Subdomain does not map to a resource”); explicit Responses invocation returned 400 `tool_user_error`; a direct request to the documented Responses route returned 404 `ResourceNotFound`. No chain operation completed and no chain was changed. The transient Entra token was not printed, logged, or retained. |
| E-087 | 2026-11-22 | P4-C5 / Copilot CLI OAuth discovery | Investigate the owner's reported authentication failure | blocked (not reproduced locally) | Owner-provided screenshot; `timeout 45s copilot -C /tmp --disable-builtin-mcps --additional-mcp-config '<redacted JSON>' -i '/mcp auth skillloom-toolbox'` | The screenshot shows `MCPOAuthError` because authorization server metadata discovery failed for the Toolbox URL. The local interactive attempt did not reach that error before timing out (`Operation cancelled by user`, exit 124). No token or secret was requested, logged, or retained. Exact reproduction still needs the command and CLI environment that produced the screenshot. |
| E-088 | 2026-11-22 | P4-C5 / Copilot CLI OAuth discovery reproduction | Reproduce and isolate the reported metadata-discovery failure | blocked (reproduced; sign-in and tool operations not completed) | Copilot CLI 1.0.114 minimal `--additional-mcp-config` and `/mcp auth` PTY repro with temporary debug logs; unauthenticated Python HTTP probes of the Toolbox challenge and Protected Resource Metadata URLs; Entra organizations OpenID metadata request; Copilot CLI MCP authentication docs; Microsoft Foundry Toolbox authentication docs | Reproduced `MCPOAuthError` before sign-in. CLI logs show resource-based authorization-server metadata discovery failing with HTTP 404/401. The unauthenticated Toolbox challenge advertises `authorization_uri` and `resource` but not `resource_metadata`; root and path-specific Protected Resource Metadata URLs return 404. Entra organizations OpenID metadata returns 200. This identifies a direct-client OAuth discovery incompatibility, but does not establish which product must change. No token was requested, stored, or logged; no tool call or chain operation ran. |
| E-089 | 2026-11-22 | P4-C4 / new Foundry agent endpoint invocation | Diagnose the smoke agent's `Subdomain does not map to a resource` 404 | blocked (agent metadata readable; invocation not completed) | Azure Foundry MCP `agent_get`; Microsoft Learn [agent endpoint configuration](https://learn.microsoft.com/azure/foundry/agents/how-to/configure-agent) and [agent model migration](https://learn.microsoft.com/azure/foundry/agents/how-to/migrate-agent-applications); direct `GET /agents/p4-chain-smoke?api-version=v1`; direct POST to the documented stable Responses endpoint using a transient `https://ai.azure.com` token, first without query parameters and then with `api-version=2025-11-15-preview` and `Foundry-Features: AgentEndpoints=V1Preview` | `agent_get` and the direct agent metadata GET confirm the prompt agent is enabled and has a stable Responses endpoint. Microsoft documents that the endpoint is active at agent creation; M365/Teams publication is separate. The Azure MCP `agent_invoke` helper uses a legacy Responses route for prompt agents. Both direct POST attempts to the documented stable route returned 404 `ResourceNotFound` (“Subdomain does not map to a resource”), while metadata GET returned 200. This narrows the issue to endpoint routing/provisioning or service support; it does not identify the root cause. The token was used by the probe but not displayed or logged; Azure CLI token-cache behavior was not inspected. No tool call or chain operation completed. |
| E-090 | 2026-11-22 | P4-C4/C5 / direct-API integration spike | Prototype client paths that bypass Foundry Toolbox while preserving Entra authorization | approved; spike in progress | Owner decision via `ask_user`; current API and authentication implementation inspected with `codegraph_explore`; ADR-0002 | Owner chose direct OpenAPI tools for Foundry and a local stdio MCP adapter for Copilot CLI. This is a reversible spike, not an accepted architecture change. No code, Azure resources, or live chain data have been changed for the spike yet. |
| E-091 | 2026-11-22 | P4-C5 / local stdio direct-API adapter prototype | Implement an authenticated local MCP adapter and verify its protocol and conditional-write contract | passed (mock protocol/API checks); blocked (live token acquisition) | `python3 -m py_compile scripts/prototype_skillloom_api_mcp_server.py`; isolated mock HTTP/stdio harness; `az account get-access-token --scope api://<redacted-application-id>/.default`; `az ad app show` (metadata only) | Added a reversible local adapter exposing only list, get, conditional save, and export. The mock harness verified MCP initialize/tool listing, authenticated API requests, ETag reads, conditional create/update, and rejection of a missing revision. The current Azure CLI user received AADSTS65001 while requesting an API token; the API app exposes app roles but no delegated scopes. No live API request or chain operation succeeded, and no Azure resource or chain data changed. |
| E-092 | 2026-11-22 | P4-C4 / direct OpenAPI Foundry setup | Register a project-managed-identity OpenAPI connection and create an isolated read-only prompt agent | passed (connection created and ARM read-back verified); blocked (agent creation) | `AZURE_DEV_USER_AGENT=microsoft_foundry_skill azd ai connection create`; Azure Foundry MCP `project_connection_get`, `agent_definition_schema_get`, `agent_update`, and `agent_get`; Microsoft Learn OpenAPI tool documentation; Azure Resource Manager connection read-back | Created `p4-direct-api-auth` with category `OpenAPI`, `ProjectManagedIdentity`, the P3 API target, and its registered audience. ARM read-back confirmed those properties; the Foundry MCP read-back reports `UnknownConnectionPropertiesV2` and its tool schema omits the documented `project_connection` auth variant. Two `agent_update` attempts returned HTTP 400 `invalid_payload`; `agent_get` confirmed no direct agent was created. No agent invocation or chain operation ran, and no chain data changed. |
| E-093 | 2026-11-22 | P4-C4 / direct OpenAPI agent SDK smoke | Create a least-privilege direct agent and verify list/fetch through the API | passed (version 2 registered and read back with list/get only); blocked (invocation) | `@azure/ai-projects` `AIProjectClient.agents.createVersion` and `deleteVersion`; `@azure/identity` `AzureCliCredential`; Azure Foundry MCP `agent_get`; OpenAI Responses API via `getOpenAIClient` and `agent_reference`; `az role assignment list` | The SDK created `p4-direct-openapi-smoke` with the project connection. The first invocation used the deprecated `agent` field and returned HTTP 400; using `agent_reference` returned HTTP 400 `tool_user_error`. Version 2 exposes only list/get; the superseded version 1 with save/export was deleted, and `agent_get` confirmed version 2 is active. The new agent identity has no project-scoped Foundry User assignment; no role change was made. The temporary conversation was deleted. No chain list/fetch or API call was verified, and no chain data changed. |
| E-094 | 2026-11-22 | P4-C4 / direct agent runtime authorization | Assign the owner-approved Foundry role to the new agent identity and verify scope | passed | Owner authorization via `ask_user`; Microsoft Foundry RBAC guidance; `az role assignment create` with the Foundry User role at the project scope; `az role assignment list` identity-specific read-back | The owner approved Foundry User for `p4-direct-openapi-smoke` at the Foundry project scope. The assignment was created and read back as Foundry User at that exact scope. This closes the known role-assignment gap; the previous generic `tool_user_error` cause is not confirmed, and the read-only invocation retry remains pending. |
| E-095 | 2026-11-22 | P4-C4 / direct agent invocation after role grant | Retry the read-only list/fetch smoke through Foundry MCP and the SDK Responses endpoint | blocked | Azure Foundry MCP `agent_invoke` for version 2; `@azure/ai-projects` Responses API with `agent_reference`; Azure CLI role-assignment read-back | After the approved Foundry User assignment, the Foundry MCP helper returned 404 `ResourceNotFound` (“Subdomain does not map to a resource”); the SDK Responses retry again returned HTTP 400 `tool_user_error`. The active agent remains version 2 with list/get only. Neither request confirmed a chain list/fetch or API call; the temporary conversation was deleted and no chain data changed. |
| E-096 | 2026-11-22 | P4-C4 / API audit correlation and getChain isolation | Determine whether the Responses tool error reaches each API operation | blocked (list live; get not confirmed) | `az containerapp logs show` parsed to audit fields; API audit source `src/api/server.ts`; Azure Monitor AppTraces/AppExceptions counts; SDK Responses call; temporary get-only version and `agent_get` read-back | Correction to E-095: live API audit logs show two `listChains` GET requests returned 200 with `SkillLoom.User`; no `getChain` event was recorded. An isolated get-only version called with a guaranteed nonexistent ID still returned HTTP 400 `tool_user_error` with no `getChain` audit event. The temporary version was deleted and version 4 with list/get only was restored and read back. App Insights traces/exceptions and workspace-exported Container App console logs had no rows; live console logs were needed for the API audit events. No chain body was fetched or modified. |
| E-097 | 2026-11-22 | P4-C4 / getChain path-parameter diagnostic | Test whether moving `chainId` from a path-level to GET-operation parameter lets Foundry dispatch `getChain` | blocked (SDK invocation returned `invalid_payload`; no chain API event) | `@azure/ai-projects` `getVersion`, `createVersion`, `deleteVersion`, and Responses API; `@azure/identity` `AzureCliCredential`; temporary get-only version 5 with operation-level `chainId`; `az containerapp logs show` sanitized audit read; Azure Foundry MCP `agent_get` | The SDK created version 5 with only `getChain` and the path parameter moved onto the GET operation. Invoking it with a guaranteed nonexistent ID returned HTTP 400 `invalid_payload`; the last 200 API console log lines contained one `api.request` event but no `listChains` or `getChain` event. Version 6 with the original list/get specification was restored, read back as active, and the temporary version 5 was deleted. No chain body was fetched or modified. |
| E-098 | 2026-11-22 | P4-C5 / local delegated-auth direction | Select a token path for the Copilot adapter without weakening API authentication | design direction selected; implementation pending | Owner selection via `ask_user`; `codegraph_explore` of the adapter and `src/auth/entra.ts`; `infra/landing-zone/app-roles.json`; Microsoft Learn [expose API scopes](https://learn.microsoft.com/entra/identity-platform/quickstart-configure-app-expose-web-apis) and [app roles in tokens](https://learn.microsoft.com/entra/identity-platform/howto-add-app-roles-in-apps) | The owner selected delegated-scope design for local Copilot authentication. The adapter requests `SKILLOOM_API_SCOPE` via Azure CLI, while the API authorizes the `roles` claim for `SkillLoom.User`/`SkillLoom.Admin`; a scope alone is insufficient. A delegated path also needs client permission/consent and assignment of `SkillLoom.User` to the calling user or group. No app registration, scope, caller-role, or consent changes were made; implementation and live testing remain pending. |
| E-099 | 2026-11-22 | P4-C5 / dedicated public-client decision | Replace Azure CLI token acquisition with user authentication that preserves API role authorization | implementation started; not validated | Owner selection via `ask_user`; `codegraph_explore` of the adapter and API authorization; Microsoft Learn MSAL Python device-code sample; `scripts/prototype_skillloom_api_mcp_server.py`; `scripts/requirements.txt`; `scripts/test_prototype_skillloom_api_mcp_server.py` | The owner selected a dedicated single-tenant public client using device-code authentication and no client secret. The adapter now has an initial MSAL in-memory-cache/device-code implementation and focused tests, but tests have not run. No Entra app registration, delegated API scope, permission/consent, or caller app-role assignment has changed; no live API request or chain operation ran. |
| E-100 | 2026-11-22 | P4-C5 / MSAL adapter local validation | Verify local token-selection, device-code, configuration, and syntax behavior | passed (focused local tests and syntax checks; live authentication not run) | `.venv/bin/python -m unittest discover -s scripts -p 'test_*.py' -v`; `.venv/bin/python -m py_compile scripts/prototype_skillloom_api_mcp_server.py scripts/test_prototype_skillloom_api_mcp_server.py`; `git diff --check` | Four unit tests passed using a fake MSAL public client, covering cached-token reuse, device-code error handling, device instructions on stderr without printing the access token, and required delegated-scope/client configuration. Python compilation and whitespace checks passed. These checks do not contact Entra or the API; no Entra resource or chain data changed. |
| E-101 | 2026-11-22 | P4-C5 / delegated API scope configuration | Define the least-privilege delegated API scope and repeatable public-client provisioning steps | passed (local configuration checks; Entra changes not run) | Read-only `az ad app list` confirmed one `skill-loom-foundry-api` registration with its matching `api://<application-id>` URI and no delegated scopes; Microsoft Learn [expose API scopes](https://learn.microsoft.com/entra/identity-platform/quickstart-configure-app-expose-web-apis) and [device-code flow](https://learn.microsoft.com/entra/identity-platform/scenario-desktop-acquire-token-device-code-flow); `python3 -m json.tool infra/landing-zone/api-scopes.json`; `git diff --check`; `npx --no-install markdownlint-cli2 infra/landing-zone/README.md` | Added admin-consent-only `SkillLoom.Access` scope metadata and documented the dedicated public-client, delegated permission, consent, and user-role setup. JSON parsing and `git diff --check` passed. Markdown lint reported three MD013 line-length issues on existing lines 28, 185, and 193; no Entra application, scope, permission, consent, user role, or chain data was changed. |
| E-102 | 2026-11-22 | P4-C5 / delegated API scope activation | Apply the approved scope to the existing API registration and verify service-principal read-back | passed (scope exposed and read back; client authorization remains pending) | `az ad app update --id <api-app-id> --set api.oauth2PermissionScopes=...` (failed before change; subsequent read-back remained empty); Microsoft Graph `az rest --method PATCH` with `infra/landing-zone/api-registration-patch.json`; `az ad app show` and `az ad sp show` scope read-backs; `python3 -m json.tool`; `git diff --check`; `npx --no-install markdownlint-cli2 infra/landing-zone/README.md` | The Azure CLI `--set` path could not resolve the nested `api` property and made no change; the unchanged empty-scope read-back confirmed that. A Microsoft Graph application PATCH then exposed the admin-consent-only `SkillLoom.Access` scope, verified on both the application and its service principal. Markdown lint still reports three existing MD013 issues at lines 28, 188, and 196. No Copilot client, permission grant, consent, caller role, API call, or chain data changed. |
| E-103 | 2026-11-22 | P4-C5 / dedicated public-client registration | Create and verify the single-tenant client required for local Copilot device-code authentication | passed (registration created and read back; permissions not configured) | Read-only Azure CLI display-name uniqueness check; `az ad app create` with `AzureADMyOrg` and `isFallbackPublicClient=true`; `az ad sp create`; `az ad app owner add`; `az ad app show` and `az ad sp show` | Created `skill-loom-foundry-copilot-cli-poc` as a single-tenant public client, created its service principal, and added the signed-in user as owner. Read-back confirmed the audience, public-client setting, and empty API permissions. No secret or redirect URI was created. API permission, admin consent, user app-role assignment, sign-in, and API operations remain pending. |
| E-104 | 2026-11-22 | P4-C5 / client API permission and caller role | Grant the least-privilege delegated scope and required API role to the authorized local caller | passed (permission, tenant admin consent, and user role read back; sign-in not run) | `az ad app permission add --api-permissions <scope-id>=Scope`; `az ad app permission admin-consent`; `az ad app permission list`; `az ad app permission list-grants`; Microsoft Graph `az rest` read/create/read for `/users/{id}/appRoleAssignments` | The client now requests only `SkillLoom.Access`; the permission grant read-back shows `AllPrincipals` consent for that scope. The signed-in caller has the API's `SkillLoom.User` app-role assignment, confirmed by Graph read-back. No access token was acquired or printed, and no live API request or chain operation ran. |
| E-105 | 2026-11-22 | P4-C5 / defer auth until tool call | Keep MCP initialization and tool discovery available without sign-in while enforcing auth on API operations | passed (mocked protocol/auth tests; live auth not run) | `.venv/bin/python -m unittest discover -s scripts -p 'test_*.py' -v`; `.venv/bin/python -m py_compile scripts/prototype_skillloom_api_mcp_server.py scripts/test_prototype_skillloom_api_mcp_server.py`; `git diff --check` | Changed the adapter to handle initialization, ping, notifications, and tool listing without acquiring a token. It validates `tools/call` parameters before device-code auth, then checks `/v1/health` before calling the API. Six focused tests pass, including the no-auth handshake and authenticated tool-call contract. The tests use fakes; no live sign-in or API request ran. |
| E-106 | 2026-11-22 | P4-C5 / local Copilot workspace configuration | Configure the public-client adapter in the workspace and verify Copilot CLI discovers it | passed (configuration recognized; live auth not run) | `python3 -m json.tool .mcp.json`; `copilot mcp list`; `npx --no-install markdownlint-cli2 docs/user-guide.md docs/admin-guide.md infra/landing-zone/README.md`; `git diff --check` | Added `skillloom-api` to the existing local `.mcp.json` without replacing `md-doc-search`; Copilot CLI lists it as a workspace server. Updated user/admin guidance for device-code authentication and the current Entra permission setup. JSON parsing and diff checks passed; user/admin docs lint clean. The infra README lint still reports three existing MD013 line-length issues. The adapter was not started, so no sign-in, API request, or chain operation occurred. |
| E-107 | 2026-11-22 | P4-C5 / configured stdio handshake | Verify the configured adapter starts and advertises only the intended User operations without prompting for credentials | passed (local protocol check; no sign-in or API request) | Adapter launched with `.mcp.json` environment values; JSON-RPC `initialize` and `tools/list` piped through `scripts/prototype_skillloom_api_mcp_server.py`; Python assertions checked protocol version and tool names | The adapter returned a valid initialize response and advertised exactly `list_chains`, `get_chain`, `save_chain`, and `export_chain_bundle`. No token request, device-code message, `/v1/health` request, or API tool call occurred. The save tool remains unused pending separate owner approval. |
| E-108 | 2026-11-22 | P4-C5 / live Copilot chain listing attempt | List chains through the configured `skillloom-api` MCP server | blocked (MCP transport closed before a tool response) | Owner request; `skillloom-api.list_chains` invocation with default arguments | The MCP runtime returned `MCP request failed: MCP transport closed before the tool responded.` No chain list or API result was received, and no chain data changed. The error does not establish whether the adapter exited, sign-in was unavailable, or the MCP runtime closed the process. Do not infer a root cause without interactive server status or redacted logs. |
| E-109 | 2026-11-22 | P4-C5 / interactive MCP status | Inspect live status and tool availability for `skillloom-api` | confirmed failed (tools unavailable) | Owner-provided interactive `/mcp list` and `/mcp get skillloom-api`; fresh `copilot -i '/mcp list'` attempt did not return status | The interactive CLI reports `skillloom-api — failed: MCP connection closed unexpectedly` and `Tools unavailable`. A fresh automated CLI attempt produced no status output. This confirms connection failure before a usable MCP tool call, but does not identify why the adapter/runtime closed; no API result or chain change is confirmed. |
| E-110 | 2026-11-22 | P4-C5 / post-reload live list attempt | List chains after the owner reloaded MCP servers and Copilot reported all six connected | blocked (transport closed before tool response) | Owner-provided `/mcp reload` and `/mcp list` status; `skillloom-api.list_chains` invocation with default arguments | The reload changed the reported status to connected, but the list request again returned `MCP request failed: MCP transport closed before the tool responded.` No chain list or API result was received. A connected status alone does not verify a successful tool call; root cause remains undetermined. |
| E-111 | 2026-11-22 | P4-C5 / device-code prompt observation | Determine whether the live list attempt initiated visible device-code sign-in | not observed | Owner reports no device-code prompt was shown during the attempt | The adapter calls MSAL device flow only during `tools/call` when silent token acquisition does not return a token, and prints its instructions to stderr. No visible prompt does not prove whether the call reached that path or whether stderr was surfaced. No auth or API result is verified. |
| E-112 | 2026-11-22 | P4-C5 / post-failure MCP status | Check whether the failed list call disconnected the MCP server | still connected | Owner reports `/mcp list` showed `skillloom-api — connected` after the failed agent tool call | The transport closed for the tool request, but the server remained reported as connected afterward. This distinguishes the call failure from a persistent server disconnect; it does not show whether the adapter received the request, started auth, or reached the API. No chain result is verified. |
| E-113 | 2026-11-22 | P4-C5 / diagnostic approval | Obtain approval for temporary, secret-free adapter diagnostics | approved | Owner approval in conversation | The owner approved temporary stderr instrumentation around MCP request receipt and auth/API boundaries. Instrumentation must not log tool arguments, tokens, device codes, or headers and must be removed after the diagnostic probe. |
| E-114 | 2026-11-22 | P4-C5 / temporary diagnostics | Add tagged, redacted markers around MCP tool receipt, auth, health, and tool-call boundaries | local checks passed; live probe pending | `scripts/prototype_skillloom_api_mcp_server.py`; `.venv/bin/python -m unittest discover -s scripts -p 'test_*.py' -v`; `.venv/bin/python -m py_compile scripts/prototype_skillloom_api_mcp_server.py scripts/test_prototype_skillloom_api_mcp_server.py`; `git diff --check` | Six adapter tests, compilation, and whitespace checks passed. Markers contain fixed event names only and do not log arguments, tokens, device codes, or headers. Live diagnostics have not run; remove the instrumentation after the probe. |
| E-115 | 2026-11-22 | P4-C5 / instrumented live probe report | Observe MCP request/auth markers and device-code flow in the owner's CLI | inconclusive (no markers or prompt observed) | Owner reports no `[DEBUG-7c31]` lines, no device-code prompt, and `skillloom-api — connected` after the attempt | The report does not include whether the list call returned data or failed. No visible diagnostics does not establish whether the new adapter process ran or whether stderr was surfaced. Root cause and API outcome remain unknown. |
| E-116 | 2026-11-22 | P4-C5 / Portal storage permission observation | Determine whether the owner's Portal data-plane denial explains the MCP list failure | not established | Owner-provided Azure Portal screenshot showing the signed-in user cannot list Blob data | The screenshot is a data-plane denial for the owner's user identity. The API uses a managed identity for Blob access, and earlier P3-G API create/read checks passed; this screenshot does not establish an API identity failure or explain the MCP timeout. |
| E-117 | 2026-11-22 | P4-C5 / instrumented list result | Capture the read-only list operation result after instrumentation | failed (MCP request timed out) | Owner-provided output: repeated `MCP error -32001: Request timed out`; `limit: 10`; server remained connected; no device-code prompt or debug markers reported | The adapter uses JSON-RPC `-32001` for preflight `AdapterError` responses from authentication or `/v1/health`, but the exact text `Request timed out` is not emitted by the adapter source. It may be a client/runtime timeout. No chain list, auth result, or API health result is confirmed; inspect local stderr through an approved diagnostic channel before changing auth or storage permissions. |
| E-118 | 2026-11-22 | P4-C5 / timeout clarification | Confirm whether either list attempt returned chain data | both attempts timed out | Owner reports Copilot summarized both listings as Skill Loom API timeouts, including the request limited to 10 chains | This confirms no successful list result was shown to the owner, but the summary is not an API audit record and does not identify whether the delay occurred during device auth, health preflight, or the list request. No chain data changed. |
| E-119 | 2026-11-22 | P4-C5 / client timeout trace | Determine the stage and duration of the `limit: 10` list attempt | invoke timeout after approximately 180 seconds | Owner-provided Copilot client trace for `skillloom-api.list_chains` | The trace records stdio invocation start, failure stage `invoke`, MCP error type `Timeout`, and cancellation cleanup delivered after about 180 seconds. This confirms the client waited until its invocation timeout, not an API HTTP status. It does not show whether the adapter was waiting in device-code auth, health preflight, or listing; no API audit result or chain data is confirmed. |
| E-120 | 2026-11-22 | P4-C5 / local debug archive inspection | Check local Copilot logs for adapter markers and invocation outcomes | two invoke timeouts; no markers found | Owner-provided local debug directory; safe parser extracted only marker names and timeout metadata | The event log contains two failed invocations with failure stage `invoke`, MCP error type `Timeout`, and cancellation cleanup delivered. The process log contains no `[DEBUG-7c31]` markers. This does not establish whether the instrumented adapter ran or its stderr was captured; no auth, health, or chain result is verified. |
| E-121 | 2026-11-22 | P4-C5 / authentication UX decision | Choose how to handle device-code auth within Copilot's invoke timeout | selected nonblocking two-step flow | Owner decision after reviewing the 180-second invoke timeout | Preserve the dedicated single-tenant public client and in-memory token cache. Return sign-in instructions promptly rather than blocking a tool call; allow a subsequent call to continue after sign-in. No client secret or persisted token is introduced. |
| E-122 | 2026-11-22 | P4-C5 / nonblocking device-code implementation | Return sign-in instructions promptly and continue MSAL polling outside the tool call | local tests/docs passed; live verification pending | `scripts/prototype_skillloom_api_mcp_server.py`; `scripts/test_prototype_skillloom_api_mcp_server.py`; `.venv/bin/python -m unittest discover -s scripts -p 'test_*.py' -v`; `.venv/bin/python -m py_compile scripts/prototype_skillloom_api_mcp_server.py scripts/test_prototype_skillloom_api_mcp_server.py`; `npx --no-install markdownlint-cli2 docs/plans/implementation-plan.md docs/articles/azure-skills-experiment.md docs/user-guide.md docs/admin-guide.md`; `git diff --check` | The first API tool call now returns device-code instructions without waiting for authentication. A daemon thread completes the MSAL flow in memory; subsequent calls report pending state or continue with the completed token. Six focused tests, compilation, Markdown lint, and whitespace checks passed. Temporary `[DEBUG-7c31]` instrumentation was removed. No live sign-in/API call or chain result has been verified; `save_chain` remains unused. |
| E-123 | 2026-11-22 | P4-C5 / device-code authorization denial | Determine why the live device-code attempt cannot access the API resource | access denied after sign-in; cause unconfirmed | Owner report of Entra sign-in page: authentication succeeded but resource access was denied; AADSTS code not supplied. Existing E-104 confirms a `SkillLoom.User` assignment for a previously configured caller but does not confirm it is the same identity used in this attempt. Microsoft Learn, [AADSTS50105](https://learn.microsoft.com/troubleshoot/azure/entra-id/app-integration/error-code-aadsts50105-user-not-assigned-role) | Microsoft documents AADSTS50105 as an enterprise-app assignment failure when assignment is required and the user lacks a qualifying app-role assignment; the reported generic text alone does not confirm that code or cause. No role, consent, or assignment policy was changed. Token acquisition, API health, and chain listing remain unverified. |
| E-124 | 2026-11-22 | P4-C5 / Security Defaults block device-code flow | Identify the cause of the Entra authorization denial | cause confirmed; replacement flow pending owner decision | Owner-provided AADSTS530035; Microsoft Learn, [authentication error codes](https://learn.microsoft.com/entra/identity-platform/reference-error-codes) and [Security Defaults enforced policies](https://learn.microsoft.com/entra/fundamentals/security-defaults#enforced-security-policies) | Microsoft identifies AADSTS530035 as `BlockedBySecurityDefaults` and states Security Defaults blocks device-code flow. This explains the failure before API token issuance; it is not evidence of a missing API role or delegated scope. Do not disable Security Defaults for this PoC. No tenant settings were changed. MSAL interactive browser acquisition with PKCE and a localhost redirect is the documented alternative under consideration; no replacement has been implemented or live-tested. |
| E-125 | 2026-11-22 | P4-C5 / interactive user authentication | Replace the device-code flow blocked by Security Defaults while retaining delegated user identity | adapter and redirect configured; live verification pending | Owner approval; `scripts/prototype_skillloom_api_mcp_server.py`; `scripts/test_prototype_skillloom_api_mcp_server.py`; `.venv/bin/python -m unittest discover -s scripts -p 'test_*.py' -v`; `.venv/bin/python -m py_compile scripts/prototype_skillloom_api_mcp_server.py scripts/test_prototype_skillloom_api_mcp_server.py`; Microsoft Learn [MSAL interactive token acquisition](https://learn.microsoft.com/entra/msal/python/getting-started/acquiring-tokens#public-clients-interactive-token-acquisition); `az ad app list`, `az ad app update --public-client-redirect-uris http://localhost`, and `az ad app show` read-back; `npx --no-install markdownlint-cli2 docs/plans/implementation-plan.md docs/articles/azure-skills-experiment.md docs/user-guide.md docs/admin-guide.md`; `npx --no-install markdownlint-cli2 infra/landing-zone/README.md` (3 existing MD013 issues); `git diff --check` | Replaced device-code polling with MSAL public-client interactive browser acquisition, which uses PKCE and the same delegated `SkillLoom.Access` scope. The browser flow runs outside the MCP request and has a five-minute timeout. Added and read back the `http://localhost` public-client redirect while preserving single-tenant/public-client settings. Security Defaults remains enabled. Unit tests, compilation, targeted docs lint, and whitespace checks passed. The landing-zone README still has three existing MD013 line-length issues at lines 28, 192, and 200. No live browser sign-in, API request, or chain operation has run. |
| E-125 | 2026-11-22 | P4-C5 / interactive user authentication | Replace the device-code flow blocked by Security Defaults while retaining delegated user identity | adapter and redirect configured; live verification pending | Owner approval; `scripts/prototype_skillloom_api_mcp_server.py`; `scripts/test_prototype_skillloom_api_mcp_server.py`; `.venv/bin/python -m unittest discover -s scripts -p 'test_*.py' -v`; `.venv/bin/python -m py_compile scripts/prototype_skillloom_api_mcp_server.py scripts/test_prototype_skillloom_api_mcp_server.py`; Microsoft Learn [MSAL interactive token acquisition](https://learn.microsoft.com/entra/msal/python/getting-started/acquiring-tokens#public-clients-interactive-token-acquisition); `az ad app list`, `az ad app update --public-client-redirect-uris http://localhost`, and `az ad app show` read-back; `npx --no-install markdownlint-cli2 docs/plans/implementation-plan.md docs/articles/azure-skills-experiment.md docs/user-guide.md docs/admin-guide.md`; `npx --no-install markdownlint-cli2 infra/landing-zone/README.md` (3 existing MD013 issues); `git diff --check` | Replaced device-code polling with MSAL public-client interactive browser acquisition, which uses PKCE and the same delegated `SkillLoom.Access` scope. The browser flow runs outside the MCP request and has a five-minute timeout. Added and read back the `http://localhost` public-client redirect while preserving single-tenant/public-client settings. Security Defaults remains enabled. Unit tests, compilation, targeted docs lint, and whitespace checks passed. The landing-zone README still has three existing MD013 line-length issues at lines 28, 192, and 200. No live browser sign-in, API request, or chain operation has run. |
| E-126 | 2026-11-22 | P4-C5 / live Copilot chain list | Verify the interactive auth path and read-only list operation | owner-reported success: one chain returned | Owner-provided result from another Copilot CLI session: `skillloom-api.list_chains`, `limit: 10`, returned one item, `P3-G live verification` (ID prefix `807cefbb`), one step, updated 2026-11-22 | This confirms a live MCP list result and effective access for that read operation. The response did not include API audit evidence or token claims. No fetch/get, save, export, or unauthorized-identity denial was verified; no chain data was changed. |
| E-127 | 2026-11-22 | P4-C5/P4-G / generic example chains | Add reusable scenario examples and seed owner-approved live records | repository examples schema-validated; live seed blocked before listing; no writes | `examples/chains/*.json`; `tests/schemas.test.js`; `npm test -- tests/schemas.test.js` (11 passed); `node_modules/.bin/markdownlint-cli2 examples/chains/README.md docs/articles/azure-skills-experiment.md` (0 issues); `git diff --check`; configured local adapter call to `list_chains(limit=100)` | Added three version-3 instruction-only examples for feature planning, bug investigation, and change review. The live adapter reached `/v1/health` but timed out before the list operation completed; the save loop was not entered. No live chain records were created. Live list, save, get, and export checks remain not run for these examples; P4-G remains not passed. |
| E-128 | 2026-11-22 | P4-C5/P4-G / Copilot MCP live operations | Verify list, create, fetch, and export against the deployed API and seed approved examples | Copilot-side list/save/get/export passed through the available MCP; local stdio adapter remains unverified | `skillloom-api` MCP `list_chains(limit=10)`; `save_chain` for the three `examples/chains/*.json` documents (HTTP 201, revision 1 each); `get_chain(example-feature-planning)`; `export_chain_bundle(example-feature-planning)`; `npm test -- tests/schemas.test.js` (11 passed); project `.venv` Python adapter tests (6 passed); targeted Markdown lint (0 issues); `git diff --check` | The live list returned the existing chain plus all three examples. Get returned the feature-planning chain at revision 1, and export returned its version-1 bundle. These results verify the available `skillloom-api` MCP path, not the workspace's local stdio adapter or its interactive Entra flow; no token claims or API audit record were returned. An initial system-Python test attempt failed because `msal` was not installed there; the repository `.venv` test run passed. |
| E-129 | 2026-11-22 | P4-C4/P4-G / Foundry direct-agent invocation | Verify the existing read-only Foundry agent can call the direct API | blocked | Azure CLI resource read-back; Azure Foundry MCP `agent_get` and `agent_invoke` for the active direct OpenAPI agent version 6; stable Responses invocation retry | Read-back confirmed the direct agent is active with list/get tools only. The regular Foundry invocation returned HTTP 400 `tool_user_error`; the explicit stable Responses retry returned HTTP 429 `rate_limit_exceeded`. No successful Foundry list/fetch result was produced; save/export were not configured on this read-only agent, no agent permissions were widened, and no unauthorized-identity denial was run. P4-C4 and P4-G remain incomplete. |
| E-130 | 2026-11-22 | P4 validation / final local checks | Validate the recorded P4 state and changed artifacts | targeted checks passed; aggregate `npm run check` blocked at lint | `npm run check`; `node_modules/.bin/eslint src tests`; `npm run typecheck`; `npm test` (41 passed); `npm run docs:check` (0 issues); `.venv/bin/python -m unittest discover -s scripts -p 'test_*.py' -v` (6 passed); targeted Markdown lint (0 issues); `git diff --check` | The aggregate check stopped because ESLint traversed vendored JavaScript under `.venv` and reported 12 `no-undef` errors for browser globals in `urllib3`'s `emscripten_fetch_worker.js`. Source/test lint, TypeScript typecheck, all 41 JavaScript tests, documentation checks, six Python adapter tests, targeted P4 Markdown lint, and whitespace checks passed individually. No lint configuration change was made; P4-G remains blocked by Foundry invocation. |
| E-131 | 2026-11-22 | P4-C4/P4-G / final Foundry invocation retry | Recheck the stable Responses route after the prior rate limit | blocked (`tool_user_error`) | Azure Foundry MCP `agent_invoke` for active direct OpenAPI agent version 6 with `protocol=responses` and `useEndpoint=true` | The retry returned HTTP 400 `tool_user_error` rather than the earlier HTTP 429. No successful Foundry list/fetch result or API audit evidence was produced; no chain data or agent permissions changed. P4-C4 and P4-G remain incomplete. |
| E-132 | 2026-11-22 | P4-C4/P4-G / dedicated Foundry smoke agent | Provide an owner-approved Foundry agent restricted to list/get/save/export on the approved example chains | agent created and read back; invocation blocked | Owner approval via `ask_user`; Azure Foundry MCP `agent_update`, `agent_get`, and `agent_invoke`; agent version 1 tool allowlist read-back | Created active `p4-chain-full-smoke` with only list/get/save/export and the existing Toolbox connection; the original read-only agent was not changed. The new agent invocation returned HTTP 400 `tool_user_error`; no successful operation result or API audit evidence was produced, and no chain data changed. E-135 later reads back the connection's `ProjectManagedIdentity` authentication type. |
| E-133 | 2026-11-22 | P4-C5/P4-G / local stdio live smoke | Exercise the configured local adapter's interactive authentication and list operation | initialize passed; live list blocked before a response | `.mcp.json` executable/argument read-back; local Python stdio harness using the configured `.venv` adapter; `initialize`; `tools/call(list_chains, limit=10)` | The adapter returned browser-sign-in-started/pending twice; the next list request produced no MCP response within 15 seconds and the harness ended. It did not confirm browser callback completion, API health, or a chain list. No token was displayed or persisted, and no chain data changed. |
| E-134 | 2026-11-22 | P4-C4/C5/P4-G / live adapter and Foundry diagnosis | Record the successful local adapter retry and inspect the new Foundry identity's project role | local list smoke passed; Foundry invocation remains blocked | Local stdio adapter retry with 45-second harness wait; Azure Monitor workspace query of `ContainerAppConsoleLogs_CL`; Azure CLI project-scope role-assignment read-back for `p4-chain-full-smoke` | The adapter completed interactive auth; API audit records show `getHealth` and `listChains` returned 200. This completes the P4-C5 smoke check but does not cover local adapter get/save/export. The project-scope role query returned no assignments for the new Foundry agent identity. This is a permission gap to resolve only with owner approval, not a proven cause of `tool_user_error`; no role or chain data changed. |
| E-135 | 2026-11-22 | P4-C4/P4-G / approved Foundry runtime role and retry | Grant the separately approved agent runtime role and retry the four-operation smoke | role assignment succeeded; invocation still blocked | Owner approval via `ask_user`; Azure CLI role assignment create and identity-specific read-back; connection auth metadata read-back; Azure Foundry MCP `agent_get` and `agent_invoke`; narrow Azure Monitor queries for chain-operation logs and the invocation request | Assigned and verified Foundry User for `p4-chain-full-smoke` at project scope. Its Toolbox connection uses ProjectManagedIdentity, and that project identity also has Foundry User. `agent_get` confirmed version 1 remained active; the retry still returned HTTP 400 `tool_user_error`. Narrow queries returned no matching API operation record or AppTraces row, which does not establish the failure point. No chain data changed; P4-C4/P4-G remain incomplete. |
| E-136 | 2026-11-22 | P4-C4/P4-G / Foundry OpenAPI write-contract correction | Align the smoke-agent save instruction with the Toolbox contract and retry | prompt corrected; invocation still blocked | Azure Foundry MCP `toolbox_version_get` for Toolbox version 1; `agent_update` and active-version read-back; `agent_invoke` for version 2; narrow Azure Monitor queries for API operation logs and the invocation request | Toolbox version 1 exposes the four allowed operation names; `saveChain` uses the `If-Match` ETag header, not an `expectedRevision` field. Updated the agent prompt to use that conditional-write contract, preserve the fetched document, and never retry. Version 2 remained active, but invocation returned HTTP 400 `tool_user_error`; narrow queries returned no matching API operation record or AppTraces row. No chain data changed; P4-C4/P4-G remain incomplete. |
| E-137 | 2026-11-23 | P4-C4/C5 / Toolbox root cause and read-only verification | Resolve tool errors without widening roles or writing chains | direct Toolbox health/list/fetch and Copilot list/fetch passed; full agent smoke rate-limited | Foundry `agent_get`/`agent_invoke`; authenticated Toolbox `tools/list` and `tools/call`; stable streamed Responses; `azd ai connection create/show`; Toolbox version create/promote; `skillloom-api` list/get; `npm test -- tests/openapi-contract.test.js` (11 passed); `npm run typecheck`; focused ESLint; `npm run build`; targeted Markdown lint; `git diff --check` | Toolbox version 1 returned `managed_identity auth but no audience`; current Learn guidance requires an OpenAPI project connection. Created secretless `p4-api-auth`, then Toolbox version 2 with `project_connection` authentication and inline operation parameters. The old converter omitted referenced and path-level parameters; two regression tests failed before the mapper fix and passed afterward. Version 2 health/list/fetch succeeded before promotion; generated schemas include chainId, pagination, and conditional headers. Promoted version 2 and pinned the read-only agent without expanding tools. A streamed original-agent response completed listing, then hit model throttling; final agent version-2 invocation returned 429. Deployment read-back shows 1 request and 1,000 tokens per minute. The throughput-increase approval request was cancelled; capacity stayed 1. Copilot browser sign-in and an initial API timeout were followed by readiness 204, unauthenticated health 401, and successful list/get. Cold start is possible, not proven. No chain writes, role changes, secrets, or persisted tokens. Full Foundry list/fetch and P4-G remain unverified. |
| E-138 | 2026-11-23 | P4-C4 / approved temporary capacity and live agent smoke | Complete Foundry list/fetch and restore the original deployment | passed (live agent smoke and restoration) | Owner approval via `ask_user`; Azure CLI deployment/model/quota/capacity reads; ARM deployment PUT and read-back; stable streamed Responses with `agent_reference` for `p4-chain-smoke` version 2 | Temporarily raised existing GPT-4.1-mini GlobalStandard capacity from 1 to 10 and verified 10 requests/10,000 tokens per minute. Corrected Toolbox schemas exposed chainId and pagination. Both listChains and getChain completed without tool errors; overall response status completed, smoke assertion passed. A finally block restored capacity 1 and verified 1 request/1,000 tokens per minute; original model, Microsoft.DefaultV2 content filter, and version-upgrade policy matched. No new resource, role grant, chain write, or persisted token. P4-C4 complete; Foundry save/export and unauthorized-identity denial not run in this check. P4-G remains open; low restored throughput can still throttle future turns. |
| E-139 | 2026-11-23 | P4 / owner-approved ongoing model capacity | Leave GPT-4.1-mini at capacity 10 without changing billing SKU or policies | passed (live deployment read-back) | Owner approval in conversation; Azure CLI regional quota read; ARM deployment PUT; independent Azure CLI deployment reads | Increased GlobalStandard capacity from 1 to 10 after confirming sufficient quota. Independent reads verified Succeeded, 10 requests/10,000 tokens per minute, the original model version, Microsoft.DefaultV2 content filter, and OnceNewDefaultVersionAvailable upgrade policy. The ARM CLI call did not return promptly; its local waiter was stopped only after independent reads confirmed the requested state. Capacity 10 remains allocated on the existing pay-per-token SKU. No model invocation, chain write, role change, or new resource; Foundry save/export and unauthorized-identity denial not run. P4-G remains open and hosted execution remains disabled. |
| E-140 | 2026-11-23 | P4-C4/C5/P4-G / smoke continuation | Resume Copilot API checks and run the configured Foundry list/fetch/save/export agent | Copilot targeted get passed at unchanged revision; list timed out; Foundry invocation blocked | Owner-confirmed Entra browser sign-in; `skillloom-api` MCP `list_chains(limit=20)` and `get_chain(example-feature-planning)`; Azure Foundry MCP `agent_get` and `agent_invoke` for `p4-chain-full-smoke` version 2; Azure MCP resource-group inventory | The first Copilot list call started browser sign-in. After the owner confirmed sign-in, a list retry timed out; a targeted get then returned `example-feature-planning` at revision 1, matching E-128. The enabled Foundry full-smoke agent was read back with its list/get/save/export instructions, but invocation returned HTTP 400 `tool_user_error` without operation-level results. The tested chain remains at revision 1; no write is evidenced. Foundry save/export are unverified, unauthorized-identity denial is `not run`, and P4-G remains open. |
| E-141 | 2026-11-23 | P4-C4/P4-G / operation-level audit correction | Determine which API operations ran before the Foundry invocation failed | Foundry list/get passed; save failed; export not run; no revision change | Azure Monitor MCP `monitor_workspace_log_query` on `ContainerAppConsoleLogs_CL`, filtered to chain operations and status; `skillloom-api` MCP `get_chain(example-feature-planning)`; API source and Toolbox version 2 OpenAPI contract inspection | Audit logs show the Foundry run's `listChains` and `getChain` returned 200, followed by `saveChain` HTTP 400 `invalid_request`; no `exportChainBundle` request appears. A subsequent get returned revision 1, confirming the write did not commit. The active API contract requires a strong quoted decimal `If-Match` ETag, while the smoke agent receives the revision through the Toolbox response. The exact malformed request value is not present in the audit record. Foundry save/export remain incomplete; unauthorized-identity denial is `not run`, so P4-G remains open. |
| E-142 | 2026-11-23 | P4-G / corrected Foundry smoke agent version 3 | Retry the conditional save with the API's quoted revision ETag and continue to export | list/get passed; save failed with HTTP 422 `invalid_document`; export not run; no revision change | Owner approval via `ask_user`; Azure Foundry MCP `agent_update`/`agent_invoke` and streamed tool-call output; Azure Monitor MCP `monitor_workspace_log_query`; `skillloom-api` MCP `get_chain(example-feature-planning)` | Version 3 preserved the four-tool allowlist and used the exact `If-Match` value `"1"`, but its save tool arguments also included an empty `If-None-Match` value. API audit records list/get 200 and save 422 `invalid_document`; no export request appears. A subsequent get confirms revision 1. The audit omits the body-validation details, so the cause of `invalid_document` is not confirmed. Foundry save/export remain incomplete; unauthorized-identity denial is `not run`, and P4-G remains open. |
| E-143 | 2026-11-23 | P4-G / Toolbox save-input schema correction | Expose chain-step fields to the Foundry save tool without weakening API validation | passed (local regression/build checks); live Toolbox validation pending | `src/foundry/openapi-toolbox.ts`; `tests/openapi-contract.test.js`; `docs/openapi.json`; `npm test -- tests/openapi-contract.test.js` (12 passed); `npm test` (44 passed); `npm run typecheck`; `npm run build`; targeted `npx eslint`; `npm run docs:check`; Markdown lint for the implementation plan and article; `git diff --check` | The default Toolbox v2 request body referenced `Chain`; `Chain.steps.items` referenced the `oneOf` `ChainStep`, while Foundry's generated save input exposed empty item properties. The Toolbox mapper now inlines the save request's chain schema with explicit step fields, without changing `docs/openapi.json`, the API's strict `ChainSchema`, role filtering, or conditional-write enforcement. All listed focused checks passed. `npm run check` was attempted but stopped at repository-wide ESLint errors in the existing `.venv` vendored urllib3 Emscripten worker; targeted ESLint passed. No API deployment, Toolbox version creation, chain write, or export occurred. Live verification and unauthorized-identity denial remain `not run`; P4-G remains open. |
| E-144 | 2026-11-23 | P4-G / Azure deployment preflight | Validate the deployment boundary and avoid unrelated API changes | passed (read-only checks); API deployment excluded by detailed what-if | `azure-validate` workflow; `validate-deployment.sh` against `infra/p2/api.bicep`; `az bicep lint`; detailed `az deployment group what-if`; Azure Policy MCP `policy_assignment_list`; static RBAC and Node runtime review; `npm run build`; `npx eslint . --ignore-pattern '.venv/**'` | The validation helper passed authentication, compilation, resource-group validation, and what-if; Bicep lint and build passed. Its summary reported Create 3/Modify 17/Delete 6, while the detailed root `changes` collection showed one Modify to the existing API Container App and ten Ignore results, with no creates or deletes. The proposed API delta changes ingress traffic, probes, and scale timing, not the image; no API deployment will run. Azure Policy MCP returned three inherited management-group policies. Repository-wide lint passed excluding `.venv`; aggregate `npm run check` still fails only because `eslint .` scans vendored urllib3 code in `.venv`. No API or Foundry resource changed. P4-G remains open, save/export and unauthorized-identity denial remain `not run`. |
| E-145 | 2026-11-23 | P4-G / Toolbox version 3 registration attempt | Register and read back the corrected OpenAPI schema before promotion | blocked (payload mismatch detected; version not promoted or endpoint-tested) | Microsoft Foundry skill; Azure Foundry MCP `toolbox_version_create` and `toolbox_get`; Node.js deep comparison with the locally generated Toolbox specification | Toolbox version 3 was created, but comparison with the local generated payload found five structural differences, including a `FingerprintETag` pattern mismatch and `responses`/`schemas` nested under `components.headers`. Read-back confirmed version 2 remains the default. Version 3 was not endpoint-tested or promoted; no API operation or chain data changed. Create a fresh version from the exact generated payload. P4-G remains open. |
| E-146 | 2026-11-23 | P4-G / Toolbox version 4 registration attempt | Retry version creation with the corrected save schema | blocked (read-back still differs from the generated specification; version not promoted or endpoint-tested) | Azure Foundry MCP `toolbox_version_create` and `toolbox_get`; local generated Toolbox specification | Version 4 retained the explicit save-step fields and project connection, but read-back inspection showed an incomplete `Error` response schema, a truncated `ChainBundle`/`BundleChainV2Fields`, and missing component schemas. Version 2 remains the default. Version 4 was not endpoint-tested or promoted; no API operation or chain data changed. Use the documented Foundry REST version-create endpoint with the local generated payload file to avoid manual transcription. P4-G remains open. |
| E-147 | 2026-11-23 | P4-G / Toolbox version 5 registration | Register the exact locally generated OpenAPI payload | passed (version created; exact payload comparison passed; endpoint validation pending) | Microsoft Foundry skill; Azure REST `POST /toolboxes/skillloom-api/versions?api-version=v1`; `az account get-access-token --resource https://ai.azure.com`; `curl`; Node.js deep comparison | The documented REST create call returned Toolbox version 5. Its returned tool array matched the locally generated payload exactly (zero differences), including project-connection authentication and explicit save-step fields. A separate Toolbox read-back and version-specific `tools/list` are still pending; the default pointer has not been changed. No API operation or chain data changed. P4-G remains open. |
| E-148 | 2026-11-23 | P4-G / Toolbox version 5 endpoint validation | Verify the new version and required tool schemas before promotion | passed (read-back and version-specific tools/list); promotion and agent smoke pending | Azure Foundry MCP `toolbox_get`; version-specific MCP `tools/list` via `curl` with an Azure CLI token; Node.js schema assertions | Read-back confirmed version 5 is latest, version 2 remains default, and the registered tool array exactly matches the local generated spec. The version-specific endpoint returned HTTP 200 and listed all seven operations, including the four allowed by the smoke agent. `saveChain.body.steps.items` exposes `id`, `instruction`, `label`, `kind`, `skillName`, and `skillBinding`; `If-Match` is available and `If-None-Match` is not required. No chain operation ran. P4-G remains open. |
| E-149 | 2026-11-23 | P4-G / Toolbox version 5 promotion | Make the validated Toolbox version the default for the existing agent endpoint | passed (default pointer verified); live agent smoke pending | Azure Foundry MCP `toolbox_update`; Node.js read-back of the returned Toolbox configuration | Version 5 is now the default, with the existing `p4-api-auth` project connection and the same consumer endpoint used by the active agent. Version 2 remains available as rollback. No agent definition, allowlist, API operation, or chain data changed. P4-G remains open pending the live agent smoke. |
| E-150 | 2026-11-23 | P4-G / single approved Foundry smoke after Toolbox promotion | Verify list/fetch/conditional save/export through active smoke agent version 3 | blocked (`agent_invoke` returned HTTP 400 `tool_user_error`); no API operation evidenced | Microsoft Foundry skill; Azure Foundry MCP `agent_get`/`agent_invoke`; Azure Monitor MCP `monitor_workspace_log_query` on `ContainerAppConsoleLogs_CL` and `AppTraces` | The single approved invocation failed with a generic tool error. A two-hour API audit query found no chain-operation event for this invocation; the AppTraces lookup by request ID returned no rows. No save/export is evidenced. The last verified chain revision is 1 (E-142); it was not re-read after this failure. The one approved smoke attempt is consumed; obtain owner approval before another live attempt. Unauthorized-identity denial remains `not run`; P4-G remains open. |
| E-151 | 2026-11-23 | P4-G / post-failure chain read-back | Confirm whether the failed Foundry invocation changed the existing chain | passed (read-only `skillloom-api` MCP get); Foundry save/export still unverified | `skillloom-api` MCP `get_chain(example-feature-planning)` | The post-failure read returned `example-feature-planning` at revision 1. This supersedes E-150's then-current note that the chain had not been re-read; it confirms no revision advance, but does not establish a successful Foundry save or export. No additional write or export was made. P4-G remains open; another live Foundry smoke needs owner approval. |
| E-152 | 2026-11-23 | P4-G / owner-approved additional Foundry attempt | Authorize exactly one further live smoke after E-150 failed before an API operation | approved; invocation pending | Owner choice via `ask_user` (`authorize_retry`); `project-execution-journal` skill | The owner authorized one additional Foundry smoke invocation after the previous single attempt returned `tool_user_error`. No agent, Toolbox, API, or chain state changed with this approval. Run only one additional invocation; P4-G remains open until save/export evidence succeeds. |
| E-153 | 2026-11-23 | P4-G / additional approved Foundry smoke | Retry the four-operation agent smoke with Toolbox version 5 as default | blocked (list/get passed; save returned HTTP 422 `invalid_document`; no export) | Azure Foundry MCP `agent_invoke` for smoke-agent version 3; Azure Monitor MCP `monitor_workspace_log_query` on `ContainerAppConsoleLogs_CL` and `AppTraces`; `skillloom-api` MCP `get_chain` | Audit records show `listChains` and `getChain` returned 200, followed by `saveChain` 422 `invalid_document`; no `exportChainBundle` request appears. AppTraces lookup by the Foundry request ID returned no rows. A post-failure get confirmed revision 1. The submitted body and detailed validator result are unavailable, so the failure cause is not established. The owner-approved additional attempt is consumed; another live invocation requires new approval. Unauthorized-identity denial remains `not run`; P4-G remains open. |
| E-154 | 2026-11-23 | P4-G / owner-authorized follow-up | Authorize one focused Toolbox save-schema diagnosis/correction, validated Toolbox version promotion if needed, and exactly one additional Foundry smoke | approved; work pending | Owner choice via `ask_user`; `project-execution-journal` skill | The owner authorized one further focused correction round and exactly one additional live smoke after local contract checks and remote version validation. No resource or chain state changed with this approval. It does not authorize API/Bicep deployment, changes to the agent allowlist or authentication, or any further smoke attempts. P4-G remains open. |
| E-155 | 2026-11-23 | P4-G / local Toolbox save-schema contract correction | Align the flattened Foundry step schema with the API's strict `ChainStepSchema` variants | passed locally; remote validation pending | `tests/openapi-contract.test.js`; `npm test -- tests/openapi-contract.test.js` (12 passed; regression first failed against the permissive schema); `npx --no-install eslint src/foundry/openapi-toolbox.ts tests/openapi-contract.test.js`; `npm run typecheck`; `docs/adr/0004-schema-ownership-and-interchange.md` | The Toolbox save-step schema now retains its explicit fields and adds mutually exclusive skill/instruction constraints: skill steps require `skillName` and allow omitted or `skill` kind; instruction steps require `kind: instruction` and forbid `skillName`. API `ChainSchema`, OpenAPI, headers, role filtering, and API deployment scope are unchanged. The local regression was red before the mapper change and passed afterward; focused ESLint and typecheck passed. This aligns known API constraints but does not prove which detail caused the unavailable prior request to fail. No remote Toolbox version or chain state changed; version-specific remote validation and the one authorized smoke remain pending. |
| E-156 | 2026-11-23 | P4-G / Toolbox v6 validation and promotion | Publish the local step-variant contract only after exact read-back and version-specific MCP validation | passed (v6 default; v5 rollback retained) | Azure Foundry MCP `toolbox_get`/`toolbox_update`; Azure REST version create/get/list; Azure CLI access-token acquisition; version-specific MCP initialize and `tools/list`; Node.js exact payload comparison | Generated Toolbox v6 from the local source and retained the existing project connection, server origin, and seven User-scoped operations. REST read-back exactly matched the submitted tool payload. Version-specific initialize and `tools/list` returned HTTP 200; all seven tools were listed, and the save schema retained explicit step fields plus both matching `oneOf` variants. Promoted v6; default read-back confirmed v6, and the REST version list confirmed v5 remains available. No agent invocation or chain operation occurred. The one authorized final smoke is now ready; P4-G remains open pending its result. |
| E-157 | 2026-11-23 | P4-G / final owner-authorized smoke after Toolbox v6 | Verify list/fetch/conditional save/export using the validated v6 default | blocked (list/get passed; save returned HTTP 422 `invalid_document`; no export) | Azure Foundry MCP `agent_invoke` for `p4-chain-full-smoke` v3; Azure Monitor MCP `monitor_workspace_log_query` on `ContainerAppConsoleLogs_CL` and `AppTraces`; `skillloom-api` MCP `get_chain(example-feature-planning)` | The single authorized invocation returned HTTP 400 `tool_user_error`. API audit records show list/get 200 followed by save 422 `invalid_document`; no export request appears. AppTraces queries by both Foundry and API request IDs returned no rows. No read-only Foundry MCP command for fetching this run's trace was found. Post-failure get confirmed revision 1. Version 6's version-specific `tools/list` had preserved the two step variants. The request body was not available at the time; the owner later supplied it and the local replay is recorded in E-158. This authorized invocation is consumed; another live attempt requires new owner approval. Unauthorized-identity denial remains `not run`; P4-G remains open. |
| E-158 | 2026-11-23 | P4-G / save request diagnosis from owner-supplied body | Reproduce and isolate the `422 invalid_document` without another live write | diagnosed locally; live correction/smoke pending fresh approval | Owner-supplied `saveChain` input; CodeGraph inspection of `ChainSchema`, `dispatch`, and `exportChainBundle`; Node.js local HTTP replay through `createApiServer` with mocked persistence; `examples/chains/feature-planning.json` | The exact body reproduced HTTP 422 `invalid_document` through the local API route. `ChainSchema` reported only four invalid paths: `agent.revision` (`"1"`), `agent.repositoryPath`, `agent.agentPath`, and `agent.fingerprint` (the latter three empty). The body added `agent` metadata absent from the local seed example. A replay with schema-valid synthetic agent metadata and the same `If-Match: "1"` returned local HTTP 200 and passed expected revision 1 to mock persistence, confirming the request precondition and remaining fields were valid. The exporter rejects any chain containing `agent`; omitting that field is necessary for this instruction-only chain to reach export. A follow-up live get timed out; the latest verified revision remains 1 from E-157. This validates the local route/schema with mocks only; no live API, Blob write, source change, or further smoke occurred. Another live invocation requires fresh owner approval; P4-G remains open. |
| E-159 | 2026-11-23 | P4-G / owner-authorized prompt-only correction | Correct the existing smoke-agent instruction so the save body does not synthesize `agent` metadata; verify the definition and run exactly one live smoke | approved; v4 update/read-back passed; smoke pending | Owner choice via `ask_user`; `microsoft-foundry` and `project-execution-journal` skills | The owner authorized one prompt-only update to `p4-chain-full-smoke`, followed by definition read-back and exactly one list/fetch/save/export attempt. API, Toolbox schema, deployment, and authentication changes are excluded. Evaluation-suite generation was explicitly skipped. The prompt correction and read-back are recorded in E-160. No chain state changed. P4-G remains open until the authorized live save and export succeed; no further attempt is authorized. |
| E-160 | 2026-11-23 | P4-G / smoke-agent prompt correction | Prevent the smoke agent from adding unsupported chain `agent` metadata | passed (active version 4 read back); live smoke pending | Azure Foundry MCP `agent_update` and `agent_get`; `microsoft-foundry` and `project-execution-journal` skills | Updated and read back `p4-chain-full-smoke` version 4. The explicit no-synthesized-`agent` instruction is present; model `gpt-4.1-mini`, temperature 0, `skillloom` MCP URL, `p4-toolbox-auth` connection, and the same four-operation allowlist were preserved. No API, Toolbox schema, deployment, authentication, or chain state changed. Evaluation-suite generation was skipped per owner choice. Exactly one live smoke remains authorized; P4-G remains open. |
| E-161 | 2026-11-24 | P4-G / final Foundry smoke and post-save read-back | Complete the one authorized v4 list/fetch/conditional-save/export smoke and confirm the stored chain revision | passed (all four API operations HTTP 200; post-read revision 2) | Azure Foundry MCP `agent_invoke`; Azure Monitor MCP API audit query; `skillloom-api` MCP `get_chain(example-feature-planning)`; `microsoft-foundry` and `project-execution-journal` skills | The single E-159-authorized invocation completed list/get/save/export. API audit events at 2026-11-24 07:17:23–07:17:28 UTC show `listChains`, `getChain`, `saveChain`, and `exportChainBundle` all returned HTTP 200. The save used `If-Match: "1"` and omitted `agent`; a post-save read confirmed `example-feature-planning` at revision 2 with no `agent` property. Combined with Copilot-side list/save/get/export evidence in E-128, P4-G passes. Unauthorized-identity denial remains `not run` as allowed by the gate. No further smoke or API deployment was run; hosted chain execution remains disabled pending P5. |
| E-162 | 2026-11-24 | P5-C1 / Copilot CLI job authentication research | Compare the owner's existing-account suggestion with documented local, headless, GitHub Actions, and Azure-job authentication boundaries | research recorded; owner decision pending | [Authenticating GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli); [Running GitHub Copilot CLI programmatically](https://docs.github.com/en/copilot/how-tos/copilot-cli/automate-copilot-cli/run-cli-programmatically); [Using Copilot CLI in GitHub Actions with `GITHUB_TOKEN`](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli-in-actions); owner question via `ask_user`; CodeGraph repository exploration | GitHub documents environment-token authentication for headless CLI use and local `gh` authentication as a fallback; the token is not inherited automatically by an Azure Container Apps Job. The job's Entra identity for Skill Loom API/MCP access is separate from GitHub Copilot authentication. The GitHub Actions `GITHUB_TOKEN` route applies to Actions, not Azure Container Apps Jobs. The owner asked whether their existing CLI account could be used; approval to provide a personal-account token to cloud jobs is not established. No credential, Azure resource, hosted job, or live harness run was created or changed. P5-C1 remains open. |
| E-163 | 2026-11-24 | P5-C1 / owner runner-scope clarification | Record the owner’s preference to keep personal Copilot authentication local and identify the intended Foundry-only hosted-runner use | personal account stays local; runner execution model needs clarification | Owner response via `ask_user`; P5 scope and exit gate in this plan | The owner said Foundry agents are the only expected users of the cloud runner, with the key workflows being discover/fetch Azure skills and chains for local execution or upload locally created chains to the hosted service. This does not authorize personal credentials in Azure. The plan’s P5 runner currently drives Copilot CLI inside the job; it is unresolved whether Foundry should trigger that job under a separate identity or perform chain execution itself. No implementation, credential, Azure resource, or live run changed. P5-C1 remains open. |
| E-164 | 2026-11-24 | P5 / owner defers hosted execution | Defer P5 and prioritize P4 workflows for discovering/fetching Azure skills and chains, local execution, and submitting chains to the hosted service | P5 deferred by owner | Owner decision via `ask_user`; P5 scope in this plan | The owner selected `defer_hosted_execution`, keeps their personal Copilot account local, and asked to focus on P4 discover/fetch/export/save and local-copy workflows. No P5 code, credentials, Azure resources, or hosted jobs were changed or created. Further P4 work must first verify which transfer workflows already exist. |
| E-165 | 2026-11-24 | P4-C8 / local Copilot skill discovery and transfer | Expose reviewed-skill search/get through the local API MCP and document user-directed local transfer | passed local tests; live catalog operations and local copy not run | `scripts/prototype_skillloom_api_mcp_server.py`; `scripts/test_prototype_skillloom_api_mcp_server.py` (9 tests); `.venv/bin/python -m py_compile scripts/prototype_skillloom_api_mcp_server.py scripts/test_prototype_skillloom_api_mcp_server.py`; `npx markdownlint-cli2 docs/plans/implementation-plan.md docs/user-guide.md docs/articles/azure-skills-experiment.md`; `git diff --check` | Added User-scoped `search_skills` and `get_skill` tools to the local MCP adapter, with bounded query/limit/cursor/name inputs and URI-encoded skill names. Documented that MCP returns untrusted content for user-directed local copying; the adapter does not write local files. Tests mock API requests only: live skill search/get, local repository writes/import, and hosted execution are `not run`. P4-G remains passed; P5 remains deferred by owner decision E-164. |
| E-166 | 2026-11-24 | P4-C9 / admin workflow decision and live catalog search | Select an operator interface and safe removal rule; begin owner-approved read-only live catalog verification | local CLI selected; removal blocked while referenced; live search succeeded with an empty catalog | Owner choices via `ask_user`; Azure best-practices MCP; CodeGraph; local API MCP adapter and `python3`; `md-doc-search`; project-execution-journal skill | The owner selected a local admin CLI, removal blocking while a chain references a skill, and read-only live checks. The first authenticated search attempt timed out at the API health check; an unauthenticated health probe returned the expected 401, and a retry completed live skill search successfully with zero catalog items. No catalog write was attempted. A successful skill-detail read could not be exercised because the catalog is empty. |
| E-167 | 2026-11-24 | P4-C9 / local reviewed-skill administration | Add a local admin CLI and Admin-only conditional removal that refuses to delete referenced skills; verify live catalog access without writing | implementation and local checks passed; live CLI search returned an empty catalog; absent-skill detail returned 404; positive detail pending | `scripts/skillloom_admin.py`; `scripts/test_skillloom_admin.py`; `src/skills/catalog.ts`; `src/auth/entra.ts`; `src/api/server.ts`; `docs/openapi.json`; `npm test -- tests/skills-catalog.test.js tests/api-server.test.js tests/openapi-contract.test.js` (27 passed); `npm run typecheck`; `.venv/bin/python -m unittest discover -s scripts -p 'test_*.py' -v` (12 passed); `.venv/bin/python -m py_compile scripts/prototype_skillloom_api_mcp_server.py scripts/skillloom_admin.py scripts/test_prototype_skillloom_api_mcp_server.py scripts/test_skillloom_admin.py`; `npx eslint src/skills/catalog.ts src/auth/entra.ts src/api/server.ts tests/skills-catalog.test.js tests/api-server.test.js tests/openapi-contract.test.js`; `npx markdownlint-cli2 docs/plans/implementation-plan.md docs/articles/azure-skills-experiment.md docs/user-guide.md docs/admin-guide.md`; `git diff --check` | Added `list`, `get`, `add`, and `remove` CLI commands using the local MCP configuration and interactive Entra auth. Skill additions read bounded local directories and require confirmation; removal uses `If-Match` and checks every stored-chain page before deleting. Added the Admin-only DELETE API route and OpenAPI contract. Live read-only CLI listing succeeded at catalog revision 1 with zero entries; a detail request for an absent probe name returned the expected 404. No catalog writes or Azure changes were made. Positive live detail retrieval remains pending P4-C10; P5 remains deferred. |
| E-168 | 2026-11-24 | P4-C9 / reference-guard concurrency review | Verify whether the chain-reference check is atomic with concurrent chain saves | non-atomic race identified; stronger coordination pending P4-C11 | CodeGraph; repository source review; project-execution-journal skill | Catalog removal scans chain Blob documents and then conditionally updates the separate catalog Blob. A concurrent chain save can occur after the scan and before removal, so the current guard protects against references found during the scan but is not a strict cross-document concurrency guarantee. No runtime race test or Azure change was performed. |
| E-169 | 2026-11-24 | P4-C11 / owner selects distributed coordination | Choose whether to keep the race caveat or coordinate chain writes with removals | shared distributed coordination selected; implementation pending | Owner decision via `ask_user`; CodeGraph; `codebase-design` and project-execution-journal skills | The owner selected distributed coordination. The implementation will use a shared Blob lease so API replicas serialize chain writes with the full catalog-removal scan and conditional catalog update. No code change or live lease verification has occurred yet. |
| E-170 | 2026-11-24 | P4-C11 / distributed chain-mutation lock | Serialize chain writes with the complete skill-removal scan and conditional catalog update across API replicas | local implementation and contract checks passed; live Azure lease check `not run` | `src/persistence/blob.ts`; `src/skills/catalog.ts`; `src/api/server.ts`; `docs/openapi.json`; `tests/blob-persistence.test.js`; `tests/skills-catalog.test.js`; `tests/api-server.test.js`; `tests/openapi-contract.test.js`; `npm test -- tests/blob-persistence.test.js tests/skills-catalog.test.js tests/api-server.test.js tests/openapi-contract.test.js` (35 passed); `npm run typecheck`; `npx eslint src/persistence/blob.ts src/skills/catalog.ts src/api/server.ts tests/blob-persistence.test.js tests/skills-catalog.test.js tests/api-server.test.js tests/openapi-contract.test.js`; Azure Blob lease behavior mocked through two persistence adapters; live Azure lease `not run` | Added a renewable 60-second Blob lease with 20-second renewal for chain saves and the complete reviewed-skill removal scan/update. Lock acquisition waits up to 10 seconds; contention returns 503. The test fake verifies serialization across independent adapters sharing a container, and a service test verifies removal waits for an in-flight chain save and then rejects deletion when that chain references the skill. No Azure resource or live data changed. |
| E-171 | 2026-11-24 | P4-C11 / documentation and final contract verification | Verify operator guidance, implementation-plan evidence, Markdown, OpenAPI error mappings, and final whitespace | documentation and contract checks passed | `npx --no-install markdownlint-cli2 docs/plans/implementation-plan.md docs/articles/azure-skills-experiment.md docs/user-guide.md docs/admin-guide.md`; `git diff --check`; OpenAPI response mapping check using Node.js; project-execution-journal skill | Markdown lint reported zero issues, whitespace checks passed, and the OpenAPI 503 response is attached only to chain save and reviewed-skill removal. P4-C11 is complete locally; live Azure lease behavior remains `not run`, and positive live skill-detail retrieval remains pending P4-C10. |
| E-172 | 2026-11-24 | POC/adopter scope decision | Record the public-release goal, fresh Azure deployment, local development, and post-POC boundaries | owner decisions recorded; implementation pending | Owner answers via `ask_user`; CodeGraph; `md-doc-search`; Git worktree review; `azure-app-onboard` skill (planning only); `project-execution-journal` skill | The owner chose a guided `azd`/Bicep path, explicit operator-managed Entra steps, an optional Foundry overlay, and Docker/Azurite local development with real Entra authentication. P5/P6 are post-POC; P4-G passed, while P4-C10 positive live skill detail and live Azure lease behavior remain pending/not run. Public visibility waits for a full content/history audit and final owner confirmation. No Azure resource or repository-visibility change occurred. |
| E-173 | 2026-11-24 | AR-2–AR-5 / adopter verification and public-release gate | Verify static packaging, local startup/auth rejection, documentation, public-candidate content, and Git history | Static/local checks passed; public release blocked | `npm run check` (56 tests); `npm run docs:check`; Markdown lint; Bicep build and lint for `infra/main.bicep`, `infra/p2/main.bicep`, and `infra/p2/api.bicep`; `azd package --all`; Podman Compose configuration/build/start and anonymous API request (401); public-candidate Gitleaks scan; full-history Gitleaks scan; `gh repo view` | No Azure resources were provisioned. Unauthenticated HTTP health routes were removed and Container Apps probes use TCP, preserving Entra enforcement for API requests. The first targeted Markdown lint caught a heading-length issue; the heading was shortened and the rerun passed. The public-candidate scan found only the known Azure Key Vault built-in role-definition GUID false positive; the full-history scan still flags a historical deployment-plan entry, and the history contains environment-specific identifiers and owner-specific budget details. Ignored local configuration is excluded from the public candidate. Positive Entra-authenticated local calls, live Azure deployment, live Azure lease behavior, and live skill-detail retrieval remain `not run` or pending. Raster image text was not OCR-reviewed. GitHub still reports `PRIVATE`; no visibility change or commit/push occurred. |
| E-174 | 2026-11-24 | AR-4–AR-5 / local history sanitation and re-audit | Remove historical environment-specific data and verify the current candidate and rewritten local refs without changing GitHub | Local content/history audit passed; remote update and visibility remain blocked | Owner decision via `ask_user`; `git-filter-repo` in an isolated clone; Gitleaks scans of all rewritten local refs and the non-ignored candidate; Python scans of 35 historical documentation snapshots and commit messages; prior local Tesseract.js OCR; article-link and ignore checks; `git update-ref`, `git read-tree`, `git diff --check`; `npm run docs:check`; `markdownlint-cli2`; project-execution-journal skill | Rewrote the three local branch histories to remove `.azure/deployment-plan.md`, redact historical owner-specific amounts, expiry details, Azure IDs and resource names from the article, implementation plan, and landing-zone README, and remove the risky P2A/P3 SVGs. Targeted scans found no matching amounts, expiry details, concrete tenant/subscription identifiers, or generated resource names in the audited docs or commit messages; generic tenant terminology remains, and commit-message email matches were GitHub noreply addresses. Gitleaks reported only the known Key Vault built-in role-definition GUID false positive in both the rewritten history and current candidate. Local OCR found a tenant-like label in the P3 image, which remains excluded; the P2A replacement is unavailable. Article image links resolve. Local branch heads were advanced with the worktree preserved; origin-tracking refs were verified unchanged. No push, Azure provisioning, or visibility change occurred. |
| E-175 | 2026-11-24 | AR-2–AR-5 / pre-publication validation | Validate the staged adopter deployment, local profile, documentation, and infrastructure before publishing | Local checks passed; authorized publication in progress | `npm run check` (56 passed); `npm run docs:check`; Markdown lint across 10 docs; `git diff --cached --check`; Bicep build/lint for `infra/main.bicep`, `infra/p2/main.bicep`, and `infra/p2/api.bicep`; `azd package --all` | Typecheck, ESLint, all 56 tests, docs checks, Markdown lint, staged whitespace check, Bicep build/lint, and `azd package --all` succeeded. `azd package` reported no artifacts found; no image was pushed and no Azure resource was provisioned. Live Azure deployment, authenticated local API calls, live lease behavior, and positive live skill-detail retrieval remain not run or pending. |
| E-176 | 2026-11-24 | AR-4–AR-5 / sanitized branch publication and merged PR audit | Publish sanitized branch heads, then verify GitHub's retained pull-request refs before changing visibility | Branch push passed; visibility blocked by legacy refs in merged PRs #2 and #3 | Owner authorization via `ask_user`; `git push --force-with-lease` for `main`, `docs/archify-diagrams`, and `part-01`; `gh repo view`, `gh pr list`, `gh pr view`; local fetch of `refs/pull/1/head` through `refs/pull/3/head`; Python history scans; GitHub Docs via `web_fetch`; project-execution-journal skill | Commit `0d48596` was pushed with the three sanitized branch heads. The PR head refs did not move with their source branches: PR #2 and PR #3 still reference historical commits whose history matches owner-specific amount, expiry, and Azure resource-name patterns. PR #1 had no matches in the targeted categories. GitHub documents these refs as read-only and directs maintainers to GitHub Support to dereference/delete affected PR refs and purge cached data. The repository remains private; no support request or visibility change occurred. |
| E-177 | 2026-11-24 | AR-4–AR-5 / owner selects a clean public snapshot | Choose between Support-assisted cleanup of old PR refs and a new repository with no inherited history | Fresh public repo selected; creation pending | Owner choice via `ask_user`; project-execution-journal skill | The owner chose `McFuzzySquirrel/skill-loom-azure` as a new public repository created from the audited tree with a fresh root commit. The old `skill-loom-foundry` repository and its PR refs remain private; no old Git history, tags, branches, or PRs will be imported. |
| E-178 | 2026-11-24 | AR-4–AR-5 / create isolated public destination | Create the selected repository without importing the original repository's history | New destination created privately; snapshot transfer pending | Owner choice via `ask_user`; `gh repo create`; `gh repo view`; project-execution-journal skill | Created `McFuzzySquirrel/skill-loom-azure` as a private empty repository. No files, branches, tags, PRs, or old history have been pushed to it; the original repository remains private. |
| E-179 | 2026-11-24 | AR-4–AR-5 / fresh snapshot build and hygiene correction | Create a rootless file snapshot, scan it, and correct formatting issues exposed by a first-commit whitespace check | Snapshot scan found only the known built-in role-ID false positive; whitespace normalized; final root commit pending | `git archive`; Gitleaks 8.30.1 release with checksum verification; Python snapshot/link checks; `git diff --check` with `core.whitespace=cr-at-eol`; Bicep builds for legacy landing-zone templates; project-execution-journal skill | The snapshot contained 117 files, no `.git` metadata, and no ignored local Azure/MCP configuration or excluded screenshots; article image links resolved. Gitleaks found only the known Key Vault role-definition GUID false positive. The x64 scanner could not run on this aarch64 host; the official ARM64 asset checksum passed and the scan then succeeded. The first root-tree whitespace check found CRLF/trailing whitespace in four legacy landing-zone files; only trailing whitespace/final blank lines were normalized, with Bicep builds succeeding. The default whitespace check treats CRLF as trailing whitespace, while `core.whitespace=cr-at-eol` passes. These snapshot checks must be repeated after rebuilding from the recorded source commit. |
| E-180 | 2026-11-24 | AR-4–AR-5 / push audited fresh root snapshot | Push only the audited file tree to the new private destination and verify it has no inherited refs | One-root snapshot pushed privately; candidate and history scans passed; public visibility pending | `git archive` from source commit `69baecf`; Git/GitHub CLI; Gitleaks 8.30.1 tree and history scans; Python pattern/link checks; `git push`; `git ls-remote`; `gh repo view` | Commit `c8e4745` is the new repository's sole root commit. The published tree has 107 files, one `main` branch, no tags or PR refs, and excludes `.archify`, `.azure`, `.mcp.json`, and the withheld screenshots. Candidate and one-commit-history Gitleaks scans each found only the known Key Vault role-definition GUID false positive; targeted documentation scans found no owner-specific amounts, GUIDs, or subscription IDs, and all article image links resolve. The new repository remains private pending public visibility; the original repository remains private. |
| E-181 | 2026-11-24 | AR-5 / publish the audited fresh snapshot | Change only the selected snapshot repository's visibility and verify its remote state | Public visibility confirmed; original repository remains private | Owner's public-repository decision; GitHub CLI `gh repo edit`, `gh repo view`, `gh pr list`; `git ls-remote`; project-execution-journal skill | `McFuzzySquirrel/skill-loom-azure` is `PUBLIC`, with `main` as default branch. At the visibility check, remote `main` matched `0449ec0`, refs contained only `refs/heads/main`, and no PRs existed. `McFuzzySquirrel/skill-loom-foundry` remains `PRIVATE`; no Azure resources were provisioned and live Azure checks were not run. |
| E-182 | 2026-11-24 | AR-4 / create an end-to-end adopter demo script | Document a safe local walkthrough for reviewed-skill administration, authenticated discovery, and chain export | Demo guide and sample data added locally; publication to the public snapshot not performed | CodeGraph, `rg`, `view`, `apply_patch`, `npm run docs:check`, Markdown lint, TypeScript chain-schema validation; project-execution-journal skill | Added `docs/demo-script.md`, a harmless reviewed-skill fixture, and a version-3 chain example referencing it. The script requires explicit approval for persistent writes, uses a disposable local Azurite store, and clearly states that hosted execution is unavailable. Static/documentation checks do not prove live Entra, MCP, or Azure behavior; no live service was called and no Azure resources were provisioned. |
| E-183 | 2026-11-24 | AR-4 / add the demo walkthrough to the public snapshot | Publish the guide, sample skill, sample chain, and README link to `skill-loom-azure` | Public sync and remote verification passed; content/history scans found only the known false positive | Owner request; Git commit `5f2b949`; `npm run docs:check`; `markdownlint-cli2`; TypeScript chain-schema validation; local-link check; Gitleaks 8.30.1 tree/history scans; GitHub CLI; `git ls-remote`; project-execution-journal skill | Commit `5f2b949` added the demo script and examples to the public repository. At verification, `main` matched that commit, was the only remote ref, and the repository had no tags or PRs; the published tree had 110 files. Gitleaks found only the known built-in Key Vault role-definition GUID false positive in both tree and history scans. No live Entra/MCP/Azure operation was run and no Azure resources were provisioned. |
| E-184 | 2026-11-24 | Cross-phase / decommission the non-production POC | Export the stored data, then remove the explicitly selected Azure resource group | Resource group deletion completed and absence verified; encrypted chain backup verified; temporary data access removed | Owner approval via `ask_user`; `azure-resource-lookup`; Azure MCP subscription/resource/container inventory; Azure CLI (`az`); Python; `systemd-creds`; `sha256sum`; project-execution-journal skill | The only resource group in the active subscription contained the POC API/Container Apps, storage, and optional Foundry resources. A temporary `Storage Blob Data Reader` assignment at the `documents` container scope enabled export after RBAC propagation; it was removed after backup verification. The container held four chain JSON blobs and no catalog blob. All four were archived with a manifest and checksums, encrypted with the local user's systemd host key, decrypted for round-trip and content verification, and stored outside the repository with mode `0600`. Azure accepted deletion of the selected resource group; the Container Apps environment remained scheduled for deletion during polling, then the group disappeared. `az group exists` returned false and the group list contained no match. The Azure Entra app registration was not in the group and was not changed. |

## 10. Traceability

| Requirement | Decisions | Phases | Acceptance | Evidence |
| --- | --- | --- | --- | --- |
| Separate project; public release only after audit and owner confirmation | D-1 | P0, AR-4–AR-5 | none | E-001, E-172 |
| Container host with management features | D-2, D-4 | P2, P3 | AC-3, AC-8 | E-005, E-006 |
| MCP/tool layer for Foundry and Copilot | D-2, D-3 | P3, P4 | AC-1, AC-2 | E-006, E-007, E-075–E-090 |
| Agents build, pull, and run chains | D-6 | P3 to P5 | AC-2, AC-5, AC-6 | E-006 to E-008 |
| Internal schemas with interchange compatibility | D-7 | P1 | AC-4 | E-004 |
| Admin-managed host catalog | D-8 | P3 | AC-5 | E-006 |
| Optional Foundry landing zone; standalone adopter path | D-11–D-13 | P2A, AR-2 | AC-10 | E-016, E-017, E-023, E-042, E-043, E-172 |

## 11. POC adopter readiness

The P0–P4 implementation is the current POC baseline; P5 and P6 remain
post-POC. These follow-up tasks make the existing POC reproducible for adopters
without changing the P5 hosted-execution gate or implying production readiness.

| ID | Task | Status | Acceptance |
| --- | --- | --- | --- |
| AR-1 | Record POC scope and adopter decisions | complete (E-172) | Evidence and remaining P4/live-check limitations are stated accurately; hosted execution remains disabled. |
| AR-2 | Fresh-environment Azure deployment with `azd` and Bicep; Foundry optional | implementation complete; static packaging passed; prior owner POC decommissioned; fresh adopter live deployment `not run` | A new adopter can build/push the image and deploy the core API to a fresh resource group without P2A resources; Entra tenant actions are explicit and operator-controlled. |
| AR-3 | Local Docker/Azurite profile | implementation complete; local startup and anonymous rejection passed; authenticated request `not run` | The API uses an explicit emulator-only storage mode while every API request still requires full Entra validation and authorization. |
| AR-4 | Public-content and full-history audit plus documentation | 110-file public snapshot includes demo guide and sample skill/chain; scans passed with only the known false positive | No active secrets or unreviewed local Azure/MCP/generated artifacts are included; docs and article reflect the evidenced POC and adopter workflow. |
| AR-5 | Static/local verification and visibility gate | static/local checks passed; new snapshot public and verified; original repo remains private | Relevant checks pass with live checks distinguished from mocks; the new repository uses its audited clean snapshot and verified links. |

AR-2 and AR-3 are independent implementations. AR-4 depends on both so the
public instructions describe the delivered workflows. AR-5 depends on AR-2
through AR-4.
