# qspec 1.8.0: a citation is a key that resolves

Design brief from System Design, 2026-09-05. Delivery target: a branch `qspec-1.8.0` on `/Users/realtimex/github/qspec` (GitHub `therealtimex/qspec`) from `main` at 2211fa7 (v1.7.0). No forge, as for 1.7.0: delivery is the pushed branch at a named SHA; do not tag or release, System Design does that after QA.

## Context

Across the Q-002, Q-003, and Q-004 loops the Reviewer's recurring finding was citation drift: a `settled` sentence attributed to the wrong paper, a journal named wrongly, a work that does not run the test the spec claims. `increment.closest_work[].cite` is a free string such as "Avis, Ferraz, and Finan (2018)", so the rule "never invent a citation" has no mechanical teeth and every check is prose against prose. Paperforge already renders a reference list from a BibTeX file when a document carries `[@key]` markers, formats both editions with Typst, and appends the list automatically (`plugin/skills/paperforge/references/citations.md`). qspec should therefore never render a bibliography; it should carry keys, check that they resolve, and emit the markers.

## Decisions

- **ADR-1.8.0-1 One `references.bib` per project.** A QSPEC project holds one BibTeX file at its root beside `specs/`. The literature for a round is one corpus. `init` writes an empty `references.bib` with a two-line header comment saying what it is and that the tool never writes an entry; `init --refresh` never touches it. `render` copies it to `<out>/references.bib` beside the documents manifest. `templates/documents.qspec.toml` sets `bibliography = "references.bib"` and `citation_style = "apa"` on the dossier and sheet document types.
- **ADR-1.8.0-2 `closest_work[].key`, optional.** A BibTeX key beside `cite`. `cite` stays the human-readable string; 1.x cannot rename or remove a field. The three spec templates gain `key: ""` under each `closest_work` entry with a comment that it must resolve in `references.bib`. Core section 7's field table gains a `key` row.
- **ADR-1.8.0-3 A tolerant BibTeX reader, read-only.** `lib/bib.js` reads `@type{key, field = {...} | "..." | number, ...}` with nested braces, case-insensitive field names, and comments; it ignores `@string`, `@preamble`, and `@comment` blocks without failing; a file that cannot be parsed at all yields one `skip` finding naming the line. No dependency. Nothing in the tool writes a bibliography entry.
- **ADR-1.8.0-4 Three findings, all `warn`, none an M invariant.** `cite-unkeyed`: the project has a `references.bib` and a `closest_work` entry has no `key`. `cite-unresolved`: the key is not in the file. `bib-incomplete`: the resolved entry lacks `title`, `year`, or one of `doi` and `url`. Each names the entry index and the key. When the spec is not inside a project or the project has no `references.bib`, none of the three fires, so every 1.7.0 project lints exactly as before. Core section 8.4 lists the three; a blocking check on an instance field remains a major release under section 14, and these are not that.
- **ADR-1.8.0-5 Renderings emit the marker, nothing more.** `dossier` and `sheet` write ` [@key]` after the cite text where a key exists; the Selection Sheet's closest-work rows do the same. qspec adds no References section; paperforge appends it. Raw markdown shows the key, which is acceptable because documents for people come from paperforge. `request` is unchanged: it is the request file, not a document.
- **ADR-1.8.0-6 `doctor` reports the bibliography.** One line: entry count, and how many `closest_work` keys across `specs/` are unresolved or unkeyed, or "none; `references.bib` at the project root holds the entries the specs cite".
- **ADR-1.8.0-7 Guidance.** The scaffolded `AGENTS.md` block gains two sentences: a citation is a key that resolves in `references.bib`; the writer adds the entry from publisher or DOI metadata and the tool never writes one. The fingerprint changes; `init --refresh` clears STALE. `COMMANDS` is unchanged, there is no new command.
- **ADR-1.8.0-8 Examples and versioning.** `examples/references.bib` holds illustrative entries for every `closest_work` citation in the six example specs, keyed, with the README's existing note that citations are illustrative; the example specs gain matching `key` values so `npm test` lints them clean with no `cite-*` warnings. Minor release 1.8.0, additive; bump every version string the bundle check holds and the four schema document headers; CHANGELOG, README, SKILL.md follow the 1.5.0 to 1.7.0 entries. SKILL.md's workflow step 1 says the interview must yield, for each closest work, a key and an entry, not only a name and year.

## Acceptance criteria

1. `npm test` passes, with new checks: the reader parses a fixture with braced, quoted, and numeric fields, nested braces, and an `@string` block, and reports a line for an unparseable file; a spec outside a project or in a project without `references.bib` produces no `cite-*` finding; in a project with the file, a missing key, an unresolved key, and an incomplete entry each produce exactly their named warning; the example specs lint with no `cite-*` finding against `examples/references.bib`; `dossier` and `sheet` output carries `[@key]` for keyed entries and nothing for unkeyed ones; `render` copies `references.bib` beside the manifest; the template manifest names `bibliography` and `citation_style`; `doctor` prints the bibliography line in both states.
2. `node scripts/plugin.mjs --check` passes.
3. Proof, reported in the Dev handoff with the run name: in a temp project built from `examples/` (not in vn-procurement), `qspec render --out documents` then `paperforge all --draft --config documents/documents.toml` produces an html and a pdf dossier whose References section lists the cited entries. The docx edition may be skipped if `python-docx` is absent, as QA found on 1.7.0; say so if it is.
4. Nothing under `policyforge/vietnam/vn-procurement` is modified. Adding real keys and entries to Q-001 to Q-004 is the writer's work in a later loop, not Dev's.

## Non-goals

- No `[@key]` markers inside prose fields such as `precommitted_checks`; keys on `closest_work` are where the drift has been.
- No online verification of DOIs or any network use.
- No command that writes or fetches a bibliography entry.
- No change to paperforge.

## Where things are

- `lib/lint.js` (findings; the `cite-*` checks need the project root, which `bin/qspec.js` resolves with `findRoot` for `notes-without-act` already; follow that pattern), `lib/render.js` (sheet and dossier), `lib/runs.js` and `bin/qspec.js` (`render` copy), `lib/scaffold.js` (init writes the file; GUIDANCE text; doctor line), `templates/`, `examples/`, `scripts/test.sh`.
- Docs: `QSPEC-CORE.md` sections 7, 8.4, 14, 15; `docs/paperforge-integration.md` (the manifest snippet gains the two keys); `README.md`; `plugin/skills/qspec/SKILL.md`; `CHANGELOG.md`.
- Paperforge citation behaviour: `/Users/realtimex/github/paperforge/plugin/skills/paperforge/references/citations.md` and `manifest.md`.
