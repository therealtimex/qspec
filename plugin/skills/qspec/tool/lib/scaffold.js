// `init` prepares a directory to hold specs, `new` copies a domain template with
// the id set, and `doctor` says whether the guidance `init` wrote still describes
// the tool. Files, never fields: nothing here writes a claim, a citation, or an
// ask. The pattern is Paperforge's: a scaffolded project carries its own agent
// guidance, and a stamp records what wrote it so drift is a visible failure.
const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync } = require("node:fs");
const { basename, dirname, join, relative, resolve } = require("node:path");
const yaml = require("./vendor/js-yaml/js-yaml.js");
const { catalogs } = require("./catalogs.js");
const { kindOf } = require("./lint.js");

const STAMP = ".qspec/scaffold.json";
const MARK_OPEN = "<!-- qspec:project-guidance -->";
const MARK_CLOSE = "<!-- /qspec:project-guidance -->";
// Named once, in the order `help` lists them. The guidance names commands, so a
// command added or removed changes what `init` writes without touching the
// template, and the fingerprint has to notice that.
const COMMANDS = ["init", "new", "doctor", "runs", "attach", "report", "lint", "fingerprint", "sign", "transition", "sheet", "index", "request", "paper"];
const TEMPLATES = join(__dirname, "..", "templates");
const VERSION = catalogs.version;

const today = () => new Date().toISOString().slice(0, 10);

// What `init` writes into AGENTS.md. Only what init knows: the path it was run
// from, the layout it just made, the round it named, and the rules the core
// states. Deliberately not an agent manual: a generated manual has slots the
// generator cannot fill, and a slot left empty long enough reads as a fact.
const GUIDANCE = `${MARK_OPEN}
## QSPEC project: {title}

This directory holds Question Specs, their Decision Records, and the Portfolio
Index of each selection round. What leaves this directory is a spec that lints
clean, is signed by a reviewer who is not its owner, and is offered into a round
by its owner. A memo, a literature review, or a ranked list of topics is the
material a spec is written from, not a deliverable of this directory.

The tool lives outside this project and is not on PATH. Invoke it by path:

\`\`\`bash
{invocation} doctor                                   # this project's state; is this guidance current
{invocation} new <Q-id> --domain <social|natural|engineering> --slug <short-name>
{invocation} lint specs/<Q-id>_<slug>.yaml            # M invariants; fix the spec until nothing blocks
{invocation} sign specs/<Q-id>_<slug>.yaml --by <reviewer> --show   # the seven rules a reviewer signs
{invocation} index specs/index-{round}.yaml --specs specs           # the round's Index and its checks
{invocation} sheet specs/<Q-id>_<slug>.yaml --index specs/index-{round}.yaml --out sheets/<Q-id>.md
{invocation} request specs/<Q-id>_<slug>.yaml --out requests/<Q-id>.md   # frozen only; the Paperforge handoff
{invocation} runs                                     # every lint and index run recorded here, with the files as they stood
{invocation} runs --diff <a>,<b> --sources            # what changed between two of them, and which findings moved
{invocation} attach <run> <handoff.md> --by <you> --role <role> --kind handoff   # keep what you concluded beside the run
{invocation} runs show <run>                          # a run, its findings, and every note as written
{invocation} report "what happened"                   # a note on what you had to work around; solve it and report it
\`\`\`

- Every field of a spec is written by a person. Leave a field empty and say so
  rather than fill it plausibly: an empty field is a \`block\` the author can see,
  an invented citation or an estimated ask is not.
- {brief}
- \`specs/\` holds one \`<Q-id>_<slug>.yaml\` per question and, beside it, the
  tool-written \`<Q-id>_<slug>.record.yaml\`. Never edit a record by hand; append
  the right act with \`sign\` or \`transition\`, and never edit \`status\` yourself.
- \`specs/index-{round}.yaml\` is this round's Index: the decision-maker it names,
  the ranking, and the recommended action per spec. \`claim_20_words\` and
  \`rank\` are a person's; the tool checks them and never derives them.
- If lint blocks, fix the spec. Do not bypass the gate.
- Signing is a reviewer's act and freezing is a decision-maker's. Do not sign or
  freeze as a person you are not; say which person must run the act.
- \`sheets/\` and \`requests/\` are renderings. Regenerate them; do not edit them.
- Every check is recorded under \`.qspec/runs/\` with the files it saw, passing or
  failing. Do not delete or gitignore it: it is how a draft that was overwritten
  can be put beside the one that replaced it. When you hand off, \`attach\` the
  handoff to the run you cite, so the reasoning stays beside the text it was
  about; when a person signs or freezes, they cite that run with \`--run\`. A
  note is not an act: \`lint\` says so until someone acts. When you work around
  the tool, \`report\` it in a sentence; the note carries the facts.
${MARK_CLOSE}
`;

