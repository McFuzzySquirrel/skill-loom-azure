# P2-C4 / Q-4 research note: storage backend for versioned JSON chain/run data

- Status: live Blob spike completed on 2026-11-20 with the owner-approved disposable account. B1-B7 and X1 passed; B8 lease-ID checks passed but expiry/renewal were not run. B9/B10 and the broader upload methods remain not run. The test account was deleted; the P2A landing zone was re-provisioned and remains available for P2 work. The owner selected Azure Blob Storage only as the final PoC backend (E-047).
- Scope: Azure Files vs Azure Blob Storage for versioned JSON with schema validation, atomic replacement, concurrent-write protection, and stale-revision rejection.
- Convention: the repo has no existing research-note convention (`docs/` holds `adr/`, `articles/`, `plans/`, `schemas/`), so this lives in `docs/plans/`. The implementation plan and experiment article separately record the current status and owner decisions; see E-030. Q-4 and P2-C4 are defined at `docs/plans/implementation-plan.md` lines 37 and 151.
- Repo context: ESM Node >= 24 (`package.json`), so the relevant SDK is `@azure/storage-blob` (JS).

## 1. Owner-selected backend

Use **Azure Blob Storage only** (block blobs, JSON documents), with:

- **Stale-revision rejection:** ETag compare-and-swap. Overwrite with `If-Match: <etag-read>`. First create with `If-None-Match: *`.
- **Application revision:** keep a `revision` integer inside the JSON, validated against the schema, as the source of truth. The ETag is the transport-level guard.
- **Recovery:** the owner chose manual export/restore only for the PoC, with
  no versioning, soft delete, or automatic retention. See the P2-C5 runbook.
- **Leases:** optional, only for long critical sections.

Do not use both backends. Azure Files adds nothing needed here, and its documented REST surface lacks the per-write conditional-header guarantee we need. Azure Files remains justified only if a consumer needs a POSIX/SMB mount (for example, an unmodified tool that writes files). Nothing reviewed indicates that need.

Confidence: high on Blob semantics because they are documented. The "Azure Files cannot do this" claim is an **absence of documentation**, not a documented prohibition (see 3.2).

Owner input on 2026-11-19: no filesystem mount is needed; keep the PoC
cost-first; use a 32 MiB maximum serialized-object size for the PoC. The
expected write rate is unknown. At that point Blob was the live-spike
candidate, not a final backend selection. On 2026-11-20, after reviewing the
live results, the owner selected Blob as the final PoC backend (E-047). The
cap is an application policy, not an Azure service limit.

Follow-up owner decision on 2026-11-19: keep the current PoC running, skip
throughput benchmarking because no write-rate target is set, and defer
recovery settings to P2-C5. No disposable storage resources have been
authorized or created. Live checks remain blocked pending P2A-G and explicit
resource approval.

Implementation follow-up on 2026-11-19: the Copilot CLI coding agent added a
shared serialized-object size guard to the chain, bundle v1/v2, catalog, and
run-record document schemas. It measures compact JSON UTF-8 bytes and rejects
objects over 32 MiB. `npm run check` passed, including exact-limit, overflow,
Unicode byte-count, and pinned-fixture tests (E-036). This post-parse
validation does not replace an API request-body limit. No Azure SDK or live
storage checks were run.

Recovery decision on 2026-11-19: the owner chose manual export/restore only,
with no Blob versioning, blob or container soft delete, or automatic
retention. The backup is an operator-managed local copy, not a regional or
account-deletion backup. The procedure is in
[`../runbooks/storage-backup-restore.md`](../runbooks/storage-backup-restore.md);
the live restore remains unrun.

## 2. What each source actually guarantees

### 2.1 Azure Blob Storage

