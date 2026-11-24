# Example scenario chains

These version-3 chains demonstrate feature planning, bug investigation,
change review, and a chain that references the
[`Demo Meeting Brief`](../skills/demo-meeting-brief/SKILL.md) catalog skill.
All set `automaticPermissionOptIn` to `false`.

The JSON files are validated against `ChainSchema` by
`tests/schemas.test.js`. They are data examples, not permission to execute a
chains. They are not automatically seeded into a live API; saving them there
creates persistent records. The skill-linked example requires an
administrator to add its skill first. Hosted execution remains disabled until
the hosted runner exit gate passes.
