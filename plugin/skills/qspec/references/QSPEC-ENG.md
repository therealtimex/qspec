# QSPEC-ENG 1.10.0
# Question Spec overlay for engineering

**Spec-ID:** QSPEC-ENG
**Schema-Version:** 1.10.0
**Targets core:** QSPEC-CORE 1.10.0
**Date:** 2026-09-05
**Status:** released
**Instance header:** `spec_schema: QSPEC/1.0` and `domain: engineering`

This overlay adds engineering vocabulary and method profiles to [QSPEC-CORE](QSPEC-CORE.md). Life cycle, core fields, invariants, Decision Records, Selection Sheets, and Indexes are defined in the core and not repeated here.

---

## 1. Scope

Mechanical, civil, electrical, chemical, materials, biomedical devices, aerospace, environmental, industrial, and computer systems and software engineering as engineered artifacts. Typical claims concern performance, reliability, safety, cost, constructability, or controllability, or a tradeoff among those, in a stated operating regime.

Software systems are in scope. There is no separate software overlay; a compiler, scheduler, or database is a system with a workload and a regime like any other artifact.

Human-in-the-loop performance belongs here when `one_sentence` predicates on a system metric. When it predicates on the people, use QSPEC-SS.

Out of scope as this overlay's job: shipping a product (use a requirements document), regulated clinical evaluation (upstream of a protocol only), and natural mechanism with no engineered artifact (QSPEC-NS).

---

## 2. Claim fields added

```yaml
claim:
  one_sentence: ""
  comparative: false
  system: ""              # required. The engineered or socio-technical system class
  artifact_or_process: "" # required. Device, algorithm, material, procedure, or process under study
  operating_regime: ""    # required. Load, environment, scale, duty cycle, input distribution, tolerance
  metric: ""              # required for empirical claims. The quantity or tradeoff the claim is about
  why_it_matters: ""
```

Core invariant M13 requires `system`, `artifact_or_process`, and `operating_regime` to be non-empty. `metric` is required unless `method_family` is `theoretical`.

Adjectives such as better, robust, or scalable are invalid in `one_sentence` until `operating_regime` and `metric` are filled (judged under J1).

---

## 3. Catalogs

### 3.1 `method_family`

| Value | Use |
|---|---|
| `experimental` | bench, hardware-in-the-loop, controlled prototype test |
| `observational_or_field` | deployed systems, plants, networks, infrastructure in service |
| `computational` | FEM, CFD, circuit or network simulation, learned surrogate |
| `design_and_analysis` | a new architecture, synthesis procedure, control law, or algorithm evaluated by analysis against constraints |
| `measurement` | a new measurand, instrument, or test method |
| `theoretical` | limits, stability, complexity, continuum model of a device class |

`mixed` is not a family. Set the primary family and name the other in `secondary_method` with a `rescue_rule`. Example rescue rule: a simulation cannot replace a missing hardware baseline under the same workload.

### 3.2 `knowledge_goal`

`performance`, `tradeoff`, `reliability_or_safety`, `mechanism_of_failure`, `feasibility`, `prediction`, `measurement`

`feasibility` is kept. It is disciplined by the `design_and_analysis` profile rule that the feasibility bar is numeric or pass/fail.

**Exploratory goals:** `feasibility`, `measurement`. Core section 6.3 refuses to exempt exploratory work from having a spec, and these are the goals it is written under in this domain. `feasibility` exists only in this catalog; the social and natural overlays name their own. The kill condition is about the bar, not about enthusiasm: "the prototype does not reach the stated efficiency at the stated volume" is a kill condition, "it is harder than we thought" is not.

### 3.3 `safety_or_ethics`

`human_users`, `animals`, `hazardous_operation`, `dual_use`, `field_deployment`, `export_control`

### 3.4 Constraint field added

```yaml
constraints:
  safety_or_ethics: []
  sensitivity: ""
  independence_limits: ""
  standards_or_codes: ""   # may be empty; name the standard if a claim is measured against one
```

### 3.5 Hints

`hints.ceiling` uses the core axis: `specialist`, `broad`, `unclear`. This overlay adds an optional `hints.scale`: `component`, `subsystem`, `system`. The two axes are not interchangeable.

---

## 4. Method profiles

Exactly one profile, inline under `profile`, with `name` equal to `method_family`. "Required" fields are checked by core invariant M11. The comparator field is the one core invariant M12 checks when `claim.comparative` is true.

### 4.1 `experimental`

```yaml
profile:
  name: experimental
  intervention_or_design_under_test: ""
  baseline: ""
  workload_or_excitation: ""
  metrics: []
  measurement_chain: ""
  controls_and_repeats: ""
  main_artifact_or_confound: ""
  precommitted_checks: []
```

