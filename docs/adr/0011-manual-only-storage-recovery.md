---
id: ADR-0011
applies_to:
  - "infra/p2/**"
  - "docs/runbooks/storage-backup-restore.md"
  - "src/persistence/**"
status: Accepted
---

# ADR-0011: Manual-only storage recovery

- **Deciders:** Project owner (@McFuzzySquirrel)
- **Date:** 2026-11-21

**Technical Story:** The manual backup/restore policy decision (P2-C5), the
storage foundation live validation (P2-G), and the recorded restore evidence
(E-039, E-051).

## Agent Rules

- **MUST:** Use manual, operator-triggered export and restore for the PoC.
- **MUST NOT:** Enable Blob versioning, blob/container soft delete, scheduled
  backups, or automatic retention under this decision.
- **MUST:** Validate restored JSON against its current schema and use
  conditional ETag writes; never unconditionally overwrite an existing blob.
- **MUST NOT:** Claim a guaranteed RPO or protection from account deletion or
  regional loss.

## Verify

- **Check:** `az bicep build --file infra/p2/main.bicep --stdout`; manually
  review `docs/runbooks/storage-backup-restore.md` against the legacy storage
  foundation Blob retention settings.
- **Expected:** Bicep compiles with automatic recovery disabled, and the
  runbook requires schema validation and conditional writes.

## Context and Problem Statement

The PoC needs a recovery procedure but has no write-rate target or approved
retention budget. Should recovery be automated or remain an explicit
operator-controlled task?

## Decision Drivers

- Keep recurring storage costs low.
- Require validation and explicit authorization for restoration.
- Make the absence of an RPO visible.

## Considered Options

- Manual encrypted export and restore.
- Blob versioning and soft delete.
- Scheduled backups with automated retention.

## Decision Outcome

Chosen option: "Manual-only export and restore," because it matches the
cost-first PoC posture. The procedure requires Entra data roles, encrypted
off-repository backup storage, schema validation, application revision
handling, and ETag conditions. It does not promise a recovery time or point.

### Positive Consequences

- No recurring backup or retention configuration is required.
- Operators must review and verify each restore.

### Negative Consequences

- Recovery depends on an operator having a valid backup.
- Storage-account deletion and regional loss are not covered.
- The runbook has only been exercised for one synthetic object, not a
  multi-object restore or guarded replacement of existing production data.

## Pros and Cons of the Options

### Manual export and restore

- Good, because it minimizes automatic retention and recurring cost.
- Bad, because it requires human action and has no guaranteed RPO.

### Automated versions or scheduled backups

- Good, because they could reduce operator response time.
- Bad, because they add cost and retention behavior not approved for this
  PoC.

## Links

- Procedure: [`docs/runbooks/storage-backup-restore.md`](../runbooks/storage-backup-restore.md).
- IaC: [`infra/p2/main.bicep`](../../infra/p2/main.bicep).
- Related backend: [ADR-0010](0010-blob-storage-persistence.md).
