// Deterministic markdown renderings of a spec, an index, and a frozen request,
// in Paperforge's head format (kind badge, title, metadata rows, then a rule).
// Nothing here composes: every line is a field, and an empty field is reported
// as a hole rather than filled.
const { catalogs, resolveProfile } = require("./catalogs.js");
const { signingEntry } = require("./record.js");

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
function index(idx, specsById = null) {
  const findings = [];
  const f = (severity, rule, message, act) => findings.push({ severity, rule, message, act });
  if (idx.index_schema !== "QSPEC-INDEX/1.0") f("block", "index-schema", "index_schema must be QSPEC-INDEX/1.0");
  const entries = Array.isArray(idx.entries) ? idx.entries : [];
  const ranks = new Set();
  for (const e of entries) {
    if (!catalogs.core.actions.includes(e.recommended_action)) f("block", "index-action", `${e.id}: recommended_action must be one of ${catalogs.core.actions.join(", ")}`);
    if (!Number.isInteger(e.rank) || ranks.has(e.rank)) f("block", "index-rank", `${e.id}: rank must be a unique integer`);
    ranks.add(e.rank);
    const words = (e.claim_20_words ?? "").trim().split(/\s+/).filter(Boolean).length;
    if (words === 0 || words > 20) f("block", "index-claim", `${e.id}: claim_20_words has ${words} words`);
    if (specsById) {
      const sp = specsById[e.id];
      if (!sp) f("block", "index-resolve", `${e.id}: no spec with that id in the given directory`);
      else if (!["selectable", "deferred", "frozen"].includes(sp.status)) f("block", "index-state", `${e.id}: spec status is '${sp.status}', not selectable`);
      else if (sp.instance_version !== e.instance_version) f("block", "index-version", `${e.id}: index says @${e.instance_version}, spec is @${sp.instance_version}`);
    }
  }
  const frozen = Array.isArray(idx.frozen) ? idx.frozen : [];
  if (frozen.length > 1 && !s(idx.exception)) f("block", "index-freeze", `${frozen.length} specs frozen in one round with no written exception`);
  for (const id of frozen) if (!entries.some((e) => e.id === id)) f("block", "index-frozen-id", `${id} is listed as frozen but has no entry`);
  const rows = [...entries].sort((a, b) => a.rank - b.rank).map((e) => `| ${e.rank} | ${e.id}@${e.instance_version} | ${e.domain} | ${e.family} | ${e.claim_20_words} | ${e.blocking ? "yes" : "no"} | ${e.recommended_action} |`);
  const md = [
    "# PORTFOLIO INDEX", `## Selection round: ${idx.round}`, `**Date:** ${idx.date}`, `**Decision-maker:** ${idx.decision_maker}`, "", "---", "", "",
    "| Rank | Question | Domain | Family | Claim | Blocking | Action |", "|---|---|---|---|---|---|---|", ...rows, "",
    "### Frozen this round", "", frozen.length ? frozen.map((id) => `- ${id}`).join("\n") : "- none", "",
    ...(s(idx.exception) ? ["### Exception", "", idx.exception, ""] : []),
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
