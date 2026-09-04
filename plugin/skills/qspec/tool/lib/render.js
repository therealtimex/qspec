// Deterministic markdown renderings of a spec, an index, and a frozen request,
// in Paperforge's head format (kind badge, title, metadata rows, then a rule).
// Nothing here composes: every line is a field, and an empty field is reported
// as a hole rather than filled.
const { catalogs, resolveProfile } = require("./catalogs.js");
const { checkSignature, frozenInRound, signingEntry } = require("./record.js");

const s = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const hole = "(not stated)";
const show = (v) => s(v) ?? hole;
const list = (xs) => (Array.isArray(xs) && xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- none");

function contextLine(spec) {
  const c = spec.claim ?? {};
  switch (spec.domain) {
    case "social": return `**Object:** ${show(c.object)}\n**Scope:** ${show(c.scope)}`;
    case "natural": return `**System:** ${show(c.system)}\n**Object:** ${show(c.object)}\n**Scope:** ${show(c.scope)}`;
    case "engineering": return `**System:** ${show(c.system)}\n**Artifact or process:** ${show(c.artifact_or_process)}\n**Operating regime:** ${show(c.operating_regime)}\n**Metric:** ${show(c.metric)}`;
    default: return "";
  }
}

function head(kind, spec, rows) {
  return [`# ${kind}`, `## ${spec.title}`, ...rows.map(([k, v]) => `**${k}:** ${v}`), "", "---", "", ""].join("\n");
}

const SHEET_STATES = ["selectable", "deferred", "frozen"];

// The selection sheet: one page, fixed order, for a decision-maker.
function sheet(spec, { record = null, index = null } = {}) {
  const findings = [];
  const f = (severity, rule, message, act) => findings.push({ severity, rule, message, act });
  if (!SHEET_STATES.includes(spec.status)) f("block", "sheet-state", `a selection sheet is rendered only for ${SHEET_STATES.join(", ")}; this spec is '${spec.status}'`);
  const qt = spec.question_type ?? {}, inc = spec.increment ?? {}, sf = spec.success_and_failure ?? {}, mat = spec.materials ?? {}, con = spec.constraints ?? {};
  const entry = index?.entries?.find((e) => e.id === spec.id) ?? null;
  if (index && !entry) f("warn", "sheet-index", `index has no entry for ${spec.id}`);
  const ask = spec.ask ?? {};
  if (!Object.values(ask).some(s)) f("manual", "sheet-ask", "the ask (time, people, access, hardware_or_compute) is empty", "fill `ask:` in the spec");
  const dissent = (record?.entries ?? []).flatMap((e) => (e.dissent ?? []).filter((d) => d.unresolved));

  const md = head("SELECTION SHEET", spec, [
    ["Question", `${spec.id}@${spec.instance_version}`], ["Domain", spec.domain], ["Status", spec.status], ["Owner", spec.owner],
  ]) + [
    "### Claim", "", show(spec.claim?.one_sentence), "",
    "### Context", "", contextLine(spec), "",
    "### Family and goal", "",
    `**Method family:** ${show(qt.method_family)}`, `**Knowledge goal:** ${show(qt.knowledge_goal)}`,
    ...(qt.secondary_method ? [`**Secondary method:** ${qt.secondary_method}`, `**Rescue rule:** ${show(qt.rescue_rule)}`] : []), "",
    "### Increment", "", show(inc.increment_if_this_works), "",
    "### Kill condition", "", show(sf.kill_condition), "",
    "### First check for the next stage", "", show(spec.handoff?.first_check), "",
    "### Materials", "", "**In hand**", "", list(mat.in_hand), "", "**Blocking**", "", list(mat.blocking), "", "**Obtainable**", "",
    (mat.obtainable ?? []).length ? mat.obtainable.map((o) => `- ${o.item} (${o.source}; ${o.horizon}; probability ${o.probability})`).join("\n") : "- none", "",
    "### Constraints", "", `**Safety or ethics:** ${(con.safety_or_ethics ?? []).join(", ") || "none"}`, `**Independence limits:** ${show(con.independence_limits)}`, "",
    "### Ask", "", `**Time:** ${show(ask.time)}`, `**People:** ${show(ask.people)}`, `**Access:** ${show(ask.access)}`, `**Hardware or compute:** ${show(ask.hardware_or_compute)}`, "",
    "### Recommended action", "", entry ? `${entry.recommended_action} (rank ${entry.rank} in round ${index.round})` : "(no index entry)", "",
    "### Unresolved dissent", "", dissent.length ? dissent.map((d) => `- ${d.reviewer}: ${d.point}`).join("\n") : "- none recorded", "",
  ].join("\n");
  return { md, findings };
}

// The portfolio index as a table, with its own mechanical checks.
//
// An Index is the record of one selection round, not a live view of the
// portfolio: obeying it changes the statuses it lists. So a listed spec that has
// since been killed, superseded, or withdrawn is reported as the round's outcome
// rather than as a failure of the round. Only `draft` is refused, because a spec
// that cannot leave draft was never offerable.
const INDEX_STATES = ["specified", "selectable", "deferred", "frozen", "killed", "superseded"];
const IN_PLAY = ["selectable", "deferred", "frozen"];

// `resolved` is what `--specs` found: { specs, records, files }, each keyed by
// spec id. Without it only the Index's own fields can be checked.
function index(idx, resolved = null) {
  const specsById = resolved?.specs ?? null;
  const recordsById = resolved?.records ?? null;
  const filesById = resolved?.files ?? null;
  const findings = [];
  const f = (severity, rule, message, act) => findings.push({ severity, rule, message, act });
  if (idx.index_schema !== "QSPEC-INDEX/1.0") f("block", "index-schema", "index_schema must be QSPEC-INDEX/1.0");
  const entries = Array.isArray(idx.entries) ? idx.entries : [];
  const ranks = new Set();
  const outcomes = [];
  for (const e of entries) {
    if (!catalogs.core.actions.includes(e.recommended_action)) f("block", "index-action", `${e.id}: recommended_action must be one of ${catalogs.core.actions.join(", ")}`);
    if (!Number.isInteger(e.rank) || ranks.has(e.rank)) f("block", "index-rank", `${e.id}: rank must be a unique integer`);
    ranks.add(e.rank);
    const words = (e.claim_20_words ?? "").trim().split(/\s+/).filter(Boolean).length;
    if (words === 0 || words > 20) f("block", "index-claim", `${e.id}: claim_20_words has ${words} words`);
    if (!specsById) continue;
    const sp = specsById[e.id];
    if (!sp) { f("block", "index-resolve", `${e.id}: no spec with that id in the given directory`); continue; }
    outcomes.push([e.id, sp.status]);
    // A round shows a committee a claim in twenty words. If the spec has moved
    // out from under its signature, those twenty words may describe a claim the
    // spec no longer makes, and nothing else in the round would say so: `lint`
    // sees the spec, the sheet sees the spec, the Index sees only its own text.
    // Only for specs still in play: a killed, superseded or withdrawn spec is
    // this round's outcome, and an edit made to it afterwards is not this
    // round's problem.
    if (IN_PLAY.includes(sp.status)) {
      for (const x of checkSignature(sp, recordsById?.[e.id] ?? null, filesById?.[e.id] ?? e.id)) {
        if (x.severity === "block") f("block", "index-stale", `${e.id}: ${x.message}. The claim this round shows may not be the claim the spec makes`, x.act);
      }
    }
    if (sp.status === "draft") f("block", "index-state", `${e.id}: spec status is 'draft', so it was never offerable in a round`);
    else if (!INDEX_STATES.includes(sp.status)) f("block", "index-state", `${e.id}: spec status '${sp.status}' is not a listed state`);
    else if (sp.status === "specified") f("warn", "index-withdrawn", `${e.id}: listed in this round but its status is 'specified', so it is not currently offered`);
    // A round records the version it saw. The spec moving ahead is the normal
    // consequence of a later revision; the Index citing a version that does not
    // exist yet is a mistake in the Index.
    if (sp.instance_version < e.instance_version) f("block", "index-version", `${e.id}: index says @${e.instance_version} but the spec is only at @${sp.instance_version}`);
    else if (sp.instance_version > e.instance_version) f("warn", "index-version", `${e.id}: this round saw @${e.instance_version}; the spec has since moved to @${sp.instance_version}`);
    const rec = recordsById?.[e.id] ?? null;
    for (const [i, en] of (rec?.entries ?? []).entries()) {
      // The committee is named by the round, so this is the one place a
      // decision_maker's authority can be checked against anything at all.
      if (en.role === "decision_maker" && en.round && en.round === idx.round && en.actor !== String(idx.decision_maker ?? "").trim()) {
        f("block", "index-committee", `${e.id}: record entries[${i}] acts as decision_maker for round ${idx.round} as '${en.actor}', but this round's decision-maker is '${idx.decision_maker}'`);
      }
      // Legal, and the reason is on the record; it stops being silent here.
      if (en.to === "killed" && en.role === "owner") f("warn", "round-withdrawal", `${e.id}: listed in this round and killed by its owner on ${en.date}: ${s(en.reason) ?? "(no reason recorded)"}`);
      if (en.to === "specified" && en.from === "selectable") f("warn", "round-withdrawal", `${e.id}: withdrawn from selection by its owner on ${en.date}: ${s(en.reason) ?? "(no reason recorded)"}`);
    }
  }
  // The cap is over what actually froze, not over the hand-written list.
  const declared = Array.isArray(idx.frozen) ? idx.frozen : [];
  const actuallyFrozen = frozenInRound(idx, specsById);
  const frozen = actuallyFrozen ?? declared;
  if (frozen.length > 1 && !s(idx.exception)) f("block", "index-freeze", `${frozen.length} specs frozen in one round (${frozen.join(", ")}) with no written exception`);
  for (const id of declared) if (!entries.some((e) => e.id === id)) f("block", "index-frozen-id", `${id} is listed as frozen but has no entry`);
  if (actuallyFrozen) {
    for (const id of actuallyFrozen) if (!declared.includes(id)) f("block", "index-frozen-drift", `${id} is frozen but the index does not list it under frozen`);
    for (const id of declared) if (!actuallyFrozen.includes(id) && specsById[id]) f("block", "index-frozen-drift", `${id} is listed under frozen but its status is '${specsById[id].status}', which is not a freeze`);
  }
  const rows = [...entries].sort((a, b) => a.rank - b.rank).map((e) => `| ${e.rank} | ${e.id}@${e.instance_version} | ${e.domain} | ${e.family} | ${e.claim_20_words} | ${e.blocking ? "yes" : "no"} | ${e.recommended_action} |`);
  const md = [
    "# PORTFOLIO INDEX", `## Selection round: ${idx.round}`, `**Date:** ${idx.date}`, `**Decision-maker:** ${idx.decision_maker}`, "", "---", "", "",
    "| Rank | Question | Domain | Family | Claim | Blocking | Action |", "|---|---|---|---|---|---|---|", ...rows, "",
    "### Frozen this round", "", frozen.length ? frozen.map((id) => `- ${id}`).join("\n") : "- none", "",
    ...(s(idx.exception) ? ["### Exception", "", idx.exception, ""] : []),
    ...(outcomes.length ? ["### Where each question stands now", "", ...outcomes.map(([id, st]) => `- ${id}: ${st}`), ""] : []),
  ].join("\n");
  return { md, findings };
}

// The frozen request: the full spec rendered for a Paperforge project's
// `request` key. Refused unless frozen, so a downstream document can only ever
// point at a chosen question.
function request(spec, { record = null } = {}) {
  const findings = [];
  const f = (severity, rule, message, act) => findings.push({ severity, rule, message, act });
  if (spec.status !== "frozen") f("block", "request-state", `a request is exported only from a frozen spec; this spec is '${spec.status}'`);
  const sig = record ? signingEntry(record) : null;
  if (!sig) f("block", "request-unsigned", "no signed Decision Record; a request must carry who signed the judged invariants");
  const qt = spec.question_type ?? {}, inc = spec.increment ?? {}, sf = spec.success_and_failure ?? {}, mat = spec.materials ?? {}, con = spec.constraints ?? {};
  const domain = catalogs.domains[spec.domain];
  const def = domain ? resolveProfile(domain, qt.method_family) : null;
  const profRows = def ? [...def.required, ...def.optional].filter((k) => spec.profile?.[k] != null && (Array.isArray(spec.profile[k]) ? spec.profile[k].length : s(String(spec.profile[k]))))
    .map((k) => `**${k.replace(/_/g, " ")}:** ${Array.isArray(spec.profile[k]) ? spec.profile[k].join("; ") : spec.profile[k]}`) : [];
  const md = head("RESEARCH QUESTION", spec, [
    ["Question", `${spec.id}@${spec.instance_version}`], ["Domain", spec.domain], ["Status", spec.status], ["Owner", spec.owner],
    ["Reviewers", (spec.reviewers ?? []).join(", ")], ["Judged invariants signed by", sig ? `${sig.actor} on ${sig.date}` : hole],
  ]) + [
    "### Claim", "", show(spec.claim?.one_sentence), "", contextLine(spec), "", `**Why it matters:** ${show(spec.claim?.why_it_matters)}`, "",
    "### Question type", "", `**Method family:** ${show(qt.method_family)}`, `**Knowledge goal:** ${show(qt.knowledge_goal)}`,
    ...(qt.secondary_method ? [`**Secondary method:** ${qt.secondary_method}`, `**Rescue rule:** ${show(qt.rescue_rule)}`] : []), "",
    "### Increment over closest work", "",
    ...(inc.closest_work ?? []).flatMap((w) => [`- **${w.cite}**`, `  - Settled: ${w.settled}`, `  - Still open: ${w.still_open}`]), "",
    `**Increment if this works:** ${show(inc.increment_if_this_works)}`, "", `**Vehicle is not the contribution:** ${show(inc.vehicle_is_not_the_contribution)}`, "",
    "### Materials", "", "**In hand**", "", list(mat.in_hand), "", "**Blocking**", "", list(mat.blocking), "", "**Obtainable**", "",
    (mat.obtainable ?? []).length ? mat.obtainable.map((o) => `- ${o.item} (${o.source}; ${o.horizon}; probability ${o.probability})`).join("\n") : "- none", "", `**Access risk:** ${show(mat.access_risk)}`, "",
    "### Success and failure", "", `**Support would look like:** ${show(sf.support_would_look_like)}`, "", `**Failure would look like:** ${show(sf.failure_would_look_like)}`, "",
    `**Uninteresting even if true:** ${show(sf.uninteresting_even_if_true)}`, "", `**Kill condition:** ${show(sf.kill_condition)}`, "",
    "### Constraints", "", `**Safety or ethics:** ${(con.safety_or_ethics ?? []).join(", ") || "none"}`, `**Sensitivity:** ${show(con.sensitivity)}`, `**Independence limits:** ${show(con.independence_limits)}`,
    ...(con.standards_or_codes != null ? [`**Standards or codes:** ${show(con.standards_or_codes)}`] : []), "",
    `### Method profile: ${show(spec.profile?.name)}`, "", ...profRows, "",
    "### Handoff", "", `**First check:** ${show(spec.handoff?.first_check)}`, "", `**Notes for next stage:** ${show(spec.handoff?.notes_for_next_stage)}`, "",
  ].join("\n");
  return { md, findings };
}

module.exports = { SHEET_STATES, sheet, index, request };
