# QSPEC: Question Spec

A Question Spec is a short contract that turns a research topic, technique, or platform into a claim that can be wrong, so that questions from different methods and domains can be compared, selected, frozen, or killed on the same terms.

Version 1.10.2, released 2026-09-06. Built by RealTimeX. Source available, all rights reserved; see [LICENSE](LICENSE).

The tool renders and checks; it does not author. A field is written by a person, a judgment is signed by a person, and the tool notices when a signature no longer covers the text. It pairs with [Paperforge](docs/paperforge-integration.md) downstream, which applies the same rule to the documents that answer the question.

## Files

| Path | What it is |
|---|---|
| `QSPEC-CORE.md` | The shared core: object model, life cycle, roles, fields, invariants, Decision Record, Selection Sheet, Index, downstream contact points, tooling. Read this first. |
| `QSPEC-SS.md`, `QSPEC-NS.md`, `QSPEC-ENG.md` | Domain overlays for social sciences, natural sciences, and engineering: claim fields, catalogs, method profiles. Software is in scope for engineering. |
| `schema/catalogs.json` | Machine-readable catalogs, profile field lists, and the English display and sentence-form labels used in committee documents. The single source of truth for the tool. |
| `bin/qspec.js` | The tool. `qspec help` lists commands. No dependencies; js-yaml is vendored under `lib/vendor/`. |
| `lib/` | `lint` (M invariants and project-scoped citation findings), `bib` (read-only BibTeX keys), `record` (fingerprint, transitions, acts), `render` (sheet, index, dossier, request), `paper` (gist check), `scaffold` (init, new, doctor), `runs` (run records and diffs), `friction` (report notes). |
| `templates/` | Empty instances per domain, Decision Record and Index templates, and `documents.qspec.toml` for a Paperforge document corpus. |
| `.qspec/scaffold.json` | In a project `init` prepared: what wrote it, and a fingerprint of the guidance so `doctor` can say when it has gone stale. |
| `.qspec/runs/`, `.qspec/friction/` | In a project: what every check saw, with the files as they stood, the notes roles attached to each run, and the notes `report` wrote. See [docs/runs.md](docs/runs.md). Not gitignored. |
| `examples/` | Two complete instances per domain with their Decision Records, one Index, one downstream paper, and `references.bib`. Citations and bibliography entries are illustrative, not real. |
| `examples/negative/` | Instances that must block, including a stale signature. `round/` holds a freeze taken by someone the round does not name: the spec lints clean, and its round refuses it. |
| `docs/paperforge-integration.md` | The file contract with Paperforge. |
| `docs/runs.md` | Run records and friction notes: why they exist, what they hold, how to read a diff. |
| `plugin/` | The RealTimeX declarative skill plugin. `tool/` and `references/` are generated from the repo by `scripts/plugin.mjs`; `SKILL.md` and the manifest are authored there. |
| `scripts/` | `test.sh` runs every command over the examples; `check-judged.mjs` holds J7 wording in sync; `check-catalog-labels.mjs` refuses an emitted value or profile field without a human label; `plugin.mjs` syncs, checks, and packages the bundle. |
| `archive/` | The 0.1.0 drafts, for reference. Do not use them. |
| `CHANGELOG.md` | What changed and why. |

## Quick start

No install: the tool runs on Node 22 with no dependencies.

Prepare a directory first. `init` writes `specs/` with the round's empty Index, an empty project-owned `references.bib`, `AGENTS.md` and `CLAUDE.md` telling any agent what the directory is and how to invoke the tool, and a stamp of what wrote them; `doctor` says whether that guidance is still what `init` would write.

```sh
node bin/qspec.js init --into ~/research/procurement --title "Procurement questions" \
    --round 2026-09 --decision-maker "Group lead" --brief ~/research/procurement/brief.pdf
node bin/qspec.js new Q-014 --domain natural --slug apical-oxygen --specs ~/research/procurement/specs
# fill it in; profile field lists are in the overlay's section 4
node bin/qspec.js lint specs/Q-014_apical-oxygen.yaml
```

