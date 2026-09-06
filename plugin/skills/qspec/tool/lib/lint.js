// The mechanical (M) invariants of QSPEC-CORE, plus the record and signature
// checks. Every finding carries one of four severities:
//   block   a demonstrated failure of a listed invariant; stops the spec leaving draft
//   manual  the check ran and the verdict is a person's; the finding names the act
//   warn    worth a look
//   skip    the check could not run, and says why
// Judged (J) invariants are never evaluated here; they are signed by a reviewer.
const { existsSync, readFileSync } = require("node:fs");
const yaml = require("./vendor/js-yaml/js-yaml.js");
const { readBib } = require("./bib.js");
const { catalogs, resolveProfile } = require("./catalogs.js");
const { checkRecord, checkSignature, loadRecord, recordPath } = require("./record.js");

const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;
const isList = (v) => Array.isArray(v);
const nonEmptyList = (v, n = 1) => isList(v) && v.length >= n && v.every((x) => (typeof x === "string" ? nonEmpty(x) : x != null));
const proseWords = (v) => String(v ?? "").toLocaleLowerCase().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];

function namesFourConsecutiveWords(response, check) {
  const responseWords = proseWords(response);
  const checkWords = proseWords(check);
  if (responseWords.length < 4 || checkWords.length < 4) return false;
  const responseText = responseWords.join("\0");
  for (let i = 0; i <= checkWords.length - 4; i += 1) {
    if (responseText.includes(checkWords.slice(i, i + 4).join("\0"))) return true;
  }
  return false;
}

function pointsAtCheck(reference, checks) {
  if (Number.isInteger(reference)) return reference >= 1 && reference <= checks.length;
  if (!nonEmpty(reference)) return false;
  const wanted = reference.trim().toLocaleLowerCase();
  return checks.some((check) => check.trim().toLocaleLowerCase() === wanted);
}

function checkReferenceSupplied(reference) {
  return reference != null && !(typeof reference === "string" && !nonEmpty(reference));
}

function loadSpec(file) {
  return yaml.load(readFileSync(file, "utf8"), { schema: yaml.CORE_SCHEMA });
}

