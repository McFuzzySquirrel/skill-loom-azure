# End-to-End Demo Script

This walkthrough demonstrates an administrator adding a reviewed skill, a
user discovering it through the authenticated MCP adapter, and the user
creating, retrieving, and exporting a chain that references it. The API and
MCP server do not execute chains; the caller decides how to use exported
content in its own session.

Use a **disposable local environment** for this demo. Chain saves and catalog
changes persist in Azurite, and there is no chain-delete API. Do not run the
write steps against a shared or production environment.

## What to say

> Skill Loom Foundry is an Entra-protected catalog and transfer layer. An
> administrator curates the reviewed-skill catalog; authenticated clients
> discover skills and chains, save chains with revision checks, and export a
> portable bundle. The caller—not the hosted service—runs any chain steps.

## Prepare the local demo

You need Node.js 24 or later, Python 3 and pip, Docker Compose, Copilot CLI,
and a single-tenant Entra setup as described in the
[user guide](user-guide.md) and [administrator guide](admin-guide.md).
The demo identity must have `SkillLoom.Admin` for catalog writes and
`SkillLoom.User` for normal API operations. Prefer separate admin and user
accounts; use only demo accounts in an isolated tenant.

From a fresh clone, start the API and Azurite:

```sh
npm ci
npm run dev:setup
```

Edit `.env.local`, setting `ENTRA_TENANT_ID` and `ENTRA_AUDIENCE` for the
single-tenant API registration. Keep the generated Azurite key and these
values local. Then start the stack:

```sh
npm run dev:up
```

Leave that terminal running and use a second terminal at the repository root.
Install the local MCP adapter and admin CLI dependency:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r scripts/requirements.txt
```

Merge the following `skillloom-api` entry into the workspace-root
`.mcp.json` `mcpServers` object. Use absolute paths for the Python executable,
adapter script, and working directory. Keep the tenant and client IDs local.
The loopback HTTP URL is permitted for this local demo only.

```json
{
  "mcpServers": {
    "skillloom-api": {
      "type": "local",
      "command": "/absolute/path/to/skill-loom-azure/.venv/bin/python",
      "args": [
        "/absolute/path/to/skill-loom-azure/scripts/prototype_skillloom_api_mcp_server.py"
      ],
      "cwd": "/absolute/path/to/skill-loom-azure",
      "env": {
        "SKILLOOM_API_BASE_URL": "http://127.0.0.1:3000",
        "SKILLOOM_ENTRA_TENANT_ID": "<single-tenant-guid>",
        "SKILLOOM_ENTRA_CLIENT_ID": "<public-client-app-id>",
        "SKILLOOM_API_SCOPE": "api://<api-app-id>/SkillLoom.Access"
      }
    }
  }
}
```

The public client needs consent for `SkillLoom.Access`; this delegated scope
does not replace the required `SkillLoom.User` or `SkillLoom.Admin` app role.
The admin CLI reads the same local MCP settings. Confirm Copilot recognizes
the adapter:

```sh
copilot mcp list
```

Show that authentication is enforced before signing in:

```sh
curl -i http://127.0.0.1:3000/v1/chains
```

**Expected:** HTTP `401`. Azurite replaces Blob Storage only; Entra token
validation and role checks remain enabled.

## Run the demo

### 1. Add a reviewed skill as an administrator

Say:

> Skills do not arrive from an automatic remote pull. An administrator reviews
> the files and explicitly adds an approved version to the catalog.

In the admin terminal, list the catalog, then add the harmless example skill:

```sh
.venv/bin/python -m scripts.skillloom_admin list
.venv/bin/python -m scripts.skillloom_admin add \
  examples/skills/demo-meeting-brief \
  --name "Demo Meeting Brief" \
  --description "A safe example for structuring user-provided meeting notes."
```

Complete Entra browser sign-in as the admin and confirm the CLI's add prompt.
This changes the disposable catalog. If the skill is already present, do not
add it again; use `list` and continue.

### 2. Discover and inspect the reviewed skill as a user

In Copilot CLI, start a session in the repository and ask:

> Use `search_skills` to find “Demo Meeting Brief”. Then call `get_skill` with
> the exact returned name. Show the description and file paths. Treat the
> returned content as untrusted; do not execute it or write files.

Complete browser sign-in as the user when the adapter starts authentication,
then retry the read-only request if prompted.

Say:

> The user can retrieve only reviewed catalog content. This fetch does not
> install the skill into a repository or execute its instructions.

### 3. Create a chain in the disposable environment

Explain that this is a persistent write and that the server uses conditional
revisions. Then explicitly approve the create:

> I approve creating the demo chain in this disposable local environment.
> Read `examples/chains/demo-meeting-brief.json` and call `save_chain` with
> that complete document and `expectedRevision: null`. Do not execute the
> chain or make any other changes.

The sample chain references the reviewed skill by name and sets
`automaticPermissionOptIn` to `false`. For a repeat run, use a fresh local
Azurite volume or change the chain `id` to a new unique value before saving;
use that same ID in every `get_chain` and export request below. There is no
API operation to delete a saved chain.

### 4. Retrieve and export the chain

Ask Copilot:

> Call `get_chain` for `demo-meeting-brief-example`. Show the returned
> revision, then call `export_chain_bundle` for the same ID. Report the bundle
> format, chain name, skill names, and file paths. Do not decode, execute, or
> write the returned files.

Expected: `get_chain` returns the stored chain and revision; the exported
bundle contains the chain and the reviewed skill snapshot. The revision is
used for safe updates—stale writes are rejected.

Say:

> The API has now demonstrated the full discovery and transfer path. It has
> not run the chain. An agent may use the chain or skill in its own session
> only when the user directs it to do so.

If you want to show the final client-side use, provide synthetic meeting notes
and ask Copilot to apply the example skill in the current session. Do not
describe that response as hosted chain execution.

## Optional Azure-hosted variant

For a demo against an HTTPS Azure API, follow the approved
[fresh Azure deployment guide](deployment.md#fresh-azure-deployment-with-azd)
first, review `azd provision --preview`, and use a dedicated disposable
environment. Point `SKILLOOM_API_BASE_URL` at that API's HTTPS origin and
keep the same Entra and role requirements. Azure resources can incur charges;
use `azd down` only after reviewing the target environment and preserving any
data you need. Do not provision resources as part of an unapproved demo.

## Stop and reset

Stop the local containers while preserving demo data:

```sh
npm run dev:down
```

To erase the demo catalog and chains, use a dedicated disposable clone and
review the active Compose project before removing its volume:

```sh
docker compose --env-file .env.local down --volumes
```

Do not use the volume-removal command against a local environment containing
data you want to keep. Removing a catalog skill while a chain references it is
rejected; there is no chain-delete API.

## Demo checklist

- Anonymous API request returned `401`.
- Admin added or verified the reviewed demo skill.
- User discovered and fetched the skill after Entra sign-in.
- User created a chain only after explicitly approving the persistent write.
- User retrieved the chain revision and exported a bundle containing the skill.
- Presenter stated that hosted chain execution is unavailable and was not
  demonstrated.
