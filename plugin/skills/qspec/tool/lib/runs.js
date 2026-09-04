// What a check saw, kept so the next edit cannot erase it. `lint` and `index`
// write one of these every time they run inside a project, passing or failing,
// so the record is a by-product of checking rather than an act somebody has to
// remember. The pattern and the reason are Paperforge's: a draft that was
// overwritten in place is gone, and git did not help because nobody committed.
// A run keeps the files themselves, not only their hashes; what is wanted
// afterwards is the lost text, and a fingerprint would not return it.
const { createHash } = require("node:crypto");
const { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, join, relative, resolve } = require("node:path");
const { catalogs } = require("./catalogs.js");

const RUNS = ".qspec/runs";

const sha = (path) => (existsSync(path) ? "sha256:" + createHash("sha256").update(readFileSync(path)).digest("hex") : null);
const slug = (label) => String(label ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const stamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

// One entry per checked file. `findings` are kept whole so a later diff can say
// which appeared and which cleared, not only how many there were.
function entry(root, file, { kind, id, instance_version, status, fingerprint, findings, recordFile }) {
  const path = relative(root, resolve(file));
  const out = {
    kind, path, sha256: sha(file),
    id: id ?? null, instance_version: instance_version ?? null, status: status ?? null, fingerprint: fingerprint ?? null,
    verdict: findings.some((x) => x.severity === "block") ? "block" : "ok",
    findings: findings.map((x) => ({ severity: x.severity, rule: x.rule, message: x.message })),
  };
  if (recordFile && existsSync(recordFile)) { out.record = relative(root, resolve(recordFile)); out.record_sha256 = sha(recordFile); }
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
      const dst = join(out, "sources", p);
      mkdirSync(dirname(dst), { recursive: true });
      copyFileSync(join(root, p), dst);
    }
  }
  const record = { label: label ?? null, recorded: new Date().toISOString(), version: catalogs.version, command, files: entries };
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
  return `${record.files.length} file(s): ${ok} ok, ${block} block`;
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
    const pa = join(root, RUNS, a.name, "sources", p), pb = join(root, RUNS, b.name, "sources", p);
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

module.exports = { RUNS, entry, write, listing, latest, load, diff, sourceDiff, summary };
