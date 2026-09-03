---
name: qspec
description: Write, lint, sign, select, freeze, or kill a research question as a Question Spec (QSPEC) — a claim that can fail, a method family and profile, materials, increment over named work, and a kill condition. Use when a research request is a topic rather than a question, when a team must choose among candidate questions, before scaffolding a Paperforge project, or when qspec lint blocks a spec. Measures and records only; it never writes a field or judges whether a question is good.
allowed-tools: Read, Write, Edit, Bash
license: UNLICENSED
metadata:
  version: "1.2.0"
---

# QSPEC Question Specs

A Question Spec is a YAML contract for one research question. The tool ships beside this file in `tool/` and needs only Node; the schema documents are in `references/`. A project that uses QSPEC holds its specs, their Decision Records, and an Index; the tool is pointed at them.

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
| Start from an empty instance | `tool/templates/qspec-social.yaml`, `qspec-natural.yaml`, `qspec-engineering.yaml` |

## Running it

**The command is not on `PATH`.** Invoke it by path from this skill directory:

```bash
node <skill-dir>/tool/bin/qspec.js help
node <skill-dir>/tool/bin/qspec.js lint specs/Q-014_apical-oxygen.yaml
```

```text
qspec lint <spec>...                  M1 to M16, record checks, signature staleness; exit 1 on block
qspec fingerprint <spec>              what a signature is taken over
qspec sign <spec> --by <reviewer>     draft -> specified; refuses while any M invariant fails
     [--show]                         print J1 to J7 for this profile and sign nothing
qspec transition <spec> --to <state> --by <actor> --role <owner|reviewer|decision_maker>
     [--index <round>] [--specs <dir>]  bind the decision-maker to the round; hold the freeze cap
     [--dissent "<who>: <point>"]     record a dissenting point with the act
qspec sheet <spec> [--index <index>]  the Selection Sheet, for selectable, deferred, or frozen only
qspec index <index> --specs <dir>     the Portfolio Index and its checks
qspec request <spec>                  the frozen request for a Paperforge project; frozen only
qspec paper <spec> <document.md>      the document carries the frozen claim as a gist
```

Findings are `block`, `manual` (with the act that settles it), `warn`, or `skip`. Only `block` sets the exit code.

## Workflow

1. **Interview before writing.** Get the claim sentence, the domain, the primary method family, at least two named closest works, the blocking materials, and the kill condition from the user. If any is missing, leave the field empty and say so; an empty field is a `block` the author can see, a plausible invention is not.
2. **Copy the template** for the domain, fill it, and run `lint` until nothing blocks. Profile field lists are in the overlay's section 4.
3. **Signing is a person's act.** When lint is clean, run `qspec sign --show` and put the seven rules in front of the reviewer: J7 is the overlay's rule for this profile, and it is the one nobody remembers. Then tell the user which reviewer must reread the spec and run `qspec sign --by <reviewer>`. Do not sign as the reviewer yourself unless the user, acting as that reviewer, says the invariants hold.
4. **Offer, choose, freeze** with `transition`, and render the Selection Sheet for the decision-maker. Pass `--index <round>` to every decision-maker act: it is the only thing that checks the actor against the round's committee and holds the one-freeze-per-round cap. Without it the act still records, and says on stderr that it checked nothing.
5. **Withdraw, do not kill, to pull a spec out of a round.** `--to specified --role owner --reason "..."` keeps the signature and allows a later re-offer. Killing is terminal and, when the round listed the spec, the Index reports it.
6. **Hand off** with `request`. Point the Paperforge project's `request` key at the exported file and put `**Question:** Q-014@1` in the document head.

## Three things not to work around

**When lint blocks, fix the spec.** M invariants are listed in QSPEC-CORE section 8 with their numbers. A block is a missing or malformed field, not a style note.

**When a signature is stale, a reviewer rereads.** `sign` on a changed spec demotes it and re-signs in one act, but only a person can say the judged invariants still hold. A frozen spec that changed needs a new `instance_version` or a successor, never a re-signature.

**Never edit a Decision Record by hand.** It is append-only and tool-written. If a state is wrong, append the right transition. Dissent goes in with `--dissent` on the act, not with an editor.

**A role is claimed, not proved.** `--role decision_maker` is checked against the round's Index when one is given and against nothing when one is not. Do not tell a user the tool established who someone is; it established that a name was written beside an act and that the text has not moved since.

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
  closest_work: [ {cite, settled, still_open}, {cite, settled, still_open} ]
  vehicle_is_not_the_contribution: ""
success_and_failure:
  kill_condition: ""            # a stop rule, not "collect more"
profile:
  name: experimental            # equals method_family
handoff:
  first_check: ""               # required before freeze
```

The Decision Record lives beside the spec as `<spec>.record.yaml`. The word "placeholder" and its siblings are blocked by Paperforge downstream; do not use them in a field a rendering carries.
