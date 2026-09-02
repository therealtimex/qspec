# QSPEC-NS 0.1.0-draft  
# Generic Question Spec for the Natural Sciences

**Spec-ID:** QSPEC-NS  
**Schema-Version:** 0.1.0-draft  
**Date:** 2026-09-02  
**Status:** draft for review  
**Compatible instance format:** QSPEC-NS/0.1  
**Relation to QSPEC (social sciences):** same base idea and life cycle; different families, profiles, and vocabulary. Do not fill social-science profiles with laboratory work.

**What this is:** a short contract for writing down a research question so it can be compared, selected, frozen, or killed.  
**What this is not:** a grant form, ethics protocol, lab notebook, preregistration, statistical analysis plan, or paper template.

---

## 1. Problem

Natural-science projects are often selected from **topics** (“quantum materials,” “microbiome and disease,” “climate extremes”) or from **techniques** (“we have a new microscope / mouse line / survey”). Topics and techniques cannot be falsified as written. Selection then tracks fashion, available equipment, or seniority rather than a claim that could fail.

The proposed object is a **Question Spec**: a claim that can be wrong, a named mode of inquiry, the system and measurements required, the increment over named work, and the condition under which the question is abandoned.

---

## 2. Purpose

A Question Spec exists to:

1. turn a topic or technique into a claim that can fail  
2. make questions from different subfields comparable at a high level  
3. expose missing system access, measurement validity, or increment before people and instruments are committed  
4. give a frozen input to protocol design, calculation, or fieldwork  
5. keep rejected questions rejected, with a reason  

A completed spec is ready to be **chosen**. It is not ready to be published.

---

## 3. Scope

Written for the **natural sciences** broadly: physics, chemistry, earth and planetary science, astronomy, biology at molecule-to-organism scales, ecology, and adjacent experimental or observational work.

**In scope as primary families:** experiment, observation, measurement/metrology, calculation/simulation, theory, and structured combinations.

**Out of scope as this schema’s job:** clinical trial regulation (use this spec *upstream* of a protocol, not instead of ICH/GCP forms), pure engineering product specs, and social-science causal designs. Those need their own profiles.

The **base object** (claim, family, materials, increment, kill condition, life cycle) is meant to stay aligned with QSPEC for the social sciences. Profiles are not interchangeable across those two documents.

---

## 4. Non-goals

This specification does not:

- score “impact” or pick a journal  
- prove that a design is valid  
- replace expertise, a group meeting, or a skeptical colleague  
- put a theorem, a field campaign, and a wet-lab screen on one numeric scale  
- stand in for IACUC/IRB, biosafety, radiation safety, fieldwork permits, preregistration, or a data-management plan  

Those are downstream objects that may point back to a frozen spec.

---

## 5. Design principles

1. **Claim before apparatus.** If the sentence cannot be false, the spec is invalid.  
2. **System before story.** Name the physical, chemical, or biological system. “The literature” is not a system.  
3. **Generic base, typed rigor.** Shared fields for all families; method-specific requirements in a profile.  
4. **Invalid ≠ unfinished.** Missing kill condition or closest work means `draft`.  
5. **System or method is not increment.** A new organism, material, instrument, or code base is not sufficient by itself.  
6. **One primary family.** Combined work names a primary claim. Simulation may not silently rescue a failed measurement, or the reverse.  
7. **Short enough to select.** If a spec cannot be read in fifteen minutes, it has failed as a selection object.  
8. **Killing is success.** A rejected spec with a reason is a finished output of question development.

---

## 6. Object model

| Object | Role |
|---|---|
| **Question Spec** | base contract (§8) |
| **Method Profile** | extra required fields for one family (§10) |
| **Question Brief** | optional one-page wrapper for a selection meeting (§12) |
| **Decision Record** | status changes, dissent, freeze or kill reason |

Cardinality:

- one question → one spec → exactly one profile  
- a brief only when someone other than the author must choose  
- many specs may sit in a portfolio; ranking lives in an index, not in the spec body  

---

## 7. Life cycle

```text
draft        → fields exist; invariants fail
specified    → invariants pass; not yet offered for choice
selectable   → offered to a decision-maker
frozen       → chosen; protocol, calculation, or fieldwork may begin
killed       → closed, with reason
```

Rules:

- Only `selectable` specs are put forward for choice.  
- Only `frozen` specs are the official question for the next stage.  
- After `frozen`, changing `claim.one_sentence`, `method_family`, the target system, or `kill_condition` requires a **new `instance_version` and usually a new `id`**. Typos and extra citations may bump `instance_version` only.  
- `killed` requires a written reason. Reopening requires new materials, a new system, or a changed claim.

**Versioning of instances:**

```yaml
spec_schema: QSPEC-NS/0.1
id: Q-014                 # stable; do not renumber after ranking
instance_version: 2
```

```yaml
changelog:
  - version: 2
    date: YYYY-MM-DD
    change: "kill_condition now includes failed negative control"
```

---

## 8. Base Question Spec (all families)

