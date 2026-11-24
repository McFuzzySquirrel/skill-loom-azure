---
id: ADR-0010
applies_to:
  - "src/persistence/**"
  - "src/schemas/catalog.ts"
  - "src/schemas/chain.ts"
status: Accepted
---

# ADR-0010: Azure Blob persistence

- **Deciders:** Project owner (@McFuzzySquirrel)
- **Date:** 2026-11-21

**Technical Story:** Q-4, P2-C4, P3-C3, and E-047.

## Agent Rules

- **MUST:** Use Azure Blob Storage as the only v1 persistence backend.
- **MUST:** Store versioned, schema-validated JSON and reject writes based on
  stale application revisions.
- **MUST:** Create blobs with `If-None-Match: *` and replace them with
  `If-Match` using the ETag from the corresponding read.
- **MUST NOT:** Add an unconditional overwrite or a second filesystem backend.
- **MUST:** Enforce the 32 MiB serialized-object limit on reads and writes.

## Verify

- **Check:** `npm run check`
- **Expected:** Fake-container tests pass for schema validation, conditional
  writes, stale/concurrent revisions, pagination, and size bounds. These tests
  do not prove live Azure SDK or managed-identity behavior.

## Context and Problem Statement

The service persists chains and a reviewed catalog without needing a
filesystem mount. Which Azure storage backend provides a suitable
single-object conditional-write model?

## Decision Drivers

- Atomic replacement and stale-writer rejection.
- No filesystem-mount requirement.
- Cost-first PoC operations with manual recovery.

## Considered Options

- Azure Blob Storage.
- Azure Files.
- Supporting both backends.

## Decision Outcome

Chosen option: "Azure Blob Storage only," because the live spike verified
conditional Blob writes and no consumer requires a mounted filesystem. The
adapter uses the private `documents` container, a managed identity, versioned
JSON, ETags, and application revisions. The container stores chain documents
under hashed names and the catalog at a fixed path.

### Positive Consequences

- Blob ETags provide the storage-level compare-and-swap condition.
- Schemas and revisions provide an application-level version boundary.
- A single backend keeps the PoC smaller.

### Negative Consequences

- Filesystem mounting and Azure Files-specific workflows are not supported.
- Managed-identity execution against the adapter remains unverified live.
- Application retry/idempotency behavior remains deferred; a retry after an
  ambiguous commit may receive a revision conflict.

## Pros and Cons of the Options

### Azure Blob Storage

- Good, because conditional writes and private containers fit the document
  model.
- Bad, because the adapter is Azure-specific and requires an identity-enabled
  host for production use.

### Azure Files or both backends

- Good, because Files could support a future mount consumer.
- Bad, because no current consumer needs it and Files did not provide the
  required documented conditional-write guarantee.

## Links

- Implementation: [`src/persistence/blob.ts`](../../src/persistence/blob.ts).
- Storage research: [`docs/plans/p2-c4-storage-backend-research.md`](../plans/p2-c4-storage-backend-research.md).
- Recovery: [ADR-0011](0011-manual-only-storage-recovery.md) and
  [`docs/runbooks/storage-backup-restore.md`](../runbooks/storage-backup-restore.md).
- Historical live test: E-044 and E-047 in the
  [implementation plan](../plans/implementation-plan.md).
