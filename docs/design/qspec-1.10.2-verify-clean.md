# qspec 1.10.2: dossiers and the Index pass paperforge verify as built

Patch brief from System Design, 2026-09-06. Delivery target: a branch `qspec-1.10.2` on `/Users/realtimex/github/qspec` (GitHub `therealtimex/qspec`) from `main` at c8d7e21 (v1.10.1). No forge, as for 1.7.0 to 1.10.1: delivery is the pushed branch at a named SHA; do not tag or release, System Design does that after QA.

## Context

Regenerating the vn-procurement documents with 1.10.1 and paperforge 4.0.0 built all 13 documents, but paperforge's verify stage failed on four dossiers and the Index. Three distinct causes, all reproducible from the real project's run `documents/.paperforge/runs/20260906T040850Z` (read only; do not modify that project):

1. Dossiers Q-003, Q-004, Q-005, Q-006 leak `<run>`, `<new>`, and `<reviewer>` into the PDF. Every one sits inside backticks in an attached note. ADR-1.10.0-4 left existing code spans untouched; a PDF has no code spans, so the hole is the amendment's own reasoning applied to one more case.
2. The Index renders `**Decision-maker:**` with nothing after it when the round names nobody, and paperforge's missing-lines check cannot find that line in the PDF.
3. Q-004's dossier has two "missing lines": a note line quoting YAML in backticks, `- \`owner: ""\`, \`reviewers: []\`, \`materials.obtainable[*].horizon: ""\`, …`, which paperforge cannot match against the PDF's extracted text. The exact glyph or wrapping cause is not yet traced.

## Decisions

- **ADR-1.10.2-1 The typographic substitution applies inside code spans too.** When `dossier` embeds a note, a bare angle-bracket placeholder is rendered as `‹…›` whether or not it sits inside backticks. Real HTML tags in a note remain as they are (they are the case paperforge's own leak check is for). The note file is untouched. Acceptance 4 from 1.10.0 still holds: identical after mapping `‹` to `<` and `›` to `>`.
- **ADR-1.10.2-2 Empty head values render as "(not stated)".** In `index` and `sheet` head rows, an empty value renders `(not stated)`, matching what the sheet already does for owner, so the row exists in every edition and verify can find it. The empty value itself is human-owned and stays reported by `sheet-ask`-style manual findings where they exist; the Index gains a `manual` finding `index-decision-maker` when the round names nobody, since a freeze cannot be bound to an unnamed committee.
- **ADR-1.10.2-3 Diagnose and fix the missing-line case at its cause.** Dev reproduces Q-004's two missing lines on a fixture note containing `` `owner: ""` `` and `` `materials.obtainable[*].horizon: ""` ``, finds which characters paperforge's PDF text extraction alters (candidates: the empty double quotes, the bracket-asterisk, or a wrap inside the code span), and picks the smallest change in the dossier's note rendering that makes verify pass while the markdown source of the note stays untouched. If the only workable change is on the paperforge side, stop and route the finding to System Design instead of working around it in prose; the acceptance below is then amended, not skipped.
- **ADR-1.10.2-4 Scope and versioning.** Patch release 1.10.2, rendering plus one `manual` finding: no catalog, template, lint-on-spec, record, or manifest change. Bump every version string the bundle check holds and the four schema document headers; CHANGELOG entry in the shape of the earlier ones.

## Acceptance criteria

1. `npm test` passes, with new checks: a note containing `` `<run>` `` in backticks renders in the dossier as `` `‹run›` `` and the note file is byte-identical; an Index with `decision_maker: ""` renders `**Decision-maker:** (not stated)` and reports `index-decision-maker` as `manual`; the fixture from ADR-1.10.2-3 renders in a form the structural tests accept.
2. `node scripts/plugin.mjs --check` passes.
3. Proof, reported in the Dev handoff with the run name: a temp project from `examples/` whose one spec carries an attached note with a backticked `<run>` and the ADR-1.10.2-3 fixture line, plus an Index with an empty decision-maker; `render --out documents --draft` then `paperforge all --draft`; paperforge's `verify:` stage reports `ok` for the dossier and the Index. Paste the stage lines.
4. Nothing under `policyforge/vietnam/vn-procurement` is modified. The regeneration there is System Design's after release.

## Where things are

- `lib/render.js`: the 1.10.0 placeholder substitution in `dossier` (currently skipping code spans), `index` head rows, `head()`.
- `scripts/test.sh`: the 1.10.0 and 1.10.1 dossier and sheet checks.
- Paperforge verify: `/Users/realtimex/github/paperforge/paperforge/verify.py`, the PDF branch and the missing-lines check; the deployed copy under `<workspace>/.agents/skills/paperforge/pipeline` is 4.0.0 and runs with the bundled RealTimeX Python at `/Applications/RealTimeX.AI.app/Contents/Resources/app/src/electron/features/pty/compat/macos/python3`.
- The failing run for reference: `policyforge/vietnam/vn-procurement/documents/.paperforge/runs/20260906T040850Z/record.json`.

## Amendment, 2026-09-06, after Dev's escalation

Dev reduced the Q-004 missing lines to a paperforge defect: `verify.py::coverage()` normalises every source line with `.replace('**', '').replace('*', '')` before choosing its probe, which strips the literal `*` inside a code span such as `` `materials.obtainable[*].horizon` ``; the rendered HTML correctly keeps it, so the probe can never match. This is not a rendering, wrapping, or PDF-extraction issue, and no qspec-side change can fix it without breaking the exact-copy contract for notes. The fix belongs in paperforge, and the non-goal is lifted for this one defect.

- **ADR-1.10.2-3 revised.** Paperforge's coverage check strips emphasis markers only outside code spans. In `paperforge/verify.py::coverage()`, the normalisation treats each backtick-delimited span as literal text: markers are stripped from the prose around it, the span's content is kept verbatim with its backticks removed. Behaviour on every existing fixture is unchanged. A unit test `tests/unit_verify.py` (or an added check in the existing verify unit script) asserts that a source line containing `` `a[*].b` `` inside prose with `**bold**` yields a probe that matches the rendered visible text. Delivered as **paperforge 4.0.1** on branch `verify-code-spans` in `/Users/realtimex/github/paperforge` from `main` at 441053d, following `CONTRIBUTING.md`: version bumped in `plugin/realtimex.plugin.json` and the skill frontmatter, `bin/paperforge plugin` re-run so the generated bundle is in sync, `bin/paperforge plugin --check`, the two `node scripts/*.mjs` checks, `tests/unit_*.py`, and the fixture and backtest builds all passing. Push the branch at a named SHA; do not tag. System Design tags `v4.0.1` after QA, then reinstalls the plugin.
- **qspec side unchanged.** ADR-1.10.2-1 and 2 stand; the exact-copy contract for notes stands. qspec 1.10.2's CHANGELOG entry names the paperforge fix it depends on.
- **Acceptance 3 restated.** Run the proof against the paperforge branch, `PYTHONPATH=/Users/realtimex/github/paperforge` with the bundled RealTimeX Python, since the deployed 4.0.0 still carries the defect; `verify:` reports `ok` for the dossier and the Index. Paste the stage lines, the qspec render run name, and the paperforge branch head SHA.
- **Delivery to Review.** Two branches, two head SHAs: `qspec-1.10.2` in qspec and `verify-code-spans` in paperforge. Hand off with status `awaiting_review`.
