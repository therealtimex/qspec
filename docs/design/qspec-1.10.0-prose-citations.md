# qspec 1.10.0: citations in prose, the nearest works, and four rendering fixes

Design brief from System Design, 2026-09-05. Delivery target: a branch `qspec-1.10.0` on `/Users/realtimex/github/qspec` (GitHub `therealtimex/qspec`) from `main` at 7ca27fe (v1.9.0). No forge, as for 1.7.0 to 1.9.0: delivery is the pushed branch at a named SHA; do not tag or release, System Design does that after QA.

## Context

Six specs now cite three to five closest works each, keyed and DOI-verified. Two things came out of the Q-005 and Q-006 loops. First, papers named in prose fields such as `comparison`, `precommitted_checks`, or `why_it_matters` carry no key, so they never reach the References section; the Reviewer flagged Chetty (2011) and Saez (2010) on Q-005 and the pattern recurred on Q-006. Second, `closest_work` has a floor of two and no stated target, so the count tracks whatever the Task 1 memo happened to name. Four rendering defects were also observed: paperforge's verify rejects a dossier whose embedded notes contain literal angle-bracket placeholders from CLI usage text; labels keep their capital letter mid-sentence ("The design is Causal empirical study"); a period at the end of `object` or `scope` is doubled by the sheet; and the Approver has twice attached its decision to the Reviewer's run instead of linting under its own label.

## Decisions

- **ADR-1.10.0-1 `[@key]` markers are allowed in every prose field and resolved by lint.** A marker is `[@key]` or `[@key; @key2]`, paperforge's own syntax. `lint` scans every string field of a spec, including list items and profile fields, for markers and reports `cite-unresolved` for any key absent from the project's `references.bib` and `bib-incomplete` for an entry lacking title, year, or a DOI or URL, with the field path in the message. Outside a project, or in a project without the file, markers are left alone and nothing fires, as in 1.8.0. `closest_work[].key` stays the structured form; a marker inside `cite` is not required and not forbidden.
- **ADR-1.10.0-2 Renderings pass markers through.** `sheet`, `dossier`, and `index` leave markers in prose untouched so paperforge formats them and appends the entries to References. `committee-clean` treats `[@…]` as permitted text; a BibTeX key is not a catalog token. `request` passes them through as well, since the request travels into a paperforge project.
- **ADR-1.10.0-3 The nearest works, three to five, not a survey.** Core section 7's `closest_work` row gains the sentence: "The nearest works, three to five in practice, with what each settled and left open. Not a literature review; cite the wider literature from prose with `[@key]`." SKILL.md's interview step says the same. The three spec templates carry three `closest_work` slots. M6's floor of two is unchanged; there is no maximum and none is added.
- **ADR-1.10.0-4 A dossier escapes what it embeds; the note file is untouched.** When `dossier` copies a note's text, it HTML-escapes a bare `<` or `>` that does not open or close an HTML tag, so `<run>` renders as literal text and paperforge's verify no longer rejects the document. The note under `notes/` is not modified, and the dossier's acceptance test changes from byte-identical to identical after unescaping. Sheets and Indexes carry no notes and are unaffected.
- **ADR-1.10.0-5 Labels have a sentence form.** Each catalog label gains `sentence`, its in-sentence form, defaulting to the label with its first character lowercased unless the label begins with two or more capitals. The design line and the constraint sentences use the sentence form; headings and table cells keep the label. The label completeness check covers both forms.
- **ADR-1.10.0-6 No doubled punctuation.** Wherever the renderer appends punctuation after a field, it first strips one trailing period, exclamation mark, or question mark from the field's text. Covered by a test that renders `object` and `scope` ending in a period.
- **ADR-1.10.0-7 Each role lints under its own label.** SKILL.md's workflow and the scaffolded `AGENTS.md` block gain one sentence: before attaching a note, lint under your own label and attach to that run, so the run carries the file as you saw it under your name. `attach` warns, without refusing, when the run named was labelled by a different role than `--role` gives; the label convention `<spec>-<role>-round-<n>` is stated in the guidance. The guidance fingerprint changes; `init --refresh` clears STALE.
- **ADR-1.10.0-8 Versioning and docs.** Minor release 1.10.0, additive: no instance field, M invariant, record, or Index shape changes; the new warnings are the existing `cite-*` rules applied to more fields. Bump every version string the bundle check holds and the four schema document headers; core sections 7, 8.4, 10, 14, 15 and the templates; `docs/runs.md` for the attach warning; `docs/paperforge-integration.md` for markers in prose; CHANGELOG, README, SKILL.md follow the 1.5.0 to 1.9.0 entries.

## Acceptance criteria

1. `npm test` passes, with new checks: a spec with `[@known]` in `comparison` and `[@unknown]` in `why_it_matters` reports exactly one `cite-unresolved` naming the field path; the same spec outside a project reports nothing; the sheet and dossier for it contain the markers verbatim and pass `committee-clean`; the templates lint as expected-fail with three empty slots; a note containing `<run>` renders in the dossier as escaped text and the note file is byte-identical afterwards; the design line for the causal example reads with a lowercase label mid-sentence; a spec whose `object` ends in a period renders without `..`; `attach --role approver` to a run labelled `q001-reviewer-round-1` prints the warning and still attaches; the label completeness check fails on a fixture missing a `sentence` form.
2. `node scripts/plugin.mjs --check` passes.
3. Proof, reported in the Dev handoff with the run name: a temp project from `examples/` with `examples/references.bib`, one example spec given a prose marker to an existing key, `render --out documents`, `paperforge all --draft`; the sheet's References section lists the prose-cited entry alongside the closest works, and the dossier for a spec with an attached note containing `<run>` passes paperforge verify.
4. Nothing under `policyforge/vietnam/vn-procurement` is modified.

## Non-goals

- No maximum on `closest_work`.
- No online DOI verification.
- No change to the Decision Record or to paperforge.
- No folding of repeated `sign --show` runs in the `runs` listing; noted for later.

## Where things are

- `lib/lint.js` (the 1.8.0 `cite-*` block; extend the scan to every string field), `lib/render.js` (`sheet`, `dossier`, `index`, `COMMITTEE_DENYLIST`, punctuation helper, label sentence form), `lib/runs.js` (`attach` warning), `lib/scaffold.js` (GUIDANCE), `lib/catalogs.js` and `schema/catalogs.json` (labels), `templates/qspec-*.yaml`, `scripts/test.sh`, the label completeness check added in 1.9.0.
- Docs: `QSPEC-CORE.md` sections 7, 8.4, 10, 14, 15; `docs/runs.md`; `docs/paperforge-integration.md`; `README.md`; `plugin/skills/qspec/SKILL.md`; `CHANGELOG.md`.
- The friction note paperforge wrote on the verify failure: `policyforge/vietnam/vn-procurement/documents/.paperforge/friction/20260905T064127Z.md` (read only; do not modify that project).
