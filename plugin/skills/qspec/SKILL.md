---
name: qspec
description: Write, lint, sign, select, freeze, or kill a research question as a Question Spec (QSPEC) — a claim that can fail, a method family and profile, materials, increment over named work, and a kill condition. Use when a research request is a topic rather than a question, when a team must choose among candidate questions, before scaffolding a Paperforge project, or when qspec lint blocks a spec. Measures and records only; it never writes a field or judges whether a question is good.
allowed-tools: Read, Write, Edit, Bash
license: UNLICENSED
metadata:
  version: "1.10.2"
---

# QSPEC Question Specs

A Question Spec is a YAML contract for one research question. The tool ships beside this file in `tool/` and needs only Node; the schema documents are in `references/`. A project that uses QSPEC is a directory `qspec init` prepared: it holds the specs, their Decision Records, the round's Index, and an `AGENTS.md` that says so; the tool is pointed at them.

## The rule

**The tool measures and records; it does not author.** Every field is written by a person. The judged invariants J1 to J7 are signed by a reviewer who is not the owner. The tool checks the mechanical invariants, stamps a fingerprint when a reviewer signs, and reports `stale-signature` when the text moves out from under a signature. Never fill a field on the author's behalf, never invent a citation, never estimate the ask.

## When to use what

| Task | Read |
|---|---|
| Understand the object, life cycle, roles, invariants | [references/QSPEC-CORE.md](references/QSPEC-CORE.md) |
| Write a social-science spec: families, profiles, catalogs | [references/QSPEC-SS.md](references/QSPEC-SS.md) |
| Write a natural-science spec | [references/QSPEC-NS.md](references/QSPEC-NS.md) |
| Write an engineering or software-systems spec | [references/QSPEC-ENG.md](references/QSPEC-ENG.md) |
| Hand a frozen question to a Paperforge project | [references/paperforge-integration.md](references/paperforge-integration.md) |
| Give a person a document | the Selection Sheet for a committee; the dossier for the people inside the process |
| Start a project directory, or check one | `qspec init`, then `qspec doctor` (below) |
| See what a check saw earlier, compare two versions, recover an overwritten draft, keep a handoff beside its run, or note a workaround | [references/runs.md](references/runs.md) |
| Start from an empty instance | `qspec new <Q-id> --domain <d>`, which copies `tool/templates/qspec-social.yaml`, `qspec-natural.yaml`, or `qspec-engineering.yaml` with the id set |

## Running it

**The command is not on `PATH`.** Invoke it by path from this skill directory:

```bash
node <skill-dir>/tool/bin/qspec.js help
node <skill-dir>/tool/bin/qspec.js lint specs/Q-014_apical-oxygen.yaml
```

```text
qspec init --into <dir>               prepare a directory: specs/ with the round's Index, AGENTS.md
     [--title] [--round] [--decision-maker] [--brief path] [--domain] [--append] [--no-git]
qspec new <Q-id> --domain <d>         an empty spec from the domain template, id and date set
     [--slug] [--title] [--owner] [--specs dir]
qspec init --refresh --into <dir>     rewrite only the QSPEC block in AGENTS.md and re-stamp; what doctor asks for on STALE
qspec doctor [--project dir]          guidance and bibliography state; runs since the last act
qspec runs [--diff <a>,<b> [--sources]] [--spec <id|path>]
                                      every recorded run here; scope colliding labels to one spec
qspec runs show <run> [--spec <id|path>]
                                      one run, its findings, and every note as written
qspec attach <run> <file> --by <actor> --role <role> --kind handoff|review|decision|note
                                      keep what you concluded beside the run it is about; copied whole
qspec report "<what happened>"        a friction note; --issue prints the latest for a tracker, files nothing
qspec lint <spec>...                  M1 to M16, record checks, signature staleness; exit 1 on block; records a run
qspec fingerprint <spec>              what a signature is taken over
qspec sign <spec> --by <reviewer>     draft -> specified; refuses while any M invariant fails
     [--show]                         print J1 to J7 for this profile and sign nothing
     [--run <name>]                   cite the run whose text is signed; refused if the text moved since
qspec transition <spec> --to <state> --by <actor> --role <owner|reviewer|decision_maker>
     [--run <name>]                   cite the run whose text is acted on
     [--index <round> | --unbound]    a decision_maker act must declare one of the two
     [--specs <dir>]                  where the round's other specs live, for the freeze cap
     [--dissent "<who>: <point>"]     record a dissenting point with the act
qspec sheet <spec> [--index <index>] [--draft]
                                      the committee sheet; --draft previews any state
qspec index <index> --specs <dir>     the Portfolio Index and its checks
qspec dossier <spec>                  the spec, record, run timeline, and attached notes; any state
qspec request <spec>                  the frozen request for a Paperforge project; frozen only
qspec render --out <dir> [--draft]    the corpus; --draft writes sheet previews under drafts/
qspec paper <spec> <document.md>      the document carries the frozen claim as a gist
```

Findings are `block`, `manual` (with the act that settles it), `warn`, or `skip`. Only `block` sets the exit code.

## Workflow