Required: all except `precommitted_checks`; `metrics` must have at least one entry. Comparator field: `baseline`.
Judged (J7): the kill condition refers to an unusable measurement, an unreachable regime, or a failed control, not only to "no improvement."

### 4.2 `observational_or_field`

```yaml
profile:
  name: observational_or_field
  deployed_context: ""
  quantity_inferred: ""
  sampling_or_logging_design: ""
  coverage_and_bias: ""
  comparison_period_or_fleet: ""
  main_confound: ""
  what_field_data_cannot_claim: ""
```

Required: all except `comparison_period_or_fleet`. Comparator field: `comparison_period_or_fleet`.
Judged (J7): `main_confound` names something that could mimic the claim, such as operator behavior, mix shift, or an instrumentation change.

### 4.3 `computational`

```yaml
profile:
  name: computational
  model_or_code: ""
  governing_model: ""
  inputs_and_boundary_conditions: ""
  verification: ""
  validation_against: ""      # a named experiment, or the literal string "none"
  baseline_model: ""
  what_computation_cannot_claim: ""
```

Required: all. Comparator field: `baseline_model`.
Judged (J7): if `validation_against` is `none`, the claim is narrowed to a computational statement and does not assert a physical mechanism.

### 4.4 `design_and_analysis`

```yaml
profile:
  name: design_and_analysis
  design_object: ""
  requirements_or_constraints: ""
  decision_variables: ""
  analysis_method: ""
  comparator_designs: []
  acceptance_criterion: ""
```

Required: all except `comparator_designs`. Comparator field: `comparator_designs` (at least one entry).
Judged (J7): if `knowledge_goal` is `feasibility`, `acceptance_criterion` is numeric or pass/fail, not "novel"; otherwise at least one comparator design is listed.

### 4.5 `measurement`

```yaml
profile:
  name: measurement
  measurand: ""
  operational_definition: ""
  calibration_or_reference: ""
  uncertainty_sketch: ""
  prior_method: ""
  why_the_measure_is_the_contribution: ""
```

Required: all except `prior_method`. Comparator field: `prior_method`.
Judged (J7): `calibration_or_reference` names a reference the measurement could fail against, and the measurand is distinct from the instrument's raw reading.

### 4.6 `theoretical`

```yaml
profile:
  name: theoretical
  primitives: ""
  proposition: ""
  regime_of_validity: ""
  relation_to_named_result: ""
  counterexample_or_reduction_that_kills: ""
  empirics_role: none | illustration | later_test
```

Required: all. Comparator field: `relation_to_named_result`.
Judged (J7): the kill condition is a counterexample, a reduction to a known result, or a broken regime.

---

## 5. Worked sketches (illustrative only)

**Experimental.** Under a named drive cycle and ambient window, converter topology A meets efficiency at or above a stated value at rated power with lower switch stress than topology B, holding magnetics volume fixed. Kill: volume cannot be held fixed, or loss-measurement uncertainty spans the claimed gap.

**Field.** After deploying this leak-detection rule on a stated pipe class, undetected leak-hours fall relative to the prior rule after accounting for a documented change in patrol frequency. Kill: patrol frequency and the detector were changed together.

**Computational.** In this Reynolds-number band, scheme A's drag coefficient converges to a named experiment within a stated band under grid refinement; scheme B does not. Kill: the ranking reverses under refinement, or a manufactured-solution test fails.

**Design.** This scheduling policy meets a stated latency tail at a stated load on the named workload suite with no more than a stated energy overhead versus the standard baseline. Kill: the suite is not representative of the regime, or the baseline cannot run on the same stack.

**Theory.** For this class of underactuated vehicles, no continuous time-invariant feedback stabilizes the origin; the obstruction is the same as a named theorem and is not removed by the usual small-angle reduction. Kill: the obstruction is an artifact of a dropped degree of freedom.

Complete instances: [examples/eng-experimental-converter-efficiency.yaml](examples/eng-experimental-converter-efficiency.yaml) and [examples/eng-design-scheduler-latency-tail.yaml](examples/eng-design-scheduler-latency-tail.yaml).

---

## 6. Resolution of 0.1.0 reviewer items

| Item | Resolution |
|---|---|
| Is `design_and_analysis` a real family | Yes. Its rigor is the acceptance criterion against stated constraints plus comparators; it does not borrow experimental or computational profiles. |
| Software in scope or fork QSPEC-CS | In scope. No fork. |
| Is `feasibility` too soft | Kept, with the numeric or pass/fail bar enforced in the profile. |
| Human-in-the-loop | Decided by what `one_sentence` predicates on. Stated in §1. |
| `hints` | Kept optional. ENG's component-vs-system axis moved to a separate `hints.scale` so `ceiling` means the same thing in every domain. |
| Comparative baseline invariant | Every profile now has a designated comparator field, so core M12 is satisfiable in all six families. |
