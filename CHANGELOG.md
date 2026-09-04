# Changelog

## 1.5.0 (2026-09-04)

1.4 gave a project a directory that says what it is. 1.5 gives it a memory of what the checks saw. On the first real project, a spec went through three versions in twenty minutes of agent review, each overwriting the last in place; the reviewer's findings and the approver's corrections lived in chat handoffs outside the project, and versions 1 and 2 survived only in one agent's transcript. The Decision Record could not help, because nobody took an act: the spec stayed `draft`, unsigned, with no record file, while the loop around it closed as "approved". The pattern that fixes this is Paperforge's run records, and the reason is the same: the record has to be a by-product of checking, not an act of discipline. Files, never fields: no instance field, M invariant, record, or Index changed. Every 1.4.0 project, spec, record, and Index is a valid 1.5.0 one.

### `lint` and `index` record a run

- Inside a project, every `qspec lint` and `qspec index` run writes `.qspec/runs/<timestamp>[-<label>]/` holding `record.json` (tool version, command, and per file: id, `instance_version`, status, fingerprint, sha256, verdict, and the findings themselves) and `sources/` with the spec, its Decision Record if any, or the Index, as they stood. Passing or failing. `--label` names the run. Outside a project nothing is written, so this repository's own examples and a scratch copy leave no trace.
- Two runs in one second get distinct names, and `runs` lists them in the order they were written rather than the order their names sort in.

### `runs` lists them and `runs --diff` reads them

- `qspec runs [--project <dir>] [--only <text>]` lists every run with its label, command, and verdict. `qspec runs --diff <a>,<b>` reports each file as `unchanged`, `reworded` (the file changed but the fingerprinted fields did not, so a signature would still hold), or `rewritten` (the fingerprinted text moved), with status, version, and verdict changes, whether the Decision Record beside it changed, and which findings appeared or cleared. `--sources` adds a unified diff of the stored text, computed from what was checked, so no repository is needed. Run names match exactly, by unique prefix, or by label.

### `report` writes a friction note

- `qspec report "what happened"` writes `.qspec/friction/<timestamp>.md` carrying the sentence and the facts an author cannot be expected to assemble: tool version, node, invocation path, whether the project's guidance is current, and the last run. `--issue` prints the latest note as a tracker body and files nothing. Solve it and report it.

### `doctor` says how much looking has happened since anyone acted

- `doctor` now reports the run count, the last run, how many runs since the most recent date any Decision Record carries, and whether friction notes exist. Many runs and no act is the shape of a spec being polished in chat while nobody signs.
- The guidance `init` writes names `runs` and `report` and says not to delete or gitignore `.qspec/runs/`. Its fingerprint therefore changed: a project scaffolded by 1.4.0 reports `STALE` under `doctor`, which is the check doing its job.
- `qspec init --refresh --into <dir>` is what `doctor` now asks for. It rewrites only the block between the markers in `AGENTS.md`, keeps everything outside them including a loops shim, and re-stamps with the facts init was given and this run's tool path. 1.4.0 could report stale guidance and could not clear it, because the stamp was written once; that was copied from Paperforge and is a gap there too.

### Not in this release

A `review` act on the Decision Record carrying a reviewer's findings and the fingerprint reviewed. It is an act, so it depends on discipline, and it needs a named reviewer in the spec, which the project above never had. It can come once runs have shown what reviewers actually cite.

## 1.4.0 (2026-09-04)

1.3 made the commands refuse quietly wrong acts. 1.4 adds the thing that was missing before the first command runs: a project. Until now a directory that held specs told nobody what it was, and an agent asked to write a Question Spec in one produced a research memo, because nothing in the directory said otherwise. The pattern is Paperforge's `init`: a scaffolded project carries its own guidance, and a stamp records what wrote it so drift is a visible failure. Files, never fields: nothing here writes a claim, a citation, or an ask, and no instance field or M invariant changed. Every 1.3.0 spec, record, and Index is a valid 1.4.0 one.

### `qspec init` prepares a directory

- `qspec init --into <dir> [--title] [--round YYYY-MM] [--decision-maker] [--brief <path>] [--domain] [--append] [--no-git]` writes `specs/` with the round's empty Index, `sheets/` and `requests/`, `AGENTS.md`, `CLAUDE.md` as a relative symlink to it (an `@AGENTS.md` import where the filesystem refuses a link), `.qspec/scaffold.json`, and a git repository unless one is already above.
- `AGENTS.md` says only what init knows: the absolute path of the tool it was run from, the layout it just made, the round it named, where the research request is, and the rules the core states: fields are a person's, records are tool-written, lint is not bypassed, signing and freezing are somebody's act. It says in as many words that a memo or a ranked list of topics is material for a spec, not the deliverable.
- **It refuses to overwrite an `AGENTS.md` it did not write.** In a RealTimeX loops workspace that file is the shim the loops doctor requires. `--append` keeps whatever is there and adds the QSPEC block below it. It also refuses to run twice on one directory.
- A fresh project passes its own checks: `qspec doctor` reports `ok` and `qspec index` on the new round renders clean. A team whose first encounter with the gates is a wall of red learns to ignore them.

