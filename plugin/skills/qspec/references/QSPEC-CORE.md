# QSPEC-CORE 1.7.0
# Question Spec: shared core for all research domains

**Spec-ID:** QSPEC-CORE
**Schema-Version:** 1.7.0
**Date:** 2026-09-04
**Status:** released
**Instance format:** `spec_schema: QSPEC/1.0` plus a `domain` key
**Domain overlays:** [QSPEC-SS](QSPEC-SS.md) (social sciences), [QSPEC-NS](QSPEC-NS.md) (natural sciences), [QSPEC-ENG](QSPEC-ENG.md) (engineering)
**Tooling:** `qspec` (section 15). Pairs with Paperforge downstream; see [docs/paperforge-integration.md](docs/paperforge-integration.md).

**What this is:** the base contract for writing down a research question so it can be compared, selected, frozen, or killed. Every instance uses this core plus exactly one domain overlay.
**What this is not:** a grant form, ethics protocol, pre-analysis plan, design review, or paper template. Those are downstream objects that cite a frozen spec.

---

## 1. Problem

Research projects are usually selected from topics, techniques, or platforms. None of those can be false as written, so selection tracks fashion, equipment, and seniority. Different traditions do not share an interface, so a causal design, a bench experiment, a simulation, and a theory paper cannot be compared or killed on the same terms.

The Question Spec is a short contract: a claim that can be wrong, a named mode of inquiry, the materials required, the increment over named work, and the condition under which the question is abandoned.

---

## 2. Purpose

A Question Spec exists to:

1. force a topic, technique, or platform into a claim that can fail
2. make questions from different methods and domains comparable at a high level
3. expose missing access, baselines, identification, or increment before people and instruments are committed
4. give a frozen input to whatever design, protocol, or fieldwork stage comes next
5. keep rejected questions rejected, with a reason

A completed spec is ready to be **chosen**. It is not ready to be published or built.

---

## 3. Non-goals

This specification does not:

- rank the importance of questions or pick a venue or funder
- prove that a design is valid
- replace expertise in a field, a group meeting, or a skeptical colleague
- put theory, fieldwork, experiment, and computation on one numeric scale
- stand in for ethics review, safety filings, preregistration, certification, or a data-management plan
- judge whether a downstream document answers the question; it can only check that the document names the question it claims to answer
- **authenticate anyone.** A signature here establishes that a name was written beside an act and that the text has not moved since. It does not establish that the person acted, consented, or exists. `owner` and `reviewer` are checked against fields of the spec, and `decision_maker` against the round's Index when one is given; all three are consistency with a written name, not proof of identity. A team that needs proof of identity gets it from the system holding the files, not from here.

---

## 4. Design principles

1. **Claim before method, apparatus, or platform.** If the central sentence cannot be false, the spec is invalid.
2. **One core, typed rigor.** All questions share this core. Domain overlays add vocabulary and method profiles. Profiles carry the standards of a tradition.
3. **Invalid is not unfinished.** A spec missing a kill condition or closest work stays in `draft`. It must not be ranked as if it were a question.
4. **Vehicle is not increment.** A new country, dataset, organism, instrument, prototype, simulator, or code base is a means, not a contribution.
5. **One primary family.** Combined work names a primary claim and a primary family. A secondary method may not silently rescue the primary.
6. **Short enough to select.** A spec that cannot be read in fifteen minutes has failed as a selection object.
7. **Killing is success.** A rejected spec with a written reason is a finished output of question development.
8. **Measure or sign, never compose.** A check is mechanical if its answer is in the file and there is exactly one. Everything else is a judgment a named person signs. The tool renders and checks; it never writes a field.
9. **A signature covers a text.** A reviewer signs the spec as it stood. If the spec moves, the signature is stale and the tool says so.

---

## 5. Object model

| Object | Role | Where |
|---|---|---|
| **Question Spec** | the contract: core fields plus overlay fields and one inline profile | section 7 and the overlay |
| **Method Profile** | required extra fields for one method family; lives inline in the spec | overlay |
| **Decision Record** | append-only log of status changes, actors, fingerprints, reasons, and dissent; written by the tool | section 9 |
| **Selection Sheet** | one-page rendering of a spec for a decision-maker; generated, never written | section 10 |
| **Portfolio Index** | ranking and recommended actions for a selection round | section 11 |
| **Request** | the frozen spec rendered as the document a downstream project answers | section 12 |