```yaml
spec_schema: QSPEC-NS/0.1
id: Q-000
title: ""
status: draft
instance_version: 1
date: YYYY-MM-DD
owner: ""
reviewers: []

claim:
  one_sentence: ""
  system: ""
  object: ""
  scope: ""
  why_it_matters: ""

question_type:
  method_family:
    # experimental
    # observational
    # measurement
    # computational
    # theoretical
    # mixed
  knowledge_goal:
    # mechanism
    # effect
    # existence
    # structure
    # measurement
    # prediction
    # explanation
  secondary_method: null

increment:
  closest_work:
    - cite: ""
      settled: ""
      still_open: ""
  increment_if_this_works: ""
  system_or_method_is_not_the_contribution: ""

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
  safety_or_ethics: none | animals | humans | dual_use | fieldwork | other
  sensitivity: ""
  independence_limits: ""

handoff:
  profile: ""
  notes_for_next_stage: ""
```

### Field meaning

| Field | Meaning |
|---|---|
| `one_sentence` | A statement that can turn out false. Not a theme or an instrument name. |
| `system` | The physical, chemical, biological, or planetary system in which the claim is tested or derived. |
| `object` | Quantity, structure, process, or entity the claim is about. |
| `scope` | Regime: energy, length/time scale, taxon, environment, approximation. |
| `why_it_matters` | Why a reader who does not work on this system should care. |
| `method_family` | How the claim is to be established. Exactly one primary. |
| `knowledge_goal` | What kind of knowledge the claim is for. Exactly one primary. |
| `closest_work` | At least two named works, with what they settled and left open. |
| `increment_if_this_works` | What becomes known that those works do not already establish. |
| `system_or_method_is_not_the_contribution` | Why the organism, material, instrument, code, or field site is a means. |
| `in_hand` | Reagents, instruments, codes, samples, telescope time, or proofs already usable. |
| `blocking` | Without these the question cannot be done. |
| `obtainable` | Named source, horizon, honest probability (beamtime, strain, archive, compute). |
| `support_would_look_like` | Pattern of results that would support the claim. |
| `failure_would_look_like` | Pattern that would refute it or fail to support it. |
| `uninteresting_even_if_true` | Result that would make the project not worth selecting even if confirmed. |
| `kill_condition` | Operational stop rule: failed control, inaccessible system, nested prior result, unworkable measurement. |
| `independence_limits` | Facility queue, company material, classified data, collaborator veto. |

Optional hints (not scores):

```yaml
dissent:
  - reviewer: ""
    point: ""
    unresolved: true | false

hints:
  ceiling: specialist | broad | unclear
  build_risk: low | medium | high
```

---

## 9. Base invariants

A spec may not leave `draft` unless all hold:

1. `one_sentence` is a claim, not a noun pile or a technique.  
2. `system` is a concrete system or a named theoretical setting, not “the field.”  
3. `method_family` is exactly one listed value.  
4. `knowledge_goal` is exactly one listed value.  
5. `closest_work` has at least two named works.  
6. `increment_if_this_works` is not solely “new organism / new material / new instrument / new simulation.”  
7. `system_or_method_is_not_the_contribution` is non-empty.  
8. `kill_condition` is non-empty and checkable.  
9. Every blocking material is named, or the claim is rewritten so it is not required.  
10. Support and failure conditions are both stated.  
11. If `method_family` is `mixed`, `secondary_method` is set and the primary claim stays singular.  
12. The attached profile matches the family and passes that profile’s invariants.

---

## 10. Method profiles

One profile per spec.

### 10.1 Experimental  
`method_family: experimental`

```yaml
profile: experimental
intervention: ""
control_or_baseline: ""
independent_variables: []
dependent_quantities: []
measurement_chain: ""
positive_or_negative_controls: ""
replication_unit: ""
main_artifact_or_confound: ""
precommitted_checks: []
```

**Invariants:** intervention and baseline named; measurement chain named (what is actually recorded); at least one control or why a control is impossible; kill condition refers to a failed control, unusable measurement, or inaccessible system — not only to a null that might still be informative.

### 10.2 Observational  
`method_family: observational`  
(field campaigns, surveys, telescopes, long-term records, natural samples)

```yaml
profile: observational
observing_system: ""
target_process: ""
comparison_or_contrast: ""
sampling_design: ""
coverage_and_bias: ""
quantity_inferred: ""
main_confound_or_aliasing: ""
```

**Invariants:** sampling or pointing design stated; a confound or alias that could mimic the claim is named; kill condition refers to inadequate coverage, irrecoverable bias, or a calibration failure.

### 10.3 Measurement / metrology  
`method_family: measurement`

```yaml
profile: measurement
measurand: ""
operational_definition: ""
calibration_or_standard: ""
uncertainty_budget_sketch: ""
validation: ""
why_the_measure_is_the_contribution: ""
```

**Invariants:** measurand distinct from the raw signal; uncertainty or validation path named.

### 10.4 Computational  
`method_family: computational`  
(numerical experiment, simulation, inference on existing measurements)

```yaml
profile: computational
model_or_code: ""
governing_equations_or_algorithm: ""
input_data_or_parameters: ""
resolution_or_convergence: ""
verification_and_validation: ""
baseline_model: ""
what_computation_cannot_claim: ""
```

