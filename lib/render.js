// Deterministic markdown renderings of a spec, an index, and a frozen request,
// in Paperforge's head format. Committee renderings compose only fixed framing
// around person-written fields and catalog-owned labels; they never invent a
// field value, and an empty field remains visible as a hole.
const { catalogs, profileFieldLabel, resolveProfile, valueLabel, valueSentence } = require("./catalogs.js");
const { claimGist, claimLabel, gistRepresentable } = require("./paper.js");
const { checkSignature, frozenInRound, signingEntry } = require("./record.js");

const s = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const hole = "(not stated)";
const show = (v) => s(v) ?? hole;
const withoutTrailingPunctuation = (v) => show(v).replace(/([.!?])((?:\s*\[@[A-Za-z0-9_:.+\/-]+(?:\s*;\s*@[A-Za-z0-9_:.+\/-]+)*\])*)$/, "$2");
const list = (xs) => (Array.isArray(xs) && xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- none");
const words = (key) => key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const tableCell = (v) => String(v == null || v === "" ? hole : v).replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
const value = (v) => Array.isArray(v) ? list(v) : show(v == null ? null : String(v));
const bodyField = (label, v, render = value) => Array.isArray(v)
  ? [`**${label}:**`, "", ...(v.length ? v.map((item) => `- ${render(item)}`) : ["- none"]), ""]
  : [`**${label}:** ${render(v)}`, ""];
const fields = (object, keys) => keys.flatMap((key) => bodyField(words(key), object?.[key]));
const cited = (work) => `${show(work?.cite)}${s(work?.key) ? ` [@${s(work.key)}]` : ""}`;
const humanValue = (v) => {
  const token = s(v == null ? null : String(v));
  return token ? valueLabel(token) ?? words(token) : hole;
};
const humanSentence = (v) => {
  const token = s(v == null ? null : String(v));
  return token ? valueSentence(token) ?? words(token) : hole;
};
const profileValue = (v, field, definition) => {
  // Profile prose belongs to its author. Only enum values declared by this
  // exact field are catalog vocabulary that the committee renderer may label.
  const enums = definition?.enums?.[field] ?? [];
  const item = (raw) => {
    const token = s(raw == null ? null : String(raw));
    return token ? (enums.includes(token) ? valueLabel(token) ?? token : token) : hole;
  };
  return Array.isArray(v) ? v.map(item) : item(v);
};

const HTML_ELEMENTS = new Set((
  "a abbr address area article aside audio b base bdi bdo blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr html i iframe img input ins kbd label legend li link main map mark menu meta meter nav noscript object ol optgroup option output p picture pre progress q rp rt ruby s samp script search section select slot small source span strong style sub summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr"
).split(" "));
const HTML_VOID_ELEMENTS = new Set("area base br col embed hr img input link meta source track wbr".split(" "));

function htmlTokenAt(text, start) {
  if (text.startsWith("<!--", start)) {
    const end = text.indexOf("-->", start + 4);
    return end < 0 ? null : text.slice(start, end + 3);
  }
  const declaration = /^<!DOCTYPE\s+html\s*>/i.exec(text.slice(start));
  if (declaration) return declaration[0];
  const open = /^<\/?\s*([A-Za-z][A-Za-z0-9-]*)\b/.exec(text.slice(start));
  if (!open || !HTML_ELEMENTS.has(open[1].toLowerCase())) return null;
  let quote = null;
  for (let i = start + open[0].length; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === ">") return text.slice(start, i + 1);
    if (char === "<") return null;
  }
  return null;
}

// Notes may quote CLI metavariables such as <run>. Paperforge treats unknown
// ASCII angle-bracket forms as raw tags in HTML and PDF and rejects visible
// entities. A bare placeholder starts with an ASCII letter and otherwise uses
// ASCII letters, digits, dots, dashes, underscores, spaces, or pipes.
// That deliberately excludes comparisons and Markdown URI/email autolinks.
// Render those placeholders with single angle quotation marks while preserving
// real HTML and placeholders the author already put in code.
function isDossierPlaceholder(value) {
  return /^[A-Za-z][A-Za-z0-9_.-]*(?:[ |]+[A-Za-z][A-Za-z0-9_.-]*)*$/.test(value);
}