Cardinality:

- one question, one spec, one domain, one profile
- one Decision Record per spec, beside it as `<spec>.record.yaml`, appended for its whole life
- a Selection Sheet is rendered only when the spec is `selectable`, `deferred`, or `frozen`
- ranking lives in the Index, never in the spec body

The Selection Sheet was called the Question Brief in 0.1.0. It was renamed because Paperforge, which renders it, already has a `brief` document type and a `brief` command.

---

## 6. Life cycle

### 6.1 States

```text
draft       fields exist; at least one invariant fails or is unsigned
specified   all mechanical invariants pass and a reviewer has signed the judged invariants against this text
selectable  offered to a decision-maker in a selection round
deferred    seen by a decision-maker and parked as backup or not-now, with a revisit date
frozen      chosen; downstream work may begin against this claim
superseded  a frozen spec replaced by a successor spec, with a pointer to it
killed      closed, with a written reason
```

### 6.2 Roles

| Role | Who | May |
|---|---|---|
| `owner` | author of the spec, named in `owner` | edit, offer, withdraw from a round, kill own spec, create successor |
| `reviewer` | anyone named in `reviewers`; never the owner | sign judged invariants, demote to draft, record dissent |
| `decision_maker` | the person or body running a selection round, named in the round's Index | freeze, defer, kill |

A spec needs at least one reviewer who is not the owner before it can leave `draft`.

`owner` and `reviewer` name people the spec itself names, so an act in one of those roles is checked against the spec. No field of a spec names the committee, so a `decision_maker` is checked only against the Index of the round the act is taken in, and only when that Index is in hand.

Because that is the one binding available, an act in the `decision_maker` role must say which it is: `--index <round>`, and the actor is checked against the committee that round names, or `--unbound`, and the record shows no round and `qspec lint` reports `unbound-decision` for as long as the record exists. Neither is refused; the choice is. Before 1.3 the flag could be omitted and the tool noted on stderr that it had checked nothing, which is not a note anyone reads back. None of this is authentication; see section 3.

### 6.3 Transitions

Every transition is an act appended to the Decision Record by `qspec sign` or `qspec transition`, which refuse anything not in this table.

| From | To | Actor | Requirement |
|---|---|---|---|
| draft | specified | reviewer | all M-invariants pass; the entry lists J1 to J7 in `signed_invariants` and carries `spec_fingerprint` |
| specified | selectable | owner | a selection round or decision-maker is named |
| selectable | specified | owner | written `reason`; the spec is withdrawn from the round and stays signed |
| selectable | frozen | decision_maker | `handoff.first_check` is non-empty; at most one freeze per round unless an exception is written in the Index |
| selectable | deferred | decision_maker | `revisit_by` date recorded |
| deferred | selectable | owner | revisit date reached or a new round opened |
| specified, selectable, deferred | draft | reviewer | the failing invariant is cited by number in `cited_invariant` |
| frozen | superseded | owner | `successor` records the new `id@instance_version` |
| any except superseded | killed | owner or decision_maker | written `reason` |

Rules:

- Only `selectable` specs are put forward for choice. Only `frozen` specs are the official question for the next stage.
- Withdrawal is not killing. An owner who no longer wants a spec in the round returns it to `specified`, where it keeps its signature and can be offered again. `killed` stays available to an owner at any point, and it stays terminal; when a round listed the spec, the Index reports the kill and its reason so an aborted round is never silent.
- The one-freeze-per-round cap is held by the act, not only by the Index: `qspec transition --to frozen --index <round>` refuses a second freeze in a round unless the Index carries a written `exception`. What counts as a freeze is the specs' own statuses, `frozen` or `superseded`, not the Index's hand-written `frozen` list. An act taken `--unbound` is outside every round, so no cap applies to it and none of its acts appear in a round's checks. That is the cost of not naming one.
- A change to any fingerprinted section (section 9.2) after signing makes the signature stale. The spec cannot be offered or frozen again until a reviewer re-signs. After `frozen`, such a change also requires a new `instance_version`; if the claim itself changed, a new `id`, and the old spec becomes `superseded`. Typos and added citations bump `instance_version` alone.
- `killed` is terminal for that instance. Reopening means a new `instance_version` or new `id` with new materials, new variation, or a changed claim, never the same spec with softer language.
- Exploratory work is not exempt. It is written as a spec whose knowledge goal is one of the domain's `exploratory_goals` and whose kill condition is about the method, the instrument, or the corpus rather than about the world. The goals differ by domain, because `feasibility` is an engineering value and does not exist in the social or natural catalogs; each overlay names its own in section 3.2. What does not differ is the kill condition: "keep looking" is not one.