### `qspec new` copies a template with the id set

- `qspec new <Q-id> --domain <d> [--slug] [--title] [--owner] [--specs <dir>]` copies the domain template to `specs/<Q-id>_<slug>.yaml` with the id, today's date, and whatever the user said on the command line. Inside a project, `--domain` defaults to the one `init` recorded and `--specs` to the project's `specs/`. It never overwrites, and it fails rather than leave a `Q-000` in a spec if a template changes shape.

### `qspec doctor` says whether the guidance is current

- `.qspec/scaffold.json` records the version and a fingerprint of the guidance **template** plus the command list, not of the rendered file, because a project's own `AGENTS.md` carries its title and its own path. `qspec doctor [--project <dir>]` compares the two and reports `ok`, `STALE`, or `unknown` with the reason, whether `AGENTS.md` still carries the block, whether the recorded request still exists, and what is in `specs/` by status. Reported, never rewritten: editing a file in somebody's project is not a diagnostic.
- The tool now reads its version from `schema/catalogs.json`, which travels in the plugin bundle where `package.json` does not; `scripts/plugin.mjs --check` holds it to the other three.

### Not in this release

A project manifest that lets `lint` and `index` run with no arguments. It would change how every command resolves its files; it waits for a real round to show that passing paths hurts.

## 1.3.0 (2026-09-04)

1.2 closed the places where the prose and the tool disagreed. 1.3 closes four places where using the commands in order lets a round go quietly wrong. Nothing here touches an instance field, adds an M invariant, or changes a file format: every 1.2.0 spec and record is a valid 1.3.0 spec and record. What changed is a command line.

### A decision-maker act declares its round or disclaims it

- `qspec transition --role decision_maker` now requires `--index <round>` or `--unbound`. 1.2 allowed the flag to be omitted and noted on stderr that it had checked nothing, which is not a note anyone reads back from a transcript; the omission is how a committee ends up with a freeze taken by someone it never named. Neither option is refused. The choice is.
- `--index` checks the actor against the committee the round names and holds the one-freeze-per-round cap. `--unbound` records no round and leaves `unbound-decision` on the record for as long as the record exists.
- The refusal names the rounds it can see: an Index sitting beside the spec, or in `--specs`, is printed as a `did you mean` line, because an omitted flag is usually a flag someone did not know to type.
- The requirement is on the role, not on the target state. 1.2's hole was described for `frozen` and `deferred`, but a kill taken as `decision_maker` is unbindable in exactly the same way.

### A round refuses to show a claim its spec has moved away from

- `qspec index --specs` now checks every listed spec's signature and blocks on `index-stale`. An Index shows a committee a claim in twenty words that a person wrote by hand. If the spec has moved since it was signed, those twenty words may describe a claim the spec no longer makes, and nothing else in a round would say so: `lint` reads the spec, the Selection Sheet reads the spec, and the Index reads only its own text. Before this, `qspec lint` would report `stale-signature` as a block on the same spec while `qspec index` reported `ok` and printed the superseded wording.

### The claim's quote rule is checked where the rule is stated

- Core section 7 says `one_sentence` may not contain a double quote or a brace, because a downstream document carries it verbatim as a gist. The only enforcement was in `qspec paper`, at the far end of the pipeline: a claim could be signed and frozen and fail only when a document was checked against it, and by then rewording costs a new `instance_version` or a successor. `qspec lint` now reports `gist-unrepresentable` as a `warn` while the spec is still in draft.
- It is a warning and not an M invariant on purpose. A new blocking check on an instance field is a major release under section 14, and 1.3 is not that. `qspec paper` still blocks.

### `manual` never stopped anything, and no longer says it does

- Section 8.1's table claimed `manual` stops a spec leaving `draft`. No command has ever refused on a `manual` finding; only `block` sets an exit code. The claim was true of M16 by coincidence, because the act M16 names is signing and signing is what leaves `draft`, and false of every other `manual` finding, such as an empty `ask` on a Selection Sheet. The column now reads "sets an exit code", and what stops a spec leaving `draft` is named as what it is: an act refusing to run.

### Not in this release

