# QSPEC-ENG 0.1.0-draft  
# Generic Question Spec for Engineering

**Spec-ID:** QSPEC-ENG  
**Schema-Version:** 0.1.0-draft  
**Date:** 2026-09-02  
**Status:** draft for review  
**Compatible instance format:** QSPEC-ENG/0.1  
**Related schemas:** QSPEC (social sciences), QSPEC-NS (natural sciences). Same life cycle and base idea; different families and profiles. Do not paste laboratory or econometric profiles into an engineering spec.

**What this is:** a short contract for writing down an engineering research question so it can be compared, selected, frozen, or killed.  
**What this is not:** a product requirements document, design review packet, safety case, grant form, or paper template.

---

## 1. Problem

Engineering research is often selected from a **technology** (“digital twin,” “solid-state battery,” “foundation model for CAD”) or from a **capability** (“we have a testbed / foundry / fleet”). Those are not questions. They cannot fail as written. Selection then tracks tools, sponsors, and fashion rather than a claim about a system under constraints.

The proposed object is a **Question Spec**: a claim that can be wrong, a named mode of inquiry, the system and operating regime, the increment over named work, and the condition under which the question is abandoned.

---

## 2. Purpose

1. Turn a technology or testbed into a claim that can fail.  
2. Make questions from different engineering fields comparable at a high level.  
3. Expose missing access, baselines, metrics, or safety constraints before people and hardware are committed.  
4. Give a frozen input to protocol, prototype, or analysis work.  
5. Keep rejected questions rejected, with a reason.

A completed spec is ready to be **chosen**. It is not a finished design.

---

## 3. Scope

Written for **engineering research**: mechanical, civil, electrical, chemical, materials, biomedical devices, aerospace, environmental, industrial, computer systems and software engineering *as engineered artifacts*, and similar fields.

Typical claims concern performance, reliability, safety, cost, constructability, controllability, or a tradeoff among those, in a stated operating regime.

**Out of scope as this schema’s job:**

- shipping a product (use a PRD / design-control file)  
- regulated clinical evaluation (upstream of a protocol only)  
- pure natural-science mechanism with no engineered artifact  
- social-science evaluation of users or markets as the primary claim (use QSPEC, or `mixed` with an explicit rescue rule)

---

## 4. Non-goals

This specification does not score impact, pick venues, replace a design review, prove a result, or stand in for ethics, export control, IRB/IACUC, or a certification dossier.

---

## 5. Design principles

1. **Claim before platform.** An instrument, code base, or testbed is not a question.  
2. **Regime before adjective.** “Better,” “robust,” and “scalable” are invalid until the operating envelope and metric are named.  
3. **Baseline is mandatory** for comparative claims.  
4. **Generic base, typed rigor.** Shared fields for all families; extra required fields in a profile.  
5. **Invalid ≠ unfinished.** Missing kill condition or closest work means `draft`.  
6. **Artifact is not increment.** A new prototype, dataset, or simulator is not sufficient by itself.  
7. **One primary family.** A second method may not silently rescue the first.  
8. **Killing is success.**

---

## 6. Object model

| Object | Role |
|---|---|
| **Question Spec** | base contract (§8) |
| **Method Profile** | extra fields for one family (§10) |
| **Question Brief** | one-page wrapper for a selection meeting (§12) |
| **Decision Record** | status change, dissent, freeze or kill reason |

One question → one spec → exactly one profile.

---

## 7. Life cycle

```text
draft        → fields exist; invariants fail
specified    → invariants pass; not yet offered for choice
selectable   → offered to a decision-maker
frozen       → chosen; design/build/test may begin against this claim
killed       → closed, with reason
```

After `frozen`, changing the claim, family, system, metric family, or kill condition requires a new `instance_version` and usually a new `id`.

```yaml
spec_schema: QSPEC-ENG/0.1
id: Q-014
instance_version: 2
changelog:
  - version: 2
    date: YYYY-MM-DD
    change: "kill_condition now includes failed baseline under same workload"
```

---

## 8. Base Question Spec (all families)