0. **Prepare the directory once.** If there is no `.qspec/scaffold.json` here or above, ask for the title, the round, the decision-maker, and where the research request is, then run `init`. It writes `AGENTS.md` for every agent that works here and refuses to overwrite one it did not write; in a RealTimeX loops workspace pass `--append` so the loops shim stays. When a project misbehaves, run `doctor` before anything else: it says whether the guidance is stale and what is in `specs/`.
1. **Interview before writing.** Get the claim sentence, the domain, the primary method family, the three to five nearest works in practice, the blocking materials, and the kill condition from the user. This is not a literature review; cite wider literature from prose with `[@key]`. For each closest work, the interview must yield both a BibTeX key and an entry copied from publisher or DOI metadata into `references.bib`, not only a name and year. If any is missing, leave the field empty and say so; an empty field is a visible finding, a plausible invention is not. The tool never writes or fetches a bibliography entry.
2. **`qspec new <Q-id> --domain <d> --slug <short-name>`** copies the template with the id and date set; fill it and run `lint` until nothing blocks. Each `lint` inside a project records a run with the spec as it stood. Before attaching a note, lint under your own `<spec>-<role>-round-<n>` label and attach to that run, so it carries the file as you saw it under your name; `attach` warns when the label names a different role. When handing findings back, cite the run name, say `qspec runs --diff <before>,<after>` so the next role sees what changed rather than a paraphrase, and `qspec attach <run> <handoff.md> --by <you> --role <role> --kind handoff` so what you concluded stays beside the text it was about. Do not summarise a note for the tool; it copies the file whole. Profile field lists are in the overlay's section 4.
3. **Signing is a person's act.** When lint is clean, run `qspec sign --show` and put the seven rules in front of the reviewer: J7 is the overlay's rule for this profile, and it is the one nobody remembers. Then tell the user which reviewer must reread the spec and run `qspec sign --by <reviewer> --run <the run they read>`; the tool refuses a run whose text has moved since. A note attached to a run is not an act: `lint` reports `notes-without-act` until a person signs or transitions, and an agent review loop that closes as "approved" has changed nothing in the record. Do not sign as the reviewer yourself unless the user, acting as that reviewer, says the invariants hold.
4. **Offer, choose, freeze** with `transition`, and render the Selection Sheet for the decision-maker. A decision-maker act must declare `--index <round>`, which checks the actor against the committee that round names and holds the one-freeze-per-round cap, or `--unbound`, which records that nothing checked it and leaves `unbound-decision` on the record for good. Reach for `--index`; offer `--unbound` only when the user says there is no round, which for a single candidate is normal.
5. **Withdraw, do not kill, to pull a spec out of a round.** `--to specified --role owner --reason "..."` keeps the signature and allows a later re-offer. Killing is terminal and, when the round listed the spec, the Index reports it.
6. **Give the right document to the right reader.** The Selection Sheet is for a committee: it uses catalog labels and `committee-clean` refuses machine or workflow vocabulary in the finished text. The dossier is for the people inside the process: its rendered copy changes CLI-style angle-bracket placeholders such as `<run>` to single angle quotation marks such as `‹run›` while leaving source notes, comparison prose, and standard Markdown autolinks untouched. Declare it as a Paperforge `qspec-dossier` document with `publish = false`; Paperforge builds and verifies it, but cannot publish it. Generate the corpus with `render --out documents/`; use `sheet --draft` or `render --draft` for an unsigned owner preview.
7. **Hand off** with `request`. Point the Paperforge project's `request` key at the exported file and put either `**Question:** Q-014@1` or `**Question:** Q-014, version 1` in the document head.

## Three things not to work around

**When lint blocks, fix the spec.** M invariants are listed in QSPEC-CORE section 8 with their numbers. A block is a missing or malformed field, not a style note. `gist-unrepresentable` is only a warning, but act on it while the spec is in draft: a double quote or a brace in `one_sentence` blocks `qspec paper` at the far end, and rewording a frozen claim costs a new `instance_version` or a successor.

**When a signature is stale, a reviewer rereads.** `sign` on a changed spec demotes it and re-signs in one act, but only a person can say the judged invariants still hold. A frozen spec that changed needs a new `instance_version` or a successor, never a re-signature.

**Never edit a Decision Record by hand.** It is append-only and tool-written. If a state is wrong, append the right transition. Dissent goes in with `--dissent` on the act, not with an editor.

**Never delete or gitignore `.qspec/runs/`.** It is how a draft that was overwritten in place can be put beside the one that replaced it. If you had to work around the tool, `qspec report "what happened"` in a sentence; solve it and report it.

**A role is claimed, not proved.** `--role decision_maker` is checked against the round's Index when one is given and against nothing under `--unbound`. Do not tell a user the tool established who someone is; it established that a name was written beside an act and that the text has not moved since.

## Essentials

```yaml
spec_schema: QSPEC/1.0
domain: natural                 # social | natural | engineering
id: Q-014
status: draft                   # maintained by sign / transition
claim:
  one_sentence: ""              # can be false; no quotes or braces
  comparative: false
question_type:
  method_family: experimental   # from the overlay catalog
  knowledge_goal: effect
  secondary_method: null        # a second family, never "mixed"
  rescue_rule: null             # required when secondary_method is set
increment:
  closest_work: [ {cite, key, settled, still_open}, {cite, key, settled, still_open} ]
  vehicle_is_not_the_contribution: ""
success_and_failure:
  kill_condition: ""            # a stop rule, not "collect more"
profile:
  name: experimental            # equals method_family
handoff:
  first_check: ""               # required before freeze
```

The Decision Record lives beside the spec as `<spec>.record.yaml`. The word "placeholder" and its siblings are blocked by Paperforge downstream; do not use them in a field a rendering carries.