`init` refuses to overwrite an `AGENTS.md` it did not write; `--append` adds the QSPEC block below whatever is there, which is what a RealTimeX loops workspace needs. `new` copies the domain template with the id and date set and nothing else, and never overwrites.

When lint reports no `block`, a reviewer who is not the owner rereads the spec and signs:

```sh
node bin/qspec.js sign specs/Q-014_apical-oxygen.yaml --by "G. Reviewer" --show   # read the seven
node bin/qspec.js sign specs/Q-014_apical-oxygen.yaml --by "G. Reviewer"
```

`--show` prints J1 to J7 with J7 resolved to this profile's rule from the overlay, and signs nothing. Signing appends a draft-to-specified entry to `specs/Q-014_apical-oxygen.record.yaml` carrying a fingerprint of the spec and the J7 rule verbatim, and sets `status: specified`. Edit the claim afterwards and `lint` reports `stale-signature` until the reviewer signs again; reword the overlay's J7 rule and `lint` reports `overlay-drift`.

The owner offers it, the decision-maker chooses. A decision-maker act must declare `--index <round>` or `--unbound`: the Index is the only thing that can check a decision-maker against a committee and hold the one-freeze-per-round cap, and `--unbound` records that nothing did.

```sh
node bin/qspec.js transition specs/Q-014_apical-oxygen.yaml --to selectable --by "F. Owner" --role owner --index round.yaml
node bin/qspec.js sheet specs/Q-014_apical-oxygen.yaml --index round.yaml --out sheets/Q-014.md
node bin/qspec.js transition specs/Q-014_apical-oxygen.yaml --to frozen --by "Group lead" --role decision_maker --index round.yaml --specs specs --reason "chosen in round 2026-09"
node bin/qspec.js request specs/Q-014_apical-oxygen.yaml --out requests/Q-014.md
```

The Selection Sheet is the committee document: catalog labels replace schema tokens, its question pointer reads `Q-014, version 1`, and `committee-clean` blocks any machine or workflow vocabulary that survives into the completed markdown. An owner can preview any state with `sheet --draft`; aggregate `render --draft` writes those previews under `drafts/`, never `sheets/`.

For the people inside the process, render a dossier at any state. For a
committee, render the corpus and let Paperforge build the sheets and Index:

```sh
node bin/qspec.js dossier specs/Q-014_apical-oxygen.yaml --out documents/dossiers/Q-014.md
node bin/qspec.js render --out documents
/path/to/paperforge/bin/paperforge all --draft --config documents/documents.toml
```

A dossier includes the spec, Decision Record, run timeline, and every attached
note. The source note remains byte-identical; CLI-style angle-bracket
placeholders such as `<run>` and `<handoff.md>` use single angle quotation marks
such as `‹run›` only in the rendered copy. Comparison prose and standard
Markdown autolinks remain unchanged. A dossier is a `qspec-dossier`
document with `publish = false`: Paperforge builds and verifies it in draft
mode, but cannot publish it. Its cover identifies it as an internal process
record. The Selection Sheet goes to a committee; the dossier stays with the
people inside the process. See
[docs/paperforge-integration.md](docs/paperforge-integration.md).

Use three to five nearest works in practice, not a survey. For each, keep the
readable `cite` text and add a `key` that resolves in the project's
`references.bib`. Cite wider literature from any prose field with `[@key]` or
`[@key; @key2]`. QSPEC warns about missing, unresolved, or incomplete entries
and names the prose field path; renderings preserve the markers for Paperforge,
which formats citations and appends the reference list.
QSPEC never writes or fetches a bibliography entry. `render` copies that one
source beside the manifest and mirrors its bytes beside rendered dossiers and
sheets.

To pull a spec out of a round without ending it, the owner withdraws it rather than killing it:

```sh
node bin/qspec.js transition specs/Q-014_apical-oxygen.yaml --to specified --by "F. Owner" --role owner --reason "partner access lapsed"
```

## Commands

