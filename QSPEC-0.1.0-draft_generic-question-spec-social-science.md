# Generic Question Spec for Social Science Research

**Spec-ID:** QSPEC
**Schema-Version:** 0.1.0-draft
**Date:** 2026-09-02
**Status:** draft for review
**Audience:** people who may use or reject this contract; no prior project documents required  
**What this is:** a shared schema for writing down a research question so it can be compared, selected, frozen, or killed  
**What this is not:** a journal article template, grant form, pre-analysis plan, or methods textbook

---

## 1. Problem

Social-science projects are often selected from **topics** (“corruption and procurement,” “identity and voting,” “platforms and labor”) rather than from **questions**. Topics cannot be falsified, staffed, or compared. Different traditions then talk past each other: a causal design, an ethnography, and a theory paper do not share an interface, so selection becomes taste plus seniority.

The proposed object is a **Question Spec**: a short contract that states a claim, the kind of knowledge sought, the materials required, the increment over named work, and the condition under which the question is abandoned.

---

## 2. Purpose

A Question Spec exists to:

1. force a topic into a claim that can be wrong  
2. make questions from different methods comparable at a high level  
3. make missing identification, access, or increment visible before people are staffed  
4. produce a frozen input for whatever design or fieldwork stage comes next  
5. keep rejected questions rejected, with a reason  

A completed spec is ready to be **chosen**. It is not ready to be published.

---

## 3. Non-goals

This specification does not:

- rank the importance of questions  
- choose a journal or funder  
- prove that a design is valid  
- replace expertise in a field or method  
- put theory, ethnography, and causal inference on one numeric score  
- stand in for ethics review, a pre-analysis plan, a replication archive, or a paper outline  

Those are separate objects that may consume a frozen spec.

---

## 4. Design principles

1. **Claim before method.** If the central sentence cannot be false, the spec is invalid.  
2. **Generic base, typed rigor.** All questions share one base. Method-specific requirements live in a profile.  
3. **Invalid ≠ unfinished.** Missing kill condition or closest work means the spec stays in draft.  
4. **Setting is not increment.** “First study in country X / archive Y / platform Z” is not sufficient.  
5. **One primary method family.** Mixed projects name a primary claim. A second method may not silently rescue the first.  
6. **Short enough to select.** If a spec cannot be read in fifteen minutes, it has failed as a selection object.  
7. **Killing is success.** A rejected spec with a written reason is a finished hunting output.

---

## 5. Object model

Four documents, not one blob:

| Object | Role |
|---|---|
| **Question Spec** | the contract (base fields in §7) |
| **Method Profile** | extra required fields for one method family (§9) |
| **Question Brief** | optional one-page wrapper for a selection committee (§11) |
| **Decision Record** | status changes, dissent, and the reason for freeze or kill |

Cardinality:

- one question → one spec → exactly one profile  
- a brief is written only when someone other than the author must choose  
- many specs may sit in a portfolio with an index; ranking lives in the index, not in the spec body  

---

## 6. Life cycle

```text
draft        → fields exist; base or profile invariants fail
specified    → invariants pass; not yet offered for choice
selectable   → offered to a decision-maker
frozen       → chosen; later stages may begin
killed       → closed, with reason
```

Rules:

- Only `selectable` specs are put forward for choice.  
- Only `frozen` specs may enter design, estimation, or fieldwork as the official question.  
- After `frozen`, a change to the claim, method family, or kill condition requires a **new version** (and, if the claim changed, usually a new id).  
- `killed` requires a written reason. Reopening requires new materials, new variation, or a changed claim — not the same spec with softer language.

---

## 7. Base Question Spec (all families)

```yaml
id: Q-000
title: ""
status: draft
version: 1
date: YYYY-MM-DD
owner: ""
reviewers: []

claim:
  one_sentence: ""
  object: ""
  scope: ""
  why_it_matters: ""

question_type:
  method_family:
    # empirical_causal | empirical_descriptive | measurement
    # | interpretive | historical | ethnographic
    # | theoretical | formal_theory | mixed
  knowledge_goal:
    # effect | mechanism | description | measurement
    # | interpretation | explanation | prediction | normative_map
  secondary_method: null

increment:
  closest_work:
    - cite: ""
      settled: ""
      still_open: ""
  increment_if_this_works: ""
  setting_is_not_the_contribution: ""

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

ethics_and_constraints:
  human_subjects: yes | no | unclear
  sensitivity: ""
  independence_limits: ""

handoff:
  profile: ""
  notes_for_next_stage: ""
```

