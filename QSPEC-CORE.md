# QSPEC-CORE 1.1.0
# Question Spec: shared core for all research domains

**Spec-ID:** QSPEC-CORE
**Schema-Version:** 1.1.0
**Date:** 2026-09-02
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
| `owner` | author of the spec, named in `owner` | edit, offer, withdraw, kill own spec, create successor |
| `reviewer` | anyone named in `reviewers`; never the owner | sign judged invariants, demote to draft, record dissent |
| `decision_maker` | the person or body running a selection round | freeze, defer, kill |

A spec needs at least one reviewer who is not the owner before it can leave `draft`.

### 6.3 Transitions

Every transition is an act appended to the Decision Record by `qspec sign` or `qspec transition`, which refuse anything not in this table.

| From | To | Actor | Requirement |
|---|---|---|---|
| draft | specified | reviewer | all M-invariants pass; the entry lists J1 to J7 in `signed_invariants` and carries `spec_fingerprint` |
| specified | selectable | owner | a selection round or decision-maker is named |
| selectable | frozen | decision_maker | `handoff.first_check` is non-empty; at most one freeze per round unless an exception is written in the Index |
| selectable | deferred | decision_maker | `revisit_by` date recorded |
| deferred | selectable | owner | revisit date reached or a new round opened |
| specified, selectable, deferred | draft | reviewer | the failing invariant is cited by number in `cited_invariant` |
| frozen | superseded | owner | `successor` records the new `id@instance_version` |
| any except superseded | killed | owner or decision_maker | written `reason` |

Rules:

- Only `selectable` specs are put forward for choice. Only `frozen` specs are the official question for the next stage.
- A change to any fingerprinted section (section 9.2) after signing makes the signature stale. The spec cannot be offered or frozen again until a reviewer re-signs. After `frozen`, such a change also requires a new `instance_version`; if the claim itself changed, a new `id`, and the old spec becomes `superseded`. Typos and added citations bump `instance_version` alone.
- `killed` is terminal for that instance. Reopening means a new `instance_version` or new `id` with new materials, new variation, or a changed claim, never the same spec with softer language.
- Exploratory method development is not exempt. It is written as a spec whose knowledge goal is `measurement` or `feasibility` and whose kill condition is about the method itself.

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
| `one_sentence` | A statement that can turn out false. Not a theme, a technique, a platform, or a list of nouns. It must not contain a double quote or a brace, because a downstream document carries it verbatim as a gist. |
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

| Severity | Means | Stops the spec leaving draft |
|---|---|---|
| `block` | a listed invariant demonstrably fails, or a signature no longer covers the text | yes |
| `manual` | the check ran and the verdict is a person's; the finding names the act that settles it | yes, until the act is done |
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
| M16 | If `status` is not `draft`, the Decision Record has a `draft -> specified` entry whose `signed_invariants` cover J1 to J7 and whose `spec_fingerprint` equals the fingerprint of the current text; the record's transitions are all listed ones, in sequence, by permitted actors; and the record's final state equals `status`. |

M16 reports as `manual` when there is no signature yet (the act is `qspec sign`) and as `block` when a signature exists and is stale or incomplete.

### 8.3 Judged (J)

| # | Rule |
|---|---|
| J1 | `one_sentence` is a claim that could be false, not a topic, technique, platform, or noun pile. |
| J2 | `increment_if_this_works` is not solely a new setting, dataset, organism, instrument, prototype, or simulator. |
| J3 | `kill_condition` is checkable by the next stage and is not "collect more." |
| J4 | Every `blocking` item is a real precondition, or the claim has been rewritten so it is not required. |
| J5 | `failure_would_look_like` describes a result, and `kill_condition` describes a stop rule; they are not the same sentence. |
| J6 | If `secondary_method` is set, the primary claim is still singular and the rescue rule is specific. |
| J7 | The profile's judged rules in the overlay hold. |

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
    signed_invariants: [J1, J2, J3, J4, J5, J6, J7]   # draft -> specified only
    spec_fingerprint: "sha256:..."                     # draft -> specified only
    cited_invariant: null                              # required for demotion to draft
    revisit_by: null                                   # required for deferred
    successor: null                                    # required for superseded
    dissent:
      - reviewer: ""
        point: ""
        unresolved: true
