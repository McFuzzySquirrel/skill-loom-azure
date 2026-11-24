# Architecture Decision Records

Accepted decisions are listed by stable ID. Each record contains one decision,
its scope, implementation rules, and a way to verify those rules.

| ADR | Title | Status | Date |
| --- | --- | --- | --- |
| [ADR-0001](0001-hosting-model.md) | Azure Container Apps hosting | Accepted | 2026-11-21 |
| [ADR-0002](0002-authentication-and-authorization.md) | Entra authentication and app roles | Accepted | 2026-11-21 |
| [ADR-0003](0003-run-isolation.md) | Gate hosted chain execution | Accepted | 2026-11-21 |
| [ADR-0004](0004-schema-ownership-and-interchange.md) | Internal schemas and pinned interchange | Accepted | 2026-11-21 |
| [ADR-0005](0005-relationship-to-skill-loom.md) | Keep the cloud project separate | Accepted | 2026-11-21 |
| [ADR-0006](0006-azure-p2a-landing-zone.md) | Pinned Basic Foundry landing zone | Accepted | 2026-11-21 |
| [ADR-0007](0007-p2-foundation-infrastructure.md) | Bicep for the P2 foundation | Accepted | 2026-11-21 |
| [ADR-0008](0008-p2-public-network-posture.md) | Public endpoints for the PoC | Accepted | 2026-11-21 |
| [ADR-0009](0009-reviewed-skill-trust-boundary.md) | Admin-reviewed skill source | Accepted | 2026-11-21 |
| [ADR-0010](0010-blob-storage-persistence.md) | Azure Blob persistence | Accepted | 2026-11-21 |
| [ADR-0011](0011-manual-only-storage-recovery.md) | Manual-only storage recovery | Accepted | 2026-11-21 |
| [ADR-0012](0012-standalone-adopter-deployment.md) | Standalone adopter deployment | Accepted | 2026-11-24 |

## Rules

- One row per record, in identifier order, with no gaps.
- Keep each row's status and date aligned with its record.
- A superseding decision must update both records and this index.
