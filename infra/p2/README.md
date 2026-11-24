# Legacy P2 Azure foundation

These Bicep modules define the original P2/P3 proof-of-concept deployment.
The foundation template reuses the P2A Log Analytics workspace; the API
Container App is defined separately in `api.bicep`. They are not the
fresh-environment adopter path.

For a new Azure environment, use the root
[deployment guide](../../docs/deployment.md) and `azure.yaml`/`infra/main.bicep`.
That deployment creates its own monitoring workspace and does not depend on
P2A or the owner's Azure subscription.

## Legacy design and evidence

- The original POC uses public HTTPS ingress with Entra token validation in
  the API. Network reachability is not authorization.
- Storage and Key Vault use public endpoints for the cost-first POC, with
  Entra/RBAC access. Blob anonymous access and Storage shared-key access are
  disabled. The Blob container has no public access.
- The POC uses manual export/restore only. Blob versioning, blob/container
  soft delete, automatic retention, and scheduled backup are not configured.
  Follow the [storage backup/restore runbook](../../docs/runbooks/storage-backup-restore.md).
- Hosted chain execution is not deployed; it remains disabled until its P5
  exit gate passes.
- The P2 foundation template requires the original P2A Log Analytics
  workspace. Keep environment-specific values in local ignored parameter
  files; do not commit subscription IDs, tenant IDs, resource IDs, or
  credentials.

## Static validation

Compile the legacy foundation without deploying:

```bash
az bicep build --file infra/p2/main.bicep --outfile /tmp/skill-loom-foundry-p2.json
```

Compilation is a static check only. Any deployment needs its own reviewed
`what-if`, explicit resource-owner approval, and environment-specific plan.