```yaml
spec_schema: QSPEC-ENG/0.1
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
  artifact_or_process: ""
  operating_regime: ""
  why_it_matters: ""

question_type:
  method_family:
    # experimental
    # observational_or_field
    # computational
    # design_and_analysis
    # measurement
    # theoretical
    # mixed
  knowledge_goal:
    # performance
    # tradeoff
    # reliability_or_safety
    # mechanism_of_failure
    # feasibility
    # prediction
    # measurement
  secondary_method: null

increment:
  closest_work:
    - cite: ""
      settled: ""
      still_open: ""
  increment_if_this_works: ""
  artifact_is_not_the_contribution: ""

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
  safety_or_ethics: none | human_users | animals | hazardous | dual_use | field | other
  standards_or_codes: ""
  independence_limits: ""

handoff:
  profile: ""
  notes_for_next_stage: ""
```

### Field meaning

| Field | Meaning |
|---|---|
| `one_sentence` | A statement that can be false. Must name a system, a regime, and a metric or tradeoff when the claim is empirical. |
| `system` | The engineered or socio-technical system the claim is about (bridge class, converter topology, compiler, plant, network). |
| `artifact_or_process` | Device, algorithm, material, procedure, or process under study. |
| `operating_regime` | Load, environment, scale, duty cycle, input distribution, manufacturing tolerance. |
| `why_it_matters` | Stake if this testbed disappeared: a general engineering problem, not “we built it.” |
| `closest_work` | At least two named designs, papers, or standards. |
| `artifact_is_not_the_contribution` | Why the prototype/code/dataset is a means. |
| `kill_condition` | Stop rule: baseline missing, metric not measurable, regime unreachable, safety gate failed, result nested in a standard. |
| `independence_limits` | Sponsor veto, proprietary stack, certification body, classified facility. |

Optional hints (not scores): `ceiling` (component / system / unclear), `build_risk` (low / medium / high), `dissent`.

---

## 9. Base invariants

A spec may not leave `draft` unless:

1. `one_sentence` is a claim, not a technology name.  
2. `system` and `operating_regime` are both non-empty.  
3. `method_family` and `knowledge_goal` are each exactly one listed value.  
4. `closest_work` has at least two named items.  
5. Increment is not solely “new prototype / new dataset / new simulator.”  
6. `artifact_is_not_the_contribution` is non-empty.  
7. `kill_condition` is checkable.  
8. Blocking materials are named, or the claim is rewritten.  
9. Support and failure conditions are both stated.  
10. Comparative claims name a baseline in the profile.  
11. Attached profile matches the family and passes profile invariants.  
12. If `mixed`, `secondary_method` is set and `rescue_rule` is explicit.

---

## 10. Method profiles

### 10.1 Experimental  
`method_family: experimental`  
(bench, hardware-in-the-loop, controlled prototype test)

```yaml
profile: experimental
intervention_or_design_under_test: ""
baseline: ""
workload_or_excitation: ""
metrics: []
measurement_chain: ""
controls_and_repeats: ""
main_artifact_or_confound: ""
precommitted_checks: []
```

**Invariants:** baseline and metrics named; workload specified; kill condition refers to an unusable measurement, unreachable regime, or failed control — not only to “no improvement.”

### 10.2 Observational or field  
`method_family: observational_or_field`  
(deployed systems, plants, networks, infrastructure in service)

```yaml
profile: observational_or_field
deployed_context: ""
quantity_inferred: ""
sampling_or_logging_design: ""
coverage_and_bias: ""
main_confound: ""
what_field_data_cannot_claim: ""
```

**Invariant:** a confound that can mimic the claim is named (operator behavior, mix shift, instrumentation change).

### 10.3 Computational  
`method_family: computational`  
(FEM, CFD, circuit sim, network sim, learned surrogate)

```yaml
profile: computational
model_or_code: ""
governing_model: ""
inputs_and_boundary_conditions: ""
verification: ""
validation_against: ""
baseline_model: ""
what_computation_cannot_claim: ""
```

**Invariants:** verification path named; validation target named or explicitly `none` with a narrowed claim; computation may not claim physical mechanism without validation.

### 10.4 Design and analysis  
`method_family: design_and_analysis`  
(new architecture, synthesis procedure, control law, algorithm-as-design)

```yaml
profile: design_and_analysis
design_object: ""
requirements_or_constraints: ""
decision_variables: ""
analysis_method: ""
comparator_designs: []
acceptance_criterion: ""
```

**Invariants:** constraints and acceptance criterion named; at least one comparator unless the claim is pure feasibility (`knowledge_goal: feasibility`), in which case the feasibility bar is numeric or pass/fail, not “novel.”

### 10.5 Measurement  
`method_family: measurement`

