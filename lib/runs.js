// What a check saw, kept so the next edit cannot erase it. `lint` and `index`
// write one of these every time they run inside a project, passing or failing,
// so the record is a by-product of checking rather than an act somebody has to
// remember. The pattern and the reason are Paperforge's: a draft that was
// overwritten in place is gone, and git did not help because nobody committed.
// A run keeps the files themselves, not only their hashes; what is wanted
// afterwards is the lost text, and a fingerprint would not return it.
const { createHash } = require("node:crypto");
const { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } = require("node:fs");
const { basename, dirname, isAbsolute, join, relative, resolve } = require("node:path");
const { catalogs } = require("./catalogs.js");

const RUNS = ".qspec/runs";

const sha = (path) => (existsSync(path) ? "sha256:" + createHash("sha256").update(readFileSync(path)).digest("hex") : null);
const slug = (label) => String(label ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

// One entry per checked file. `findings` are kept whole so a later diff can say
// which appeared and which cleared, not only how many there were.
function entry(root, file, { kind, id, instance_version, status, fingerprint, findings, recordFile, detail, rendered }) {
  const path = relative(root, resolve(file));
  const out = {
    kind, path, sha256: sha(file),
    id: id ?? null, instance_version: instance_version ?? null, status: status ?? null, fingerprint: fingerprint ?? null,
    verdict: findings.some((x) => x.severity === "block") ? "block" : "ok",
    findings: findings.map((x) => ({ severity: x.severity, rule: x.rule, message: x.message })),
  };
  if (recordFile && existsSync(recordFile)) { out.record = relative(root, resolve(recordFile)); out.record_sha256 = sha(recordFile); }
  // what a command saw that is not a finding: the judged rules `sign --show`
  // printed, or the markdown a rendering produced
  if (detail) out.detail = detail;
  if (rendered != null) out.rendered = rendered;
  return out;
}

function write(root, command, entries, label = null) {
  const base = join(root, RUNS);
  // Two runs inside one second must not share a directory: the second would
  // overwrite the first, which is the exact failure this exists to stop. The
  // suffix counts every run of this second, labelled or not, so names inside a
  // burst stay distinct; order is read from `recorded`, which keeps milliseconds.
  const at = stamp();
  const burst = existsSync(base) ? readdirSync(base).filter((d) => d.startsWith(at)).length : 0;
  let name = label ? `${at}-${slug(label)}` : at;
  if (burst) name = `${name}.${burst + 1}`;
  for (let n = burst + 2; existsSync(join(base, name, "record.json")); n++) name = `${label ? `${at}-${slug(label)}` : at}.${n}`;
  const out = join(base, name);
  mkdirSync(join(out, "sources"), { recursive: true });
  for (const e of entries) {
    for (const p of [e.path, e.record]) {
      if (!p) continue;
      // a checked document may live outside the project, as a Paperforge
      // paper does; it is kept under external/ rather than at a path that
      // would climb out of the run directory
      const inside = !p.startsWith("..") && !isAbsolute(p);
      const dst = join(out, "sources", inside ? p : join("external", basename(p)));
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(resolve(root, p), dst);
      if (!inside && p === e.path) e.stored = `sources/external/${basename(p)}`;
    }
    if (e.rendered != null) {
      // the sheet or request as a person read it, kept whole: a rendering is
      // reproducible from the spec only while the spec is what it was
      mkdirSync(join(out, "rendered"), { recursive: true });
      const name = `${e.path.replace(/[\\/]/g, "_").replace(/\.ya?ml$/, "")}.md`;
      writeFileSync(join(out, "rendered", name), e.rendered);
      e.rendered = `rendered/${name}`;
    }
  }
  const record = { label: label ?? null, recorded: new Date().toISOString(), version: catalogs.version, command, files: entries, notes: [] };
  writeFileSync(join(out, "record.json"), JSON.stringify(record, null, 2) + "\n");
  return { name, dir: out, record };
}

// Every recorded run, oldest first.
function listing(root) {
  const base = join(root, RUNS);
  if (!existsSync(base)) return [];
  const out = [];
  for (const d of readdirSync(base).sort()) {
    const p = join(base, d, "record.json");
    if (!existsSync(p)) continue;
    try { out.push({ name: d, record: JSON.parse(readFileSync(p, "utf8")) }); } catch { /* not a run */ }
  }
  // chronological, not lexical: a labelled name and a suffixed one sort
  // differently from the order they were written in
  return out.sort((x, y) => (x.record.recorded < y.record.recorded ? -1 : x.record.recorded > y.record.recorded ? 1 : x.name < y.name ? -1 : 1));
}

function latest(root) {
  const all = listing(root);
  return all.length ? all[all.length - 1] : null;
}

// One run by name, by a unique prefix of it, or by its label.
function load(root, name) {
  const all = listing(root);
  const exact = all.find((r) => r.name === name);
  if (exact) return exact;
  const matches = all.filter((r) => r.name.startsWith(name) || (r.record.label && slug(r.record.label) === slug(name)));
  if (matches.length === 1) return matches[0];
  if (!matches.length) throw new Error(`no run matches '${name}'; \`qspec runs\` lists them`);
  throw new Error(`'${name}' matches ${matches.length} runs: ${matches.map((m) => m.name).join(", ")}`);
}

function summary(record) {
  const ok = record.files.filter((f) => f.verdict === "ok").length;
  const block = record.files.length - ok;
  const notes = (record.notes ?? []).length;
  return `${record.files.length} file(s): ${ok} ok, ${block} block${notes ? `; ${notes} note(s)` : ""}`;
}

// A note is what a role said about a run: a handoff, a review, a decision.
// It is copied whole and never summarised. Facts stay in `files`; judgments
// live here, beside them, with the name of whoever made them.
const KINDS = ["handoff", "review", "decision", "note"];

function attach(root, runName, file, { actor, role, kind = "note" }) {
  if (!actor || !String(actor).trim()) throw new Error("attach needs --by <actor>");
  if (!role || !String(role).trim()) throw new Error("attach needs --role <role>");
  if (!KINDS.includes(kind)) throw new Error(`--kind must be one of ${KINDS.join(", ")}`);
  const src = resolve(file);
  if (!existsSync(src)) throw new Error(`${file}: no such file`);
  const run = load(root, runName);
  const dir = join(root, RUNS, run.name);
  mkdirSync(join(dir, "notes"), { recursive: true });
  const ext = (src.match(/\.[A-Za-z0-9]+$/) || [".md"])[0];
  const base = `${stamp()}-${kind}-${slug(actor) || "anonymous"}`;
  let name = `${base}${ext}`;
  for (let n = 2; existsSync(join(dir, "notes", name)); n++) name = `${base}.${n}${ext}`;
  copyFileSync(src, join(dir, "notes", name));
  const note = { kind, actor: String(actor).trim(), role: String(role).trim(), path: `notes/${name}`, sha256: sha(src), attached: new Date().toISOString() };
  run.record.notes = [...(run.record.notes ?? []), note];
  writeFileSync(join(dir, "record.json"), JSON.stringify(run.record, null, 2) + "\n");
  return { run: run.name, note };
}

// Notes attached to runs that include this spec, after a given date. Day
// granularity on the date, because that is what a Decision Record carries.
function notesSince(root, specRelPath, sinceDate = null) {
  const out = [];
  for (const r of listing(root)) {
    if (!r.record.files.some((f) => f.path === specRelPath)) continue;
    for (const n of r.record.notes ?? []) if (!sinceDate || n.attached.slice(0, 10) > sinceDate) out.push({ run: r.name, ...n });
  }
  return out;
}

// The run, its files, and every note as written.
function show(root, runName) {
  const run = load(root, runName);
  const r = run.record;
  const lines = [`${run.name}  ${r.label ?? "-"}  ${r.command}  recorded ${r.recorded}  qspec ${r.version}`];
  for (const f of r.files) {
    lines.push(`  ${f.path}  ${f.kind}${f.id ? `  ${f.id}@${f.instance_version}` : ""}${f.status ? `  ${f.status}` : ""}  ${f.verdict}${f.fingerprint ? `  ${f.fingerprint.slice(0, 23)}...` : ""}`);
    for (const x of f.findings) lines.push(`      ${x.severity.padEnd(6)} ${x.rule.padEnd(18)} ${x.message}`);
    if (f.rendered) lines.push(`      rendered: ${f.rendered}`);
  }
  const notes = r.notes ?? [];
  lines.push(notes.length ? `  notes (${notes.length}):` : "  notes: none; `qspec attach` adds a handoff, review, or decision to this run");
  for (const n of notes) {
    lines.push("", `  --- ${n.kind} by ${n.actor} (${n.role}) at ${n.attached}  ${n.path}`);
    let text = "";
    try { text = readFileSync(join(root, RUNS, run.name, n.path), "utf8"); } catch { text = "(note file missing)"; }
    lines.push(...text.replace(/\s+$/, "").split("\n").map((l) => `  ${l}`));
  }
  return lines;
}

// What changed between two runs, per file. The distinction worth making is the
// one a changelog line cannot: whether the fingerprinted text moved, whether
// only wording outside it did, and which findings appeared or cleared.
function diff(a, b) {
  const byPath = (r) => Object.fromEntries(r.files.map((f) => [f.path, f]));
  const A = byPath(a.record), B = byPath(b.record);
  const out = { added: [], removed: [], files: [] };
  for (const p of Object.keys(B)) if (!A[p]) out.added.push(p);
  for (const p of Object.keys(A)) if (!B[p]) out.removed.push(p);
  const key = (x) => `${x.severity} ${x.rule} ${x.message}`;
  for (const p of Object.keys(A).filter((p) => B[p])) {
    const x = A[p], y = B[p];
    const before = new Set(x.findings.map(key)), after = new Set(y.findings.map(key));
    out.files.push({
      path: p,
      change: x.sha256 === y.sha256 ? "unchanged" : x.fingerprint && y.fingerprint && x.fingerprint === y.fingerprint ? "reworded" : "rewritten",
      status: [x.status, y.status], verdict: [x.verdict, y.verdict], version: [x.instance_version, y.instance_version],
      record: x.record_sha256 === y.record_sha256 ? "unchanged" : x.record_sha256 || y.record_sha256 ? "changed" : "none",
      appeared: y.findings.filter((f) => !before.has(key(f))), cleared: x.findings.filter((f) => !after.has(key(f))),
    });
  }
  return out;
}

// A unified diff of the stored sources, computed from what was checked, so no
// repository is needed and nothing a rewritten history took away is missing.
function sourceDiff(root, a, b, only = null) {
  const lines = [], missing = [];
  const paths = [...new Set([...a.record.files, ...b.record.files].map((f) => f.path))].filter((p) => !only || p.includes(only)).sort();
  for (const p of paths) {
    const stored = (r) => r.record.files.find((f) => f.path === p)?.stored ?? join("sources", p);
    const pa = join(root, RUNS, a.name, stored(a)), pb = join(root, RUNS, b.name, stored(b));
    if (!existsSync(pa) || !existsSync(pb)) { missing.push(p); continue; }
    const ta = readFileSync(pa, "utf8"), tb = readFileSync(pb, "utf8");
    if (ta === tb) continue;
    lines.push(`--- ${a.name}/${p}`, `+++ ${b.name}/${p}`, ...unified(ta.split("\n"), tb.split("\n")));
  }
  return { lines, missing };
}

// Longest-common-subsequence line diff with three lines of context. Small
// files only, which a spec is; there is no dependency to vendor for this.
function unified(a, b, context = 3) {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const ops = [];
  for (let i = 0, j = 0; i < n || j < m;) {
    if (i < n && j < m && a[i] === b[j]) { ops.push([" ", a[i], i, j]); i++; j++; }
    else if (i < n && (j >= m || L[i + 1][j] >= L[i][j + 1])) { ops.push(["-", a[i], i, j]); i++; }
    else { ops.push(["+", b[j], i, j]); j++; }
  }
  const keep = new Set();
  ops.forEach((op, k) => { if (op[0] !== " ") for (let d = -context; d <= context; d++) if (ops[k + d]) keep.add(k + d); });
  const out = [];
  let hunk = null;
  ops.forEach((op, k) => {
    if (!keep.has(k)) { if (hunk) { out.push(...hunk.lines); hunk = null; } return; }
    if (!hunk) { hunk = { lines: [`@@ -${op[2] + 1} +${op[3] + 1} @@`] }; }
    hunk.lines.push(op[0] + op[1]);
  });
  if (hunk) out.push(...hunk.lines);
  return out;
}

module.exports = { RUNS, KINDS, entry, write, listing, latest, load, diff, sourceDiff, summary, attach, notesSince, show };