---

## 7. Core instance fields

Every instance begins with these fields. The overlay adds fields under `claim`, `constraints`, and `profile`, and supplies the value catalogs marked `<overlay>`.

```yaml
spec_schema: QSPEC/1.0
domain: social | natural | engineering
id: Q-000                 # stable; never renumbered after a ranking
title: ""
status: draft             # maintained by qspec sign / qspec transition
instance_version: 1
date: YYYY-MM-DD
owner: ""
reviewers: []             # at least one, none equal to owner
changelog:
  - version: 1
    date: YYYY-MM-DD
    change: "created"

claim:
  one_sentence: ""
  comparative: false      # true if the claim compares against a baseline, comparator, or prior result
  # <overlay> adds object/scope or system/regime fields here
  why_it_matters: ""

question_type:
  method_family: ""       # exactly one value from the <overlay> catalog
  knowledge_goal: ""      # exactly one value from the <overlay> catalog
  secondary_method: null  # a family from the catalog, or null
  rescue_rule: null       # required when secondary_method is set

increment:
  closest_work:           # at least two entries
    - cite: ""
      settled: ""
      still_open: ""
    - cite: ""
      settled: ""
      still_open: ""
  increment_if_this_works: ""
  vehicle_is_not_the_contribution: ""

materials:
  in_hand: []
  blocking: []
  obtainable:
    - item: ""
      source: ""
      horizon: ""
      probability: low | medium | high
  access_risk: low | medium | high

success_and_failure:
  support_would_look_like: ""
  failure_would_look_like: ""
  uninteresting_even_if_true: ""
  kill_condition: ""

constraints:
  safety_or_ethics: []    # zero or more values from the <overlay> catalog
  sensitivity: ""
  independence_limits: ""
  # <overlay> may add fields here

ask:                      # what selecting this costs; shown on the sheet, reported as a hole if empty
  time: ""
  people: ""
  access: ""
  hardware_or_compute: ""

hints:                    # optional; never used for ranking; not fingerprinted
  ceiling: specialist | broad | unclear
  build_risk: low | medium | high

profile:
  name: ""                # must equal question_type.method_family
  # <overlay> profile fields

handoff:                  # not fingerprinted: first_check is filled between signing and freeze
  first_check: ""         # required before freeze
  notes_for_next_stage: ""
```

### Field meaning