// Claude Code reads CLAUDE.md and nothing else; every other agent reads
// AGENTS.md. One file under both names, so there is nothing to keep in step.
const CLAUDE_IMPORT = `@AGENTS.md

<!-- Claude Code reads this file; every other agent reads AGENTS.md. The line
     above imports that one, because this filesystem would not take a link. -->
`;

// The template, not the rendered file: a project's AGENTS.md carries its own
// title and its own absolute entry point, and hashing those would give every
// project a different answer to a question about qspec.
function fingerprint() {
  return createHash("sha256").update(GUIDANCE + "\0" + COMMANDS.join(" ")).digest("hex").slice(0, 16);
}

function render(template, vars) {
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

function titleFrom(dir) {
  return basename(resolve(dir)).replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function indexText(round, decisionMaker) {
  return [
    `# Portfolio Index for round ${round}. Schema: QSPEC-CORE.md section 11.`,
    "# Check: qspec index this-file.yaml --specs specs",
    "index_schema: QSPEC-INDEX/1.0",
    `round: ${JSON.stringify(String(round))}`,
    `date: ${today()}`,
    `decision_maker: ${JSON.stringify(String(decisionMaker ?? ""))}`,
    "entries: []",
    "frozen: []",
    "exception: null",
    "",
  ].join("\n");
}

function insideWorkTree(dir) {
  const r = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: dir, encoding: "utf8" });
  return r.status === 0 && r.stdout.trim() === "true";
}

function stamp(root, facts) {
  const path = join(root, STAMP);
  mkdirSync(dirname(path), { recursive: true });
  const { created, ...rest } = facts;
  writeFileSync(path, JSON.stringify({ version: VERSION, agents: fingerprint(), created: created ?? new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), ...rest }, null, 2) + "\n");
  return path;
}

// What `doctor` should say about a project's guidance. Three answers, and the
// third matters: a project with no stamp has no record of what wrote it, and
// saying nothing would report it as current.
function drift(root) {
  const path = join(root, STAMP);
  if (!existsSync(path)) return { state: "unstamped", version: null, why: `no record of what scaffolded this project; ${STAMP} is missing` };
  let found;
  try { found = JSON.parse(readFileSync(path, "utf8")); } catch { found = null; }
  if (!found || typeof found !== "object" || Array.isArray(found)) return { state: "unstamped", version: null, why: `${STAMP} does not hold a scaffold record` };
  if (found.agents === fingerprint()) return { state: "current", version: found.version, why: "AGENTS.md carries what `init` would write now", facts: found };
  return { state: "stale", version: found.version, why: `AGENTS.md is not what \`init\` would write now; written by ${found.version ?? "an unknown version"}, this tool is ${VERSION}`, facts: found };
}

