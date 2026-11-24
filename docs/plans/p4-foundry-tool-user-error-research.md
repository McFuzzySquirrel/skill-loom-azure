# P4 research note: Foundry `tool_user_error` on the direct prompt agent

- Date: 2026-11-23
- Scope: whether repeated `tool_user_error` from the P4 direct prompt agent (OpenAPI Toolbox connection, project managed identity) fits a model/tool-calling problem or a Foundry agent/connection configuration problem.
- Method: primary sources only, all on Microsoft Learn and read on 2026-11-23: the Foundry Agent Service articles listed in section 6, and the Microsoft Foundry REST API reference (`API Version: v1`, a single page). No SDK source, OpenAPI/spec files or model-vendor pages were read. The Learn articles are unversioned "latest" docs. The OpenAPI article documents the OpenAPI 3.0/3.1 tool and the toolbox REST surface at `api-version=v1`. The toolbox page's .NET sample uses `2.1.0-beta.4` preview packages, and the connection REST call uses ARM `api-version=2025-06-01`.
- No Azure changes and no live invocations were made. Existing files were not modified. Placement follows `docs/plans/p2-c4-storage-backend-research.md`, the only existing research note.

## 1. Conclusion

The evidence does **not** isolate a cause. The documentation does not define `tool_user_error` as a model fault or as a configuration fault, so the label alone cannot decide it.

- **Model/tool-calling is the weaker hypothesis.** The documented tool-support matrix lists `gpt-4.1-mini` as `Yes` for OpenAPI and MCP, and East US as `Yes` for OpenAPI. A model that never emitted a tool call would more naturally show as "agent doesn't call tool" than as a tool execution error. Payload quality (arguments the model generated) is still not excluded, because the raw payload is missing.
- **Configuration/runtime is the stronger hypothesis**, but it is not proven. The best-supported sub-branches are:
  - the identity or audience that actually reaches the target API;
  - toolbox version routing and the agent-to-toolbox binding;
  - the OpenAPI spec not matching what the tool layer accepts (for example `If-Match` header handling).
- The one documented, specific `tool_user_error` trigger on a toolbox is a missing project role for an identity on a `UserEntraToken` connection. This project uses `ProjectManagedIdentity`, so that trigger does not map directly.
- The Foundry-side trace for a failing conversation is the highest-value missing artifact. It was not in the supplied evidence, and nothing can be settled without it.

## 2. Evidence: known facts vs hypotheses

### 2.1 Known project facts (supplied by the owner; not independently verified here)

| # | Fact |
| --- | --- |
| K1 | Model deployment: GPT-4.1-mini, GlobalStandard, East US, capacity 1. |
| K2 | The prompt agent calls an OpenAPI Toolbox connection that uses `ProjectManagedIdentity`. |
| K3 | The project identity has Foundry User. The runtime agent identity also received project-scoped Foundry User after owner approval. The failure persisted. |
| K4 | A list/get-only agent returned `tool_user_error`. |
| K5 | A later four-operation agent (list/get/save/export), using the OpenAPI `If-Match` header contract, was active at version 2 and still returned `tool_user_error`. |
| K6 | `listChains` returned HTTP 200 twice earlier. `getChain` stayed unverified. Later calls failed. |
| K7 | Narrow API audit and AppTraces queries after the latest failure found no matching chain-operation records. |
| K8 | Copilot-side MCP operations and a local stdio adapter list succeeded. Neither proves Foundry tool invocation. |
| K9 | The raw request/response payload and the model-run trace are not available. |

### 2.2 Documented facts from primary sources

