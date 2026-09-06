# qspec 1.10.1: one field, one paragraph

Patch brief from System Design, 2026-09-05. Delivery target: a branch `qspec-1.10.1` on `/Users/realtimex/github/qspec` (GitHub `therealtimex/qspec`) from `main` at 761ea74 (v1.10.0). No forge, as for 1.7.0 to 1.10.0: delivery is the pushed branch at a named SHA; do not tag or release, System Design does that after QA.

## Context

The Q-006 committee sheet PDF shows the whole Design section as one paragraph: eight labelled fields with no break between them. The cause is in `lib/render.js`: labelled body fields are emitted as consecutive lines with no blank line between them, and CommonMark, which paperforge follows, joins consecutive lines into one paragraph. The same shape appears in the sheet's Ask section, the object and scope lines, and the dossier's question-type and constraints sections. List-valued profile fields such as `mechanism_outcomes` and `precommitted_checks` are flattened into one line joined with semicolons. The suite asserts on labels and denylisted tokens, not on paragraph structure, so it passed.

## Decisions

- **ADR-1.10.1-1 Every labelled body field is its own paragraph.** In `sheet`, `dossier`, and `index` bodies, a `**Label:** text` line is always followed by a blank line. The head rows above the first `---` stay consecutive: paperforge parses them as cover metadata, and the head format is the contract with `qspec paper`.
- **ADR-1.10.1-2 List-valued fields render as lists.** A profile field whose value is an array renders as `**Label:**` on its own line, a blank line, then one `- item` per entry with trailing punctuation normalised as elsewhere, then a blank line. Applies to `mechanism_outcomes`, `precommitted_checks`, and any other array-valued profile or constraint field the catalog declares. Materials already render as lists and are unchanged.
- **ADR-1.10.1-3 A structural test.** `scripts/test.sh` gains a check that, for the rendered sheet and dossier of an example spec, no two lines matching `^\*\*[^*]+:\*\*` are adjacent below the first `---`, and that a list-valued profile field appears as list items rather than a semicolon-joined line. The check runs on the markdown, not on a paperforge build.
- **ADR-1.10.1-4 Scope and versioning.** Patch release 1.10.1, rendering only: no catalog, template, lint, record, or manifest change. Bump the version strings the bundle check holds and the four schema document headers; CHANGELOG entry in the shape of the earlier ones; no README or SKILL.md change is needed unless a rendered example there shows the old shape.

## Acceptance criteria

1. `npm test` passes with the structural check added and passing on the example sheet and dossier.
2. `node scripts/plugin.mjs --check` passes.
3. Proof in the Dev handoff: a temp project from `examples/`, `render --out documents`, `paperforge all --draft`; the Q-101 sheet PDF shows the Design section as separate labelled paragraphs with pre-committed checks as a bulleted list; cite the render run name.
4. Nothing under `policyforge/vietnam/vn-procurement` is modified.

## Where things are

- `lib/render.js`: `profileRows` and the `### Design` splice in `sheet`; `contextLine` and the `**Object:**`/`**Scope:**` join; the `### Ask` block; `dossier`'s question-type, success-and-failure, constraints, and handoff blocks; `head()` must not change.
- `scripts/test.sh`: the sheet and dossier checks added in 1.9.0 and 1.10.0 are the place to add the structural assertion.
