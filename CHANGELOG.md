# Changelog

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