```yaml
profile: measurement
measurand: ""
operational_definition: ""
calibration_or_reference: ""
uncertainty_sketch: ""
why_the_measure_is_the_contribution: ""
```

### 10.6 Theoretical  
`method_family: theoretical`  
(limits, stability, complexity, continuum model of a device class)

```yaml
profile: theoretical
primitives: ""
proposition: ""
regime_of_validity: ""
relation_to_named_result: ""
counterexample_or_reduction_that_kills: ""
empirics_role: none | illustration | later_test
```

### 10.7 Mixed

```yaml
profile: mixed
primary_claim_family: ""
secondary_role: ""
rescue_rule: ""
```

Example rescue rule: “A simulation cannot replace a missing hardware baseline under the same workload.”

---

## 11. Worked sketches (illustrative only)

**Experimental.** Claim: under a named drive cycle and ambient window, converter topology A meets efficiency ≥ X% at rated power with lower switch stress than topology B, holding magnetics volume fixed. Kill condition: volume cannot be held fixed, or loss measurement uncertainty spans the claimed gap.

**Field.** Claim: after deployment of this leak-detection rule on a stated pipe class, undetected leak-hours fall relative to the prior rule after accounting for a documented change in patrol frequency. Kill condition: patrol frequency and the detector were changed together.

**Computational.** Claim: in this Reynolds-number band, scheme A’s drag coefficient converges to a named experiment within a stated band under grid refinement; scheme B does not. Kill condition: qualitative ranking reverses under refinement or a failed manufactured-solution test.

**Design.** Claim: this scheduling policy meets latency tail ≤ X at load Y on the named workload suite with no more than Z% extra energy versus the standard baseline. Kill condition: the suite is not representative of the stated regime, or the baseline cannot be run on the same stack.

**Theory.** Claim: for this class of underactuated vehicles, no continuous time-invariant feedback stabilizes the origin; the obstruction is the same as a named theorem and is not removed by the usual small-angle reduction. Kill condition: the obstruction is an artifact of a dropped degree of freedom.

---

## 12. Question Brief (selection interface)

One page:

```text
ID / title
Claim sentence
System + operating regime
Family + knowledge goal
Increment in one line
Kill condition
Materials: in hand / blocking
Constraints (safety, standards, access)
Ask (time, people, hardware, compute)
Recommended action: freeze | backup | not now | kill
Dissent (if any)
```

---

## 13. Portfolios

Same heading order; stable ids; ranking in an index; freeze at most one spec per round unless an exception is written. Output is a decision, not a longer list.

---

## 14. Downstream use

After `frozen`, typical next objects: test protocol, design document, simulation plan, hazard analysis, observing/facility proposal. They cite `id` + `instance_version`. A changed question is a new spec, not a silent edit in a methods section.

---

## 15. Definition of done

1. Every candidate is `specified`, `selectable`, `frozen`, or `killed` with a reason.  
2. Non-killed specs pass base and profile invariants.  
3. An index exists if there are multiple specs.  
4. A decision-maker can freeze one spec from a brief without reconstructing the claim orally.  
5. The frozen spec names the first check of the next stage (baseline run, calibration, mesh convergence, access, or counterexample).

---

## 16. Differences from QSPEC and QSPEC-NS

Kept: life cycle, brief + spec + profile, increment over named work, kill condition, ban on “setting as novelty.”

Changed for engineering:

- `operating_regime` and `artifact_or_process` are first-class  
- knowledge goals center on performance, tradeoff, reliability/safety, feasibility  
- families include `design_and_analysis` and `observational_or_field`  
- baselines, workloads, and standards are mandatory for comparative claims  
- constraints include codes/standards and hazardous operations  

---

## 17. Items for reviewers

1. Is `design_and_analysis` a real family, or should design claims always attach experimental or computational profiles?  
2. Are software systems in scope, or should they fork QSPEC-CS?  
3. Is `feasibility` too soft to keep as a knowledge goal?  
4. Should “human-in-the-loop” performance be engineering here or social science?  
5. Do optional hints (`ceiling`, `build_risk`) help, or fake precision?  
6. What would make you refuse this as a lab or department selection contract?

---

## 18. Suggested filenames

- Schema: `QSPEC-ENG-0.1.0-draft.md`  
- Instance: `Q-014_converter-efficiency-drive-cycle.md` with `spec_schema: QSPEC-ENG/0.1` in the header