| Field | Meaning |
|---|---|
| `one_sentence` | A statement that can turn out false. Not a theme, a technique, a platform, or a list of nouns. It must not contain a double quote or a brace, because a downstream document carries it verbatim as a gist. `qspec lint` reports `gist-unrepresentable` as a `warn` while the spec is still being written; `qspec paper` blocks on it. It is a warning and not an M invariant because a new blocking check on an instance field would be a major release, and finding out at the document is far too late: rewording a frozen claim costs a new `instance_version` or a successor. |
| `comparative` | Whether the claim asserts better, worse, larger, or different relative to something. If true, the profile's comparator field must be filled. |
| `why_it_matters` | Why a reader who does not work on this setting, system, or testbed should care. |
| `method_family` | How the claim is to be established. Exactly one primary. |
| `knowledge_goal` | What kind of knowledge the claim is for. Exactly one primary. |
| `secondary_method` | A second family that contributes without carrying the claim. |
| `rescue_rule` | What the secondary method is not allowed to fix. Example: a simulation cannot replace a failed control. |
| `closest_work` | At least two named works, designs, or standards, with what each settled and left open. |
| `increment_if_this_works` | What becomes known that the closest work does not already establish. |
| `vehicle_is_not_the_contribution` | Why the setting, dataset, organism, instrument, prototype, or code is a means, not the novelty. |
| `in_hand` | Materials already usable. |
| `blocking` | Materials without which the question cannot be done. A blocking item with no `obtainable` plan is reported as a warning. |
| `obtainable` | Named source, time horizon, and an honest probability for each missing item. |
| `access_risk` | Owner's summary of the blocking and obtainable lists. |
| `support_would_look_like` | Evidence pattern that would support the claim. |
| `failure_would_look_like` | Evidence pattern that would refute or fail to support it. This is a scientific outcome, not a stop rule. |
| `uninteresting_even_if_true` | A confirmed result that would still not be worth having selected. |
| `kill_condition` | Operational trigger to stop the project: failed check, unreachable access, nested prior result, unusable measurement. Never "add more controls, cases, or time." |
| `safety_or_ethics` | All applicable categories from the overlay catalog. Empty list means none apply. |
| `independence_limits` | Partner veto, sponsor veto, classification, facility queue, legal or political risk to the claim. |
| `ask` | Time, people, access, and hardware or compute that selecting this spec commits. The sheet shows it; the tool never estimates it. |
| `hints` | Owner's guesses. Sheets may show them. Indexes must not sort on them. |
| `profile.name` | Must equal `method_family`. The overlay lists the profile's required fields and its comparator field. |
| `first_check` | The first thing the next stage must run: the kill condition test, the main access test, the baseline run, the calibration, the convergence study, or the counterexample search. |

---

## 8. Invariants and findings

Invariants are numbered so a Decision Record can cite them. **M** invariants are mechanical and are checked by `qspec lint`. **J** invariants are judged and are signed by a reviewer with `qspec sign`. A spec leaves `draft` only when all M pass and all J are signed against the current text.

### 8.1 Severities

Every finding the tool reports carries one of four severities. The vocabulary is Paperforge's, so a team reading both tools reads one language.

Only `block` sets an exit code, in every command. What stops a spec leaving `draft` is an act refusing to run, not a severity: `qspec sign` refuses while any M invariant blocks, and it is signing that leaves `draft`. A `manual` finding is a prompt with an act attached, and no command has ever refused on one. Before 1.3 this table said `manual` stopped a spec leaving `draft`, which was true of M16 by coincidence, because the act M16 names is signing, and false of every other `manual` finding.

| Severity | Means | Sets an exit code |
|---|---|---|
| `block` | a listed invariant demonstrably fails, or a signature no longer covers the text | yes |
| `manual` | the check ran and the verdict is a person's; the finding names the act that settles it | no; it names an act, and the act is what settles it |
| `warn` | worth a look; the owner decides | no |
| `skip` | the check could not run, and says why | no |

### 8.2 Mechanical (M)

| # | Rule |
|---|---|
| M1 | `spec_schema` is `QSPEC/1.0` and `domain` is one of `social`, `natural`, `engineering`. |
| M2 | `id`, `title`, `owner`, `date`, `instance_version`, and `status` are present; `status` is a listed state. |
| M3 | `reviewers` has at least one entry and none equals `owner`. |
| M4 | `method_family` and `knowledge_goal` are each exactly one value from the domain's catalog. |
| M5 | `secondary_method`, if set, is a catalog family different from `method_family`, and `rescue_rule` is non-empty. |
| M6 | `closest_work` has at least two entries, each with non-empty `cite`, `settled`, and `still_open`. |
| M7 | `increment_if_this_works` and `vehicle_is_not_the_contribution` are non-empty. |
| M8 | `support_would_look_like`, `failure_would_look_like`, `uninteresting_even_if_true`, and `kill_condition` are non-empty. |
| M9 | Every `obtainable` entry has `item`, `source`, `horizon`, and a listed `probability`; `access_risk` is a listed value. |
| M10 | `safety_or_ethics` is a list whose values are all from the domain's catalog; any `hints` values are listed values. |
| M11 | `profile.name` equals `method_family`, and every required field of that profile in the overlay is present and non-empty. |
| M12 | If `claim.comparative` is true, the profile's designated comparator field is non-empty. |
| M13 | The overlay's required `claim` fields are non-empty. |
| M14 | If `status` is `frozen` or `superseded`, `handoff.first_check` is non-empty. |
| M15 | `changelog` has an entry whose `version` equals `instance_version`. |
| M16 | If `status` is not `draft`, the Decision Record has a `draft -> specified` entry whose `signed_invariants` cover J1 to J7 and whose `spec_fingerprint` equals the fingerprint of the current text; the record's transitions are all listed ones, in sequence, in roles permitted for them; and the record's final state equals `status`. |