**Invariants:** verification/validation path named; a baseline or nested model named; `what_computation_cannot_claim` forbids treating a fit as a unique mechanism without extra structure.

### 10.5 Theoretical  
`method_family: theoretical`

```yaml
profile: theoretical
primitives_or_postulates: ""
proposition: ""
regime_of_validity: ""
relation_to_named_theory: ""
assumed_not_tested: ""
counterexample_or_reduction_that_kills: ""
empirics_role: none | illustration | later_test
```

**Invariants:** proposition stated; relation to a named theory stated; kill condition is a counterexample, a reduction to a known result, or a broken regime — not “the experiment disagreed” unless `empirics_role` is `later_test` and that test is specified.

### 10.6 Mixed  
`method_family: mixed`

```yaml
profile: mixed
primary_claim_family: ""
secondary_role: ""
rescue_rule: ""
```

**Invariant:** `rescue_rule` states what the second method is not allowed to fix (e.g. “a simulation cannot replace a failed control”; “an experiment cannot replace a missing existence proof”).

---

## 11. Worked sketches (illustrative only)

**Experimental.** Claim: in this cuprate family, raising apical oxygen height by a stated amount suppresses the superconducting dome maximum by a stated qualitative pattern, holding doping fixed. Kill condition: doping cannot be held fixed within the stated window, or the structural proxy does not track apical height.

**Observational.** Claim: extreme rainfall events in this basin have increased in frequency after accounting for a named set of covariates and a documented change in gauge coverage. Kill condition: the coverage change cannot be separated from the trend under the stated sampling design.

**Measurement.** Claim: this assay reports unbound protein X in plasma with a stated uncertainty and does not conflate it with fragment Y. Kill condition: the calibration standard does not separate X from Y.

**Computational.** Claim: in this turbulence regime, scheme A converges to the same dissipation rate as a named reference at a stated resolution, while scheme B does not. Kill condition: results change qualitatively under grid refinement or under a documented code verification failure.

**Theoretical.** Claim: within this mean-field regime, the named instability exists only above a threshold coupling that is absent from the standard textbook limit. Kill condition: the threshold is an artifact of an approximation already removed in a named paper.

---

## 12. Question Brief (selection interface)

Maximum one page. Use when a group, panel, or PI must choose among specs.

```text
ID / title
Claim sentence
System
Family + knowledge goal
Increment in one line
Kill condition
Materials: in hand / blocking
Constraints (safety, access)
Ask (time, people, instrument or compute)
Recommended action: freeze | backup | not now | kill
Dissent (if any)
```

The spec and profile sit behind the brief. Decision-makers who need detail open them.

---

## 13. Portfolios

When several specs are offered together:

- every file uses the same heading order  
- identifiers stay stable; ranking is a separate index  
- the index lists id, a ≤20-word claim, family, blocking flag, recommended action  
- a selection round freezes at most one spec unless an explicit exception is written  

The output of reading a portfolio is a decision, not a longer list.

---

## 14. Downstream use (informative)

After `frozen`, typical next objects are: experimental protocol, observing proposal, analysis plan, theory note, safety filings, preregistration. This schema does not define those documents. They should cite `id` + `instance_version`. A change of question is a new spec version, not a silent amendment in a methods section.

---

## 15. Definition of done for question development

Finished when:

1. every candidate is `specified`, `selectable`, `frozen`, or `killed` with a reason  
2. every non-killed spec passes base and profile invariants  
3. if there are multiple specs, an index exists  
4. a decision-maker can freeze one spec from a brief without reconstructing the claim orally  
5. the frozen spec names the first check the next stage must run (control, calibration, convergence, access, or counterexample)

---

## 16. Differences from QSPEC (social sciences), for implementers

Kept: life cycle, brief + spec + profile, increment over named work, kill condition, ban on “setting as novelty.”

Changed:

- `system` is first-class  
- families are experimental / observational / measurement / computational / theoretical  
- knowledge goals include existence and structure  
- profiles talk about controls, calibration, sampling, verification — not assignment of social treatments  
- constraints include animals, dual use, and facility access, not only human-subjects review  

Do not mix profile catalogs in one file.

---

## 17. Items for reviewers

1. Are the six families the right grain for natural sciences, or should ecology, astronomy, and bench biology be split further?  
2. Is `system` distinct enough from `object` and `scope`?  
3. Does any base field smuggle experimental language into theory?  
4. Should `computational` be split into “numerical experiment” vs “inference on data”?  
5. Is `existence` a knowledge goal worth keeping (particles, phases, species, solutions)?  
6. Are optional `hints` useful or fake precision?  
7. Is the freeze rule too rigid for exploratory method development?  
8. What would make you refuse this as a lab or department selection contract?

---

## 18. Suggested filenames

- Schema document: `QSPEC-NS-0.1.0-draft.md`  
- Instance: `Q-014_apical-oxygen-dome.md` with `spec_schema: QSPEC-NS/0.1` in the header  

A later draft can add an empty template and two complete examples (one experimental, one theoretical) once this structure is accepted or revised.