# Internal schemas

These schemas are owned by this repository. They are not published or imported
by Skill Loom. The compatibility boundary is the exported chain and bundle
format only.

## Skill Loom source inventory

Reviewed at commit
[`a608c2853a83a017b46b24383bc5d81b4d22f1a9`](https://github.com/McFuzzySquirrel/skill-loom/commit/a608c2853a83a017b46b24383bc5d81b4d22f1a9).

- `src/shared/chain.ts`: No imports; types and a display helper. Adapted into
  chain types and Zod definitions in `src/schemas/chain.ts`.
- `src/server/chains/model.ts`: Zod; imports shared chain types and the server
  config harness schema. Adapted without server imports; version remains 3.
- `src/shared/bundles.ts`: Imports chain types from the server model. Adapted
  into standalone schemas; bundle versions 1 and 2 remain supported.
- `src/portable/bundle.ts`: Imports Node crypto, Zod, YAML frontmatter, and
  server catalog and chain modules. Only pure bundle shapes were adapted;
  runtime path, content, and filesystem behavior stays out of the schema module.
- `src/portable/run-schema.ts`: Imports Zod, the bundle parser, and Node crypto.
  Adapted with a direct bundle-schema dependency; runtime fingerprint checks
  are not part of parsing.
- `src/server/runs/model.ts`: Imports Zod, the chain model, and server config.
  Reviewed as a candidate; hosted records use the portable record shape and
  version 1.
- `src/shared/remote-catalog.ts`: No imports; resource-limit types. Reviewed.
  Host-managed catalog records are defined locally; remote pulls are not part
  of v1.
- `src/shared/discovery-handoff.ts`: Zod schema for a separate temporary
  discovery format. Not copied because it is outside chain/bundle interchange.
- `src/shared/presets.ts`: Imports only shared chain types. Scenario preset
  types are not persisted interchange formats and were not copied.
- `src/shared/project-claim.ts`: Imports filesystem, crypto, path, and SQLite
  modules. Not copied; its schemas describe local project ownership.
- `src/shared/project-coordination.ts`: Imports crypto and the project-claim
  and project-run-record modules. Not copied; it coordinates local processes.
- `src/server/catalog/remote.ts`: Imports filesystem, process, path, crypto,
  config-store, and Git modules. Not copied; remote repository catalog behavior
  is excluded.
- `src/shared/project-run-records.ts`: Imports filesystem and crypto modules,
  plus managed and portable run parsers. Not copied; filesystem scanning is
  outside the schema module.
- `src/shared/sync-directory.ts`: Imports filesystem APIs. Not copied; it
  implements persistence behavior.
- `src/shared/terminal.ts`: Protocol types for the server-owned terminal
  transport, not chain or bundle schemas; not copied.
- `src/portable/cli.ts`: Imports process, filesystem, path, runtime, and local
  project coordination modules. Not copied.
- `src/portable/install-skill.ts`: Imports filesystem, crypto, path, and
  bundle-install helpers. Not copied.
- `src/portable/installed-modes.ts`: Imports filesystem, crypto, path, and
  directory-sync and bundle helpers. Not copied.
- `src/portable/runtime.ts`: Imports filesystem, process, crypto, path, and
  catalog frontmatter modules. Not copied; execution behavior is outside the
  schema module.

`src/shared/api.ts` contains API error-envelope helpers rather than chain,
bundle, run-record, or catalog interchange schemas, so it was not copied.
The source application's server layer depends on Fastify and its terminal
runner uses `node-pty`; neither dependency is imported by these schemas.

## Compatibility policy

- Accept chain documents at version 3 and exported bundles at versions 1 and 2.
- Keep these format versions unchanged. A future format change requires an ADR,
  fixture updates from a recorded Skill Loom commit, and passing contract tests.
- Top-level chain, bundle, catalog, and run-record schemas enforce a 32 MiB
  application limit on their compact JSON serialization, measured in UTF-8
  bytes. This does not change the interchange format versions or replace an
  HTTP request-body limit at the API boundary.
- Bundle and catalog skill files carry canonical base64 content. Each skill is
  limited to 2,000 files and 20 MiB of decoded content; file paths must be
  portable relative paths without traversal, cross-platform separators,
  duplicate/colliding names, or filesystem-reserved components.
- Hosted catalog entries are admin-added, reviewed, fingerprinted snapshots.
  Existing names cannot be overwritten, and bundle export resolves only those
  reviewed snapshots; remote repository pulls are not supported in v1.
- Fixtures in `tests/fixtures/skill-loom/a608c2853a83a017b46b24383bc5d81b4d22f1a9/`
  are pinned to the source commit above. The chain is adapted from
  `tests/unit/chain-model.test.ts`; bundle fixtures are adapted from
  `tests/unit/portable-runtime.test.ts`.
- Refresh a fixture only when an intentional upstream format change is under
  review. Record the new commit and format delta here, then verify both parse
  and JSON re-export in this repository's tests.
