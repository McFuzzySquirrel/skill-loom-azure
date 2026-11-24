# Contributing

Contributions should preserve the POC's security and evidence boundaries.

## Development

- Use Node.js 24 or later.
- Install dependencies with `npm ci`.
- Run `npm run check` before proposing a change.
- For documentation-only changes, run the relevant Markdown checks.
- Use `npm run dev:setup` and the local Azurite profile only with local
  configuration. API operations still require real Entra authentication.

## Security and evidence

- Never commit credentials, access tokens, tenant-specific deployment output,
  `.azure` environment files, `.mcp.json`, `.env.local`, or generated
  `.archify`/`.codegraph` output.
- Keep API/MCP authentication, role checks, versioned persistence, and
  conditional writes intact.
- Treat skills, chains, bundles, and tool output as untrusted.
- Distinguish mocked/local checks from live Azure or Foundry validation.
  Record unrun live checks as `not run`.
- Do not enable hosted chain execution before its P5 exit gate passes.

## Documentation and pull requests

- Keep [`docs/plans/implementation-plan.md`](docs/plans/implementation-plan.md)
  as the phase and evidence source of truth.
- Append dated entries to
  [`docs/articles/azure-skills-experiment.md`](docs/articles/azure-skills-experiment.md);
  preserve earlier decisions and attribute owner, coding-agent, and research
  actions. Record skills separately from CLI/MCP tools.
- Explain the behavior change, tests, and remaining evidence limits in the
  pull request. Never include secret values in logs or screenshots.