Suggested and deliberately held for evidence from a real round: an `act:` label on record entries, generating or diffing `claim_20_words`, and refusing an offer whose `ask` is empty. The first duplicates state that `from`, `to` and `role` already carry; the second cannot be measured, because a twenty-word précis and a claim sentence are meant to be different text, and the tool composing one would break the rule that it never writes a field; the third is a real gap whose harm is that the Selection Sheet tells the committee late rather than not at all.

## 1.2.0 (2026-09-03)

Six gaps found by reading 1.1.0 against what the tool actually does. All additive: no field removed or renamed, no M invariant on the instance fields tightened, every 1.1.0 instance and record still valid.

### A role is claimed, and the tool now says so

- `owner` and `reviewer` were checked against fields of the spec; `decision_maker` was checked against nothing, so anyone passing `--role decision_maker` could freeze. No field of a spec names the committee, but the round's Index does. `qspec transition --index <round>` now refuses a decision-maker the Index does not name, and records the round on the act. Without `--index` the act still records and says on stderr that it checked nothing.
- `qspec index --specs` refuses a round in which an act claims that round as decision-maker under a different name. It is the only place the check can be made, and `examples/negative/round/` is a spec that lints clean whose round refuses it.
- Core section 3 now states the non-goal plainly: a signature establishes that a name was written beside an act and that the text has not moved since. It does not establish that the person acted, consented, or exists. Section 8.2 no longer implies M16 checks who a decision-maker is.

### Withdrawal is not killing

- New transition `selectable -> specified` by the owner, with a written reason. Before this the owner's only exit from `selectable` was `killed`, so pulling a spec out of a round meant ending it. A withdrawn spec keeps its signature and can be offered again.
- Owner-kill stays legal and stays terminal, but stops being silent: `qspec index` reports a listed spec killed or withdrawn by its owner, with the reason from its record.

### The freeze cap is held by the act

- "At most one freeze per round unless an exception is written in the Index" was enforced only by `qspec index`, over a `frozen` list nothing wrote. `qspec transition --to frozen --index <round>` now refuses a second freeze in the round, and `qspec index --specs` derives what froze from the specs' own statuses and blocks when the Index's list disagrees. `superseded` counts as a freeze: superseding replaces one rather than undoing it.

### J7 is printed, recorded, and watched

- `qspec sign` prints J1 to J7 before it writes, with J7 resolved to the overlay's rule for this spec's profile. `qspec sign --show` prints the seven and signs nothing, so a reviewer can read them first.
- The signing entry records the J7 rule verbatim in `judged_rules`, so a later reader sees what was signed rather than that something was. When the overlay's wording moves, `qspec lint` reports `overlay-drift` as a `warn` — a rewording should not invalidate a portfolio. A pre-1.2.0 signature reports `J7-unrecorded` as `skip`.
- The J7 rules moved into `schema/catalogs.json`, and `scripts/check-judged.mjs` holds them to the same text as the overlays in `npm test`. Two profiles had no J7 rule at all, so a reviewer was signing J7 against nothing: `measurement` in QSPEC-SS and in QSPEC-ENG now have one.

### Exploratory work has a goal in every domain

- Core section 6.3 said exploratory work is written under `measurement` or `feasibility`. `feasibility` exists only in the engineering catalog, so the sentence named a value two domains do not have. Each overlay now declares its own `exploratory_goals` in section 3.2, carried in `schema/catalogs.json`: social `measurement`, `description`, `interpretation`; natural `measurement`, `existence`; engineering `feasibility`, `measurement`. The core points at the overlay instead of naming values, and keeps the teeth: the kill condition is about the method, instrument, or corpus, and "keep looking" is not one.

### An Index is a record of a round, not a live view

- Obeying a round changed the statuses the round listed, and the Index then failed forever. `kill` is a listed `recommended_action`, so a round that recommended a kill and was obeyed broke its own Index; superseding a freeze did the same. Listed ids may now resolve to `killed`, `superseded`, or a withdrawn `specified`, reported as the round's outcome. Only `draft` is refused. A spec that has moved to a later `instance_version` is a `warn`; an Index citing a version that does not exist yet is still a `block`.
- The rendering gained a "Where each question stands now" section.
- Definition of done, section 13.1, now lists `superseded`. A superseded spec is a finished object: it was frozen, it was replaced, and its successor is named.

### Also

