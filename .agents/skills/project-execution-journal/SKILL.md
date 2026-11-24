---
name: project-execution-journal
description: Create or update a project execution journal, running collaboration dialogue, or phase-based project notes grounded in available project records and verifiable work history. Use when asked to document how project work unfolded or keep a project journal current.
---

# Project execution journal

Create a factual, readable account of how a project is carried out. When a
project plan exists, keep the journal subordinate to it: the plan owns status
and acceptance criteria; the journal explains decisions, collaboration,
surprises, and lessons.

Use this skill for an explicit user request to create, update, or restructure a
project journal, running dialogue, or session-notes document, or when an
applicable project instruction explicitly requires dated journal updates
during implementation. Treat that instruction as authorization to append at
its specified cadence; generic instructions to implement code are not a
journal trigger. A request to brainstorm or assess the idea is not permission
to edit files.

## Workflow

1. **Establish the assignment.** Identify the requested journal, its audience,
   destination, and whether the user wants a new journal, an appended update,
   or a restructure. Inspect the project's documentation conventions, existing
   journal, and available plan or milestone record. Keep the implementation
   plan itself unchanged.

   Ask for the destination or audience when it materially affects the content
   and is not clear from the request or project conventions. If the user asks
   only for an assessment, give a recommendation without creating or changing a
   journal. When an applicable project instruction specifies a journal path
   and update cadence, follow it without asking for a separate reminder.

   **Done when:** the requested journal action, audience, destination, and
   evidence sources are clear.

2. **Build an evidence map.** Use the current conversation and available
   project records, such as plans, task trackers, source changes, test output,
   deployment records, and research notes. Prefer observed evidence to
   remembered or inferred claims. For each meaningful event, capture its date
   when known, the decision or action, the responsible person or agent, the
   result, and any material limitation or lesson.

   Distinguish the project owner/requester, the coding or task agent, and
   research sub-agents when the evidence identifies them. Do not assign an
   action to someone based only on chronology or presence in the conversation.
   Record a skill only when its use is known. List CLI, API, MCP, editor, and
   other tool use separately from skills. Use “none” when verified and
   “not recorded” when the available evidence cannot establish whether a skill
   or tool was used.

   Mark outcomes precisely: completed, failed, blocked, deferred, or not run.
   Distinguish live checks from local, mocked, or contract tests. Keep failed
   attempts and later corrections visible as dated events rather than
   rewriting history to make execution look linear.

   **Done when:** each proposed journal claim has an attributable source or is
   explicitly marked unknown, deferred, or not run.

3. **Choose the structure.** Reuse the project's existing phase names and
   order when a plan provides them. Do not impose a fixed software or cloud
   lifecycle on a different kind of project. Group by meaningful phases or
   milestones, with dated entries chronological within each group.

   If no plan or phase model exists, propose a small neutral outline based on
   the visible work and ask the user to approve it as the journal's narrative
   structure. Do not present that outline as a project plan. This skill
   documents execution; it does not create or maintain the implementation
   plan.

   Add concise **Quick highlights** near the beginning when creating or
   restructuring a journal. For this project's
   `docs/articles/azure-skills-experiment.md`, use two phase-indexed tables:
   **Microsoft Azure Skills and tools** and **Other skills and tools**. Give
   each table `Phase`, `Skills`, `Tools`, and `Use` columns. Include the phase
   number and title in each phase cell; keep cross-phase rows clearly labeled.
   Keep skills separate from tools, use names recorded in the dated entries,
   and briefly summarize their purpose. Use `—` for no recorded use and mark
   future phases `Not started`. These tables inventory activity; the
   implementation plan remains the source of truth for phase status. Refresh
   rows as new use is recorded. For other journals, follow the user's
   requested format and summarize purpose, verified state, decisions or
   lessons, and open work. Label planned work clearly; do not make future
   phases look delivered.

   **Done when:** the outline fits the project and its source plan, and any
   new phase model has user approval.

4. **Write or update the journal.** Follow the existing document's voice,
   audience, location, and formatting when available. For a new journal, use
   the project’s documentation conventions; ask before choosing a public
   destination when the audience is uncertain.

   Default to append-only updates that add dated entries. An applicable
   project instruction can authorize those updates at its specified cadence.
   Restructure, condense, or replace historical prose only when the user
   explicitly requests it. When authorized to edit history, retain material
   decisions, approvals, actions, failures and corrections, evidence,
   limitations, and lessons.

   Use a consistent entry shape suited to the project, for example:

   ```markdown
   ### [Date] — [Decision or milestone]

   **Project owner/requester:** [Decision, approval, or action; omit if none.]
   **Agent:** [Research, implementation, or verification; omit if none.]
   **Research sub-agent:** [Source work and result; omit if none.]
   **Outcome/evidence:** [What changed and what the evidence proves.]
   **Skills used:** [Skill names, none, or not recorded.]
   **Tools used:** [CLI/MCP/API/editor tools, none, or not recorded.]
   ```

   Adapt actor labels to the project. Separate skills from tools even when
   both appear in the same update. Do not invent skill names, tool use, quotes,
   dates, decisions, or test results to fill the format.

   **Done when:** the journal reflects the agreed structure, attributes
   meaningful actions, separates skills from tools, and preserves the
   evidence boundary for every reported result.

5. **Validate and report.** Verify Quick highlights table rows against the
   dated entries and recorded skill/tool use; keep phase status in the
   authoritative plan rather than those inventory tables. Check dated ordering
   within phases, local links, headings, Markdown, and the final diff. Inspect
   content for credentials, secrets, private URLs, environment-specific
   identifiers, and personal details inappropriate for the stated audience;
   replace them with safe descriptions or placeholders. For documentation-only
   changes, run relevant documentation checks rather than unrelated
   application tests.

   Report what changed, validation performed, evidence still missing, and any
   uncertainty. Do not describe a mock, contract, or local check as a live
   integration result.

   **Done when:** the document passes applicable checks, contains no
   inappropriate sensitive values, and its status and evidence agree with the
   project records—or unresolved conflicts are reported to the user.

## Portability rules

- Follow the host project's phase names, writing style, audience, and document
  paths; do not assume Azure, a software lifecycle, a fixed phase numbering
  scheme, or a particular repository layout.
- Use the journal as a narrative companion, not a second implementation plan
  or a substitute for source evidence.
- Keep actions attributable and dated. A conversation timestamp does not
  prove that an external action succeeded.
- Keep unpublished project data in the current trusted workspace. Do not send
  private project material to external services for summarization or editing.
- If the requested audience or source-of-truth conflict makes a factual or
  privacy decision uncertain, pause and ask the user rather than guessing.
