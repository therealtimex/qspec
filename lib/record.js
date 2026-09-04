// Decision Record: fingerprinting, transitions, and the acts that append to it.
//
// A reviewer signs the judged invariants against the spec as it stood. Nothing
// stamps itself, and a signature is only as good as the text it was given: so
// the record stores a fingerprint of the spec's substantive sections, and lint
// reports the signature stale when the spec has moved out from under it. The
// same design as Paperforge's accepted gists (its decision 0002).
const { createHash } = require("node:crypto");
const { existsSync, readFileSync, writeFileSync } = require("node:fs");
const { basename, dirname, join } = require("node:path");
const yaml = require("./vendor/js-yaml/js-yaml.js");
const { J_INVARIANTS, catalogs, judgedRule } = require("./catalogs.js");

// Sections whose change invalidates a signature. `handoff` is excluded because
// `first_check` is filled between signing and freeze by design; `hints` because
// they are never scored; identity and bookkeeping fields because they are not
// the question.
const FINGERPRINTED = ["claim", "question_type", "increment", "materials", "success_and_failure", "constraints", "profile"];

function canon(v) {
  if (typeof v === "string") return v.replace(/\s+/g, " ").trim();
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = canon(v[k]);
    return out;
  }
  return v ?? null;
}

function fingerprint(spec) {
  const body = {};
  for (const k of FINGERPRINTED) body[k] = canon(spec?.[k]);
  return "sha256:" + createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

const TRANSITIONS = [
  { from: ["draft"], to: "specified", roles: ["reviewer"], needs: ["signed_invariants", "spec_fingerprint"] },
  { from: ["specified"], to: "selectable", roles: ["owner"], needs: [] },
  // Withdrawal. Before 1.2 the owner's only exit from `selectable` was `killed`,
  // so pulling a spec out of a round meant ending it.
  { from: ["selectable"], to: "specified", roles: ["owner"], needs: ["reason"] },
  { from: ["selectable"], to: "frozen", roles: ["decision_maker"], needs: [] },
  { from: ["selectable"], to: "deferred", roles: ["decision_maker"], needs: ["revisit_by"] },
  { from: ["deferred"], to: "selectable", roles: ["owner"], needs: [] },
  { from: ["specified", "selectable", "deferred"], to: "draft", roles: ["reviewer"], needs: ["cited_invariant"] },
  { from: ["frozen"], to: "superseded", roles: ["owner"], needs: ["successor"] },
  { from: ["draft", "specified", "selectable", "deferred", "frozen"], to: "killed", roles: ["owner", "decision_maker"], needs: ["reason"] },
];

function allowed(from, to, role) {
  return TRANSITIONS.find((t) => t.from.includes(from) && t.to === to && t.roles.includes(role)) ?? null;
}

// `owner` and `reviewer` are checked against fields of the spec. `decision_maker`
// is named by no field of a spec: the committee running a round is named by the
// round's Index. So the binding exists only when an Index is in hand, and when it
// is not, the act says so rather than implying an authority it did not check.
// None of this authenticates anyone; see QSPEC-CORE section 3.
function bindDecisionMaker(entry, index) {
  if (entry.role !== "decision_maker" || !index) return null;
  const named = String(index.decision_maker ?? "").trim();
  if (!named) return `the index for round ${index.round ?? "(unnamed)"} names no decision_maker`;
  if (entry.actor !== named) return `'${entry.actor}' is not the decision-maker for round ${index.round ?? "(unnamed)"} (${named})`;
  return null;
}

// The ids an Index lists whose specs actually reached a freeze. Ground truth for
// the one-freeze-per-round cap: a status is set only by a recorded act, while
// the Index's own `frozen` list is written by hand. `superseded` counts, because
// it is a freeze that has since been replaced, not a freeze that never happened.
const FROZE = ["frozen", "superseded"];

function frozenInRound(index, specsById) {
  if (!specsById) return null;
  return (index?.entries ?? []).map((e) => e.id).filter((id) => FROZE.includes(specsById[id]?.status));
}

// Where a spec's record lives: beside it as <name>.record.yaml, or under
// records/<id>.record.yaml. --record overrides both.
function recordPath(specFile, spec, override) {
  if (override) return override;
  const dir = dirname(specFile);
  const sib = join(dir, basename(specFile).replace(/\.ya?ml$/, "") + ".record.yaml");
  if (existsSync(sib)) return sib;
  const byId = join(dir, "records", `${spec?.id}.record.yaml`);
  if (existsSync(byId)) return byId;
  return sib; // the path a new record will be written to
}

function loadRecord(path) {
  if (!existsSync(path)) return null;
  return yaml.load(readFileSync(path, "utf8"), { schema: yaml.CORE_SCHEMA });
}

function saveRecord(path, record) {
  writeFileSync(path, yaml.dump(record, { lineWidth: 100, noRefs: true }));
}

// The latest draft -> specified entry, which is the one a signature check reads.
function signingEntry(record) {
  const entries = record?.entries ?? [];
  for (let i = entries.length - 1; i >= 0; i--) if (entries[i].from === "draft" && entries[i].to === "specified") return entries[i];
  return null;
}

const nonEmpty = (v) => typeof v === "string" && v.trim().length > 0;

// Mechanical checks over a record against its spec. Returns findings in the
// four-severity vocabulary.
function checkRecord(spec, record, recordFile) {
  const out = [];
  const f = (severity, rule, message, act) => out.push({ severity, rule, message, act, file: recordFile });
  if (record.record_schema !== "QSPEC-DR/1.0") f("block", "DR-schema", "record_schema must be QSPEC-DR/1.0");
  if (record.spec_id !== spec.id) f("block", "DR-id", `record spec_id '${record.spec_id}' does not match spec id '${spec.id}'`);
  const entries = Array.isArray(record.entries) ? record.entries : [];
  if (!Array.isArray(record.entries)) f("block", "DR-entries", "entries must be a list");
  let state = "draft";
  entries.forEach((e, i) => {
    const at = `entries[${i}]`;
    if (!["owner", "reviewer", "decision_maker"].includes(e.role)) f("block", "DR-role", `${at}: role must be owner, reviewer, or decision_maker`);
    if (!nonEmpty(String(e.actor ?? ""))) f("block", "DR-actor", `${at}: actor missing`);
    if (!nonEmpty(String(e.date ?? ""))) f("block", "DR-date", `${at}: date missing`);
    if (e.from !== state) f("block", "DR-sequence", `${at}: from '${e.from}' but the record's state was '${state}'`);
    const t = allowed(e.from, e.to, e.role);
    if (!t) f("block", "DR-transition", `${at}: ${e.from} -> ${e.to} by ${e.role} is not a listed transition`);
    else for (const k of t.needs) {
      const v = e[k];
      const ok = Array.isArray(v) ? v.length > 0 : nonEmpty(String(v ?? ""));
      if (!ok) f("block", "DR-requirement", `${at}: ${e.from} -> ${e.to} requires ${k}`);
    }
    if (e.role === "owner" && e.actor !== spec.owner) f("block", "DR-owner", `${at}: role owner but actor '${e.actor}' is not the spec owner`);
    if (e.role === "decision_maker" && !nonEmpty(String(e.round ?? ""))) f("warn", "unbound-decision", `${at}: ${e.to} by '${e.actor}' as decision_maker names no round, so the role was claimed and checked against nothing`, "re-run the act with --index <round.yaml>, or record the round in the Index");
    if (e.role === "reviewer" && !(spec.reviewers ?? []).includes(e.actor)) f("block", "DR-reviewer", `${at}: role reviewer but actor '${e.actor}' is not in reviewers`);
    if (e.role === "reviewer" && e.actor === spec.owner) f("block", "DR-reviewer", `${at}: the owner may not sign as reviewer`);
    if (Number.isInteger(e.instance_version) && e.instance_version > spec.instance_version) f("block", "DR-version", `${at}: instance_version ${e.instance_version} is ahead of the spec`);
    for (const d of e.dissent ?? []) if (!nonEmpty(d?.reviewer) || !nonEmpty(d?.point)) f("block", "DR-dissent", `${at}: dissent entries need reviewer and point`);
    state = e.to ?? state;
  });
  if (entries.length && state !== spec.status) f("block", "status-mismatch", `record ends in '${state}' but the spec says '${spec.status}'`, `set status: ${state} in the spec, or append the missing transition with: qspec transition`);
  return out;
}

// The signature check that lint runs. Returns findings; `null` record means
// no record file exists.
function checkSignature(spec, record, specFile) {
  const out = [];
  const f = (severity, rule, message, act) => out.push({ severity, rule, message, act, file: specFile });
  const signAct = `qspec sign ${specFile} --by <reviewer>`;
  if (spec.status === "draft") {
    if (!record) f("skip", "J-signature", "no Decision Record yet; the spec is draft, so nothing has been signed");
    return out;
  }
  const s = record ? signingEntry(record) : null;
  if (!s) { f("manual", "J-unsigned", `status is '${spec.status}' but no reviewer has signed J1-J7`, signAct); return out; }
  const signed = new Set(s.signed_invariants ?? []);
  const missing = J_INVARIANTS.filter((j) => !signed.has(j));
  if (missing.length) f("block", "J-incomplete", `signature covers ${[...signed].join(", ") || "nothing"}; missing ${missing.join(", ")}`, signAct);
  if (!s.spec_fingerprint) f("manual", "J-unfingerprinted", "signature carries no spec_fingerprint, so staleness cannot be checked", signAct);
  else if (s.spec_fingerprint !== fingerprint(spec)) f("block", "stale-signature", `the spec changed after ${s.actor} signed on ${s.date}; the signature no longer covers this text`, `reread and re-sign: ${signAct}`);
  // J7 is whatever the overlay says for this profile, so a signature is only
  // meaningful against a stated rule. Drift is a warning, not a block: an
  // overlay wording fix should not invalidate a portfolio.
  const rule = judgedRule(spec);
  const signedRule = s.judged_rules?.J7 ?? null;
  if (signedRule == null) f("skip", "J7-unrecorded", `signed before the overlay's J7 rule was recorded, so drift cannot be checked${rule ? `; the rule now reads: ${rule}` : ""}`, signAct);
  else if (rule == null) f("warn", "overlay-drift", `the signature records a J7 rule but the overlay states none for profile '${spec.question_type?.method_family}'`, signAct);
  else if (rule !== signedRule) f("warn", "overlay-drift", `the overlay's J7 rule changed since ${s.actor} signed on ${s.date}; signed: ${signedRule} | now: ${rule}`, `reread J7 and re-sign: ${signAct}`);
  return out;
}

// Acts. Each appends one entry and returns it; the caller saves.
function appendEntry(record, spec, entry, opts = {}) {
  record.entries = record.entries ?? [];
  const state = record.entries.length ? record.entries[record.entries.length - 1].to : "draft";
  if (entry.from == null) entry.from = state;
  if (entry.from !== state) throw new Error(`the record is in '${state}', not '${entry.from}'`);
  const t = allowed(entry.from, entry.to, entry.role);
  if (!t) throw new Error(`${entry.from} -> ${entry.to} by ${entry.role} is not a listed transition`);
  for (const k of t.needs) {
    const v = entry[k];
    const ok = Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== "";
    if (!ok) throw new Error(`${entry.from} -> ${entry.to} requires ${k}`);
  }
  if (entry.role === "owner" && entry.actor !== spec.owner) throw new Error(`'${entry.actor}' is not the owner (${spec.owner})`);
  if (entry.role === "reviewer" && !(spec.reviewers ?? []).includes(entry.actor)) throw new Error(`'${entry.actor}' is not in reviewers (${(spec.reviewers ?? []).join(", ")})`);
  if (entry.role === "reviewer" && entry.actor === spec.owner) throw new Error("the owner may not act as reviewer");
  const unbound = bindDecisionMaker(entry, opts.index);
  if (unbound) throw new Error(unbound);
  const full = {
    date: entry.date, instance_version: spec.instance_version, actor: entry.actor, role: entry.role,
    from: entry.from, to: entry.to, reason: entry.reason ?? "",
    round: entry.round ?? opts.index?.round ?? null,
    signed_invariants: entry.signed_invariants ?? null, spec_fingerprint: entry.spec_fingerprint ?? null,
    judged_rules: entry.judged_rules ?? null,
    cited_invariant: entry.cited_invariant ?? null, revisit_by: entry.revisit_by ?? null,
    successor: entry.successor ?? null, dissent: entry.dissent ?? [],
    // the run the act was taken on, when the actor named one: what they read,
    // and the notes beside it, are then one name away from the act
    run: entry.run ?? null,
  };
  record.entries.push(full);
  return full;
}

function newRecord(spec) {
  return { record_schema: "QSPEC-DR/1.0", spec_id: spec.id, entries: [] };
}

// Rewrite the top-level status line in place, preserving the rest of the file
// byte for byte (specs carry comments that a YAML dump would drop).
function setStatus(specFile, to) {
  const text = readFileSync(specFile, "utf8");
  const re = /^status:[^\n]*$/m;
  if (!re.test(text)) throw new Error("no top-level status line found");
  if (!catalogs.core.states.includes(to)) throw new Error(`unknown state ${to}`);
  writeFileSync(specFile, text.replace(re, `status: ${to}`));
}

module.exports = { FINGERPRINTED, FROZE, fingerprint, TRANSITIONS, allowed, bindDecisionMaker, frozenInRound, recordPath, loadRecord, saveRecord, signingEntry, checkRecord, checkSignature, appendEntry, newRecord, setStatus };