M16 reports as `manual` when there is no signature yet (the act is `qspec sign`) and as `block` when a signature exists and is stale or incomplete.

M16 checks that each act was taken in a role the transition table permits, and that the actor is the one the spec names for `owner` and `reviewer`. It cannot check a `decision_maker` against anything, because no field of a spec names the committee: that check belongs to the round and is made by `qspec index`.

### 8.3 Judged (J)

| # | Rule |
|---|---|
| J1 | `one_sentence` is a claim that could be false, not a topic, technique, platform, or noun pile. |
| J2 | `increment_if_this_works` is not solely a new setting, dataset, organism, instrument, prototype, or simulator. |
| J3 | `kill_condition` is checkable by the next stage and is not "collect more." |
| J4 | Every `blocking` item is a real precondition, or the claim has been rewritten so it is not required. |
| J5 | `failure_would_look_like` describes a result, and `kill_condition` describes a stop rule; they are not the same sentence. |
| J6 | If `secondary_method` is set, the primary claim is still singular and the rescue rule is specific. |
| J7 | The profile's judged rule in the overlay holds. It is one sentence per profile, listed in the overlay's section 4 and carried in `schema/catalogs.json`. `qspec sign` prints it, resolved for this spec's profile, alongside J1 to J6; `qspec sign --show` prints the seven and signs nothing. The signature records the rule verbatim, so a later reader sees what was signed, and `qspec lint` reports `overlay-drift` as a `warn` when the overlay's wording has moved since. |

A reviewer signing J1 to J7 is asserting seven sentences, not seven numbers, which is why the tool prints them. It cannot make anyone read them.

### 8.4 Findings that are not invariants

These come from the record, the Index, or a rendering rather than from the instance fields, so they carry no M number. A minor release may add to this list.

| Finding | Severity | Means |
|---|---|---|
| `stale-signature` | block | the spec moved after a reviewer signed |
| `status-mismatch` | block | the record's final state is not the spec's `status` |
| `DR-*` | block | the record's schema, sequence, roles, actors, or required fields are wrong |
| `unbound-decision` | warn | a `decision_maker` act names no round, so the role was checked against nothing |
| `overlay-drift` | warn | the overlay's J7 rule changed since the signature recorded it |
| `J7-unrecorded` | skip | signed before the rule was recorded, so drift cannot be checked |
| `blocking-without-plan` | warn | blocking materials with no `obtainable` entry |
| `index-committee` | block | an act claims a round whose Index names a different decision-maker |
| `index-stale` | block | a listed spec's signature no longer covers its text, so the round may be showing a claim the spec does not make |
| `gist-unrepresentable` | warn in `lint`, block in `paper` | `one_sentence` carries a double quote or a brace, which a downstream gist cannot hold |
| `index-freeze`, `index-frozen-drift` | block | more than one freeze without an exception, or a `frozen` list that disagrees with the specs |
| `index-withdrawn`, `round-withdrawal` | warn | a listed spec was withdrawn or killed by its owner |

---

## 9. Decision Record

One file per spec, beside it as `<spec>.record.yaml`, append-only, written by the tool. It is the audit trail behind every state change and the only home for dissent.

### 9.1 Shape