Field meaning:

| Field | Meaning |
|---|---|
| `one_sentence` | A statement that can turn out false. Not a theme. |
| `object` | People, institutions, quantities, or concepts the claim is about. |
| `scope` | Time, place, population, corpus, or theoretical domain. |
| `why_it_matters` | Why a reader who does not work on this setting should care. |
| `method_family` | How the claim is to be established. Exactly one primary. |
| `knowledge_goal` | What kind of knowledge the claim is for. Exactly one primary. |
| `closest_work` | At least two named works, with what they settled and what they left open. |
| `increment_if_this_works` | What becomes known that those works do not already establish. |
| `setting_is_not_the_contribution` | Why the case or dataset is a means, not the novelty. |
| `in_hand` | Materials already usable. |
| `blocking` | Materials without which this question cannot be done. |
| `obtainable` | Named source, time horizon, and a honest probability. |
| `support_would_look_like` | Evidence pattern that would support the claim. |
| `failure_would_look_like` | Evidence pattern that would refute or fail to support it. |
| `uninteresting_even_if_true` | Result that would make the project not worth selecting even if confirmed. |
| `kill_condition` | Operational trigger to stop, not to “add more controls / more cases.” |
| `independence_limits` | Partner veto, classification, political or legal risk to the claim. |

Optional (if used, treat as hints, not scores):

```yaml
dissent:
  - reviewer: ""
    point: ""
    unresolved: true | false

hints:
  ceiling: field | general_interest | unclear
  build_risk: low | medium | high
```

---

## 8. Base invariants

A spec may not leave `draft` unless all of these hold:

1. `one_sentence` is a claim, not a list of nouns.  
2. `method_family` is exactly one listed value.  
3. `knowledge_goal` is exactly one listed value.  
4. `closest_work` contains at least two named works.  
5. `increment_if_this_works` is not solely “new country, new dataset, or new interviews.”  
6. `setting_is_not_the_contribution` is non-empty.  
7. `kill_condition` is non-empty and checkable.  
8. Every blocking material is named, or the claim is rewritten so that material is not required.  
9. Support and failure conditions are both stated.  
10. If `method_family` is `mixed`, a secondary method is named and the primary claim remains singular.  
11. A method profile is attached, matches the family, and passes that profile’s invariants.

Specs that fail lint may be stored as drafts. They must not be ranked as if they were questions.

---

## 9. Method profiles

Profiles carry the standards of a tradition. They are not optional once a family is chosen.

### 9.1 Empirical causal  
For `empirical_causal` (including randomized experiments and natural experiments).

```yaml
profile: empirical_causal
treatment: ""
assignment_process: ""
comparison: ""
estimand: ""
identifying_assumption: ""
main_alternative_explanation: ""
primary_outcome: ""
mechanism_outcomes: []
precommitted_checks: []
design_risk: ""
```

Must state how treatment is assigned, who is compared to whom, the main rival explanation, and one primary outcome family. The kill condition must refer to a failed identifying or design check, not merely to an inconvenient estimate.

### 9.2 Empirical descriptive  
For `empirical_descriptive`.

```yaml
profile: empirical_descriptive
object_described: ""
unit_of_observation: ""
variation_shown: ""
why_not_trivial: ""
what_description_cannot_claim: ""
```

The claim sentence must not use causal verbs.

### 9.3 Measurement  
For `measurement`.

```yaml
profile: measurement
construct: ""
operationalization: ""
validation: ""
error_concerns: ""
why_the_measure_is_the_contribution: ""
```

### 9.4 Interpretive, ethnographic, or historical  
For `interpretive`, `ethnographic`, or `historical`.