// A comma-delimited metavariable list is CLI syntax even when an item happens
// to share a name with an HTML element, as in the documented <a>,<b> run diff.
function inDossierPlaceholderList(text, start, end) {
  const left = /<([^<>\r\n]+)>\s*,\s*$/.exec(text.slice(0, start));
  if (left && isDossierPlaceholder(left[1])) return true;
  const right = /^\s*,\s*<([^<>\r\n]+)>/.exec(text.slice(end + 1));
  return Boolean(right && isDossierPlaceholder(right[1]));
}

function hasMatchingDossierHtmlClose(text, start, token, name) {
  let depth = 1;
  let codeTicks = 0;
  for (let i = start + token.length; i < text.length; i += 1) {
    if (text[i] === "`") {
      let end = i + 1;
      while (text[end] === "`") end += 1;
      const ticks = end - i;
      if (codeTicks === 0) codeTicks = ticks;
      else if (ticks === codeTicks) codeTicks = 0;
      i = end - 1;
    } else if (text[i] === "<" && codeTicks === 0) {
      const next = htmlTokenAt(text, i);
      if (!next) continue;
      const tag = /^<\s*(\/?)\s*([A-Za-z][A-Za-z0-9-]*)\b/.exec(next);
      if (tag?.[2].toLowerCase() === name) {
        if (tag[1]) depth -= 1;
        else if (!/\/\s*>$/.test(next) && !HTML_VOID_ELEMENTS.has(name)) depth += 1;
        if (depth === 0) return true;
      }
      i += next.length - 1;
    }
  }
  return false;
}

// Comma-list inference may override only an unmatched bare opening tag. Void
// elements, paired tags, attributes, closing tags, and self-closing tags are
// unambiguous authored HTML and remain byte-for-byte intact.
function isDefiniteDossierHtml(text, start, token) {
  const bare = /^<\s*([A-Za-z][A-Za-z0-9-]*)\s*>$/.exec(token);
  if (!bare) return true;
  const name = bare[1].toLowerCase();
  if (HTML_VOID_ELEMENTS.has(name)) return true;
  return hasMatchingDossierHtmlClose(text, start, token, name);
}

function protectDossierNote(value) {
  const text = String(value ?? "");
  let out = "";
  let codeTicks = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "`") {
      let end = i + 1;
      while (text[end] === "`") end += 1;
      const ticks = end - i;
      if (codeTicks === 0) codeTicks = ticks;
      else if (ticks === codeTicks) codeTicks = 0;
      out += text.slice(i, end);
      i = end - 1;
    } else if (text[i] === "<" && codeTicks === 0) {
      const end = text.indexOf(">", i + 1);
      const placeholder = end >= 0 ? text.slice(i, end + 1) : null;
      const content = placeholder?.slice(1, -1);
      const token = htmlTokenAt(text, i);
      const listPlaceholder = token && inDossierPlaceholderList(text, i, end) && !isDefiniteDossierHtml(text, i, token);
      if (placeholder && isDossierPlaceholder(content) && (!token || listPlaceholder)) {
        out += `‹${content}›`;
        i = end;
      } else if (token) { out += token; i += token.length - 1; }
      else out += text[i];
    }
    else out += text[i];
  }
  return out;
}

const catalogIdentifiers = [...new Set([
  ...Object.keys(catalogs.labels?.values ?? {}),
  ...Object.keys(catalogs.labels?.profile_fields ?? {}),
])].filter((token) => /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(token));
const escapedIdentifiers = catalogIdentifiers.sort((a, b) => b.length - a.length)
  .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

// One exported denylist guards both committee renderings after every field,
// including prose supplied by a person, has reached the finished markdown.
const COMMITTEE_DENYLIST = [
  { id: "catalog-token", pattern: new RegExp(`\\b(?:${escapedIdentifiers.join("|")})\\b`, "i"), example: "The scope says empirical_causal." },
  { id: "invariant-code", pattern: /\b[JM]\d{1,2}\b/i, example: "The committee must settle J7." },
  { id: "fingerprint", pattern: /\bfingerprint\b/i, example: "The fingerprint is current." },
  { id: "instance-version", pattern: /\binstance_version\b/i, example: "The instance_version is current." },
  { id: "decision-record", pattern: /\bDecision Record\b/i, example: "See the Decision Record." },
  { id: "tool-name", pattern: /\bQSPEC\b/i, example: "Prepared with QSPEC." },
  { id: "run-heading", pattern: /\bruns?\b/i, scope: "heading", example: "### Runs" },
  { id: "machine-pointer", pattern: /\b[A-Za-z][A-Za-z0-9_.-]*@\d+\b/, example: "**Question:** Q-005@3" },
];

