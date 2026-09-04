# QSPEC-NS 1.5.0
# Question Spec overlay for the natural sciences

**Spec-ID:** QSPEC-NS
**Schema-Version:** 1.5.0
**Targets core:** QSPEC-CORE 1.5.0
**Date:** 2026-09-04
**Status:** released
**Instance header:** `spec_schema: QSPEC/1.0` and `domain: natural`

This overlay adds natural-science vocabulary and method profiles to [QSPEC-CORE](QSPEC-CORE.md). Life cycle, core fields, invariants, Decision Records, Selection Sheets, and Indexes are defined in the core and not repeated here.

---

## 1. Scope

Physics, chemistry, earth and planetary science, astronomy, biology from molecule to organism, ecology, and adjacent experimental, observational, computational, or theoretical work.

Out of scope as this overlay's job: clinical trial regulation (a spec sits upstream of a protocol, never instead of it), engineered artifacts as the object of the claim (QSPEC-ENG), and claims about people or institutions (QSPEC-SS).

---

## 2. Claim fields added

```yaml
claim:
  one_sentence: ""
  comparative: false
  system: ""             # required. The physical, chemical, biological, or planetary system, or the named theoretical setting
  object: ""             # required. Quantity, structure, process, or entity the claim is about
  scope: ""              # required. Regime: energy, length or time scale, taxon, environment, approximation
  why_it_matters: ""
```

Core invariant M13 requires `system`, `object`, and `scope` to be non-empty. `system` answers "where is this tested or derived," `object` answers "what is the claim about," `scope` answers "under what regime."

---

## 3. Catalogs

### 3.1 `method_family`

| Value | Use |
|---|---|
| `experimental` | bench, controlled intervention on the system |
| `observational` | field campaigns, surveys, telescopes, long-term records, natural samples |
| `measurement` | metrology, a new measurand, calibration, or assay |
| `computational` | numerical experiment, simulation, or inference on existing measurements |
| `theoretical` | derivation, proof, or model within a named theory |

`mixed` is not a family. Set the primary family and name the other in `secondary_method` with a `rescue_rule`.

### 3.2 `knowledge_goal`

`mechanism`, `effect`, `existence`, `structure`, `measurement`, `prediction`, `explanation`

`existence` is kept for particles, phases, species, solutions, and objects.

**Exploratory goals:** `measurement`, `existence`. Core section 6.3 refuses to exempt exploratory work from having a spec, and these are the goals it is written under in this domain. There is no `feasibility` value here; that is an engineering word. Developing an instrument, a probe, or a technique is `measurement`; searching for an object or a phase is `existence`. In both cases the kill condition is about the method or the search, not about the world: "the calibration cannot be transferred to the field instrument" is a kill condition, "we saw nothing" is not, unless the spec states the sensitivity at which seeing nothing settles it.

### 3.3 `safety_or_ethics`

`animals`, `humans`, `biosafety`, `radiation`, `dual_use`, `fieldwork_permit`, `hazardous_materials`

### 3.4 `hints.ceiling`

`specialist`, `broad`, `unclear`.

---

## 4. Method profiles

Exactly one profile, inline under `profile`, with `name` equal to `method_family`. "Required" fields are checked by core invariant M11. The comparator field is the one core invariant M12 checks when `claim.comparative` is true.

### 4.1 `experimental`

```yaml
profile:
  name: experimental
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

Required: all except `precommitted_checks`. Comparator field: `control_or_baseline`.
Judged (J7): `positive_or_negative_controls` names a control or states why one is impossible; the kill condition refers to a failed control, an unusable measurement, or an inaccessible system, not only to a null result.

### 4.2 `observational`

```yaml
profile:
  name: observational
  observing_system: ""
  target_process: ""
  comparison_or_contrast: ""
  sampling_design: ""
  coverage_and_bias: ""
  quantity_inferred: ""
  main_confound_or_aliasing: ""
```

Required: all. Comparator field: `comparison_or_contrast`.
Judged (J7): the confound or alias named could actually mimic the claim; the kill condition refers to coverage, irrecoverable bias, or calibration failure.

### 4.3 `measurement`

```yaml
profile:
  name: measurement
  measurand: ""
  operational_definition: ""
  calibration_or_standard: ""
  uncertainty_budget_sketch: ""
  validation: ""
  prior_method: ""
  why_the_measure_is_the_contribution: ""
```

Required: all except `prior_method`. Comparator field: `prior_method`.
Judged (J7): the measurand is distinct from the raw signal.

### 4.4 `computational`

```yaml
profile:
  name: computational
  computation_mode: numerical_experiment | inference_on_data
  model_or_code: ""
  governing_equations_or_algorithm: ""
  input_data_or_parameters: ""
  resolution_or_convergence: ""
  verification_and_validation: ""
  baseline_model: ""
  what_computation_cannot_claim: ""
```

Required: all. Comparator field: `baseline_model`.
Judged (J7): `what_computation_cannot_claim` forbids treating a fit as a unique mechanism without extra structure; the kill condition includes a convergence or verification failure.

### 4.5 `theoretical`

```yaml
profile:
  name: theoretical
  primitives_or_postulates: ""
  proposition: ""
  regime_of_validity: ""
  relation_to_named_theory: ""
  assumed_not_tested: ""
  counterexample_or_reduction_that_kills: ""
  empirics_role: none | illustration | later_test
```

Required: all. Comparator field: `relation_to_named_theory`.
Judged (J7): the kill condition is a counterexample, a reduction to a known result, or a broken regime, not "the experiment disagreed" unless `empirics_role` is `later_test` and the test is specified.

---

## 5. Worked sketches (illustrative only)

**Experimental.** In this cuprate family, raising apical oxygen height by a stated amount suppresses the superconducting dome maximum in a stated qualitative pattern, holding doping fixed. Kill: doping cannot be held fixed in the window, or the structural proxy does not track apical height.

**Observational.** Extreme rainfall in this basin has increased in frequency after accounting for named covariates and a documented change in gauge coverage. Kill: the coverage change cannot be separated from the trend under the stated sampling design.

**Measurement.** This assay reports unbound protein X in plasma with a stated uncertainty and does not conflate it with fragment Y. Kill: the calibration standard does not separate X from Y.

**Computational.** In this turbulence regime, scheme A converges to the same dissipation rate as a named reference at a stated resolution, while scheme B does not. Kill: results change qualitatively under refinement or a documented verification failure.

**Theoretical.** In this mean-field regime, the named instability exists only above a threshold coupling absent from the textbook limit. Kill: the threshold is an artifact of an approximation already removed in a named paper.

Complete instances: [examples/ns-experimental-apical-oxygen.yaml](examples/ns-experimental-apical-oxygen.yaml) and [examples/ns-theoretical-mean-field-threshold.yaml](examples/ns-theoretical-mean-field-threshold.yaml).

---

## 6. Resolution of 0.1.0 reviewer items

| Item | Resolution |
|---|---|
| Six families the right grain | Five. `mixed` removed. Ecology, astronomy, and bench biology are not split; the difference is carried by `system` and `scope`. |
| `system` vs `object` vs `scope` | Kept all three with one-line definitions in §2. |
| Experimental language in theory | The theoretical profile has its own kill rule; core `failure_would_look_like` is an evidence pattern and for theory reads as a counterexample. |
| Split `computational` | Not split. `computation_mode` added as a required profile field. |
| `existence` | Kept. |
| `hints` | Kept optional; never used for ranking. |
| Freeze rule vs exploratory work | `deferred` state added in core. Method development is a spec with a method-level kill condition. |