```yaml
profile: interpretive
site_or_corpus: ""
access: ""
unit_of_observation: ""
contrast: ""
source_limits: ""
positionality: ""
overturning_observation: ""
```

`overturning_observation` must be a kind of evidence that would force revision, not “more time in the field.”

### 9.5 Theoretical or formal  
For `theoretical` or `formal_theory`.

```yaml
profile: theoretical
primitives: ""
proposition: ""
relation_to_named_model: ""
assumed_not_tested: ""
counterexample_that_kills: ""
empirics_role: none | illustration | test
```

### 9.6 Mixed  
For `mixed` only.

```yaml
profile: mixed
primary_claim_family: ""
secondary_role: ""
rescue_rule: ""
```

`rescue_rule` must state what the second method is not allowed to fix.

---

## 10. Worked sketches (illustrative only)

These show that the same base can hold different families. They are not recommended projects.

**Causal.** Claim: a legal value cutoff that reserves small contracts for small firms raises small-firm win rates without lowering prices paid. Family: empirical causal. Kill condition: the density of contract values shows manipulation at the cutoff and buyer characteristics also jump.

**Descriptive.** Claim: the share of single-bid public contracts in a country follows a documented set of procedures and market structures rather than a single “corruption” interpretation. Family: empirical descriptive. Kill condition: the objects called “single-bid” are not comparable across procedures.

**Interpretive.** Claim: procurement officers treat scoring weights as a professional craft for managing quality risk, not only as a rent technology. Family: ethnographic. Kill condition: access never includes the meetings where weights are set.

**Theory.** Claim: when quality can be misreported by the auctioneer, the buyer may optimally overweight quality relative to the standard scoring-auction benchmark. Family: formal theory. Kill condition: the proposition is nested in an already named model under weaker assumptions.

---

## 11. Question Brief

Used when a committee or other decision-maker must choose among specs. Maximum one page.

Contents:

- id and title  
- claim sentence  
- method family and knowledge goal  
- increment in one line  
- kill condition  
- materials in hand vs blocking  
- resources asked (time, people, access)  
- recommended action: freeze / backup / not now / kill  
- unresolved dissent, if any  

The spec and profile sit behind the brief as the audit trail. Decision-makers who need detail open them; the others should be able to act from the brief.

---

## 12. Portfolios

When several specs are offered together:

- every file uses the same heading order  
- identifiers stay stable; ranking is a separate index  
- the index lists id, a ≤20-word claim, family, whether anything is blocking, and a recommended action  
- a selection round freezes at most one spec unless an explicit exception is written down  

The output of reading a portfolio is a decision, not a longer list.

---

## 13. Downstream use (informative)

After a spec is `frozen`, later work typically produces other documents: a detailed design or fieldwork protocol, ethics materials, analysis code, and a paper. This specification does not define those documents. It only requires that they point back to a frozen spec and that a change of question be recorded as a new spec version.

---

## 14. Definition of done for question development

Question development using this spec is finished when:

1. every candidate is `specified`, `selectable`, `frozen`, or `killed` with a reason  
2. every non-killed spec passes base and profile invariants  
3. if there are multiple specs, an index exists  
4. a decision-maker can freeze one spec from a brief without reconstructing the claim orally  
5. the frozen spec names the first check that the next stage must run (the kill condition or the main access test)

---

## 15. Items for reviewers

Please comment on:

1. Whether the **base fields work** for theory, history, and ethnography, not only for empirical microeconomics.  
2. Whether any base field **smuggles a causal-inference assumption**.  
3. Whether the **profile list is the right grain** (too many families, too few, wrong names).  
4. Whether `knowledge_goal` earns its keep next to `method_family`, or should be dropped.  
5. Whether `mixed` should be a family or only a flag on a primary family.  
6. Whether `normative_map` belongs, or normative work should be out of scope.  
7. Whether optional `hints` (ceiling, build risk) help committees or create fake precision.  
8. Whether the life cycle is too rigid for early exploratory work.  
9. Whether the one-page brief is the right committee interface.  
10. What is missing that would make you refuse to use this as a selection contract.

A later draft can add an empty template and two complete examples — one causal, one non-causal — once this structure is accepted or revised.