function committeeClean(md) {
  const findings = [];
  let inHead = true;
  for (const [offset, line] of String(md).split("\n").entries()) {
    // A marker is Paperforge citation syntax, not prose containing a catalog
    // token. Keep the rendered text intact and omit only markers from this gate.
    const checked = line.replace(/\[@[A-Za-z0-9_:.+\/-]+(?:\s*;\s*@[A-Za-z0-9_:.+\/-]+)*\]/g, "");
    const heading = /^#{1,6}\s/.test(line) || (inHead && /^\*\*[^*]+:\*\*/.test(line));
    for (const rule of COMMITTEE_DENYLIST) {
      if (rule.scope === "heading" && !heading) continue;
      const match = rule.pattern.exec(checked);
      if (!match) continue;
      const number = offset + 1;
      findings.push({
        severity: "block",
        rule: "committee-clean",
        message: `rendered committee text contains '${match[0]}' on line ${number}`,
        act: `reword line ${number} without machine or workflow vocabulary`,
      });
    }
    if (/^---\s*$/.test(line)) inHead = false;
  }
  return findings;
}

function contextRows(spec) {
  const c = spec.claim ?? {};
  switch (spec.domain) {
    case "social": return [...bodyField("Object", c.object), ...bodyField("Scope", c.scope)];
    case "natural": return [...bodyField("System", c.system), ...bodyField("Object", c.object), ...bodyField("Scope", c.scope)];
    case "engineering": return [
      ...bodyField("System", c.system),
      ...bodyField("Artifact or process", c.artifact_or_process),
      ...bodyField("Operating regime", c.operating_regime),
      ...bodyField("Metric", c.metric),
    ];
    default: return [];
  }
}

function head(kind, spec, rows) {
  return [`# ${kind}`, `## ${spec.title}`, ...rows.map(([k, v]) => `**${k}:** ${v}`), "", "---", "", ""].join("\n");
}

const SHEET_STATES = ["selectable", "deferred", "frozen"];

function profileDefinition(spec) {
  const domain = catalogs.domains[spec.domain];
  return domain ? resolveProfile(domain, spec.question_type?.method_family) : null;
}

function committeeContext(spec) {
  const c = spec.claim ?? {};
  const why = show(c.why_it_matters);
  switch (spec.domain) {
    case "social":
      return `${why}\n\nThe question concerns ${withoutTrailingPunctuation(c.object)}. Its scope is ${withoutTrailingPunctuation(c.scope)}.`;
    case "natural":
      return `${why}\n\nThe question examines ${withoutTrailingPunctuation(c.object)} in ${withoutTrailingPunctuation(c.system)}. Its scope is ${withoutTrailingPunctuation(c.scope)}.`;
    case "engineering":
      return `${why}\n\nThe question concerns ${withoutTrailingPunctuation(c.artifact_or_process)} in ${withoutTrailingPunctuation(c.system)}, under ${withoutTrailingPunctuation(c.operating_regime)}. It is assessed by ${withoutTrailingPunctuation(c.metric)}.`;
    default:
      return why;
  }
}