| # | Documented fact | Source |
| --- | --- | --- |
| D1 | `gpt-4.1-mini` is `Yes` for OpenAPI and MCP. Tool availability needs support from both model and region. | [Limits, quotas, regions: tool support](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/limits-quotas-regions#tool-support-by-region-and-model); [Tool best practices, troubleshooting](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/tool-best-practice#troubleshooting) |
| D2 | East US is a supported Agent Service region, and its row in the per-region tool matrix has `yes` in the OpenAPI column (and in MCP). Verified by reading the full row against the 15-column header (Agent2Agent, Foundry IQ, Browser Automation, Code Interpreter, Computer Use, Fabric Data Agent, File Search, Function, Grounding with Bing Custom Search, Grounding with Bing Search, Image Generation, MCP, OpenAPI, SharePoint, Web Search): `yes yes yes yes no yes yes yes yes yes yes yes yes yes yes`; the 13th value is OpenAPI. Computer Use is `no` in East US, which is not relevant here. | [Limits, quotas, regions: tool support](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/limits-quotas-regions#tool-support-by-region-and-model) |
| D3 | A missing role on the project that hosts the toolbox fails with `tool_user_error` ("A user error occurred while executing a tool call.") or `403`. The page states this for a `UserEntraToken` connection, where the calling user's identity reaches the toolbox. | [Toolbox: RBAC and Troubleshoot](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/toolbox) |
| D4 | Foundry User on the project is required for the developer identity and for the agent identity that calls tools at runtime (prompt agents). | [Toolbox: prerequisites](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/toolbox) |
| D5 | Toolbox OpenAPI tools require project managed identity, not account managed identity. A `ProjectManagedIdentity` connection needs the target API's expected audience, which is not the Foundry project endpoint. The project managed identity (not the account identity) needs the role on the target service. Foundry User on the Foundry project does not substitute for authorization on the target API. | [OpenAPI tools](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/openapi#configure-openapi-authentication-in-the-foundry-portal); [Agent identity: permissions](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/agent-identity#permissions-and-access-boundaries) |
| D6 | Documented OpenAPI failure rows: 401 with an assigned role means the audience does not match what the target expects. 400 means the spec does not match the real API (names, types, required fields). A connection-not-found error means the connection ID is wrong or belongs to another project. An `operationId` error means characters other than letters, `-`, `_`. | [OpenAPI: Troubleshoot common errors](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/openapi#troubleshoot-common-errors) |
| D7 | OpenAPI constraints: every operation needs an `operationId` (letters, `-`, `_` only). Request body content types are `application/json` and `application/json-patch+json`. OAuth2 connections are unsupported. | [OpenAPI: Understand limitations](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/openapi#understand-limitations) |
| D8 | The documented OpenAPI troubleshooting does not mention custom request headers (`If-Match`) or header parameters. Header-parameter handling is therefore **undocumented**. It must be tested, not assumed. | Absence in [OpenAPI tools](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/openapi) |
| D9 | The toolbox consumer endpoint always serves `default_version`. Creating a version does not auto-promote it, except that the first version becomes default. Versions are immutable. | [Toolbox: endpoints and versions](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/toolbox) |
| D10 | The recommended verification is to call `initialize` and `tools/list` on the toolbox MCP endpoint (version-specific developer endpoint to test a version), and then run one agent request. A successful initialize does not prove downstream tools are available. `tools/list` returning zero tools for an OpenAPI tool is attributed to an invalid spec or to missing RBAC on the target. | [Toolbox: verify and Troubleshoot](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/toolbox) |
| D11 | Toolbox MCP troubleshooting also lists: `tools/call` with non-streaming returns 500 (use streaming); 401 on MCP calls needs scope `https://ai.azure.com/.default`; discovery `403` and timeouts need hop-by-hop diagnosis rather than blind credential changes. | [Toolbox: Troubleshoot](https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/toolbox) |
| D12 | Foundry server-side tracing records prompt agents once Application Insights is connected. The Conversation view shows ordered run steps, tool calls, and tool inputs/outputs. Querying needs Log Analytics Reader. Traces can be delayed by minutes. | [Set up tracing](https://learn.microsoft.com/en-us/azure/foundry/observability/how-to/trace-agent-setup) |
| D13 | `tool_choice` accepts `auto`, `required`, `none`. The documented check for "did the model produce a tool call" is to review traces. | [Tool best practices](https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/tool-best-practice#control-tool-calling-with-tool_choice) |
| D14 | I found no definition of `tool_user_error` or `invalid_payload`, and no list of `tool_user_error` causes, in the sources actually searched. Those were: the OpenAPI, Toolbox, Tool best practices, Limits/quotas/regions, Agent identity and Tracing articles; a Learn search for each code; and the full Microsoft Foundry REST reference page (`API Version: v1`, fetched 2026-11-23). In the REST page, a text search for `tool_user_error` and `invalid_payload` returned 0 matches. It documents error responses as `ApiErrorResponse` / `Azure.Core.Foundations.ErrorResponse` and lists `OpenAI.ResponseErrorCode` values that do not include either code. This is an absence in those sources only. Not searched: SDK source/reference docs, the Foundry OpenAPI spec files, and non-Learn official pages. | Searches and fetch listed above; [REST reference](https://learn.microsoft.com/en-us/rest/api/microsoft-foundry/aiproject/) |

### 2.3 Hypotheses (not established)

| # | Hypothesis | Supports | Weakens / unknown |
| --- | --- | --- | --- |
| H1 | **Audience/identity mismatch.** The `ProjectManagedIdentity` token has a wrong audience, or the project managed identity lacks the app role or authorization on the API itself. | D5, D6; K7 (no API records, so the request may be rejected before app logging, or never sent) | A 401 or 403 would usually reach the gateway or edge logs. K7 does not say which layers were queried. |
| H2 | **Foundry-side failure before any HTTP call.** The tool layer fails resolving the connection, spec, or version, or while building the request. | K7; D6 (connection not found), D10 | Cannot be separated from H1 without the trace. |
| H3 | **Toolbox or agent version routing.** The agent points at a toolbox or version different from the one tested, or the default version is stale. | D9; K5 (agent version 2 was verified active, but the toolbox default version was not stated) | Not verified. |
| H4 | **Spec or contract mismatch.** The `If-Match` header parameter, the schema, or the response shape is rejected or unsupported by the tool layer. | D6, D7, D8; K4 (the earlier list/get-only agent also failed, which weakens a pure `If-Match` explanation) | The first failure involved no write headers. |
| H5 | **Model/tool-calling failure.** The model emits malformed arguments, or the tool call is rejected. | D13 mentions model-support checks | D1: the model and region are documented as supported. K4 and K5 show a failure that persists across two different agent definitions. |
| H6 | **Capacity-1 throttling.** | None documented for `tool_user_error` | I found no source linking low capacity to this code. A 429 would normally be reported as rate limiting. |
| H7 | **Runtime identity role assignment not yet effective, or it targets the wrong principal.** | D3, D4; K3 | The role was granted but the failure persisted. RBAC propagation can lag, and the principal used at runtime may differ from the one that was granted. Not verified. |

### 2.4 Unsupported speculation (not evidence; excluded from the ranking)

- Tool response size might cause the failure. No primary source reviewed links it to `tool_user_error`, and `listChains` returned 200 earlier. It may be checked in passing from the trace, but it is not part of the differential.

## 3. Differential diagnosis

Rank by how well the evidence discriminates. "Not excluded" means no evidence either way.

1. **H1/H2 (identity, audience, or pre-HTTP failure in Foundry): leading, not proven.** The documented specific `tool_user_error` cause is identity/role related (D3). The documented managed-identity pitfalls are audience and target-role issues (D5, D6). Foundry User does not grant access to the target API (D5), so K3 does not rule these out. Missing API-side records (K7) are consistent with a pre-HTTP failure, or with a rejection logged at a layer that was not queried.
2. **H3 (version routing): plausible and cheap to check.** Agent version 2 being active says nothing about the toolbox `default_version` (D9).
3. **H4 (spec/contract handling): plausible.** K4 weakens H4 for the `If-Match` header alone. Header handling is undocumented (D8), so it stays a risk for write operations specifically.
4. **H7 (runtime principal or propagation): not excluded.** Confirm that the granted principal is the one the trace shows.
5. **H5 (model): least supported.** The model and region are documented as supported (D1). The consistent failure across agent versions does not look like sampling noise, although argument quality cannot be assessed without the payload.
6. **H6 (capacity): no documentary support.** Do not investigate before the others.

`invalid_payload`: there is no definition in the sources searched (D14). Treat it as an unclassified error code and do not read it as proof of a model argument fault or of a spec fault. Its origin (service, SDK, or the target API) should be read from the trace or response envelope.

## 4. Limitations

- Source coverage is Microsoft Learn only (articles plus the REST reference page). I did not read SDK source or reference docs, or the Foundry OpenAPI spec files, so D14 is an absence claim limited to the sources listed there.
- The matrix rows were read from fetched markdown of the Learn page, not from the rendered page.
- The fetched Learn pages are the current "latest" docs and not tied to a specific service build. The project's actual service behaviour may differ, because the toolbox, the .NET SDK, and parts of the API are preview or beta.
- Project facts K1-K9 are owner-supplied and were not independently checked.
- No claims about `gpt-4.1-mini` argument-generation quality are made, because no official source on that was reviewed.

## 5. Next diagnostic steps (minimal, read-only or non-mutating, in order)

1. **Get the Foundry trace for one failing response.** Use the portal Traces and Conversation view (D12), or the response ID. Record: whether the model emitted a tool call, the tool name, the arguments, the exact error code and message at the tool step, and timestamps. This separates H5 (no or malformed call) from H1-H4 (the call failed in the tool layer). It also gives the origin of `invalid_payload`. Redact before sharing.
2. **Check whether any outbound request left Foundry.** Query the API gateway/edge and the platform request log, not only the app audit log, for the failure window (allow for trace ingestion delay, D12). No request at any layer favours H2. A 401/403 at the edge favours H1.
3. **Confirm routing (H3).** Read the toolbox's `default_version`, the version the agent definition references, and the connection resource ID the tool uses. Confirm they are the same toolbox/connection in the same project as the failing agent (D6, D9).
4. **Confirm the connection's audience and the target-side authorization (H1).** Compare the connection's `authType`, audience and target URL with what the API's token validation expects (D5, D6). Confirm that the project managed identity principal, which is not the account identity and not necessarily the runtime agent identity, is the one the API authorizes. This is a read-only configuration review.
5. **Run toolbox discovery without invoking the model (D10).** Call `initialize` then `tools/list` on the version-specific toolbox endpoint with the documented token scope (D11). If it returns zero or an error for the OpenAPI tool, the spec or RBAC branch is confirmed (H1/H4) without any model involvement. This is a non-mutating discovery call, but the owner should approve it because it is a live call to Foundry. Skip it if "no live invocations" is meant to cover discovery.
6. **Review the OpenAPI document offline.** Check `operationId` characters, the content types (D7), the `If-Match` header declaration and `security` section (D6, D8), and the response schemas. A local validator is enough.
7. **Only then consider the model branch.** If the trace shows malformed arguments, compare a `tool_choice` of `required` on a minimal one-operation agent (D13). Treat capacity (H6) last.

Record results in the owner-selected log. Do not add environment identifiers, tokens, or private URLs to this note.

## 6. Sources

- OpenAPI tools: <https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/openapi>
- Toolbox: <https://learn.microsoft.com/en-us/azure/foundry/agents/how-to/tools/toolbox>
- Tool best practices: <https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/tool-best-practice>
- Limits, quotas, and regions (tool support): <https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/limits-quotas-regions>
- Agent identity: <https://learn.microsoft.com/en-us/azure/foundry/agents/concepts/agent-identity>
- Set up tracing: <https://learn.microsoft.com/en-us/azure/foundry/observability/how-to/trace-agent-setup>
- Microsoft Foundry REST API reference (v1): <https://learn.microsoft.com/en-us/rest/api/microsoft-foundry/aiproject/>
