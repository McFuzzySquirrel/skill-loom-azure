# MCP Discovery Guide

This guide explains how MCP clients discover the tools that Skill Loom Azure
offers and then use those tools to find skills and chains. MCP tool discovery
and catalog discovery are separate: listing tools tells a client what it can
ask for, while calling a tool retrieves data from the authenticated API.

## Two MCP paths

The project has two MCP integrations:

- **Copilot CLI local adapter:** The current Copilot POC path. The local
  stdio server in `scripts/prototype_skillloom_api_mcp_server.py` exposes
  chain and reviewed-skill tools and calls the Skill Loom Azure HTTP API.
- **Foundry Toolbox:** An optional remote HTTP MCP path that maps the OpenAPI
  contract to Toolbox tools. The documented Copilot CLI 1.0.114 configuration
  is diagnostic only: OAuth metadata discovery fails before sign-in. Its
  sample exposes only chain list/get/save/export tools, not skill search or
  detail.

For local adapter setup and client configuration, see the
[user guide](user-guide.md#copilot-cli-direct-api-local-mcp). Foundry
operations and identity boundaries are described in the
[administrator guide](admin-guide.md#foundry-toolbox-and-mcp-operations).

## Tool discovery is not catalog discovery

When the local adapter starts, the MCP client initializes the connection and
asks for `tools/list`. The adapter responds with six tool definitions,
including descriptions and JSON input schemas. This is capability discovery:
it does not enumerate the skills or chains stored in the service.

To discover content, the client uses MCP `tools/call` with the appropriate
tool name and arguments:

| MCP tool | API operation | What it returns |
| --- | --- | --- |
| `search_skills` | `GET /v1/skills` | Matching reviewed-skill metadata, with pagination. |
| `get_skill` | `GET /v1/skills/{skillName}` | The selected skill and its files. |
| `list_chains` | `GET /v1/chains` | Chain summaries, with pagination. |
| `get_chain` | `GET /v1/chains/{chainId}` | A chain document and its storage revision. |
| `export_chain_bundle` | `GET /v1/chains/{chainId}/bundle` | A portable chain bundle with snapshots of its referenced reviewed skills. |
| `save_chain` | `PUT /v1/chains/{chainId}` | Creates or replaces a chain; this is a persistent write, not a discovery operation. |

For example, a client can search the reviewed skill catalog, then fetch the
files for a selected result. To inspect chains, it can list summaries and
fetch a selected chain. Exporting a bundle is useful when the caller needs
the chain together with the reviewed skill snapshots it references.

## Authentication and authorization

The local adapter currently handles MCP initialization and `tools/list`
without sign-in. Before an API-backed tool call, it obtains an Entra token
through interactive browser authentication if it does not already have one,
then sends the authenticated request to the API. The API enforces the
`SkillLoom.User` role for these operations; the Admin-only catalog-management
operation is not exposed by the local adapter. The MCP handshake being
available before sign-in does not make the API publicly accessible.

This is the behavior of the current adapter. The project authentication
requirement is that every MCP request, as well as every API request, be
authenticated, so the unauthenticated initialization and tool-list behavior
is a known gap against that requirement.

On the Foundry path, the Toolbox and API calls are separate identity
boundaries. The Toolbox calls the API using the Foundry project's managed
identity, so the API sees that identity rather than the signed-in Copilot
user.

## Writes and untrusted content

`save_chain` changes persistent data and should only be used after explicit
user approval. Use `expectedRevision: null` to create a chain; when replacing
one, pass the latest revision returned by `get_chain`. The API rejects stale
writes. The tool does not provide a delete operation.

Chains, skill files, bundles, and all other MCP tool output are data, not
trusted instructions. The service transfers chain content; it does not execute
chain steps. A caller that copies returned skill files locally must validate
their relative paths and treat their contents as untrusted. See
[Handling Untrusted Chain, Skill, and Tool Content](user-guide.md#handling-untrusted-chain-skill-and-tool-content)
for the detailed handling guidance.