function draftHoles(spec, definition) {
  const c = spec.claim ?? {}, qt = spec.question_type ?? {}, inc = spec.increment ?? {};
  const sf = spec.success_and_failure ?? {}, mat = spec.materials ?? {}, con = spec.constraints ?? {};
  const ask = spec.ask ?? {}, profile = spec.profile ?? {};
  const domain = catalogs.domains[spec.domain];
  const holes = [];
  const filled = (v) => Array.isArray(v)
    ? v.length > 0 && v.every((item) => typeof item === "string" ? Boolean(s(item)) : item != null)
    : Boolean(s(v == null ? null : String(v)));
  const requireValue = (label, v) => { if (!filled(v)) holes.push(label); };

  requireValue("Question format", spec.spec_schema);
  requireValue("Research field", spec.domain);
  requireValue("Question identifier", spec.id);
  requireValue("Research question title", spec.title);
  if (spec.instance_version == null) holes.push("Question version");
  requireValue("Question state", spec.status);
  requireValue("Question date", spec.date);
  requireValue("Owner", spec.owner);
  requireValue("Reviewer", spec.reviewers);
  requireValue("Claim", c.one_sentence);
  requireValue("Why it matters", c.why_it_matters);
  if (typeof c.comparative !== "boolean") holes.push("Whether the claim is comparative");
  requireValue("Design", qt.method_family);
  requireValue("Knowledge goal", qt.knowledge_goal);
  if (qt.secondary_method != null) requireValue("Rescue rule", qt.rescue_rule);
  requireValue("What this study would add", inc.increment_if_this_works);
  requireValue("Why the vehicle is not the contribution", inc.vehicle_is_not_the_contribution);
  requireValue("What would count as support", sf.support_would_look_like);
  requireValue("What would count as failure", sf.failure_would_look_like);
  requireValue("Why a true result could still be uninteresting", sf.uninteresting_even_if_true);
  requireValue("When the study stops", sf.kill_condition);
  if (!Array.isArray(mat.in_hand)) holes.push("Materials in hand");
  if (!Array.isArray(mat.blocking)) holes.push("Blocking materials");
  requireValue("Access risk", mat.access_risk);
  if (!Array.isArray(con.safety_or_ethics)) holes.push("Safety or ethics constraints");
  requireValue("Design profile", profile.name);
  requireValue("Time requested", ask.time);
  requireValue("People requested", ask.people);
  requireValue("Access requested", ask.access);
  requireValue("Hardware or compute requested", ask.hardware_or_compute);
  if (["frozen", "superseded"].includes(spec.status)) requireValue("First check for the next stage", spec.handoff?.first_check);
  if (!Array.isArray(spec.changelog) || !spec.changelog.some((entry) => entry?.version === spec.instance_version)) {
    holes.push("Change history for this version");
  }
  const contextLabels = {
    system: "System", object: "Research object", scope: "Scope",
    artifact_or_process: "Artifact or process", operating_regime: "Operating regime", metric: "Metric",
  };
  for (const field of domain?.claim_required ?? []) requireValue(contextLabels[field] ?? words(field), c[field]);
  for (const conditional of domain?.claim_conditional ?? []) {
    if (!(conditional.unless_family ?? []).includes(qt.method_family)) requireValue(contextLabels[conditional.field] ?? words(conditional.field), c[conditional.field]);
  }
  const closest = Array.isArray(inc.closest_work) ? inc.closest_work : [];
  for (let i = 0; i < Math.max(2, closest.length); i += 1) {
    const work = closest[i];
    requireValue(`Closest work ${i + 1}`, work?.cite);
    requireValue(`What closest work ${i + 1} establishes`, work?.settled);
    requireValue(`What closest work ${i + 1} leaves open`, work?.still_open);
  }
  for (const [i, obtainable] of (Array.isArray(mat.obtainable) ? mat.obtainable : []).entries()) {
    requireValue(`Material to obtain ${i + 1}`, obtainable?.item);
    requireValue(`Source for material ${i + 1}`, obtainable?.source);
    requireValue(`Expected horizon for material ${i + 1}`, obtainable?.horizon);
    requireValue(`Likelihood for material ${i + 1}`, obtainable?.probability);
  }
  const profileFields = new Set([
    ...(definition?.required ?? []),
    ...Object.keys(definition?.enums ?? {}),
    ...(c.comparative === true && definition?.comparator ? [definition.comparator] : []),
  ]);
  for (const field of profileFields) {
    const v = profile[field];
    const minimum = definition?.min_list?.[field] ?? 1;
    const complete = Array.isArray(v) ? v.length >= minimum && v.every(filled) : filled(v);
    if (!complete) holes.push(profileFieldLabel(field) ?? words(field));
  }
  return [...new Set(holes)];
}