| Need | Source | What it states |
|---|---|---|
| Whole-object replace | [Put Blob](https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob) | "The Put Blob operation will overwrite all contents of an existing blob with the same name"; partial updates are not supported with Put Blob. Existing metadata is also overwritten. Returns an `ETag` "that the client can use to perform conditional PUT operations by using the If-Match request header". |
| Conditional writes | [Specifying conditional headers for Blob service operations](https://learn.microsoft.com/en-us/rest/api/storageservices/specifying-conditional-headers-for-blob-service-operations) | Supports `If-Match`, `If-None-Match` (ETag or `*`), `If-Modified-Since` and `If-Unmodified-Since`. Evaluation is `If-Match && If-Unmodified-Since && (If-None-Match \|\| If-Modified-Since)`. |
| Optimistic concurrency, 412 on stale write | [Managing concurrency in Blob Storage](https://learn.microsoft.com/en-us/azure/storage/blobs/concurrency-manage) | Every object has an ID that changes on each write. A mismatched `If-Match` returns **HTTP 412 Precondition Failed**. The default with no strategy is **last writer wins**. The page states a strong consistency model: after an insert or update, subsequent reads and lists return the latest update. It also documents leases for pessimistic concurrency. |
| Leases | [Lease Blob](https://learn.microsoft.com/en-us/rest/api/storageservices/lease-blob) | Exclusive write/delete lock. Put Blob on a leased blob requires `x-ms-lease-id`. |
| SDK | [JS BlobRequestConditions](https://learn.microsoft.com/en-us/javascript/api/@azure/storage-blob/blobrequestconditions), [.NET BlobRequestConditions](https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.models.blobrequestconditions) | Expose `ifMatch`, `ifNoneMatch`, `ifModifiedSince`, `ifUnmodifiedSince` and `leaseId` on request options. |
| Recovery | [Blob versioning](https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview), [soft delete](https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview), and [point-in-time restore](https://learn.microsoft.com/en-us/azure/storage/blobs/point-in-time-restore-overview) | Versioning retains prior data on every write and adds storage cost. Point-in-time restore also requires soft delete and change feed, and does not protect account deletion. The owner chose manual-only recovery for the PoC. |

Takeaways:

- A single Put Blob replaces the whole content. The concurrency guide says snapshot isolation keeps reads consistent while writes occur, which supports the service-level no-torn-read requirement. Keep B4 as a live regression for the selected SDK upload path and payload sizes.
- Do **not** use rename or copy-then-delete as the replace mechanism. Blob has no rename for non-HNS accounts and it is not needed.
- The "optimistic concurrency" cell in the matrix below depends on the doc statements above, not on any live test.

### 2.2 Azure Files

| Need | Source | What it states |
|---|---|---|
| Replace via rename | [Rename File](https://learn.microsoft.com/en-us/rest/api/storageservices/rename-file) | Available in version 2021-04-10 and later for SMB shares; the API is not supported for NFS shares. `x-ms-file-rename-replace-if-exists` overwrites an existing destination. Source and destination lease headers are available. It is unsupported on share snapshots. The listed request headers have **no `If-Match` / `If-None-Match`**. |
| Write | [Create File](https://learn.microsoft.com/en-us/rest/api/storageservices/create-file), [Put Range](https://learn.microsoft.com/en-us/rest/api/storageservices/put-range) | Create File "creates a new file or replaces a file", but only initializes it. Content goes in with Put Range, so replacement is multi-step. Create File with content up to 4 MiB is documented only from version 2026-02-06. Neither page lists `If-Match` / `If-None-Match`. |
| ETag | [Set File Properties](https://learn.microsoft.com/en-us/rest/api/storageservices/set-file-properties), Put Range | Returns an ETag representing "the version of the file" and Last-Modified. The ETag is returned but **no page reviewed documents it as an accepted write precondition**. |
| Leases | [Lease File](https://learn.microsoft.com/en-us/rest/api/storageservices/lease-file) | Supported from version 2019-02-02. The Set File Properties and Put Range pages state the lease header is ignored on NFS shares, which "do not support file leases". |

Takeaways:

- Rename-replace exists but is not documented as conditional on a revision. Two writers can each rename over the target, so last writer wins.
- Stale-revision rejection would have to rely on leases (SMB only, with expiry/renewal concerns), or on an app-level check-then-rename that is **racy** without a lock.
- Local POSIX `rename()` semantics must not be assumed over an SMB or NFS mount. This matches the warning in the P2-C4 plan item.

## 3. Documented vs. needs live spike

### 3.1 Documented (cite and trust, with low-cost regression test)

- Blob `If-Match` / `If-None-Match` supported on writes, with 412 on mismatch.
- Blob Put Blob overwrites the whole content.
- JS/.NET SDK expose the conditions.
- Blob lease semantics.
- Azure Files Rename File exists, supports `replace-if-exists`, and takes lease IDs.
- Azure Files leases are SMB only.

### 3.2 Not found in the documentation reviewed (inference, not guarantee)

- Any conditional-write (ETag precondition) header on Azure Files Create File, Put Range, or Rename File. Absence on those pages is evidence, but I did not read the full Files REST header index or the SMB/NFS protocol documents.
- Whether SMB/NFS mounted clients get atomic rename-over-existing.
- Whether a failed or interrupted Put Range sequence can leave a partial file visible.

### 3.3 Partially verified: JS SDK version and API-version details

The live spike used `@azure/storage-blob` 12.34.0 and `@azure/identity`
4.14.1, installed temporarily without changing the project manifests.
`uploadData` honored `If-None-Match: *` and `If-Match` for the tested payloads.
The SDK's REST API version was not captured; `upload()` and
`syncUploadFromURL` were not tested.

### 3.4 Existing application payload bounds

Before E-036, the schemas did not define a maximum serialized storage document
size:

- `src/schemas/bundle.ts:11-32` sets `MAX_BUNDLE_BYTES` to 20 MiB, but applies the derived character limit to each file or agent `content` string. It also permits up to 2,000 files per skill and 100 skills; there is no aggregate serialized-bundle byte limit in this schema.
- `src/schemas/run-record.ts:5-72` permits up to 1,000 steps and 50 attempts per step, with per-attempt summary and reason limits, and embeds a `ChainBundle`. There is no total serialized run-record limit.

These are component bounds, not a Blob object-size policy. The owner selected
a 32 MiB total cap for the PoC, and E-036 records the schema enforcement
against compact serialized JSON. Test near-limit payloads through the
selected SDK in the live spike. The API must separately reject oversized raw
request bodies before parsing.

## 4. Test matrix and status

| ID | Backend | Check | Pass criterion | Status |
|---|---|---|---|---|
| B1 | Blob | Concurrent `uploadData` create requests with `If-None-Match: *` | One request succeeds; the other gets 409/412 | PASSED |
| B2 | Blob | N parallel `uploadData` writers, all `If-Match` the same ETag | Exactly one succeeds; the rest get 412; final content equals the winner | PASSED |
| B3 | Blob | Write with a stale ETag after a successful write | 412; blob unchanged | PASSED |
| B4 | Blob | Reader polling during repeated overwrites of an exact-32-MiB JSON chain | Never sees a torn or mixed document; every read validates | PASSED |
| B5 | Blob | JS SDK `uploadData` honors `conditions.ifMatch` / `ifNoneMatch` for the selected size | Same as B2 and B3 through `uploadData` | PASSED; `upload` and `syncUploadFromURL` not run |
| B6 | Blob | Interrupt `uploadStream` source after a staged chunk, then read | Old content intact; no partial commit | PASSED |
| B7 | Blob | Verify versioning, blob soft delete, and container soft delete are disabled, and no lifecycle policy exists | Automatic retention is disabled | PASSED |
| B8 | Blob | Acquire lease; write without and with lease ID | Missing lease ID is rejected; correct lease ID permits write | PARTIAL; expiry/renewal not run |
| B9 | Blob | Auth via managed identity (RBAC) with the least-privilege data role, no account key | Conditional writes work with Entra auth | NOT RUN; no managed-identity host |
| B10 | Blob | Retry/idempotency: a 412 caused by our own retried successful write (timeout after commit) | App-level `revision` check disambiguates | NOT RUN |
| F1 | Files | Two writers rename a temp file over the same target, concurrently | Record whether a stale writer can be rejected (expected: no, last writer wins) | NOT RUN |
| F2 | Files | Rename-replace behavior on SMB mount vs REST API (rename endpoint is not available for NFS) | Is replace atomic to readers? | NOT RUN |
| F3 | Files | Whether any ETag precondition header is honored on Put Range / Rename | Confirms or refutes section 3.2 | NOT RUN |
| F4 | Files | Break an infinite lease on SMB after client failure; confirm leases are unsupported on NFS | Documents lock recovery behavior | NOT RUN |
| F5 | Files | Mid-write crash leaves partial file? | Record only; informs the exclusion | NOT RUN |
| X1 | Blob | Run the same catalog schema validation before and after a read-back | Rejects an invalid document and preserves the prior revision | PASSED |

Run F1 to F5 only if Blob fails B1 to B10, or if a mount requirement appears. Per D-11, prefer the lowest-cost options for the spike (a single standard LRS account, a minimal container, and no versioning during B1 to B6).

## 5. Remaining decisions and deferrals

1. Throughput benchmarking is skipped because the owner has not set a write-rate target. Revisit only if a workload target becomes necessary.
2. Recovery policy is resolved for the PoC: no automated versioning, soft
   delete, or retention; use operator-triggered export/restore as documented
   in P2-C5. P2-G passed a single-object synthetic backup/restore check
   (E-051), then removed the temporary account. Multi-object batch path
   mapping and guarded existing-object revision restore remain untested.
3. The owner authorized a disposable Standard LRS account/container on 2026-11-20. The spike resources were removed after the checks; no test account remains.

## 6. Source list

- <https://learn.microsoft.com/en-us/rest/api/storageservices/put-blob>
- <https://learn.microsoft.com/en-us/rest/api/storageservices/specifying-conditional-headers-for-blob-service-operations>
- <https://learn.microsoft.com/en-us/azure/storage/blobs/concurrency-manage>
- <https://learn.microsoft.com/en-us/rest/api/storageservices/lease-blob>
- <https://learn.microsoft.com/en-us/azure/storage/blobs/versioning-overview>
- <https://learn.microsoft.com/en-us/javascript/api/@azure/storage-blob/blobrequestconditions>
- <https://learn.microsoft.com/en-us/dotnet/api/azure.storage.blobs.models.blobrequestconditions>
- <https://learn.microsoft.com/en-us/rest/api/storageservices/rename-file>
- <https://learn.microsoft.com/en-us/rest/api/storageservices/create-file>
- <https://learn.microsoft.com/en-us/rest/api/storageservices/put-range>
- <https://learn.microsoft.com/en-us/rest/api/storageservices/set-file-properties>
- <https://learn.microsoft.com/en-us/rest/api/storageservices/lease-file>
- <https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-blob-overview>
- <https://learn.microsoft.com/en-us/azure/storage/blobs/soft-delete-container-overview>
- <https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview>
- <https://learn.microsoft.com/en-us/azure/storage/blobs/point-in-time-restore-overview>

Microsoft Learn pages were fetched on 2026-11-19. The Blob conditional-header and concurrency pages and the Azure Files Put Range and Rename File pages were read in full for the claims above. The Create File request-header list was checked; the remaining Put Blob, SDK, versioning, and lease references were keyword-checked, not read in full. Claims are limited to the cited behavior examined.

## 7. Live spike results — 2026-11-20

The project owner authorized reprovisioning the Basic P2A landing zone and
creating one disposable Blob test account, with no P2 deployment. The
`@azure/storage-blob` 12.34.0 and `@azure/identity` 4.14.1 packages were
installed temporarily without changing `package.json` or `package-lock.json`.
An ephemeral runner outside the repository used `DefaultAzureCredential` with
the signed-in operator identity. The account used Standard_LRS, HTTPS-only,
TLS 1.2, no public blob access, and disabled shared-key access. The private
`documents` container granted `Storage Blob Data Contributor` only at
container scope.

B1-B7 and X1 passed. The conditional create race had one successful request
and one 409/412 rejection; concurrent ETag writers had one winner and four
412 responses; stale writes returned 412 without changing the winner. Two
readers polling during exact-32-MiB chain replacements observed only complete,
schema-valid versions. An interrupted `uploadStream` source left the prior
blob content intact. Versioning and blob/container soft delete were explicitly
disabled, and the account had no lifecycle policy. The 15-second lease test
rejected a write without the lease ID and accepted one with the lease ID;
lease expiry and renewal were not tested. X1 rejected an invalid catalog
before upload and validated the read-back.

B5 covered `uploadData` only; `upload()` and `syncUploadFromURL` remain
untested. B9 was not run because no managed-identity host was deployed. B10
was not run because application retry/idempotency logic does not exist yet.
The disposable account and container-scoped role assignment were deleted
after the spike (E-045). No Azure Files tests or throughput benchmark ran.
The results support the owner's selection of Blob with ETag conditional
writes. Lease expiry/renewal and the B9/B10 checks remain untested as recorded
above; no Azure Files tests or throughput benchmark ran.
