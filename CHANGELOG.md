# Changelog

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