```

### 9.2 The fingerprint

`spec_fingerprint` is SHA-256 over the canonical JSON of these sections, with keys sorted and every string whitespace-collapsed:

`claim`, `question_type`, `increment`, `materials`, `success_and_failure`, `constraints`, `profile`

Not covered: identity and bookkeeping (`id`, `title`, `status`, `instance_version`, `date`, `owner`, `reviewers`, `changelog`), `hints` (never scored), `ask` (a cost, not the question), and `handoff` (`first_check` is filled between signing and freeze by design).

Rewrapping lines or fixing spacing does not move the fingerprint. Changing a word in the claim, the kill condition, a profile field, or a blocking item does. `qspec fingerprint <spec>` prints it.

### 9.3 Rules

- Entries are never edited or deleted. A correction is a new entry.
- `qspec sign` refuses while any M invariant fails. It appends the signing entry with the fingerprint, and sets `status: specified`. On a `specified`, `selectable`, or `deferred` spec whose text has changed, it first appends a demotion to `draft` citing M16, then signs. On a `frozen` spec it refuses: a changed frozen spec needs a new `instance_version` or a successor.
- `qspec transition` refuses any transition not in section 6.3, any actor not permitted for the role, and a freeze without `first_check`.
- A demotion to `draft` must cite the failing invariant by number.
- Unresolved dissent is carried onto the Selection Sheet verbatim.

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

Checks: every action is listed, ranks are unique integers, every claim is 1 to 20 words, every id resolves to a spec in the given directory whose status is `selectable`, `deferred`, or `frozen` at the stated `instance_version`, and more than one frozen id needs a written exception. `rank` is never derived from `hints`. The output of reading an Index is a decision, not a longer list.

---

## 12. Downstream use

After `frozen`, later work produces other documents: design or protocol, ethics and safety filings, analysis plan, code, paper. This specification does not define them. It defines three points of contact.

1. **The request.** `qspec request <spec>` renders the frozen spec as a markdown document and refuses for any other state. A downstream project points its request key at that file, so what was asked travels with what was produced.
2. **The pointer.** The downstream document's head carries a metadata row `**Question:** Q-000@1`, citing `id` and `instance_version`. A changed question is a new spec version or a new spec, never a silent edit in a methods section.
3. **The claim.** The document's load-bearing paragraph carries the frozen `one_sentence` verbatim as the gist of a labelled claim, `{#claim-q-000 gist="..."}`. `qspec paper <spec> <document.md>` reports `manual` when the label is absent and `block` when the gist differs. Whether the paragraph supports the claim is a reviewer's question and is never asked by the tool.

---

## 13. Definition of done for question development

Question development is finished when:

1. every candidate is `specified`, `selectable`, `deferred`, `frozen`, or `killed` with a reason
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

---

## 15. Tooling

`qspec` ships in this repository as a Node package with one dependency. Every command is a resolution procedure over files or an act recorded to a file. None writes a field of a spec other than `status`, and that only as the consequence of a recorded act.

```text
qspec lint <spec>...                  M1 to M16, record checks, signature staleness
qspec fingerprint <spec>              what a signature is taken over
qspec sign <spec> --by <reviewer>     draft -> specified, with J1 to J7 and the fingerprint
qspec transition <spec> --to <state> --by <actor> --role <role>
qspec sheet <spec> [--index <index>]  the Selection Sheet
qspec index <index> --specs <dir>     the Portfolio Index and its checks
qspec request <spec>                  the frozen request for a downstream project
qspec paper <spec> <document.md>      does the document carry the frozen claim
```

The J invariants are deliberately not evaluated by the tool. A finding that could be wrong in a way the author cannot adjudicate is not a finding.