```yaml
record_schema: QSPEC-DR/1.0
spec_id: Q-000
entries:
  - date: YYYY-MM-DD
    instance_version: 1
    actor: ""
    role: owner | reviewer | decision_maker
    from: draft
    to: specified
    reason: ""
    round: null                                        # the Index round the act was taken in
    signed_invariants: [J1, J2, J3, J4, J5, J6, J7]   # draft -> specified only
    spec_fingerprint: "sha256:..."                     # draft -> specified only
    judged_rules: { J7: "" }                           # the overlay rule signed, verbatim
    cited_invariant: null                              # required for demotion to draft
    revisit_by: null                                   # required for deferred
    successor: null                                    # required for superseded
    dissent:
      - reviewer: ""
        point: ""
        unresolved: true
    run: null                                          # the recorded run the actor read, when they named one
```

### 9.2 The fingerprint

`spec_fingerprint` is SHA-256 over the canonical JSON of these sections, with keys sorted and every string whitespace-collapsed:

`claim`, `question_type`, `increment`, `materials`, `success_and_failure`, `constraints`, `profile`

Not covered: identity and bookkeeping (`id`, `title`, `status`, `instance_version`, `date`, `owner`, `reviewers`, `changelog`), `hints` (never scored), `ask` (a cost, not the question), and `handoff` (`first_check` is filled between signing and freeze by design).

Rewrapping lines or fixing spacing does not move the fingerprint. Changing a word in the claim, the kill condition, a profile field, or a blocking item does. `qspec fingerprint <spec>` prints it.

### 9.3 Rules

- Entries are never edited or deleted. A correction is a new entry.
- `qspec sign` refuses while any M invariant fails. It appends the signing entry with the fingerprint, and sets `status: specified`. On a `specified`, `selectable`, or `deferred` spec whose text has changed, it first appends a demotion to `draft` citing M16, then signs. On a `frozen` spec it refuses: a changed frozen spec needs a new `instance_version` or a successor.
- `qspec transition` refuses any transition not in section 6.3, any actor not permitted for the role, a freeze without `first_check`, a `decision_maker` who is not the one the given Index names, and a second freeze in a round that carries no exception.
- `round` is written from the Index given to the act. It is what lets a round check, afterwards, that its own committee took the acts recorded against it.
- `judged_rules` records the overlay's J7 rule as it read when the reviewer signed. It is evidence of what was signed, not a second fingerprint: a reworded rule is a `warn`, not a stale signature.
- A demotion to `draft` must cite the failing invariant by number.
- Unresolved dissent is carried onto the Selection Sheet verbatim.
- `run` names the recorded run the actor read, given with `--run`. The tool refuses the act when that run's recorded fingerprint for the spec is not the spec's fingerprint now: the actor read one text and would be acting on another. A run is the audit trail for looking, and a note attached to it is a judgment nobody has acted on; neither is an act, and `lint` reports `notes-without-act` until someone takes one.

---

## 10. Selection Sheet

Rendered by `qspec sheet <spec> [--index <index>]`, never written. Refused unless the spec is `selectable`, `deferred`, or `frozen`. One page, in Paperforge's head format, fixed order:

```text
# SELECTION SHEET / ## title / Question id@version, Domain, Status, Owner
Claim sentence
Context (object and scope, or system and regime)
Family and goal (+ secondary method and rescue rule, if any)
Increment in one line
Kill condition
First check for the next stage
Materials: in hand / blocking / obtainable with probability
Constraints: safety or ethics, independence limits
Ask: time, people, access, hardware or compute
Recommended action and rank, from the Index if given
Unresolved dissent, verbatim from the Decision Record
```

An empty field renders as `(not stated)` and the tool reports it. An empty `ask` is a `manual` finding. The spec and its Decision Record sit behind the sheet; a decision-maker who needs detail opens them.

---

## 11. Portfolio Index

Used whenever more than one spec is offered in a round. Checked and rendered by `qspec index <index> --specs <dir>`.

```yaml
index_schema: QSPEC-INDEX/1.0
round: ""
date: YYYY-MM-DD
decision_maker: ""
entries:
  - id: Q-000
    instance_version: 1
    domain: social | natural | engineering
    claim_20_words: ""
    family: ""
    blocking: true | false
    recommended_action: freeze | backup | not_now | kill
    rank: 1
frozen: []          # at most one id unless exception is non-empty
exception: null     # written justification for freezing more than one
```

