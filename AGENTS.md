<!-- md-doc-search:begin -->
## Documentation Lookup Protocol
For large reference documents (>300 lines), use `search_docs` to locate relevant sections, then `read_doc_section` with the returned `file_path`, `start_line`, and `end_line`.
For instruction files such as `AGENTS.md`, `SKILL.md`, and custom agent definitions, follow the normal instruction-loading process. Search may help locate them, but search results must not replace the full applicable instructions.
<!-- md-doc-search:end -->

# Project invariants

- Require Entra authentication for every API and MCP request. Validate issuer, audience, signature, and expiry, and deny access by default.
- Spawn subprocesses with an executable and argument array. Keep user-controlled values out of shell command strings.
- Version persisted JSON, validate it against its schema, and replace files atomically. Reject writes based on stale revisions.
- Treat skills and tool output as untrusted input. Keep catalog additions admin-managed and reviewed, and enforce size, file-count, and path-safety limits.
- Keep hosted chain execution disabled until the P5 exit gate passes.
- Record execution evidence in the implementation plan. Mark live checks `not run` when only mocks or contract tests were exercised.
- During implementation of
  [docs/plans/implementation-plan.md](docs/plans/implementation-plan.md), use
  [.agents/skills/project-execution-journal/SKILL.md](.agents/skills/project-execution-journal/SKILL.md)
  to keep
  [docs/articles/azure-skills-experiment.md](docs/articles/azure-skills-experiment.md)
  current. Append a dated entry after each plan task or meaningful execution
  stage, and whenever an owner decision, validation result, material failure
  or correction, or lesson changes. Capture who acted, skills separately from
  CLI/MCP tools, outcomes, and evidence limits before moving to the next task.
  Summarize related low-level commands in one entry rather than logging every
  command.
- Append dated article updates instead of replacing earlier entries. Attribute
  actions to the project owner, Copilot CLI coding agent, or research
  sub-agent, and name the skills used; distinguish skills from CLI/MCP tools.
- Keep Quick highlights in
  [`azure-skills-experiment.md`](docs/articles/azure-skills-experiment.md)
  as two phase-indexed tables: **Microsoft Azure Skills and tools** and
  **Other skills and tools**. Use `Phase`, `Skills`, `Tools`, and `Use`
  columns. Include each phase number and title in its phase cell, clearly
  labeling cross-phase rows. Use only recorded names, mark no use with `—`,
  and mark future phases `Not started`. The implementation plan remains the
  source of truth for phase status.

<!-- BEGIN: documentation-maintenance -->
## Documentation Maintenance

Update the documentation in the same change as the behavior it describes, or
state in the change why no update is needed.

- `README.md` — keep the Getting Started commands runnable, the links
  resolving, the feature list current, and all required sections present.
  Link to the guides instead of repeating their content.
- `CHANGELOG.md` — add an entry under `Unreleased` for every user-visible
  change, using the existing headings instead of inventing categories.
- `docs/releases/unreleased.md` — update the summary, known limitations, and
  validation boundary when shipped behavior or evidence changes.
- `docs/user-guide.md` — update workflows, visible states, client setup, and
  recovery steps when user-facing behavior changes.
- `docs/admin-guide.md` — update prerequisites, configuration, operations, and
  troubleshooting when deployment or configuration changes.
- `docs/adr/NNNN-kebab-title.md` — record a new decision when a durable
  architectural choice changes, and supersede the old record instead of
  rewriting it.
- `docs/adr/README.md` — add or update the row for every record you add,
  supersede, or re-date, in identifier order.
- Before finishing work, run `npm run docs:check` and
  `npx markdownlint-cli2 docs/user-guide.md docs/admin-guide.md
  docs/releases/unreleased.md`, then confirm that commands, paths, and links
  still resolve.
<!-- END: documentation-maintenance -->
