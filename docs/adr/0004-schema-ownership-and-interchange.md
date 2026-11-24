---
id: ADR-0004
applies_to:
  - "src/schemas/**"
  - "tests/fixtures/skill-loom/**"
  - "tests/schemas.test.js"
status: Accepted
---

# ADR-0004: Internal schemas and pinned interchange

- **Deciders:** Project owner (@McFuzzySquirrel)
- **Date:** 2026-11-21

**Technical Story:** Implementation plan D-7 and P1-G.

## Agent Rules

- **MUST:** Keep this repository's schemas internal; do not publish or consume
  a shared schema package from Skill Loom.
- **MUST:** Preserve supported chain and bundle versions unless a new
  decision approves the format change.
- **MUST:** Test interchange against fixtures pinned to a recorded
  Skill Loom commit.
- **MUST NOT:** Import Skill Loom server, PTY, or filesystem runtime code into
  the schema modules.

## Verify

- **Check:** `npm run check`
- **Expected:** Pinned chain and bundle fixtures parse and round-trip without
  drift; schema and contract tests pass.

## Context and Problem Statement

Sharing a schema package would couple two repositories but would not alone
prevent exported-format drift. How should the cloud project maintain
compatibility while keeping its runtime independent?

## Decision Drivers

- Keep the cloud service independently deployable.
- Detect changes at the exported interchange boundary.
- Avoid importing local server behavior into hosted schemas.

## Considered Options

- Publish a shared schema package.
- Own an internal schema module and verify the portable formats with fixtures.
- Copy server runtime modules directly.

## Decision Outcome

Chosen option: "Internal schemas with pinned chain and bundle fixtures,"
because it isolates the cloud runtime while preserving a testable portable
boundary. The current chain schema is version 3 and the bundle schema accepts
versions 1 and 2.

### Positive Consequences

- The cloud service has no runtime dependency on Skill Loom's server.
- Changes to the portable format are visible in fixture tests.

### Negative Consequences

- Schema adaptations can drift unless fixtures and source commit references
  are maintained.
- A cloud-specific persisted format change requires its own review.

## Pros and Cons of the Options

### Internal schemas with pinned fixtures

- Good, because runtime ownership stays local and compatibility is tested.
- Bad, because schema adaptation and fixture refreshes require discipline.

### Shared package or copied server runtime

- Good, because some types could be reused directly.
- Bad, because publishing couples release schedules; copying runtime code
  imports unrelated server dependencies and behavior.

## Links

- Schema inventory: [`docs/schemas/README.md`](../schemas/README.md).
- Fixture source: Skill Loom commit
  `a608c2853a83a017b46b24383bc5d81b4d22f1a9`.
- Verification: [`tests/schemas.test.js`](../../tests/schemas.test.js).