// The selection sheet: one page, fixed order, for a decision-maker.
function sheet(spec, { record = null, index = null, draft = false } = {}) {
  const findings = [];
  const f = (severity, rule, message, act) => findings.push({ severity, rule, message, act });
  if (!draft && !SHEET_STATES.includes(spec.status)) f("block", "sheet-state", `a selection sheet is rendered only for ${SHEET_STATES.join(", ")}; this spec is '${spec.status}'`);
  const qt = spec.question_type ?? {}, inc = spec.increment ?? {}, sf = spec.success_and_failure ?? {}, mat = spec.materials ?? {}, con = spec.constraints ?? {};
  const closest = Array.isArray(inc.closest_work) ? inc.closest_work : [];
  const entry = index?.entries?.find((e) => e.id === spec.id) ?? null;
  if (index && !entry) f("warn", "sheet-index", `index has no entry for ${spec.id}`);
  const ask = spec.ask ?? {};
  if (!Object.values(ask).some(s)) f("manual", "sheet-ask", "the ask (time, people, access, hardware_or_compute) is empty", "fill `ask:` in the spec");
  const dissent = (record?.entries ?? []).flatMap((e) => (e.dissent ?? []).filter((d) => d.unresolved));
  const definition = profileDefinition(spec);
  const profileRows = definition ? [...definition.required, ...definition.optional]
    .filter((field) => definition.required.includes(field) || (Array.isArray(spec.profile?.[field]) ? spec.profile[field].length : s(String(spec.profile?.[field] ?? ""))))
    .flatMap((field) => bodyField(
      profileFieldLabel(field) ?? words(field),
      spec.profile?.[field],
      (item) => profileValue(item, field, definition),
    )) : [];
  const obtainable = Array.isArray(mat.obtainable) ? mat.obtainable : [];
  const materialLines = [
    "**In hand:**", "", list(mat.in_hand), "", "**Still needed:**", "",
    ...(Array.isArray(mat.blocking) && mat.blocking.length ? mat.blocking.map((item) => `- ${withoutTrailingPunctuation(item)}.`) : ["- No blocking material is recorded."]),
    ...obtainable.map((item) => `- ${withoutTrailingPunctuation(item.item)}. Source: ${withoutTrailingPunctuation(item.source)}. Expected horizon: ${withoutTrailingPunctuation(item.horizon)}. Likelihood: ${withoutTrailingPunctuation(humanSentence(item.probability))}.`),
    "", `**Access risk:** ${withoutTrailingPunctuation(humanValue(mat.access_risk))}.`, "",
  ];
  const safety = Array.isArray(con.safety_or_ethics) && con.safety_or_ethics.length
    ? con.safety_or_ethics.map((token) => `${withoutTrailingPunctuation(humanSentence(token))}.`).join(" ")
    : "No safety or ethics constraint is recorded.";
  const headRows = [
    ["Question", `${spec.id}, version ${spec.instance_version}`],
    ...(index ? [["Selection round", index.round]] : []),
    ["Owner", show(spec.owner)],
    ...(draft ? [["Draft", "unsigned, not for submission"]] : []),
  ];
  const holes = draft ? draftHoles(spec, definition) : [];
  const md = head("Research question", spec, headRows) + [
    "### Claim", "", show(spec.claim?.one_sentence), "",
    "### Why this question matters", "", committeeContext(spec), "",
    "### Design", "", `The design is ${humanSentence(qt.method_family)}, with ${humanSentence(qt.knowledge_goal)} as its knowledge goal.`, "",
    ...profileRows,
    ...(qt.secondary_method ? [
      ...bodyField("Secondary design", qt.secondary_method, (item) => `${withoutTrailingPunctuation(humanValue(item))}.`),
      ...bodyField("Rescue rule", qt.rescue_rule),
    ] : []),
    "### What is known and what is still open", "",
    ...(closest.length ? closest.map((work) => `- ${withoutTrailingPunctuation(cited(work))}. **What it establishes:** ${show(work.settled)} **What remains open:** ${show(work.still_open)}`) : [`- ${hole}`]), "",
    `**What this study would add:** ${show(inc.increment_if_this_works)}`, "",
    "### What would count as support", "", show(sf.support_would_look_like), "",
    "### What would count as failure", "", show(sf.failure_would_look_like), "",
    "### When the study stops", "", show(sf.kill_condition), "",
    "### Materials", "", ...materialLines,
    "### Constraints", "", safety, "",
    ...(s(con.sensitivity) ? [`**Sensitive material:** ${show(con.sensitivity)}`, ""] : []),
    ...(s(con.independence_limits) ? [`**Independence:** ${show(con.independence_limits)}`, ""] : []),
    ...(s(con.standards_or_codes) ? [`**Standards or codes:** ${show(con.standards_or_codes)}`, ""] : []),
    "### Ask", "", ...bodyField("Time", ask.time), ...bodyField("People", ask.people), ...bodyField("Access", ask.access), ...bodyField("Hardware or compute", ask.hardware_or_compute),
    ...(entry ? ["### Recommended action", "", `The round recommends: ${humanSentence(entry.recommended_action)} (rank ${entry.rank}).`, ""] : []),
    "### Unresolved dissent", "", dissent.length ? dissent.map((d) => `- A reviewer dissents: ${d.point}`).join("\n") : "No unresolved dissent is recorded.", "",
    ...(draft ? ["### Before submission", "", ...(holes.length ? holes.map((label) => `- ${label}`) : ["- No empty fields."]), ""] : []),
  ].join("\n");
  findings.push(...committeeClean(md));
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
  for (const e of entries) {
    if (!catalogs.core.actions.includes(e.recommended_action)) f("block", "index-action", `${e.id}: recommended_action must be one of ${catalogs.core.actions.join(", ")}`);
    if (!Number.isInteger(e.rank) || ranks.has(e.rank)) f("block", "index-rank", `${e.id}: rank must be a unique integer`);
    ranks.add(e.rank);
    const words = (e.claim_20_words ?? "").trim().split(/\s+/).filter(Boolean).length;
    if (words === 0 || words > 20) f("block", "index-claim", `${e.id}: claim_20_words has ${words} words`);
    if (!specsById) continue;
    const sp = specsById[e.id];
    if (!sp) { f("block", "index-resolve", `${e.id}: no spec with that id in the given directory`); continue; }
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
  const rows = [...entries].sort((a, b) => a.rank - b.rank).map((e) => {
    const title = specsById?.[e.id]?.title;
    const question = title ? `${title} (${e.id}, version ${e.instance_version})` : `${e.id}, version ${e.instance_version}`;
    return `| ${e.rank} | ${tableCell(question)} | ${humanValue(e.domain)} | ${humanValue(e.family)} | ${tableCell(e.claim_20_words)} | ${e.blocking ? "Yes" : "No"} | ${humanValue(e.recommended_action)} |`;
  });
  const md = [
    `# Selection round ${idx.round}`, `**Date:** ${idx.date}`, `**Decision-maker:** ${idx.decision_maker}`, "", "---", "", "",
    "| Rank | Question | Field | Design | Claim | Blocked | Recommended |", "|---|---|---|---|---|---|---|", ...rows, "",
    "### Frozen this round", "", frozen.length ? frozen.map((id) => `- ${specsById?.[id]?.title ? `${specsById[id].title} (${id})` : id}`).join("\n") : "- None", "",
    ...(s(idx.exception) ? ["### Exception", "", idx.exception, ""] : []),
  ].join("\n");
  findings.push(...committeeClean(md));
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
    .flatMap((k) => bodyField(k.replace(/_/g, " "), spec.profile[k])) : [];
  const md = head("RESEARCH QUESTION", spec, [
    ["Question", `${spec.id}@${spec.instance_version}`], ["Domain", spec.domain], ["Status", spec.status], ["Owner", spec.owner],
    ["Reviewers", (spec.reviewers ?? []).join(", ")], ["Judged invariants signed by", sig ? `${sig.actor} on ${sig.date}` : hole],
  ]) + [
    "### Claim", "", show(spec.claim?.one_sentence), "", ...contextRows(spec), ...bodyField("Why it matters", spec.claim?.why_it_matters),
    "### Question type", "", ...bodyField("Method family", qt.method_family), ...bodyField("Knowledge goal", qt.knowledge_goal),
    ...(qt.secondary_method ? [...bodyField("Secondary method", qt.secondary_method), ...bodyField("Rescue rule", qt.rescue_rule)] : []),
    "### Increment over closest work", "",
    ...(inc.closest_work ?? []).flatMap((w) => [`- **${w.cite}**`, `  - Settled: ${w.settled}`, `  - Still open: ${w.still_open}`]), "",
    `**Increment if this works:** ${show(inc.increment_if_this_works)}`, "", `**Vehicle is not the contribution:** ${show(inc.vehicle_is_not_the_contribution)}`, "",
    "### Materials", "", "**In hand**", "", list(mat.in_hand), "", "**Blocking**", "", list(mat.blocking), "", "**Obtainable**", "",
    (mat.obtainable ?? []).length ? mat.obtainable.map((o) => `- ${o.item} (${o.source}; ${o.horizon}; probability ${o.probability})`).join("\n") : "- none", "", `**Access risk:** ${show(mat.access_risk)}`, "",
    "### Success and failure", "", `**Support would look like:** ${show(sf.support_would_look_like)}`, "", `**Failure would look like:** ${show(sf.failure_would_look_like)}`, "",
    `**Uninteresting even if true:** ${show(sf.uninteresting_even_if_true)}`, "", `**Kill condition:** ${show(sf.kill_condition)}`, "",
    "### Constraints", "", ...bodyField("Safety or ethics", con.safety_or_ethics ?? []), ...bodyField("Sensitivity", con.sensitivity), ...bodyField("Independence limits", con.independence_limits),
    ...(con.standards_or_codes != null ? bodyField("Standards or codes", con.standards_or_codes) : []),
    `### Method profile: ${show(spec.profile?.name)}`, "", ...profRows,
    "### Handoff", "", `**First check:** ${show(spec.handoff?.first_check)}`, "", `**Notes for next stage:** ${show(spec.handoff?.notes_for_next_stage)}`, "",
  ].join("\n");
  return { md, findings };
}

// A dossier is the whole process record for one question. Unlike a Selection
// Sheet or request it is useful while the spec is still draft, so missing
// fields are shown rather than treated as rendering failures. Attached note
// bodies are embedded without changing their source files. Bare angle-bracket
// placeholders use single angle quotation marks so Paperforge does not parse
// them as HTML in either the reading or print edition.
function dossier(spec, { record = null, history = [] } = {}) {
  const qt = spec.question_type ?? {}, inc = spec.increment ?? {}, mat = spec.materials ?? {};
  const sf = spec.success_and_failure ?? {}, con = spec.constraints ?? {};
  const ask = spec.ask ?? {}, hints = spec.hints ?? {}, profile = spec.profile ?? {};
  const domain = catalogs.domains[spec.domain];
  const def = domain ? resolveProfile(domain, qt.method_family) : null;
  const claimKeys = [...new Set([
    ...(domain?.claim_required ?? []),
    ...(domain?.claim_conditional ?? []).map((c) => c.field),
    "comparative", "why_it_matters",
  ])];
  const constraintKeys = ["safety_or_ethics", "sensitivity", "independence_limits", ...(domain?.constraints_extra ?? [])];
  const hintKeys = ["ceiling", "build_risk", ...Object.keys(domain?.hints_extra ?? {})];
  const profileKeys = [...new Set([...(def?.required ?? []), ...(def?.optional ?? [])])];
  const gist = claimGist(spec);
  const claimMark = spec.status === "frozen" && gist && gistRepresentable(gist) ? ` {#${claimLabel(spec)} gist="${gist}"}` : "";
  const closest = Array.isArray(inc.closest_work) ? inc.closest_work : [];
  const decisions = Array.isArray(record?.entries) ? record.entries : [];
  const runRows = history.map((run) => {
    const files = run.record?.files ?? [];
    const blocks = files.flatMap((f) => f.findings ?? []).filter((f) => f.severity === "block").length;
    const verdict = files.some((f) => f.verdict === "block") ? "block" : "ok";
    return `| ${tableCell(run.name)} | ${tableCell(run.record?.label ?? "-")} | ${tableCell(run.record?.command)} | ${verdict} | ${blocks} | ${(run.record?.notes ?? []).length} |`;
  });
  const decisionRows = decisions.map((e) => {
    const dissent = (e.dissent ?? []).map((d) => `${d.reviewer}: ${d.point}${d.unresolved ? " (unresolved)" : ""}`).join("; ") || "none";
    return `| ${tableCell(e.date)} | ${tableCell(e.actor)} | ${tableCell(e.role)} | ${tableCell(e.from)} | ${tableCell(e.to)} | ${tableCell(e.reason)} | ${tableCell(e.run ?? "-")} | ${tableCell(dissent)} |`;
  });
  const mdParts = [
    head("Process record (internal)", spec, [
      ["Question", `${spec.id}@${spec.instance_version}`], ["Status", show(spec.status)],
      ["Domain", show(spec.domain)], ["Profile", show(qt.method_family)], ["Owner", show(spec.owner)],
      ["Reviewers", (spec.reviewers ?? []).join(", ") || hole],
    ]),
    "### Claim", "", `${show(spec.claim?.one_sentence)}${claimMark}`, "",
    ...fields(spec.claim, claimKeys),
    "### Question type", "", ...fields(qt, ["method_family", "knowledge_goal", "secondary_method", "rescue_rule"]),
    "### Increment", "",
    "| Closest work | Settled | Still open |", "|---|---|---|",
    ...(closest.length ? closest.map((w) => `| ${tableCell(cited(w))} | ${tableCell(w.settled)} | ${tableCell(w.still_open)} |`) : [`| ${hole} | ${hole} | ${hole} |`]), "",
    ...fields(inc, ["increment_if_this_works", "vehicle_is_not_the_contribution"]),
    "### Materials", "", ...fields(mat, ["in_hand", "blocking"]),
    "**Obtainable:**", "",
    ...(Array.isArray(mat.obtainable) && mat.obtainable.length
      ? ["| Item | Source | Horizon | Probability |", "|---|---|---|---|", ...mat.obtainable.map((o) => `| ${tableCell(o.item)} | ${tableCell(o.source)} | ${tableCell(o.horizon)} | ${tableCell(o.probability)} |`), ""]
      : ["- none", ""]),
    ...fields(mat, ["access_risk"]),
    "### Success and failure", "", ...fields(sf, ["support_would_look_like", "failure_would_look_like", "uninteresting_even_if_true", "kill_condition"]),
    "### Constraints", "", ...fields(con, constraintKeys),
    "### Ask", "", ...fields(ask, ["time", "people", "access", "hardware_or_compute"]),
    "### Hints", "", ...fields(hints, hintKeys),
    `### Method profile: ${show(profile.name)}`, "", ...fields(profile, profileKeys),
    "### Handoff", "", ...fields(spec.handoff, ["first_check", "notes_for_next_stage"]),
    "### Decision Record", "",
    "| Date | Actor | Role | From | To | Reason | Run | Dissent |", "|---|---|---|---|---|---|---|---|",
    ...(decisionRows.length ? decisionRows : [`| ${hole} | ${hole} | ${hole} | ${hole} | ${hole} | ${hole} | ${hole} | none |`]), "",
    "### Run timeline", "",
    "| Name | Label | Command | Verdict | Blocks | Notes |", "|---|---|---|---|---|---|",
    ...(runRows.length ? runRows : [`| ${hole} | ${hole} | ${hole} | ${hole} | 0 | 0 |`]), "",
    "### Attached notes", "",
  ];
  let md = mdParts.join("\n");
  const notes = history.flatMap((run) => (run.notes ?? []).map((note) => ({ run: run.name, ...note })))
    .sort((a, b) => String(a.attached).localeCompare(String(b.attached)) || String(a.run).localeCompare(String(b.run)));
  if (!notes.length) return { md: md + "- none\n", findings: [] };
  md += "Each note body below is copied from its run.\n\n";
  for (const note of notes) {
    md += `### ${note.kind} by ${note.actor} (${note.role}) — run ${note.run} — ${note.attached}\n\n`;
    md += "Attached note follows.\n\n";
    const rendered = protectDossierNote(note.text);
    md += rendered;
    if (!rendered.endsWith("\n")) md += "\n";
    md += "\n";
  }
  return { md, findings: [] };
}

module.exports = { COMMITTEE_DENYLIST, SHEET_STATES, committeeClean, dossier, sheet, index, request };