Checks: every action is listed, ranks are unique integers, every claim is 1 to 20 words, and every id resolves to a spec in the given directory. `rank` is never derived from `hints`. The output of reading an Index is a decision, not a longer list.

An Index is the record of one round, not a live view of the portfolio, and obeying it changes the statuses it lists. So a listed spec that has since been killed, superseded, or withdrawn is reported as the round's outcome, not as a failure of the round; only `draft` is refused, because a spec that cannot leave `draft` was never offerable. A spec that has moved to a later `instance_version` is a `warn`; an Index citing a version that does not exist yet is a `block`.

What is checked against the specs themselves, when `--specs` is given:

- `frozen` must agree with the specs' own statuses. `frozen` and `superseded` both count as a freeze, because superseding replaces a freeze rather than undoing it. More than one needs a written `exception`.
- Any act in the specs' records that claims this `round` as `decision_maker` must be by the person this Index names. This is the only place that check can be made.
- Every listed spec still in play, meaning `selectable`, `deferred`, or `frozen`, must carry a signature that still covers its text. An Index shows a committee a claim in twenty words that a person wrote by hand; if the spec has moved since it was signed, those twenty words may describe a claim the spec no longer makes, and nothing else in a round would say so, because `lint` reads the spec and the Selection Sheet reads the spec while the Index reads only its own text. A spec the round killed, superseded, or that its owner withdrew is this round's outcome, and an edit made to it afterwards is not this round's failure.
- A listed spec killed or withdrawn by its owner is reported with the reason from its record, so a round that lost a candidate says so.

---

## 12. Downstream use

After `frozen`, later work produces other documents: design or protocol, ethics and safety filings, analysis plan, code, paper. This specification does not define them. It defines three points of contact.

1. **The request.** `qspec request <spec>` renders the frozen spec as a markdown document and refuses for any other state. A downstream project points its request key at that file, so what was asked travels with what was produced.
2. **The pointer.** The downstream document's head carries a metadata row `**Question:** Q-000@1`, citing `id` and `instance_version`. A changed question is a new spec version or a new spec, never a silent edit in a methods section.
3. **The claim.** The document's load-bearing paragraph carries the frozen `one_sentence` verbatim as the gist of a labelled claim, `{#claim-q-000 gist="..."}`. `qspec paper <spec> <document.md>` reports `manual` when the label is absent and `block` when the gist differs. Whether the paragraph supports the claim is a reviewer's question and is never asked by the tool.

---

## 13. Definition of done for question development

Question development is finished when:

1. every candidate is `specified`, `selectable`, `deferred`, `frozen`, `superseded`, or `killed` with a reason. A `superseded` spec is finished: it was frozen, it was replaced, and its successor is named
2. every non-killed spec passes all M invariants and carries a current signature for all J invariants
3. if there is more than one spec, an Index exists and passes its checks
4. a decision-maker can freeze one spec from its Selection Sheet without reconstructing the claim orally
5. the frozen spec's `first_check` names the first thing the next stage must run

---

## 14. Versioning of this schema