function lintSpec(spec, file = "<spec>") {
  const out = [];
  const f = (rule, message, severity = "block", act) => out.push({ severity, rule, message, act, file });

  if (spec?.spec_schema !== catalogs.schema) f("M1", `spec_schema must be ${catalogs.schema}`);
  const domain = catalogs.domains[spec?.domain];
  if (!domain) { f("M1", `domain must be one of ${Object.keys(catalogs.domains).join(", ")}`); return out; }

  for (const k of ["id", "title", "owner", "date"]) if (!nonEmpty(String(spec[k] ?? ""))) f("M2", `${k} missing`);
  if (!Number.isInteger(spec.instance_version) || spec.instance_version < 1) f("M2", "instance_version must be a positive integer");
  if (!catalogs.core.states.includes(spec.status)) f("M2", `status must be one of ${catalogs.core.states.join(", ")}`);

  if (!nonEmptyList(spec.reviewers)) f("M3", "reviewers must have at least one entry");
  else if (spec.reviewers.includes(spec.owner)) f("M3", "owner may not be a reviewer");

  const qt = spec.question_type ?? {};
  if (!domain.families.includes(qt.method_family)) f("M4", `method_family must be one of ${domain.families.join(", ")}`);
  if (!domain.goals.includes(qt.knowledge_goal)) f("M4", `knowledge_goal must be one of ${domain.goals.join(", ")}`);

  if (qt.secondary_method != null) {
    if (!domain.families.includes(qt.secondary_method)) f("M5", "secondary_method is not a catalog family");
    if (qt.secondary_method === qt.method_family) f("M5", "secondary_method equals method_family");
    if (!nonEmpty(qt.rescue_rule)) f("M5", "rescue_rule required when secondary_method is set");
  }

  const inc = spec.increment ?? {};
  const cw = inc.closest_work;
  if (!isList(cw) || cw.length < 2) f("M6", "closest_work needs at least two entries");
  else cw.forEach((w, i) => { for (const k of ["cite", "settled", "still_open"]) if (!nonEmpty(w?.[k])) f("M6", `closest_work[${i}].${k} empty`); });
  for (const k of ["increment_if_this_works", "vehicle_is_not_the_contribution"]) if (!nonEmpty(inc[k])) f("M7", `increment.${k} empty`);

  const sf = spec.success_and_failure ?? {};
  for (const k of ["support_would_look_like", "failure_would_look_like", "uninteresting_even_if_true", "kill_condition"]) if (!nonEmpty(sf[k])) f("M8", `success_and_failure.${k} empty`);

  const mat = spec.materials ?? {};
  if (!catalogs.core.levels.includes(mat.access_risk)) f("M9", "materials.access_risk must be low, medium, or high");
  for (const k of ["in_hand", "blocking"]) if (!isList(mat[k])) f("M9", `materials.${k} must be a list`);
  (mat.obtainable ?? []).forEach((o, i) => {
    for (const k of ["item", "source", "horizon"]) if (!nonEmpty(o?.[k])) f("M9", `materials.obtainable[${i}].${k} empty`);
    if (!catalogs.core.levels.includes(o?.probability)) f("M9", `materials.obtainable[${i}].probability must be low, medium, or high`);
  });
  if (isList(mat.blocking) && mat.blocking.length > 0 && !(mat.obtainable ?? []).length) f("blocking-without-plan", `${mat.blocking.length} blocking material(s) and no obtainable entry naming a source and horizon`, "warn");

  const con = spec.constraints ?? {};
  if (!isList(con.safety_or_ethics)) f("M10", "constraints.safety_or_ethics must be a list");
  else for (const v of con.safety_or_ethics) if (!domain.safety.includes(v)) f("M10", `safety_or_ethics value '${v}' not in catalog`);
  if (spec.hints) {
    if (spec.hints.ceiling != null && !catalogs.core.ceiling.includes(spec.hints.ceiling)) f("M10", "hints.ceiling not a listed value");
    if (spec.hints.build_risk != null && !catalogs.core.levels.includes(spec.hints.build_risk)) f("M10", "hints.build_risk not a listed value");
    for (const [k, vals] of Object.entries(domain.hints_extra ?? {})) if (spec.hints[k] != null && !vals.includes(spec.hints[k])) f("M10", `hints.${k} not a listed value`);
  }

  const prof = spec.profile ?? {};
  const def = resolveProfile(domain, qt.method_family);
  if (prof.name !== qt.method_family) f("M11", `profile.name '${prof.name}' must equal method_family '${qt.method_family}'`);
  if (def) {
    for (const k of def.required) {
      const v = prof[k];
      const ok = isList(v) ? nonEmptyList(v, def.min_list?.[k] ?? 1) : nonEmpty(String(v ?? ""));
      if (!ok) f("M11", `profile.${k} required for ${qt.method_family}`);
    }
    for (const [k, vals] of Object.entries(def.enums ?? {})) if (!vals.includes(prof[k])) f("M11", `profile.${k} must be one of ${vals.join(", ")}`);
    if (spec.claim?.comparative === true) {
      const v = prof[def.comparator];
      const ok = isList(v) ? nonEmptyList(v) : nonEmpty(String(v ?? ""));
      if (!ok) f("M12", `claim.comparative is true but profile.${def.comparator} is empty`);
    }
  }

  if (nonEmpty(prof.design) && domain.designs && !Object.prototype.hasOwnProperty.call(domain.designs, prof.design)) {
    f("M11", `profile.design '${prof.design}' must be one of the ${spec.domain} design catalog (domain.designs): ${Object.keys(domain.designs).join(", ")}`);
  }
  const threatField = domain.threat_field;
  const threats = Array.isArray(prof[threatField]) ? prof[threatField] : [];
  threats.forEach((entry, i) => {
    if (nonEmpty(entry?.threat) && !domain.threats.includes(entry.threat)) {
      f("M11", `profile.${threatField}[${i}].threat '${entry.threat}' must be one of the ${spec.domain} threat catalog (domain.threats): ${domain.threats.join(", ")}`);
    }
  });

  // These are warning-only additions in 1.x. A named design brings its
  // catalogued standard threats with it; a response is runnable only when it
  // points at a pre-committed check or repeats at least four consecutive words
  // from one of those checks or from the kill condition.
  const threatProfile = threatField && (!domain.design_family || domain.design_family === qt.method_family);
  if (threatProfile) {
    const standard = domain.designs?.[prof.design] ?? [];
    if (standard.length) {
      const named = new Set(threats.map((entry) => entry?.threat).filter(nonEmpty));
      const missing = standard.filter((threat) => !named.has(threat));
      if (missing.length) f("threats-unaddressed", `profile.design '${prof.design}' has standard threats not named in profile.${threatField}: ${missing.join(", ")}`, "warn");
    }
    const checks = (Array.isArray(prof.precommitted_checks) ? prof.precommitted_checks : []).filter(nonEmpty);
    const kill = spec.success_and_failure?.kill_condition;
    threats.forEach((entry, i) => {
      const response = entry?.response;
      const reference = entry?.check;
      const direct = pointsAtCheck(reference, checks);
      const quoted = checks.some((check) => namesFourConsecutiveWords(response, check))
        || namesFourConsecutiveWords(response, kill);
      if (checkReferenceSupplied(reference) && !direct) {
        f("threat-without-check", `profile.${threatField}[${i}].check ${JSON.stringify(reference)} points at no profile.precommitted_checks item`, "warn");
      } else if (!direct && !quoted) {
        f("threat-without-check", `profile.${threatField}[${i}].response names no precommitted check or kill-condition clause`, "warn");
      }
    });
  }

  const claim = spec.claim ?? {};
  if (!nonEmpty(claim.one_sentence)) f("M13", "claim.one_sentence empty");
  // Section 7 states this as a property of the field, but the only enforcement
  // was in `qspec paper`, at the far end of the pipeline: a claim could be
  // signed and frozen and fail only when a document was checked against it, by
  // which point rewording it costs a new instance_version or a successor. It is
  // a warning here and a block there, because a new blocking check on an
  // instance field would be a major release (section 14).
  else if (/["{}]/.test(claim.one_sentence)) f("gist-unrepresentable", 'claim.one_sentence contains a double quote or a brace; a downstream document carries it verbatim as a gist and cannot hold either. `qspec paper` blocks on this', "warn", "reword the claim before it is signed");
  if (!nonEmpty(claim.why_it_matters)) f("M13", "claim.why_it_matters empty");
  if (typeof claim.comparative !== "boolean") f("M13", "claim.comparative must be true or false");
  for (const k of domain.claim_required) if (!nonEmpty(claim[k])) f("M13", `claim.${k} required for domain ${spec.domain}`);
  for (const c of domain.claim_conditional) if (!c.unless_family.includes(qt.method_family) && !nonEmpty(claim[c.field])) f("M13", `claim.${c.field} required unless method_family is ${c.unless_family.join("/")}`);

  if (["frozen", "superseded"].includes(spec.status) && !nonEmpty(spec.handoff?.first_check)) f("M14", "handoff.first_check required when frozen or superseded");

  const cl = spec.changelog;
  if (!isList(cl) || !cl.some((e) => e?.version === spec.instance_version)) f("M15", "changelog needs an entry whose version equals instance_version");

  if (spec.ask) for (const k of Object.keys(spec.ask)) if (!["time", "people", "access", "hardware_or_compute"].includes(k)) f("ask-key", `ask.${k} is not a listed key (time, people, access, hardware_or_compute)`, "warn");

  return out;
}

// Citation checks are project-scoped. The caller supplies a bibliography only
// after resolving the nearest QSPEC root; without one, old projects and scratch
// specs retain exactly their earlier findings.
function lintCitations(spec, file, bibliography) {
  if (!bibliography) return [];
  let bib;
  try { bib = readBib(bibliography); }
  catch (e) {
    return [{ severity: "skip", rule: "bib-parse", message: `${bibliography} could not be read: ${e.message}`, file }];
  }
  if (bib.error) {
    return [{ severity: "skip", rule: "bib-parse", message: `${bibliography} cannot be parsed at line ${bib.error.line}: ${bib.error.message}`, file }];
  }
  const findings = [];
  const incomplete = (entry) => {
    const missing = [];
    if (!entry.fields.title?.trim()) missing.push("title");
    if (!entry.fields.year?.trim()) missing.push("year");
    if (!entry.fields.doi?.trim() && !entry.fields.url?.trim()) missing.push("doi or url");
    return missing;
  };
  const works = Array.isArray(spec?.increment?.closest_work) ? spec.increment.closest_work : [];
  for (const [i, work] of works.entries()) {
    const key = typeof work?.key === "string" ? work.key.trim() : "";
    if (!key) {
      findings.push({ severity: "warn", rule: "cite-unkeyed", message: `closest_work[${i}] key '(empty)' does not resolve in references.bib`, file });
      continue;
    }
    const entry = bib.entries.get(key);
    if (!entry) {
      findings.push({ severity: "warn", rule: "cite-unresolved", message: `closest_work[${i}] key '${key}' does not resolve in references.bib`, file });
      continue;
    }
    const missing = incomplete(entry);
    if (missing.length) findings.push({ severity: "warn", rule: "bib-incomplete", message: `closest_work[${i}] key '${key}' resolves to an entry missing ${missing.join(", ")}`, file });
  }

  // Paperforge markers may appear anywhere a spec carries prose, including
  // list items and profile fields. Walk the parsed document rather than naming
  // today's fields so overlays and future additive fields get the same check.
  const visit = (value, path = "") => {
    if (typeof value === "string") {
      const marker = /\[@[A-Za-z0-9_:.+\/-]+(?:\s*;\s*@[A-Za-z0-9_:.+\/-]+)*\]/g;
      for (const match of value.matchAll(marker)) {
        const keys = match[0].slice(1, -1).split(";").map((part) => part.trim().slice(1));
        for (const key of keys) {
          const entry = bib.entries.get(key);
          if (!entry) {
            findings.push({ severity: "warn", rule: "cite-unresolved", message: `${path} marker '[@${key}]' does not resolve in references.bib`, file });
            continue;
          }
          const missing = incomplete(entry);
          if (missing.length) findings.push({ severity: "warn", rule: "bib-incomplete", message: `${path} marker '[@${key}]' resolves to an entry missing ${missing.join(", ")}`, file });
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, `${path}[${i}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) visit(child, path ? `${path}.${key}` : key);
    }
  };
  visit(spec);
  return findings;
}

// Full check of one file: M invariants, then the record and signature (M16).
function kindOf(doc) {
  if (doc?.record_schema) return "record";
  if (doc?.index_schema) return "index";
  return "spec";
}

function lintFile(file, opts = {}) {
  let spec;
  try { spec = loadSpec(file); } catch (e) { return { file, spec: null, findings: [{ severity: "block", rule: "PARSE", message: e.message, file }] }; }
  const kind = kindOf(spec);
  if (kind === "record") return { file, spec: null, kind, findings: [{ severity: "skip", rule: "not-a-spec", message: "a Decision Record; it is checked alongside its spec", file }] };
  if (kind === "index") return { file, spec: null, kind, findings: [{ severity: "skip", rule: "not-a-spec", message: "a Portfolio Index; check it with: qspec index " + file, file }] };
  const findings = lintSpec(spec, file);
  findings.push(...lintCitations(spec, file, opts.bibliography));
  if (!catalogs.domains[spec?.domain]) return { file, spec, findings };
  const rp = recordPath(file, spec, opts.record);
  const record = existsSync(rp) ? loadRecord(rp) : null;
  if (record) findings.push(...checkRecord(spec, record, rp));
  findings.push(...checkSignature(spec, record, file));
  return { file, spec, record, recordFile: rp, findings };
}

function hasBlock(findings) { return findings.some((x) => x.severity === "block"); }

function format(result) {
  const lines = [];
  const blocks = result.findings.filter((x) => x.severity === "block").length;
  const tag = blocks ? "FAIL" : "ok  ";
  lines.push(`${tag}  ${result.file}`);
  for (const x of result.findings) {
    lines.push(`    ${x.severity.padEnd(6)}  ${x.rule.padEnd(18)} ${x.message}`);
    if (x.act) lines.push(`            -> ${x.act}`);
  }
  return lines.join("\n");
}

module.exports = { loadSpec, lintSpec, lintCitations, kindOf, lintFile, hasBlock, format };