- `--dissent "<reviewer>: <point>"` on `sign` and `transition`. Section 9 makes the Decision Record the only home for dissent, and the tool that owns the record could not write one; the example carrying unresolved dissent had been written by hand.
- Decision Record entries gained two optional fields within `QSPEC-DR/1.0`: `round` and `judged_rules`.
- New findings: `unbound-decision`, `overlay-drift`, `J7-unrecorded`, `index-committee`, `index-frozen-drift`, `index-withdrawn`, `round-withdrawal`. Core section 8.4 lists the findings that are not invariants.
- The skill's own run instructions pointed at `tool/bin/qspec.mjs`, which does not exist. Fixed to `qspec.js`.
- Example Decision Records were replayed through the tool so they carry `round` and `judged_rules`.
- Built bundles are no longer committed. `dist/` was tracked from the first commit while the workflow builds its own zip and globs `dist/qspec-*.zip`; with two versions in the tree the glob matched twice and the release failed. `dist/` is now ignored and the workflow names the zip for the tag it is building. Two latent bugs surfaced once `dist/` stopped existing in a checkout: `pack()` created its output directory relative to the caller's working directory while `zip` runs with its cwd in `plugin/`, and the workflow's variable for the built zip was named `ZIP`, which Info-ZIP reads and prepends to its own argv.

## 1.1.0 (2026-09-02)

The pairing with Paperforge, and the gate the pairing exposed.

### Signatures cover a text

- The Decision Record's draft-to-specified entry now carries `spec_fingerprint`, SHA-256 over the substantive sections of the spec with whitespace collapsed. `qspec lint` reports `stale-signature` as `block` when the spec has moved since a reviewer signed. Before this, a reviewer's signature survived any later edit, and the rule that a post-freeze change needs a new version was discipline rather than a gate.
- New invariant M16 ties `status` to the record: a spec that is not `draft` must have a complete, current signature and a valid transition sequence ending in its stated status.
- `qspec sign` and `qspec transition` are the only writers of the record. They refuse anything outside the transition table, any actor not permitted for the role, a signature while an M invariant fails, and a freeze without `first_check`.

### Four severities

Findings are `block`, `manual`, `warn`, or `skip`, Paperforge's vocabulary. A `manual` finding names the act that settles it. Only `block` sets the exit code. Added `blocking-without-plan` as a warning.

### Renderings, never authored

- `qspec sheet` renders the Selection Sheet in Paperforge's head format and refuses for any status below `selectable`. An empty field is `(not stated)` and reported; an empty `ask` is `manual`.
- `qspec index` checks and renders the Portfolio Index, resolving ids against a directory of specs.
- `qspec request` exports a frozen spec as the document a Paperforge project's `request` key points at, and refuses any other status.
- `qspec paper` checks that a downstream document carries the frozen claim verbatim as a gist and cites `id@instance_version`.

### Renames and additions

- Question Brief is now the Selection Sheet. Paperforge has a `brief` type and a `brief` command; three things called brief was one too many.
- New optional core block `ask` (time, people, access, hardware or compute), shown on the sheet and not fingerprinted.
- Schema documents are unversioned filenames with the version in the header.
- `qspec-lint` is kept as an alias of `qspec lint`.
- Example citations reworded from "Placeholder" to "Illustrative work" because Paperforge's `todo` rule blocks that word.
- Licence: source available, all rights reserved to RealTimeX. `package.json` is `UNLICENSED` and private.

### Plugin and packaging

- Repository renamed to `qspec`. First RealTimeX plugin: `plugin/` is a declarative skill bundle carrying the tool and the schema documents; `scripts/plugin.mjs` syncs it from the repo, refuses drift, and packages the release zip.
- js-yaml vendored as a single ES module, so the tool has no dependencies and runs from a bundle without `npm install`.
- GitHub Actions: CI on push and pull request; a tag-triggered release that checks the tag against the manifest, packages, lints from the unpacked zip, and publishes with a checksum.

### Versioning note

M16 tightens what leaving `draft` requires. Section 14 of the core calls that a major change. It was released as minor because no 1.0.0 instance existed outside this repository; the core now says this exception is not available again.

## 1.0.0 (2026-09-02)

First release. Replaced the three 0.1.0-draft documents, now in `archive/`.

- Extracted `QSPEC-CORE` from the three drafts; the domain documents became overlays.
- `mixed` removed as a family; it is a secondary-method flag with a mandatory rescue rule, and the primary profile always applies.
- Decision Record given a schema; `deferred` and `superseded` states added; every transition names its actor.
- Invariants split into mechanical M1 to M15 and judged J1 to J7.
- `claim.comparative` and a designated comparator field per profile.
- `safety_or_ethics` is a list; `hints.ceiling` means one thing in every domain; one name for the vehicle field.
- Added `schema/catalogs.json`, a linter, templates, six examples, two negative examples.
- Reviewer items resolved: `knowledge_goal`, `normative_map`, `hints`, `existence`, `feasibility` kept; `computational` not split but gains `computation_mode`; software in scope for engineering; human-in-the-loop decided by what the claim predicates on.

## 0.1.0-draft (2026-09-02)

Three independent drafts: social sciences, natural sciences, engineering.