```text
qspec init --into <dir>               prepare a directory: specs/ with the round's Index, AGENTS.md,
     [--title] [--round YYYY-MM] [--decision-maker] [--brief path] [--domain] [--append] [--no-git]
qspec new <Q-id> --domain <d>         an empty spec from the domain template, id and date set
     [--slug] [--title] [--owner] [--specs dir]
qspec init --refresh --into <dir>     rewrite only the QSPEC block in AGENTS.md and re-stamp; what doctor asks for on STALE
qspec doctor [--project dir]          tool and node versions; guidance, bibliography, and runs since the last act
qspec runs [--project dir] [--spec <id|path>]
                                      every recorded run in the project, optionally scoped to one spec
     [--diff <a>,<b> [--sources]]     what changed between two runs: reworded or rewritten, findings appeared or cleared
qspec runs show <run> [--spec <id|path>]
                                      one run, its findings, and every note as written
qspec attach <run> <file> --by <actor> --role <role> [--kind handoff|review|decision|note]
                                      keep a handoff, review, or decision beside the run it is about
qspec report "<what happened>"        a friction note with version, scaffold state, and last run; --issue prints the latest
qspec lint <spec>...                  M1 to M16, record checks, signature staleness; exit 1 on block; records a run
     [--record path] [--json] [--expect-fail]
qspec fingerprint <spec>              what a signature is taken over
qspec sign <spec> --by <reviewer>     draft -> specified; refuses while any M invariant fails
     [--show] [--dissent "<who>: <point>"] [--run name]   --show prints J1 to J7 and signs nothing
qspec transition <spec> --to <state> --by <actor> --role <owner|reviewer|decision_maker>
     [--index round.yaml | --unbound] [--specs dir] [--reason] [--cite Jn] [--run name]
     [--revisit-by date] [--successor id@ver] [--date date] [--dissent "<who>: <point>"]
qspec sheet <spec> [--index <index>] [--out file] [--draft]
                                      committee sheet; --draft previews any state
qspec index <index> --specs <dir> [--out file]         checks, then renders
qspec dossier <spec> [--out file]                      readable process record; any state
qspec request <spec> [--out file]                      frozen only
qspec render --out <dir> [--specs dir] [--index file] [--manifest documents.toml] [--draft]
                                      the corpus; --draft writes sheet previews under drafts/
qspec paper <spec> <document.md>                       the document carries the frozen claim as a gist
```

Findings use four severities: `block`, `manual` (with the act that settles it), `warn`, `skip`. Only `block` sets the exit code; a `manual` finding names an act, and running the act is what settles it. Judged invariants J1 to J7 are never evaluated by the tool; it prints them, records what was signed, and reports when the overlay's wording has moved since.

Nothing here authenticates anyone. `owner` and `reviewer` are checked against fields of the spec, `decision_maker` against the round's Index when one is given. A signature establishes that a name was written beside an act and that the text has not moved since; it does not establish that the person acted or consented.

`npm test` runs every command over the examples, the negatives, and the templates, then checks the plugin bundle for drift.

Inside a project, every check is recorded under `.qspec/runs/` with the files it saw, passing or failing; `qspec runs --diff a,b --sources` shows what changed between two of them, `qspec attach` keeps a handoff or review beside the run it is about, and an act can cite the run it read with `--run`. The reason is Paperforge's: a draft overwritten in place is gone, and git did not help because nobody committed. See [docs/runs.md](docs/runs.md).

Before attaching a note, lint under your own `<spec>-<role>-round-<n>` label
and attach to that run. `attach` warns but still copies the note when the label
names a different role.

## Installing as a plugin

`plugin/` is a RealTimeX declarative skill plugin: no entry point, the skill carries the tool. `npm run plugin` re-syncs the bundle from the repo; `node scripts/plugin.mjs --check` fails if it has drifted, so a stale plugin is a visible failure.

```sh
realtimex-pp-cli install-plugin --path "$PWD/plugin" --agent
```

Or download `qspec-<version>.zip` from a GitHub release and upload it under Settings, Plugins, Install Plugin.

## Releasing

