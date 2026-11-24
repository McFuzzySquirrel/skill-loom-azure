# Blob manual backup and restore

## Status and policy

This is the P2-C5 manual-only PoC procedure. No P2 storage account or service
data currently remains deployed. P2-G exercised backup and restore for one
synthetic, schema-valid chain object, then tore down the temporary resources
(E-051, E-053). This did not exercise multi-object batch path mapping,
replacement of an existing object, or application revision guards. To run
this procedure again, use an approved deployment plan and owner authorization.

The PoC has no scheduled backups, Blob versioning, blob soft delete, container
soft delete, or automatic retention. Before a destructive data change or
teardown, an operator takes an on-demand export to an encrypted local
destination outside the repository. Keep the export until the operation and
any restore are verified, then remove it. There is no guaranteed RPO or
protection against storage-account deletion or regional loss.

## Backup

Use an Entra-authenticated operator with `Storage Blob Data Reader` on the
`documents` container. Shared-key authentication is disabled. Choose a
private, encrypted destination with sufficient free space; a serialized
object can be up to 32 MiB.

Set the resource names and operator object ID locally. The bootstrap operator
needs permission to create and remove these temporary data-role assignments:

```bash
az login
storage_id="$(az storage account show \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --query id -o tsv)"
container_scope="${storage_id}/blobServices/default/containers/documents"
az role assignment create \
  --assignee-object-id "$BACKUP_OPERATOR_OBJECT_ID" \
  --assignee-principal-type User \
  --role "Storage Blob Data Reader" \
  --scope "$container_scope"
```

```bash
umask 077
backup_dir="$HOME/.local/share/skill-loom-foundry/backups/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_dir"
az storage blob download-batch \
  --account-name "$STORAGE_ACCOUNT" \
  --source documents \
  --destination "$backup_dir" \
  --auth-mode login \
  --no-progress
(
  cd "$backup_dir"
  find . -type f ! -name SHA256SUMS -print0 | sort -z | xargs -0 -r sha256sum \
    > SHA256SUMS
)
```

After the export is verified, remove the temporary Reader assignment:

```bash
az role assignment delete \
  --assignee-object-id "$BACKUP_OPERATOR_OBJECT_ID" \
  --role "Storage Blob Data Reader" \
  --scope "$container_scope"
```

Keep the account name and backup location in local operator notes, not in
committed files. Before using batch download, P3 must define fixed,
path-safe blob names and verify that the local name mapping remains inside
`backup_dir`.

## Restore

1. Make a fresh backup of the current container and verify the backup
   checksums.
2. Select only the required object files. Validate each JSON object against
   its current schema before uploading.
3. Temporarily grant the operator `Storage Blob Data Contributor` at the
   `documents` container scope. Create a missing blob with `If-None-Match: *`;
   replace an existing blob only with `If-Match` set to the current ETag.
   Never use an unconditional overwrite.
4. Where a document has an application revision, advance it according to the
   P3 persistence rules before restoring. Until that guarded restore path is
   implemented, do not overwrite an existing live object directly.
5. Read back the restored objects and revalidate their schemas and revisions.
   Remove the temporary Contributor assignment and keep the backup until
   verification is complete.

The Azure CLI upload command supports `--if-none-match` and `--if-match`.
P2-G verified a single-object synthetic restore with a conditional delete and
conditional create; batch export/path safety and guarded existing-object
replacement remain unverified.
