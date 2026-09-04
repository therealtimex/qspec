# QSPEC-SS 1.5.0
# Question Spec overlay for the social sciences

**Spec-ID:** QSPEC-SS
**Schema-Version:** 1.5.0
**Targets core:** QSPEC-CORE 1.5.0
**Date:** 2026-09-04
**Status:** released
**Instance header:** `spec_schema: QSPEC/1.0` and `domain: social`

This overlay adds social-science vocabulary and method profiles to [QSPEC-CORE](QSPEC-CORE.md). Everything about life cycle, core fields, invariants, Decision Records, Selection Sheets, and Indexes lives in the core and is not repeated here.

---

## 1. Scope

Economics, political science, sociology, anthropology, management, public policy, education, communication, and adjacent fields. Typical claims concern effects, mechanisms, descriptions, measures, interpretations, or propositions about people, institutions, markets, texts, or practices.

Out of scope as this overlay's job: engineered artifacts as the object of the claim (use QSPEC-ENG) and natural systems (use QSPEC-NS). Human users of an engineered system belong here when the claim is about the people, and in QSPEC-ENG when the claim is about the system's metric.

---

## 2. Claim fields added

```yaml
claim:
  one_sentence: ""
  comparative: false
  object: ""             # required. People, institutions, quantities, or concepts the claim is about
  scope: ""              # required. Time, place, population, corpus, or theoretical domain
  why_it_matters: ""
```

Core invariant M13 requires `object` and `scope` to be non-empty.

---

## 3. Catalogs

### 3.1 `method_family`

| Value | Use |
|---|---|
| `empirical_causal` | randomized experiments, natural experiments, quasi-experimental designs |
| `empirical_descriptive` | patterns, distributions, and trends without a causal claim |
| `measurement` | a new construct operationalization or validation |
| `interpretive` | meaning-making from texts, discourse, or practice |
| `ethnographic` | sustained presence in a site |
| `historical` | archival reconstruction of a past process |
| `theoretical` | verbal or conceptual propositions |
| `formal_theory` | mathematical models and proofs |

`mixed` is not a family. A combined project sets `method_family` to its primary family and names the other in `secondary_method` with a `rescue_rule`.

### 3.2 `knowledge_goal`

`effect`, `mechanism`, `description`, `measurement`, `interpretation`, `explanation`, `prediction`, `normative_map`

`normative_map` is kept for work whose claim is that a normative position implies or forbids specific institutional arrangements. It attaches to `theoretical` or `formal_theory`.

**Exploratory goals:** `measurement`, `description`, `interpretation`. Core section 6.3 refuses to exempt exploratory work from having a spec, and these are the goals it is written under in this domain. There is no `feasibility` value here; that is an engineering word. Building or validating an instrument is `measurement`; going to a site or a corpus without knowing what is there is `description` or `interpretation`. In every case the kill condition is about the measure, the site, or the corpus, not about the world: "the sampling frame cannot be reconstructed" is a kill condition, "we did not find much" is not.

### 3.3 `safety_or_ethics`

`human_subjects`, `vulnerable_population`, `deception`, `sensitive_data`, `political_risk`, `partner_dependency`

An empty list means no category applies.

### 3.4 `hints.ceiling`

`specialist`, `broad`, `unclear`. Same axis as the core.

---

## 4. Method profiles

Exactly one profile, inline under `profile`, with `name` equal to `method_family`. "Required" fields are checked by core invariant M11. The comparator field is the one core invariant M12 checks when `claim.comparative` is true.

### 4.1 `empirical_causal`

```yaml
profile:
  name: empirical_causal
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

Required: all except `mechanism_outcomes` and `precommitted_checks`. Comparator field: `comparison`.
Judged (J7): the kill condition refers to a failed identifying or design check, not to an inconvenient estimate.

### 4.2 `empirical_descriptive`

```yaml
profile:
  name: empirical_descriptive
  object_described: ""
  unit_of_observation: ""
  variation_shown: ""
  comparison_or_benchmark: ""
  why_not_trivial: ""
  what_description_cannot_claim: ""