Tag `vX.Y.Z`. The release workflow refuses the tag unless it matches the version in `plugin/realtimex.plugin.json`, re-runs every check, packages the bundle, lints an example from the unpacked zip, and publishes the release with a checksum. `npm run package` writes the same zip locally.

## Versioning

- Instances declare `spec_schema: QSPEC/1.0` and a `domain`. All 1.x core releases accept that string.
- Schema documents carry their version in the header, not the filename.
- A field removal, rename, or tightened M invariant on instance fields is a major release with a new `spec_schema` string.
- Every 1.9.0 project, spec, record, and Index is valid under 1.10.0. The release resolves citation markers in prose, recommends three to five nearest works, adds sentence-form labels and rendering fixes, and warns on cross-role attachments; no instance field, M invariant, record shape, or Index shape changed.
- Every 1.8.0 project, spec, record, and Index is valid under 1.9.0. The release adds labels and gates on rendered committee text, `--draft` previews, and internal-only dossiers; no instance field, M invariant, record shape, or Index shape changed.
- Every 1.7.0 project, spec, record, and Index is valid under 1.8.0. Citation keys are optional, and the three citation findings run only inside a project that has `references.bib`; without that file, lint findings are unchanged. 1.8.0 adds the read-only bibliography checks and Paperforge markers.
- Every 1.6.0 project, spec, record, and Index is valid under 1.7.0. 1.7.0 adds dossiers, aggregate rendering, a Paperforge manifest template, and spec-scoped run lookup; no instance field, M invariant, record shape, or Index shape changed.
- Every 1.5.0 project, spec, record, and Index is valid under 1.6.0. 1.6.0 adds an optional `run` on Decision Record entries, notes attached to runs, and run records for every checking command; `notes-without-act` is a warning.
- Every 1.4.0 project, spec, record, and Index is valid under 1.5.0. 1.5.0 adds run records, `runs`, `report`, and doctor lines; a project scaffolded by 1.4.0 reports `STALE` guidance because the guidance now names `runs` and `report`.
- Every 1.3.0 instance, record, and Index is valid under 1.4.0. 1.4.0 adds `init`, `new`, and `doctor`, which write project files and empty templates; no instance field or M invariant changed.
- Every 1.2.0 instance and record is valid under 1.3.0. What 1.3.0 changed is a command line, not a file: a `decision_maker` act now has to declare `--index` or `--unbound`.
- Every 1.1.0 instance and record is valid under 1.2.0. A record written before 1.2.0 reports `J7-unrecorded` as `skip`, and a decision-maker act in one reports `unbound-decision` as `warn`; neither blocks, and re-signing or re-freezing with `--index` clears them.

## Migrating a 0.1.0 draft instance

| 0.1.0 | 1.x |
|---|---|
| no `spec_schema`, or `QSPEC-NS/0.1`, `QSPEC-ENG/0.1` | `spec_schema: QSPEC/1.0` plus `domain: social`, `natural`, or `engineering` |
| `version` | `instance_version` plus a `changelog` entry |
| `setting_is_not_the_contribution`, `system_or_method_is_not_the_contribution`, `artifact_is_not_the_contribution` | `vehicle_is_not_the_contribution` |
| `method_family: mixed` with a `mixed` profile | primary family plus `secondary_method` and `rescue_rule`; profile is the primary family's |
| `ethics_and_constraints.human_subjects: yes` | `constraints.safety_or_ethics: [human_subjects]` |
| `safety_or_ethics: <single value>` | a list, using the overlay catalog |
| `hints.ceiling: field / general_interest` | `specialist / broad`; ENG `component / system` moves to `hints.scale` |
| `dissent` block in the spec | `dissent` entries in the Decision Record |
| `handoff.profile: <name>` | `profile.name` inline with the profile fields |
| Question Brief | Selection Sheet, rendered by `qspec sheet` |
| (none) | `claim.comparative`, `ask`, `handoff.first_check`, `reviewers` with at least one non-owner, a tool-written Decision Record |

## Licence

Source available, all rights reserved to RealTimeX; see [LICENSE](LICENSE). The source is published for reference; it is not open source. js-yaml is vendored under MIT; see [NOTICE](NOTICE).
