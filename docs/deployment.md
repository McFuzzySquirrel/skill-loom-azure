# Deployment and Local Development

This guide covers the core API only. Foundry is an optional integration; the
core Azure deployment does not create Foundry resources. The POC is
non-production and hosted chain execution remains disabled.

## Local API and Azurite

### Prerequisites

- Node.js 24 or later and npm.
- Docker Engine/Desktop or a compatible Docker Compose runtime.
- A single-tenant Entra API registration and caller role assignment. Local
  development does not disable API authentication.

### Start the stack

Install dependencies, then generate a local Azurite account key:

```sh
npm ci
npm run dev:setup
```

Edit `.env.local` and set `ENTRA_TENANT_ID` and `ENTRA_AUDIENCE` for the
single-tenant API registration. Keep the generated Azurite key and Entra
configuration local; `.env.local` is ignored by Git. The local adapter
requires all three values to start.

```sh
npm run dev:up
```

The API is bound to `127.0.0.1:3000`; Azurite is bound to
`127.0.0.1:10000`. Compose gives the API a separate `azurite` storage mode
that accepts only the local emulator host on port 10000 and creates the
`documents` container. Managed-identity configuration cannot be mixed with
this mode. Entra token signature, issuer, audience, expiry, tenant, and
operation-role checks remain enabled.

An unauthenticated request to an API operation should return `401`:

```sh
curl -i http://127.0.0.1:3000/v1/chains
```

Container Apps uses TCP probes rather than unauthenticated HTTP health routes.
The API does not expose a health path that bypasses authentication.

Stop the containers while preserving local Blob data:

```sh
npm run dev:down
```

To delete the local Azurite volume and its data, run
`docker compose --env-file .env.local down --volumes` after reviewing the
target project. The setup command refuses to overwrite an existing
`.env.local`; edit or remove that file yourself if you want to regenerate the
local key.

## Fresh Azure deployment with `azd`

### Prerequisites and operator-owned Entra setup

Install the Azure CLI, Azure Developer CLI (`azd`), and Node.js. The
`postdeploy` hook also uses the Azure CLI. Sign in to the same tenant and
subscription with both CLIs. The deploying identity needs permission to
create the resources and role assignments in the selected subscription and
resource group (for example, Owner or Contributor plus User Access
Administrator).

Before provisioning:

1. Create a single-tenant Entra API app registration in the deployment tenant.
2. Expose the API audience (commonly `api://<application-id>`).
3. Configure the `SkillLoom.User` and `SkillLoom.Admin` app roles. Assign
   `SkillLoom.User` to normal callers and `SkillLoom.Admin` only to trusted
   administrators.
4. For local Copilot access, configure the separate public client, delegated
   `SkillLoom.Access` scope, consent, and redirect described in the
   [user guide](user-guide.md). Do not create a client secret for the public
   client.

These are tenant-specific Microsoft Entra actions; Bicep does not create or
modify app registrations, consent, or app-role assignments.

### Provision and deploy

Authenticate and create an `azd` environment for the target subscription and
region:

```sh
az login
azd auth login
azd env new <environment-name> --location <region> --subscription <subscription-id>
azd env set ENTRA_AUDIENCE "api://<application-id>"
azd env set ENTRA_TOKEN_VERSION "2.0"
```

Preview the infrastructure changes and have the resource owner review them:

```sh
azd provision --preview
```

After approval, provision the resources, build the image remotely, and deploy
the API:

```sh
azd up
```

The template creates a standalone Log Analytics workspace, Basic Azure
Container Registry, user-assigned identity, Standard LRS Blob account and
private `documents` container, Container Apps environment, and API Container
App. `azd` remotely builds the container image. The API app starts without
external ingress; the post-deploy hook enables external HTTPS ingress after
the application image is deployed. The API identity receives ACR Pull and
Blob Data Contributor at the `documents` container scope.

The selected Entra tenant must match the one used for the API registration.
The deployment uses public Azure endpoints and a public Container Apps
ingress. Entra validation and roles remain mandatory; network reachability
does not authorize an API operation. The template is a cost-first POC, not a
production network design. Storage versioning, soft delete, automatic
retention, private endpoints, and a spending cap are not configured.

After deployment, inspect the environment values and resolve the Container
Apps FQDN:

```sh
azd env get-values --output json
az containerapp show \
  --name "<AZURE_CONTAINER_APP_NAME>" \
  --resource-group "<AZURE_RESOURCE_GROUP>" \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv
```

Use the returned FQDN to test the authenticated health operation. Without a
bearer token it should return `401`:

```sh
curl -i https://<container-app-fqdn>/v1/health
```

Review `azd up` output and Azure cost estimates before running it. Container
Apps, ACR, Blob Storage, and Log Analytics can incur charges. A subscription
budget or alert is not automatically created and would not cap spending.
`azd up` provisions Azure resources; static Bicep compilation and local tests
do not.

### Cleanup and data

`azd down` deletes the resources for the selected `azd` environment. Confirm
the active environment and resource group before running it. It does not
remove the Entra app registration, consent, or role assignments. The storage
policy is manual backup/restore; preserve data before cleanup and follow the
[storage backup/restore runbook](runbooks/storage-backup-restore.md).

## Validation boundaries

- `npm run check`, `az bicep build`, Compose configuration checks, and local
  Azurite tests are local/static evidence.
- The local Azurite adapter is not proof of Azure Blob or managed-identity
  behavior.
- The commands in this guide are not deployment approval. `azd up` provisions
  Azure resources; obtain resource-owner approval after reviewing
  `azd provision --preview` before running it.
- P5 hosted execution and P6 production hardening/pilot checks remain
  post-POC.