- `spec_schema: QSPEC/1.0` covers all `1.x` releases of the core. Minor releases add optional fields, catalog values, findings, or checks that apply to records and renderings rather than to the instance fields.
- Overlays version with the core and declare the core version they target.
- A change that removes a field, renames a field, or tightens an M invariant on the instance fields is a major release and a new `spec_schema` string.
- 1.1.0 added M16, which tightens what leaving `draft` requires. That was taken as a minor release because no 1.0.0 instance existed outside this repository. It is the last time that exception applies.
- 1.7.0 adds the human-readable dossier, aggregate `render`, a documented Paperforge manifest template, and `--spec` scoping for run labels that collide across questions. No instance field, M invariant, Decision Record shape, or Index shape changed. Every 1.6.0 project, spec, record, and Index is a valid 1.7.0 one.
- 1.6.0 adds `run` as an optional field on Decision Record entries, notes attached to runs, and run records for every checking command. No instance field or M invariant changed; `notes-without-act` is a `warn`. Every 1.5.0 project, spec, record, and Index is a valid 1.6.0 one.
- 1.5.0 adds run records: inside a project, `lint` and `index` write what they saw and the files as they stood under `.qspec/runs/`, `runs --diff` reads two of them, and `report` writes a friction note. No instance field, M invariant, record, or Index changed. Every 1.4.0 project, spec, record, and Index is a valid 1.5.0 one.
- 1.4.0 adds `init`, `new`, and `doctor`. They write project files and empty templates: a directory layout, an empty Index, agent guidance, a stamp of what wrote them, and a spec with only its `id` and `date` set. No instance field, M invariant, record, or Index changed. Every 1.3.0 instance, record, and Index is a valid 1.4.0 one.
- 1.3.0 adds findings on records and renderings and requires a `decision_maker` act to declare `--index` or `--unbound`. No instance field changed and no M invariant was added or tightened: `gist-unrepresentable` is a `warn`, not an M number, for exactly that reason. Every 1.2.0 instance and record is a valid 1.3.0 instance and record. What changed is a command line, not a file: a script that froze without naming a round now has to say `--unbound`.
- 1.2.0 adds a transition, two optional Decision Record fields, one catalog key, one catalog value per profile, and findings on records and Indexes. It removes no field, renames none, and tightens no M invariant on the instance fields. Every 1.1.0 instance and record is a valid 1.2.0 instance and record; a record written before 1.2.0 reports `J7-unrecorded` as `skip` and, for a decision-maker act, `unbound-decision` as `warn`, neither of which blocks. Re-signing and re-freezing with `--index` clears both.

---

## 15. Tooling

`qspec` ships in this repository as a Node package with no npm dependencies; its YAML reader is vendored in the bundle. Every command is a resolution procedure over files, an act recorded to a file, a file laid down for a person to fill, or a record of what a check saw. None writes a field of a spec other than `status`, and that only as the consequence of a recorded act; `new` sets `id` and `date`, which are the spec's name and its birthday, not its content.

Inside a project, every command that reads a spec records a run under `.qspec/runs/` with the files as they stood, passing or failing: `lint`, `index`, `sign`, `transition`, `sheet`, `dossier`, `request`, `render`, and `paper`. A rendering keeps the markdown it produced; aggregate `render` records one entry naming each output. A document checked from outside the project is kept under `external/`. The Decision Record is the audit trail for acts; a run is the audit trail for looking; a note attached to a run with `attach` is what a role concluded about it, copied whole and never summarised. None of the three is an act of discipline on the tool's side: the run is written because the check ran, and the note is written because somebody handed off.

```text
qspec init --into <dir>               a project: specs/ with the round's Index, AGENTS.md, a stamp
qspec new <Q-id> --domain <d>         an empty spec from the domain template, id and date set
qspec doctor                          is the project's guidance what init would write now; runs since the last act
qspec runs [--diff <a>,<b>] [--spec <id|path>]
                                      what each recorded run saw; scope colliding labels to one spec
qspec runs show <run> [--spec <id|path>]
                                      one run, its findings, and every note as written
qspec attach <run> <file> --by <actor> --role <role> [--kind handoff|review|decision|note]
                                      keep a handoff, review, or decision beside the run it is about
qspec report "<what happened>"        a friction note carrying version, scaffold state, and last run
qspec lint <spec>...                  M1 to M16, record checks, signature staleness
qspec fingerprint <spec>              what a signature is taken over
qspec sign <spec> --by <reviewer>     draft -> specified, with J1 to J7 and the fingerprint
                                      prints the seven rules; --show prints without signing;
                                      --run <name> cites the run whose text is signed
qspec transition <spec> --to <state> --by <actor> --role <role>
                                      a decision_maker act takes --index <round> or --unbound;
                                      --run <name> cites the run whose text is acted on
qspec sheet <spec> [--index <index>]  the Selection Sheet
qspec index <index> --specs <dir>     the Portfolio Index and its checks
qspec dossier <spec>                  the spec, Decision Record, run timeline, and attached notes
qspec request <spec>                  the frozen request for a downstream project
qspec render --out <dir>              every dossier, eligible sheet and request, and every Index
qspec paper <spec> <document.md>      does the document carry the frozen claim
```

The J invariants are deliberately not evaluated by the tool. A finding that could be wrong in a way the author cannot adjudicate is not a finding.