function findRoot(from) {
  let dir = resolve(from);
  for (;;) {
    if (existsSync(join(dir, STAMP))) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

// Rewrite only what init wrote: the block between the markers in AGENTS.md,
// and the stamp. Nothing outside the markers is touched, which is what makes
// this safe to run on a file somebody else also owns. The facts init was given
// are kept from the stamp; the invocation path is taken from this run.
function refresh(directory, { invocation = "qspec" } = {}) {
  const root = resolve(directory);
  const stampPath = join(root, STAMP);
  if (!existsSync(stampPath)) throw new Error(`${root} is not a QSPEC project (${STAMP} missing); run \`qspec init --into ${root}\` without --refresh`);
  let facts;
  try { facts = JSON.parse(readFileSync(stampPath, "utf8")); } catch { throw new Error(`${STAMP} does not hold a scaffold record; refresh cannot tell what init was given`); }
  const agentsPath = join(root, "AGENTS.md");
  const block = render(GUIDANCE, {
    title: facts.title ?? titleFrom(root), invocation, round: facts.round ?? "",
    brief: facts.brief
      ? `The research request is at \`${facts.brief}\`. Specs are written from it and cite it; they do not restate it.`
      : "No research request is recorded here. Say in each spec where its question came from.",
  });
  const written = [];
  const text = existsSync(agentsPath) ? readFileSync(agentsPath, "utf8") : "";
  const open = text.indexOf(MARK_OPEN), close = text.indexOf(MARK_CLOSE);
  if (open >= 0 && close > open) {
    writeFileSync(agentsPath, text.slice(0, open) + block.trimEnd() + text.slice(close + MARK_CLOSE.length));
    written.push("AGENTS.md (QSPEC block rewritten; nothing outside the markers touched)");
  } else if (text) {
    writeFileSync(agentsPath, text.replace(/\s*$/, "") + "\n\n" + block);
    written.push("AGENTS.md (QSPEC block was missing; appended below what was there)");
  } else {
    writeFileSync(agentsPath, `# ${facts.title ?? titleFrom(root)}\n\n${block}`);
    written.push("AGENTS.md (was missing; written)");
  }
  const { version: _v, agents: _a, created, ...rest } = facts;
  stamp(root, { ...rest, invocation, created: created ?? undefined, refreshed: new Date().toISOString().replace(/\.\d{3}Z$/, "Z") });
  written.push(STAMP);
  return { root, written };
}

function create(directory, { title, round, decisionMaker, brief, domain, append = false, git = true, invocation = "qspec" } = {}) {
  const root = resolve(directory);
  if (existsSync(join(root, STAMP))) throw new Error(`${root} is already a QSPEC project (${STAMP} exists); \`qspec init --refresh --into ${root}\` rewrites the guidance block, \`qspec doctor\` reports on it`);
  if (domain != null && !catalogs.domains[domain]) throw new Error(`domain must be one of ${Object.keys(catalogs.domains).join(", ")}`);
  const agentsPath = join(root, "AGENTS.md");
  const hadAgents = existsSync(agentsPath) || isLink(agentsPath);
  // Refused rather than replaced: an AGENTS.md that init did not write belongs
  // to someone, and in a RealTimeX loops workspace it is the shim the loops
  // doctor requires. --append keeps it above the block.
  if (hadAgents && !append) throw new Error(`${agentsPath} exists and was not written by qspec; pass --append to add the QSPEC block below it, or choose another directory`);
  const indexName = `index-${round}.yaml`;
  if (existsSync(join(root, "specs", indexName))) throw new Error(`specs/${indexName} exists; this round is already prepared`);
  // Relative when the request lives inside the project, so the project stays
  // movable; absolute when it does not, because a path of ../../.. says
  // nothing to a reader and breaks the first time either side moves.
  const briefRel = brief ? (relative(root, resolve(brief)).startsWith("..") ? resolve(brief) : relative(root, resolve(brief)) || ".") : null;
  if (brief && !existsSync(resolve(brief))) throw new Error(`--brief ${brief}: no such file`);

  const written = [];
  for (const d of ["specs", "sheets", "requests"]) mkdirSync(join(root, d), { recursive: true });
  writeFileSync(join(root, "specs", indexName), indexText(round, decisionMaker));
  written.push(`specs/${indexName}`);
  for (const d of ["sheets", "requests"]) { writeFileSync(join(root, d, ".gitkeep"), ""); written.push(`${d}/.gitkeep`); }

  const block = render(GUIDANCE, {
    title, invocation, round,
    brief: briefRel
      ? `The research request is at \`${briefRel}\`. Specs are written from it and cite it; they do not restate it.`
      : "No research request is recorded here. Say in each spec where its question came from.",
  });
  if (hadAgents) {
    const text = readFileSync(agentsPath, "utf8");
    writeFileSync(agentsPath, text.replace(/\s*$/, "") + "\n\n" + block);
    written.push("AGENTS.md (QSPEC block appended below what was there)");
  } else {
    writeFileSync(agentsPath, `# ${title}\n\n${block}`);
    written.push("AGENTS.md");
  }
  const claude = join(root, "CLAUDE.md");
  if (existsSync(claude) || isLink(claude)) written.push("CLAUDE.md (left as it was)");
  else {
    try { symlinkSync("AGENTS.md", claude); written.push("CLAUDE.md -> AGENTS.md"); }
    catch { writeFileSync(claude, CLAUDE_IMPORT); written.push("CLAUDE.md (an @AGENTS.md import: this filesystem refused a link)"); }
  }
  stamp(root, { title, round, decision_maker: decisionMaker ?? null, brief: briefRel, domain: domain ?? null, invocation });
  written.push(STAMP);

  if (git && !existsSync(join(root, ".git")) && !insideWorkTree(root)) {
    const r = spawnSync("git", ["init", "-q"], { cwd: root, encoding: "utf8" });
    written.push(r.status === 0 ? ".git/" : `.git/ (skipped: ${r.error ? "git is not installed" : (r.stderr || "git init failed").trim()})`);
  }
  return { root, written };
}

function isLink(p) {
  try { return lstatSync(p).isSymbolicLink(); } catch { return false; }
}

// A copy of the domain template with the id, the date, and whatever the user
// said on the command line. The template's placeholders are matched exactly so
// a template that changes shape fails here rather than producing a spec with
// `Q-000` still in it.
function newSpec({ id, domain, slug, title, owner, specsDir }) {
  if (!id || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) throw new Error("new needs an id such as Q-014: letters, digits, '-' and '_' only");
  if (!catalogs.domains[domain]) throw new Error(`domain must be one of ${Object.keys(catalogs.domains).join(", ")}`);
  if (slug != null && !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(slug)) throw new Error("--slug: letters, digits, '-' and '_' only");
  const template = join(TEMPLATES, `qspec-${domain}.yaml`);
  let text = readFileSync(template, "utf8");
  const put = (re, line, what) => {
    if (!re.test(text)) throw new Error(`templates/qspec-${domain}.yaml no longer carries the ${what} placeholder; new cannot fill it`);
    text = text.replace(re, line);
  };
  put(/^id: Q-000$/m, `id: ${id}`, "id");
  put(/^date: YYYY-MM-DD$/m, `date: ${today()}`, "date");
  put(/^    date: YYYY-MM-DD$/m, `    date: ${today()}`, "changelog date");
  if (title != null) put(/^title: ""$/m, `title: ${JSON.stringify(String(title))}`, "title");
  if (owner != null) put(/^owner: ""$/m, `owner: ${JSON.stringify(String(owner))}`, "owner");
  const out = join(resolve(specsDir), `${id}${slug ? `_${slug}` : ""}.yaml`);
  if (existsSync(out)) throw new Error(`${out} exists; new does not overwrite a spec`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  return out;
}

// Specs in a directory by status, and the rounds sitting beside them. Read
// only; a status is set by a recorded act, so this is what actually happened.
function survey(specsDir) {
  const byStatus = {};
  const rounds = [];
  let records = 0, unreadable = 0;
  let names = [];
  try { names = readdirSync(specsDir); } catch { return null; }
  for (const f of names) {
    if (!/\.ya?ml$/.test(f)) continue;
    if (/\.record\.ya?ml$/.test(f)) { records++; continue; }
    let doc;
    try { doc = yaml.load(readFileSync(join(specsDir, f), "utf8"), { schema: yaml.CORE_SCHEMA }); } catch { unreadable++; continue; }
    const kind = kindOf(doc);
    if (kind === "index") rounds.push(f);
    else if (kind === "spec") byStatus[doc.status ?? "(no status)"] = (byStatus[doc.status ?? "(no status)"] ?? 0) + 1;
    else unreadable++;
  }
  return { byStatus, rounds: rounds.sort(), records, unreadable };
}

// The most recent date any Decision Record beside the specs carries. Day
// granularity, because that is what an act records.
function lastActDate(specsDir) {
  let last = null;
  let names = [];
  try { names = readdirSync(specsDir); } catch { return null; }
  for (const f of names) {
    if (!/\.record\.ya?ml$/.test(f)) continue;
    try {
      const r = yaml.load(readFileSync(join(specsDir, f), "utf8"), { schema: yaml.CORE_SCHEMA });
      for (const e of r?.entries ?? []) { const d = String(e.date ?? ""); if (d && (!last || d > last)) last = d; }
    } catch { /* unreadable record; lint reports it */ }
  }
  return last;
}

// Reported, never rewritten: editing a file in somebody's project is not a
// diagnostic. Returns the lines to print and whether anything is wrong.
function doctor({ project, invocation = "qspec", cwd = process.cwd() } = {}) {
  const lines = [`qspec ${VERSION}`, `node  ${process.version}`, `tool  ${invocation}`];
  const root = project ? resolve(project) : findRoot(cwd);
  if (!root || !existsSync(join(root, STAMP))) {
    lines.push("", `project: none (no ${STAMP} ${project ? `in ${resolve(project)}` : `here or above ${cwd}`})`);
    return { lines, problems: 0 };
  }
  let problems = 0;
  const found = drift(root);
  const state = { current: "ok", stale: "STALE", unstamped: "unknown" }[found.state];
  lines.push("", `project: ${root}`);
  lines.push(`  ${"scaffold".padEnd(10)} ${state.padEnd(8)} ${found.why}`);
  if (found.state === "stale") { problems++; lines.push(`  ${"".padEnd(10)} ${"".padEnd(8)} \`qspec init --refresh --into ${root}\` rewrites the block init wrote and re-stamps; nothing outside the markers is touched`); }
  const agentsPath = join(root, "AGENTS.md");
  const agents = existsSync(agentsPath) ? readFileSync(agentsPath, "utf8") : "";
  if (agents.includes(MARK_OPEN) && agents.includes(MARK_CLOSE)) lines.push(`  ${"guidance".padEnd(10)} ${"ok".padEnd(8)} AGENTS.md carries the QSPEC block`);
  else { problems++; lines.push(`  ${"guidance".padEnd(10)} ${"MISSING".padEnd(8)} AGENTS.md ${agents ? "no longer carries the QSPEC block" : "is missing"}; agents working here have no guidance`); }
  const facts = found.facts ?? {};
  if (facts.brief) lines.push(`  ${"brief".padEnd(10)} ${(existsSync(join(root, facts.brief)) ? "ok" : "MISSING").padEnd(8)} ${facts.brief}`);
  if (facts.brief && !existsSync(join(root, facts.brief))) problems++;
  const s = survey(join(root, "specs"));
  if (!s) { problems++; lines.push(`  ${"specs".padEnd(10)} ${"MISSING".padEnd(8)} specs/ is not a directory`); }
  else {
    const total = Object.values(s.byStatus).reduce((a, b) => a + b, 0);
    const detail = total ? Object.entries(s.byStatus).sort().map(([k, v]) => `${v} ${k}`).join(", ") : "none yet";
    lines.push(`  ${"specs".padEnd(10)} ${String(total).padEnd(8)} ${detail}; ${s.records} record(s)${s.unreadable ? `; ${s.unreadable} file(s) unreadable as YAML` : ""}`);
    lines.push(`  ${"rounds".padEnd(10)} ${String(s.rounds.length).padEnd(8)} ${s.rounds.length ? s.rounds.map((r) => `specs/${r}`).join(", ") : "none; check one with: qspec index <round.yaml> --specs specs"}`);
  }
  // What the checks saw, and how much checking has happened since anyone acted.
  // Many runs and no act is the shape of a spec being polished in chat.
  const runs = require("./runs.js");
  const friction = require("./friction.js");
  const all = runs.listing(root);
  const last = all.length ? all[all.length - 1] : null;
  const lastAct = lastActDate(join(root, "specs"));
  const since = lastAct ? all.filter((r) => r.record.recorded.slice(0, 10) > lastAct).length : all.length;
  lines.push(`  ${"runs".padEnd(10)} ${String(all.length).padEnd(8)} ${last ? `last ${last.name}: ${runs.summary(last.record)}` : "none; lint and index record one each time they run here"}${all.length ? `; ${since} since the last recorded act${lastAct ? ` (${lastAct})` : " (none yet)"}` : ""}`);
  const attached = all.reduce((n, r) => n + (r.record.notes ?? []).length, 0);
  if (attached) lines.push(`  ${"notes".padEnd(10)} ${String(attached).padEnd(8)} attached to runs; \`qspec runs show <run>\` prints them${lastAct ? "" : "; none acted on yet"}`);
  const notes = friction.listing(root);
  if (notes.length) lines.push(`  ${"friction".padEnd(10)} ${String(notes.length).padEnd(8)} latest ${basename(notes[notes.length - 1])}; \`qspec report --issue\` prints it`);
  return { lines, problems };
}

module.exports = { COMMANDS, STAMP, MARK_OPEN, MARK_CLOSE, fingerprint, drift, findRoot, create, refresh, newSpec, doctor, titleFrom };