```

Required: all except `comparison_or_benchmark`. Comparator field: `comparison_or_benchmark`.
Judged (J7): `one_sentence` uses no causal verbs.

### 4.3 `measurement`

```yaml
profile:
  name: measurement
  construct: ""
  operationalization: ""
  validation: ""
  error_concerns: ""
  prior_measure: ""
  why_the_measure_is_the_contribution: ""
```

Required: all except `prior_measure`. Comparator field: `prior_measure`.
Judged (J7): `validation` names evidence the measure could fail against, and the kill condition refers to a validation failure, not to a disappointing correlation.

### 4.4 `interpretive`, `ethnographic`, `historical`

These three families share one field set. `profile.name` still equals the family.

```yaml
profile:
  name: interpretive | ethnographic | historical
  site_or_corpus: ""
  access: ""
  unit_of_observation: ""
  contrast: ""
  source_limits: ""
  positionality: ""
  overturning_observation: ""
```

Required: all. Comparator field: `contrast`.
Judged (J7): `overturning_observation` is a kind of evidence that would force revision, not "more time in the field."

### 4.5 `theoretical`, `formal_theory`

```yaml
profile:
  name: theoretical | formal_theory
  primitives: ""
  proposition: ""
  relation_to_named_model: ""
  assumed_not_tested: ""
  counterexample_that_kills: ""
  empirics_role: none | illustration | test
```

Required: all. Comparator field: `relation_to_named_model`.
Judged (J7): the kill condition is a counterexample or a nesting in a named model under weaker assumptions, not "the data disagreed" unless `empirics_role` is `test` and the test is specified.

---

## 5. Worked sketches (illustrative only)

**Causal.** A legal value cutoff reserving small contracts for small firms raises small-firm win rates without lowering prices paid. Family `empirical_causal`. Kill: contract-value density shows manipulation at the cutoff and buyer characteristics also jump.

**Descriptive.** The single-bid share of public contracts in a country follows documented procedures and market structures rather than a single corruption interpretation. Family `empirical_descriptive`. Kill: objects called single-bid are not comparable across procedures.

**Ethnographic.** Procurement officers treat scoring weights as a professional craft for managing quality risk, not only as a rent technology. Family `ethnographic`. Kill: access never includes the meetings where weights are set.

**Formal theory.** When quality can be misreported by the auctioneer, the buyer may optimally overweight quality relative to the standard scoring-auction benchmark. Family `formal_theory`. Kill: the proposition is nested in a named model under weaker assumptions.

Complete instances: [examples/ss-causal-procurement-cutoff.yaml](examples/ss-causal-procurement-cutoff.yaml) and [examples/ss-ethnographic-scoring-weights.yaml](examples/ss-ethnographic-scoring-weights.yaml).

---

## 6. Resolution of 0.1.0 reviewer items

| Item | Resolution |
|---|---|
| Base fields for theory, history, ethnography | `object` and `scope` are the only added claim fields. Both are method-neutral. |
| Causal assumptions smuggled into base | `comparative` is the only comparison-shaped core field and is optional-false. Support and failure patterns are evidence patterns, not estimates. |
| Profile grain | Eight families, five field sets. Interpretive, ethnographic, and historical share fields but keep separate family names so an Index can distinguish them. |
| `knowledge_goal` | Kept. It is required for the Selection Sheet and is load-bearing in QSPEC-ENG. Dropping it in one domain would break the shared Index. |
| `mixed` | Removed as a family. It is a flag: `secondary_method` plus `rescue_rule` on a primary family. The primary profile's invariants always apply. |
| `normative_map` | Kept, restricted to theoretical families. |
| `hints` | Kept optional. Indexes may not sort on them. |
| Life cycle rigidity | `deferred` state added. Exploratory work is a spec with a method-level kill condition. |
| One-page brief | Kept as the Selection Sheet: fixed order, `first_check` and `ask` added, rendered by `qspec sheet`. |
