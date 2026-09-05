#!/usr/bin/env node
// qspec: lint specs, record acts, and render the documents people use to read
// and choose questions. `qspec help` lists the commands.
const { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } = require("node:fs");
const { dirname, join, relative, resolve } = require("node:path");
const yaml = require("../lib/vendor/js-yaml/js-yaml.js");
const { J_INVARIANTS, J_TEXT, judgedRule } = require("../lib/catalogs.js");
const { format, hasBlock, lintFile, loadSpec } = require("../lib/lint.js");
const { checkPaper } = require("../lib/paper.js");
const { appendEntry, bindDecisionMaker, fingerprint, frozenInRound, loadRecord, newRecord, recordPath, saveRecord, setStatus, signingEntry } = require("../lib/record.js");
const { SHEET_STATES, dossier: renderDossier, index: renderIndex, request: renderRequest, sheet: renderSheet } = require("../lib/render.js");
const { STAMP, create, doctor, findRoot, newSpec, refresh, titleFrom } = require("../lib/scaffold.js");
const runs = require("../lib/runs.js");
const friction = require("../lib/friction.js");

const HELP = `usage: qspec <command> [args]

  init --into <dir> [--title text] [--round YYYY-MM] [--decision-maker name]
       [--brief path] [--domain d] [--append] [--no-git]
                                 prepare a directory: specs/ with the round's Index, AGENTS.md
                                 and CLAUDE.md, references.bib, sheets/, requests/, and a stamp
                                 of what wrote them
  init --refresh --into <dir>    rewrite only the QSPEC block init wrote in AGENTS.md, and re-stamp;
                                 what doctor asks for when the guidance is STALE
  new <Q-id> --domain <social|natural|engineering> [--slug name] [--title text]
       [--owner name] [--specs dir]
                                 an empty spec from the domain template with id and date set
  doctor [--project dir]         tool and node versions, whether this project's guidance is
                                 current, bibliography resolution, and what the runs have seen
  runs [--project dir] [--only text] [--spec <id|path>]
       [--diff <a>,<b> [--sources]]
                                 every recorded run in this project: lint, index, sign, transition,
                                 sheet, dossier, request, render, paper; --diff says what changed between two,
                                 --sources shows the text
  runs show <run> [--project dir] [--spec <id|path>]
                                 one run: its files, findings, and every note as written
  attach <run> <file> --by <actor> --role <role> [--kind handoff|review|decision|note]
                                 keep a handoff, review, or decision beside the run it is about;
                                 copied whole, never summarised
  report "<what happened>" [--issue] [--project dir]
                                 a friction note carrying version, scaffold state, and last run;
                                 --issue prints the latest note for a tracker and files nothing
  lint <spec.yaml>...            M invariants, Decision Record, and signature (M16)
       [--record path] [--json] [--expect-fail] [--label text]
                                 inside a project, records a run under .qspec/runs/
  fingerprint <spec.yaml>        print the fingerprint a signature is taken over
  sign <spec.yaml> --by <reviewer> [--date YYYY-MM-DD] [--reason text] [--show]
       [--dissent "<reviewer>: <point>"] [--run <name>]
                                 print J1 to J7 with this profile's J7 rule, then
                                 record draft -> specified; --show prints without signing;
                                 --run names the run whose text is being signed
  transition <spec.yaml> --to <state> --by <actor> --role <owner|reviewer|decision_maker>
       [--index round.yaml | --unbound] [--specs dir] [--reason text] [--cite Jn|Mn]
       [--revisit-by date] [--successor id@ver] [--date date] [--dissent "<who>: <point>"]
       [--run <name>]
                                 a decision_maker act needs --index, which binds the actor
                                 to the round's committee and holds the one-freeze-per-round
                                 cap, or --unbound to record that nothing checked it
  sheet <spec.yaml> [--index index.yaml] [--out file.md] [--draft]
                                 committee sheet; --draft previews any state without submission
  index <index.yaml> [--specs dir] [--out file.md] [--label text]
                                 portfolio index table, with its checks; records a run
  dossier <spec.yaml> [--out file.md] [--label text]
                                 whole spec, decision record, run timeline, and attached notes
  request <spec.yaml> [--out file.md]
                                 frozen request for a Paperforge project's request key
  render --out <dir> [--specs dir] [--index round.yaml] [--manifest documents.toml]
         [--label text] [--draft] dossiers for every spec, eligible sheets (or previews under
                                 drafts/), every Index, and frozen requests; prints missing entries
  paper <spec.yaml> <document.md>
                                 does the document carry the frozen claim as a gist
`;

const argv = process.argv.slice(2);
const cmd = argv.shift();
const BOOLEAN = new Set(["append", "draft", "expect-fail", "issue", "json", "no-git", "refresh", "show", "sources", "unbound"]);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const k = a.slice(2);
    const next = argv[i + 1];
    if (!BOOLEAN.has(k) && next != null && !next.startsWith("--")) { flags[k] = next; i++; } else flags[k] = true;
  } else positional.push(a);
}
const today = () => new Date().toISOString().slice(0, 10);
const die = (msg) => { console.error(`error: ${msg}`); process.exit(2); };

function printFindings(file, findings) {
  const blocks = findings.filter((x) => x.severity === "block").length;
  console.log(`${blocks ? "FAIL" : "ok  "}  ${file}`);
  for (const x of findings) {
    console.log(`    ${x.severity.padEnd(6)}  ${x.rule.padEnd(18)} ${x.message}`);
    if (x.act) console.log(`            -> ${x.act}`);
  }
  return blocks > 0;
}

// Every spec in a directory, by id. Used to resolve an Index against ground
// truth: a status is set only by a recorded act, so the specs are what actually
// happened in a round.
function specsIn(dir) {
  const out = {};
  for (const f of readdirSync(dir)) {
    if (!/\.ya?ml$/.test(f) || /\.record\.ya?ml$/.test(f)) continue;
    try { const sp = loadSpec(join(dir, f)); if (sp?.id) out[sp.id] = sp; } catch {}
  }
  return out;
}

// Specs, their records, and the file each spec came from, keyed by id. The paths
// are kept so a finding about a listed spec can name the file to fix.
function resolveDir(dir) {
  const specs = {}, records = {}, files = {};
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (/\.record\.ya?ml$/.test(f)) { try { const r = loadRecord(p); if (r?.spec_id) records[r.spec_id] = r; } catch {} continue; }
    if (!/\.ya?ml$/.test(f)) continue;
    try { const sp = loadSpec(p); if (sp?.id) { specs[sp.id] = sp; files[sp.id] = p; } } catch {}
  }
  return { specs, records, files };
}

function loadIndex(path) {
  return yaml.load(readFileSync(path, "utf8"), { schema: yaml.CORE_SCHEMA });
}

// Rounds that are sitting right there. An omitted --index is the likeliest way
// to weaken an act, so the refusal names the files it can see rather than
// leaving the actor to go looking.
function indexesNear(dirs) {
  const found = [];
  for (const dir of new Set(dirs.filter(Boolean))) {
    let names = [];
    try { names = readdirSync(dir); } catch { continue; }
    for (const f of names) {
      if (!/\.ya?ml$/.test(f) || /\.record\.ya?ml$/.test(f)) continue;
      try { if (loadIndex(join(dir, f))?.index_schema === "QSPEC-INDEX/1.0") found.push(join(dir, f)); } catch {}
    }
  }
  return found.sort();
}

// What a reviewer is asserting. J1 to J6 are the core's; J7 is the overlay's
// rule for this spec's profile, which is why it is printed rather than numbered.
function judgedRules(spec) {
  const rule = judgedRule(spec);
  const lines = J_INVARIANTS.filter((j) => j !== "J7").map((j) => `  ${j}  ${J_TEXT[j]}`);
  lines.push(`  J7  ${rule ?? `(the overlay states no judged rule for profile '${spec.question_type?.method_family}')`}`);
  return { rule, text: `judged invariants for ${spec.id}@${spec.instance_version} (${spec.domain}, profile ${spec.question_type?.method_family}):\n${lines.join("\n")}` };
}

// Section 9 makes the Decision Record the only home for dissent, so the tool
// that owns the record has to be able to write it. One point per act; a second
// point is a second act.
function dissentFrom(flag) {
  if (!flag || flag === true) return [];
  const at = String(flag).indexOf(":");
  if (at < 1) die('--dissent needs "<reviewer>: <point>"');
  return [{ reviewer: String(flag).slice(0, at).trim(), point: String(flag).slice(at + 1).trim(), unresolved: true }];
}

// A run is recorded only inside a project: the root is the nearest .qspec/
// above the checked file. Outside one there is nowhere to keep it, and lint
// over a scratch copy or this repository's examples should leave no trace.
// Files from more than one project make one run each.
function recordRuns(command, items, label) {
  const byRoot = new Map();
  for (const it of items) {
    const root = it.root ?? findRoot(dirname(resolve(it.file)));
    if (!root) continue;
    if (!byRoot.has(root)) byRoot.set(root, []);
    byRoot.get(root).push(runs.entry(root, it.file, it));
  }
  for (const [root, entries] of byRoot) {
    const { name } = runs.write(root, command, entries, label);
    if (!flags.json) console.log(`  recorded ${relative(process.cwd(), join(root, runs.RUNS, name)) || name}`);
  }
}

// An act that names a run is saying "this is the text I read". The run's
// recorded fingerprint for this spec must therefore be the spec's fingerprint
// now; otherwise the actor read one text and is acting on another.
function citedRun(file, spec) {
  if (!flags.run || flags.run === true) return null;
  const root = findRoot(dirname(resolve(file)));
  if (!root) die("--run needs a QSPEC project around the spec; none found");
  let run;
  try { run = runs.load(root, String(flags.run)); } catch (e) { die(e.message); }
  const rel = relative(root, resolve(file));
  const seen = run.record.files.find((f) => f.path === rel);
  if (!seen) die(`run ${run.name} did not include ${rel}`);
  const now = fingerprint(spec);
  if (seen.fingerprint !== now) die(`run ${run.name} saw ${rel} at ${seen.fingerprint}; it is now ${now}. The text moved since that run: lint again and cite the new run`);
  return run.name;
}

// A note beside a run is a judgment nobody has acted on yet. Say so while it
// is true; a stack of notes and no act is the shape of a review that happened
// only in prose.
function notesWithoutAct(result) {
  const root = findRoot(dirname(resolve(result.file)));
  if (!root || !result.spec?.id) return [];
  const entries = result.record?.entries ?? [];
  const lastAct = entries.length ? String(entries[entries.length - 1].date ?? "") : null;
  const notes = runs.notesSince(root, relative(root, resolve(result.file)), lastAct || null);
  if (!notes.length) return [];
  const who = [...new Set(notes.map((n) => `${n.kind} by ${n.actor}`))].join(", ");
  return [{ severity: "warn", rule: "notes-without-act", message: `${notes.length} note(s) attached ${lastAct ? `since the last act on ${lastAct}` : "and no act recorded"}: ${who}. A note is not an act`, act: "a named reviewer signs, or the owner or decision-maker records a transition, citing the run with --run", file: result.file }];
}

function lintWithProject(file, opts = {}) {
  const root = findRoot(dirname(resolve(file)));
  const bibliography = root && existsSync(join(root, "references.bib")) ? join(root, "references.bib") : null;
  return { ...lintFile(file, { ...opts, bibliography }), bibliography };
}

function emit(md, out) {
  if (out) { mkdirSync(dirname(resolve(out)), { recursive: true }); writeFileSync(out, md); console.log(`wrote ${out}`); } else process.stdout.write(md);
}

const flagText = (name) => flags[name] && flags[name] !== true ? String(flags[name]) : null;
const safeName = (value) => String(value ?? "unnamed").replace(/[^A-Za-z0-9_.-]+/g, "-").replace(/^-|-$/g, "") || "unnamed";

function writeRendering(outDir, subdir, name, md) {
  const path = join(outDir, subdir, `${safeName(name)}.md`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, md);
  console.log(`wrote ${path}`);
  return path;
}

function missingManifestEntries(manifest, outputs) {
  const text = readFileSync(manifest, "utf8");
  const declared = new Set(), slugs = new Set(), warnings = [];
  let collectionRoot = ".";
  let document = null;
  const finishDocument = () => {
    if (!document) return;
    if (document.type === "qspec-dossier" && document.publish === true) {
      const name = document.id ? `'${document.id}'` : (document.source ? `'${document.source}'` : "block");
      warnings.push(`warning: dossier document ${name} has publish = true; process records must remain unpublished`);
    }
    document = null;
  };
  for (const line of text.split("\n")) {
    if (/^\s*\[\[collection\]\]\s*$/.test(line)) { finishDocument(); collectionRoot = "."; }
    else if (/^\s*\[\[collection\.document\]\]\s*$/.test(line)) { finishDocument(); document = {}; }
    else if (/^\s*\[/.test(line) && !/^\s*\[collection\.document\.[^\]]+\]\s*$/.test(line)) finishDocument();
    const slug = /^\s*slug\s*=\s*"([^"]+)"/.exec(line);
    if (slug) slugs.add(slug[1]);
    const root = /^\s*root\s*=\s*"([^"]+)"/.exec(line);
    if (root) collectionRoot = root[1];
    const source = /^\s*source\s*=\s*"([^"]+)"/.exec(line);
    if (source) {
      declared.add(join(collectionRoot, source[1]).replace(/\\/g, "/"));
      if (document) document.source = source[1];
    }
    const id = /^\s*id\s*=\s*"([^"]+)"/.exec(line);
    if (id && document) document.id = id[1];
    const type = /^\s*type\s*=\s*"([^"]+)"/.exec(line);
    if (type && document) document.type = type[1];
    const publish = /^\s*publish\s*=\s*(true|false)\s*(?:#.*)?$/.exec(line);
    if (publish && document) document.publish = publish[1] === "true";
  }
  finishDocument();
  const groups = new Map();
  for (const output of outputs) {
    const path = relative(dirname(resolve(manifest)), resolve(output.output)).replace(/\\/g, "/");
    if (declared.has(path)) continue;
    const root = dirname(path).replace(/\\/g, "/");
    const key = `${output.kind}\0${root}`;
    if (!groups.has(key)) groups.set(key, { kind: output.kind, root, documents: [] });
    groups.get(key).documents.push({ ...output, source: relative(root, path).replace(/\\/g, "/") });
  }
  const toml = (value) => JSON.stringify(String(value));
  const snippets = [...groups.values()].map((group) => {
    const plural = group.kind === "index" ? "indexes" : `${group.kind}s`;
    const base = `qspec-render-${plural}`;
    let slug = base, suffix = 2;
    while (slugs.has(slug)) slug = `${base}-${suffix++}`;
    slugs.add(slug);
    const lines = ["[[collection]]", `slug = ${toml(slug)}`, `root = ${toml(group.root)}`, 'profile = "en"'];
    for (const output of group.documents) {
      const type = output.kind === "request" ? "report" : `qspec-${output.kind}`;
      lines.push("", "  [[collection.document]]", `  id = ${toml(`qspec-${output.kind}-${safeName(output.id).toLowerCase()}`)}`, `  type = ${toml(type)}`, `  source = ${toml(output.source)}`);
      if (output.kind === "dossier") lines.push('  pdf = "typst"', "  docx = true");
      lines.push("  publish = false");
    }
    return lines.join("\n");
  });
  return { snippets, warnings };
}

switch (cmd) {
  case "init": {
    if (!flags.into || flags.into === true) die("init needs --into <directory>");
    const round = flags.round && flags.round !== true ? String(flags.round) : today().slice(0, 7);
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(round)) die("--round: letters, digits, '-', '_' and '.' only; it names specs/index-<round>.yaml");
    const invocation = resolve(process.argv[1]);
    let made;
    if (flags.refresh) {
      try { made = refresh(flags.into, { invocation }); } catch (e) { die(e.message); }
      console.log(`refreshed ${made.root}`);
      for (const w of made.written) console.log(`  ${w}`);
      break;
    }
    try {
      made = create(flags.into, { title: flags.title && flags.title !== true ? String(flags.title) : titleFrom(flags.into), round, decisionMaker: flags["decision-maker"] && flags["decision-maker"] !== true ? String(flags["decision-maker"]) : null, brief: flags.brief && flags.brief !== true ? String(flags.brief) : null, domain: flags.domain && flags.domain !== true ? String(flags.domain) : null, append: Boolean(flags.append), git: !flags["no-git"], invocation });
    } catch (e) { die(e.message); }
    console.log(`prepared ${made.root}`);
    for (const w of made.written) console.log(`  ${w}`);
    console.log(`\nnext: ${invocation} new Q-001 --domain ${flags.domain && flags.domain !== true ? flags.domain : "<social|natural|engineering>"} --slug <short-name> --specs ${made.root}/specs`);
    break;
  }
  case "new": {
    const [id] = positional;
    if (!id) die("new needs <Q-id> --domain <social|natural|engineering>");
    const root = findRoot(process.cwd());
    let facts = {};
    if (root) { try { facts = JSON.parse(readFileSync(join(root, STAMP), "utf8")); } catch {} }
    const domain = flags.domain && flags.domain !== true ? String(flags.domain) : facts.domain;
    if (!domain) die(`new needs --domain <social|natural|engineering>${root ? "" : "; no QSPEC project here or above to take a default from"}`);
    const specsDir = flags.specs && flags.specs !== true ? String(flags.specs) : (root ? join(root, "specs") : process.cwd());
    let out;
    try { out = newSpec({ id, domain, slug: flags.slug && flags.slug !== true ? String(flags.slug) : null, title: flags.title && flags.title !== true ? String(flags.title) : null, owner: flags.owner && flags.owner !== true ? String(flags.owner) : null, specsDir }); }
    catch (e) { die(e.message); }
    console.log(`wrote ${out}\nfill it in; profile field lists are in the ${domain} overlay's section 4\nnext: ${resolve(process.argv[1])} lint ${out}`);
    break;
  }
  case "doctor": {
    const { lines, problems } = doctor({ project: flags.project && flags.project !== true ? String(flags.project) : null, invocation: resolve(process.argv[1]) });
    console.log(lines.join("\n"));
    process.exit(problems ? 1 : 0);
  }
  case "runs": {
    const root = flags.project && flags.project !== true ? resolve(String(flags.project)) : findRoot(process.cwd());
    if (!root || !existsSync(join(root, STAMP))) die(`no QSPEC project here or above (no ${STAMP}); pass --project <dir>`);
    if (positional[0] === "show") {
      if (!positional[1]) die("runs show needs a run name; `qspec runs` lists them");
      try { console.log(runs.show(root, positional[1], flagText("spec")).join("\n")); } catch (e) { die(e.message); }
      break;
    }
    if (flags.diff && flags.diff !== true) {
      const names = String(flags.diff).split(",").map((x) => x.trim()).filter(Boolean);
      if (names.length !== 2) die("--diff takes two run names, comma separated");
      let a, b;
      try { a = runs.load(root, names[0], flagText("spec")); b = runs.load(root, names[1], flagText("spec")); } catch (e) { die(e.message); }
      const d = runs.diff(a, b);
      console.log(`${a.name} -> ${b.name}`);
      for (const f of d.files) {
        const bits = [f.change];
        if (f.status[0] !== f.status[1]) bits.push(`status ${f.status[0]} -> ${f.status[1]}`);
        if (f.version[0] !== f.version[1]) bits.push(`@${f.version[0]} -> @${f.version[1]}`);
        if (f.verdict[0] !== f.verdict[1]) bits.push(`verdict ${f.verdict[0]} -> ${f.verdict[1]}`);
        if (f.record === "changed") bits.push("record changed");
        console.log(`  ${f.path}: ${bits.join(", ")}`);
        for (const x of f.appeared) console.log(`      + ${x.severity.padEnd(6)} ${x.rule.padEnd(18)} ${x.message}`);
        for (const x of f.cleared) console.log(`      - ${x.severity.padEnd(6)} ${x.rule.padEnd(18)} ${x.message}`);
      }
      if (d.added.length) console.log(`  added      ${d.added.join(", ")}`);
      if (d.removed.length) console.log(`  removed    ${d.removed.join(", ")}`);
      if (flags.sources) {
        const { lines, missing } = runs.sourceDiff(root, a, b, flags.only && flags.only !== true ? String(flags.only) : null);
        if (missing.length) console.log(`  no stored sources for ${missing.join(", ")}`);
        if (!lines.length) console.log("  sources identical"); else console.log("\n" + lines.join("\n"));
      }
      break;
    }
    const all = runs.listing(root, flagText("spec")).filter((r) => !flags.only || flags.only === true || r.name.includes(String(flags.only)) || (r.record.label ?? "").includes(String(flags.only)));
    if (!all.length) { console.log("  no runs recorded yet"); break; }
    for (const r of all) console.log(`  ${r.name.padEnd(34)} ${(r.record.label ?? "-").slice(0, 28).padEnd(28)} ${r.record.command.padEnd(6)} ${runs.summary(r.record)}`);
    break;
  }
  case "attach": {
    const [runName, file] = positional;
    if (!runName || !file) die("attach needs <run> <file> --by <actor> --role <role>");
    const root = flags.project && flags.project !== true ? resolve(String(flags.project)) : findRoot(process.cwd());
    if (!root || !existsSync(join(root, STAMP))) die(`no QSPEC project here or above (no ${STAMP}); pass --project <dir>`);
    let done;
    try { done = runs.attach(root, runName, file, { actor: flags.by, role: flags.role, kind: flags.kind && flags.kind !== true ? String(flags.kind) : "note" }); } catch (e) { die(e.message); }
    if (done.warning) console.error(done.warning);
    console.log(`attached ${done.note.kind} by ${done.note.actor} (${done.note.role}) to ${done.run} as ${done.note.path}`);
    break;
  }
  case "report": {
    const root = flags.project && flags.project !== true ? resolve(String(flags.project)) : findRoot(process.cwd());
    if (!root || !existsSync(join(root, STAMP))) die(`no QSPEC project here or above (no ${STAMP}); pass --project <dir>`);
    if (flags.issue) {
      const last = friction.latest(root);
      if (!last) die("no friction notes yet; `qspec report \"what happened\"` writes one");
      console.log(friction.issueBody(last));
      break;
    }
    const what = positional.join(" ").trim();
    if (!what) die('report needs a sentence: qspec report "what happened"');
    const path = friction.write(root, what, friction.facts(root, resolve(process.argv[1])));
    console.log(`wrote ${relative(process.cwd(), path) || path}\ncommit it and mention it in your handoff; \`qspec report --issue\` prints it for a tracker`);
    break;
  }
  case "lint": {
    if (!positional.length) die("lint needs at least one spec file");
    let exit = 0;
    const results = positional.map((f) => lintWithProject(f, { record: flags.record }));
    for (const r of results) r.findings.push(...notesWithoutAct(r));
    for (const r of results) {
      const blocked = hasBlock(r.findings);
      if (flags["expect-fail"] && r.kind && r.kind !== "spec") { if (!flags.json) console.log(`skip  ${r.file}  (${r.kind})`); continue; }
      if (flags["expect-fail"] ? !blocked : blocked) exit = 1;
      if (!flags.json) {
        if (flags["expect-fail"]) console.log(`${blocked ? "FAILS AS EXPECTED" : "UNEXPECTED PASS"}  ${r.file}\n    ${[...new Set(r.findings.filter((x) => x.severity === "block").map((x) => x.rule))].join(", ")}`);
        else console.log(format(r));
      }
    }
    if (flags.json) console.log(JSON.stringify(results.map(({ file, findings }) => ({ file, findings })), null, 2));
    const checkedResults = results.filter((r) => !r.kind || r.kind === "spec");
    const runItems = checkedResults.map((r) => ({ file: r.file, kind: "spec", id: r.spec?.id, instance_version: r.spec?.instance_version, status: r.spec?.status, fingerprint: r.spec?.id ? fingerprint(r.spec) : null, findings: r.findings, recordFile: r.recordFile }));
    for (const bibliography of new Set(checkedResults.map((r) => r.bibliography).filter(Boolean))) runItems.push({ file: bibliography, kind: "bibliography", findings: [] });
    recordRuns("lint", runItems, flags.label && flags.label !== true ? String(flags.label) : null);
    process.exit(exit);
  }
  case "fingerprint": {
    const [file] = positional;
    if (!file) die("fingerprint needs a spec file");
    console.log(fingerprint(loadSpec(file)));
    break;
  }
  case "sign": {
    const [file] = positional;
    if (!file || !flags.by) die("sign needs <spec.yaml> --by <reviewer>");
    const spec = loadSpec(file);
    const { rule, text } = judgedRules(spec);
    console.log(text);
    const judged = text.split("\n").slice(1).map((l) => l.trim());
    if (flags.show) {
      console.log("\nnothing signed; re-run without --show to sign these seven.");
      recordRuns("sign --show", [{ file, kind: "spec", id: spec.id, instance_version: spec.instance_version, status: spec.status, fingerprint: fingerprint(spec), findings: [], recordFile: recordPath(file, spec, flags.record), detail: { judged_rules: judged } }], flags.label && flags.label !== true ? String(flags.label) : null);
      break;
    }
    const cited = citedRun(file, spec);
    const rp = recordPath(file, spec, flags.record);
    const record = loadRecord(rp) ?? newRecord(spec);
    const pre = lintFile(file, { record: flags.record }).findings.filter((x) => x.severity === "block" && /^M\d+$/.test(x.rule));
    if (pre.length) { console.error(`refusing to sign: ${pre.length} mechanical invariant(s) fail`); for (const x of pre) console.error(`    ${x.rule}  ${x.message}`); process.exit(1); }
    const state = record.entries?.length ? record.entries[record.entries.length - 1].to : "draft";
    try {
      if (["specified", "selectable", "deferred"].includes(state)) {
        const prior = signingEntry(record);
        if (prior && prior.spec_fingerprint === fingerprint(spec)) die(`${spec.id} already carries a current signature by ${prior.actor} on ${prior.date}`);
        appendEntry(record, spec, { date: flags.date ?? today(), actor: flags.by, role: "reviewer", to: "draft", reason: "the text changed after signing; demoted to re-sign", cited_invariant: "M16" });
      } else if (state !== "draft") die(`${spec.id} is ${state}; a changed ${state} spec needs a new instance_version or a successor (QSPEC-CORE section 6.3), not a re-signature`);
      appendEntry(record, spec, { date: flags.date ?? today(), actor: flags.by, role: "reviewer", from: "draft", to: "specified", reason: flags.reason ?? "judged invariants reread and signed", signed_invariants: [...J_INVARIANTS], spec_fingerprint: fingerprint(spec), judged_rules: rule ? { J7: rule } : null, dissent: dissentFrom(flags.dissent), run: cited });
    } catch (e) { die(e.message); }
    saveRecord(rp, record);
    setStatus(file, "specified");
    console.log(`\nsigned ${J_INVARIANTS.join(" ")} for ${spec.id}@${spec.instance_version} by ${flags.by}\nrecord: ${rp}\nstatus: specified${cited ? `\nrun: ${cited}` : ""}`);
    recordRuns("sign", [{ file, kind: "spec", id: spec.id, instance_version: spec.instance_version, status: "specified", fingerprint: fingerprint(spec), findings: [], recordFile: rp, detail: { judged_rules: judged, act: `draft -> specified by ${flags.by}` } }], flags.label && flags.label !== true ? String(flags.label) : null);
    break;
  }
  case "transition": {
    const [file] = positional;
    if (!file || !flags.to || !flags.by || !flags.role) die("transition needs <spec.yaml> --to <state> --by <actor> --role <role>");
    const spec = loadSpec(file);
    const rp = recordPath(file, spec, flags.record);
    const record = loadRecord(rp) ?? newRecord(spec);
    const state = record.entries?.length ? record.entries[record.entries.length - 1].to : "draft";
    if (flags.to === "specified" && state === "draft") die("use `qspec sign` for draft -> specified; it must carry the signature");
    if (["frozen", "superseded"].includes(flags.to) && !(spec.handoff?.first_check ?? "").trim()) die("handoff.first_check must be filled before freeze (M14)");
    const idx = flags.index ? loadIndex(flags.index) : null;
    // A decision_maker is the one role no field of a spec names, so the only
    // thing that can check it is the round's Index. 1.2 let the flag be omitted
    // and said so on stderr, which is a note nobody reads in a transcript. The
    // act now has to declare which of the two it is; neither is refused.
    if (flags.role !== "decision_maker" && flags.unbound) die("--unbound says a decision-maker was checked against no round; it means nothing for owner or reviewer");
    if (flags.role === "decision_maker") {
      if (idx && flags.unbound) die("pass --index <round.yaml> or --unbound, not both");
      if (!idx && !flags.unbound) {
        const near = indexesNear([flags.specs, dirname(file)]);
        die(`acting as decision_maker needs the round: pass --index <round.yaml>, so '${flags.by}' is checked against the committee that round names, or --unbound to record that nothing checked it`
          + (near.length ? `\n  did you mean: ${near.map((p) => `--index ${p}`).join("\n                ")}` : ""));
      }
      if (flags.unbound) console.error(`note: --unbound, so '${flags.by}' acts as decision_maker on their own say-so; the record will show the round as unnamed and lint will report unbound-decision`);
    }
    // Identity before arithmetic: who may act is a better error than how many
    // freezes are left.
    const unbound = bindDecisionMaker({ role: flags.role, actor: flags.by }, idx);
    if (unbound) die(unbound);
    // The cap the transition table states in prose. Ground truth is the sibling
    // specs' own statuses, not the Index's hand-written `frozen` list.
    if (flags.to === "frozen" && idx) {
      const already = (frozenInRound(idx, specsIn(flags.specs ?? dirname(file))) ?? []).filter((id) => id !== spec.id);
      if (already.length && !String(idx.exception ?? "").trim()) die(`round ${idx.round} has already frozen ${already.join(", ")}; at most one freeze per round unless the index carries a written exception`);
    }
    const cited = citedRun(file, spec);
    let entry;
    try {
      entry = appendEntry(record, spec, { date: flags.date ?? today(), actor: flags.by, role: flags.role, to: flags.to, reason: flags.reason ?? "", cited_invariant: flags.cite ?? null, revisit_by: flags["revisit-by"] ?? null, successor: flags.successor ?? null, dissent: dissentFrom(flags.dissent), run: cited }, { index: idx });
    } catch (e) { die(e.message); }
    saveRecord(rp, record);
    setStatus(file, flags.to);
    console.log(`${entry.from} -> ${entry.to} by ${entry.actor} (${entry.role}) for ${spec.id}@${spec.instance_version}\nrecord: ${rp}\nstatus: ${entry.to}${cited ? `\nrun: ${cited}` : ""}`);
    recordRuns("transition", [{ file, kind: "spec", id: spec.id, instance_version: spec.instance_version, status: entry.to, fingerprint: fingerprint(spec), findings: [], recordFile: rp, detail: { act: `${entry.from} -> ${entry.to} by ${entry.actor} (${entry.role})` } }], flags.label && flags.label !== true ? String(flags.label) : null);
    break;
  }
  case "sheet": {
    const [file] = positional;
    if (!file) die("sheet needs a spec file");
    const spec = loadSpec(file);
    const record = loadRecord(recordPath(file, spec, flags.record));
    const idx = flags.index ? loadIndex(flags.index) : null;
    const draft = Boolean(flags.draft);
    const { md, findings } = renderSheet(spec, { record, index: idx, draft });
    const blocked = printFindings(file, findings);
    recordRuns(draft ? "sheet --draft" : "sheet", [{ file, kind: "spec", id: spec.id, instance_version: spec.instance_version, status: spec.status, fingerprint: fingerprint(spec), findings, recordFile: recordPath(file, spec, flags.record), rendered: blocked ? null : md }], flags.label && flags.label !== true ? String(flags.label) : null);
    if (blocked) process.exit(1);
    emit(md, flags.out);
    break;
  }
  case "index": {
    const [file] = positional;
    if (!file) die("index needs an index file");
    const idx = loadIndex(file);
    const { md, findings } = renderIndex(idx, flags.specs ? resolveDir(flags.specs) : null);
    const blocked = printFindings(file, findings);
    recordRuns("index", [{ file, kind: "index", id: idx?.round ?? null, status: null, findings }], flags.label && flags.label !== true ? String(flags.label) : null);
    if (blocked) process.exit(1);
    emit(md, flags.out);
    break;
  }
  case "dossier": {
    const [file] = positional;
    if (!file) die("dossier needs a spec file");
    let spec;
    try { spec = loadSpec(file); } catch (e) { die(`${file}: cannot parse spec: ${e.message}`); }
    const rp = recordPath(file, spec, flags.record);
    const record = loadRecord(rp);
    const root = findRoot(dirname(resolve(file)));
    const history = root ? runs.history(root, relative(root, resolve(file))) : [];
    const { md, findings } = renderDossier(spec, { record, history });
    recordRuns("dossier", [{ file, kind: "spec", id: spec.id, instance_version: spec.instance_version, status: spec.status, fingerprint: fingerprint(spec), findings, recordFile: rp, rendered: md, output: flagText("out") }], flagText("label"));
    emit(md, flagText("out"));
    break;
  }
  case "request": {
    const [file] = positional;
    if (!file) die("request needs a spec file");
    const spec = loadSpec(file);
    const record = loadRecord(recordPath(file, spec, flags.record));
    const lint = lintFile(file, { record: flags.record });
    const { md, findings } = renderRequest(spec, { record });
    const all = [...lint.findings.filter((x) => x.severity === "block"), ...findings];
    const blocked = printFindings(file, all);
    recordRuns("request", [{ file, kind: "spec", id: spec.id, instance_version: spec.instance_version, status: spec.status, fingerprint: fingerprint(spec), findings: all, recordFile: recordPath(file, spec, flags.record), rendered: blocked ? null : md }], flags.label && flags.label !== true ? String(flags.label) : null);
    if (blocked) process.exit(1);
    emit(md, flags.out);
    break;
  }
  case "render": {
    const outDir = flagText("out");
    if (!outDir) die("render needs --out <directory>");
    const project = findRoot(process.cwd());
    const specsDir = resolve(flagText("specs") ?? (project ? join(project, "specs") : join(process.cwd(), "specs")));
    if (!existsSync(specsDir)) die(`${specsDir}: no such specs directory; pass --specs <dir>`);
    const renderRoot = findRoot(specsDir) ?? project;
    const manifest = flagText("manifest");
    const draftSheets = Boolean(flags.draft);
    if (manifest && !existsSync(manifest)) die(`${manifest}: no such manifest`);

    const specs = [], indexes = [], parseFailures = [];
    for (const name of readdirSync(specsDir).sort()) {
      if (!/\.ya?ml$/.test(name) || /\.record\.ya?ml$/.test(name)) continue;
      const file = join(specsDir, name);
      try {
        const doc = loadSpec(file);
        if (doc?.index_schema) indexes.push({ file, index: doc });
        else if (doc?.id) specs.push({ file, spec: doc });
      } catch (e) { parseFailures.push({ file, message: e.message }); }
    }
    const chosenPath = flagText("index") ? resolve(flagText("index")) : null;
    if (chosenPath && !indexes.some((x) => resolve(x.file) === chosenPath)) {
      try { indexes.push({ file: chosenPath, index: loadIndex(chosenPath) }); }
      catch (e) { die(`${chosenPath}: cannot parse Index: ${e.message}`); }
    }
    const ambiguousIndex = !chosenPath && indexes.length > 1;
    let blocked = parseFailures.length > 0;
    for (const failure of parseFailures) console.error(`FAIL  ${failure.file}\n    block   PARSE              ${failure.message}`);
    if (ambiguousIndex) {
      console.error(`FAIL  sheets\n    block   render-index       found several Index files (${indexes.map((x) => x.file).join(", ")}); pass --index <round.yaml>`);
      if (specs.some(({ spec }) => draftSheets || SHEET_STATES.includes(spec.status))) blocked = true;
    }

    const resolved = { specs: {}, records: {}, files: {} };
    for (const { file, spec } of specs) {
      resolved.specs[spec.id] = spec;
      resolved.files[spec.id] = file;
      const record = loadRecord(recordPath(file, spec));
      if (record) resolved.records[spec.id] = record;
    }
    const renderedIndexes = indexes.map(({ file, index }) => {
      const rendered = renderIndex(index, resolved);
      const indexBlocked = printFindings(file, rendered.findings);
      if (indexBlocked) blocked = true;
      return { file, index, rendered, blocked: indexBlocked };
    });
    const selectedIndex = chosenPath
      ? renderedIndexes.find((x) => resolve(x.file) === chosenPath) ?? null
      : renderedIndexes.length === 1 ? renderedIndexes[0] : null;
    const eligibleSheets = specs.some(({ spec }) => draftSheets || SHEET_STATES.includes(spec.status));
    if (selectedIndex?.blocked && eligibleSheets) {
      console.error(`FAIL  sheets\n    block   render-index       selected Index ${selectedIndex.file} is blocked; no sheets were rendered`);
    }
    const written = [], runItems = [];
    const remember = ({ source, output, kind, id, spec = null, findings = [], recordFile = null, md }) => {
      written.push({ output, kind, id });
      runItems.push({ file: source, kind: spec ? "spec" : kind, id, instance_version: spec?.instance_version, status: spec?.status, fingerprint: spec ? fingerprint(spec) : null, findings, recordFile, rendered: md, output });
    };

    for (const { file, spec } of specs) {
      const rp = recordPath(file, spec);
      const record = loadRecord(rp);
      const history = renderRoot ? runs.history(renderRoot, relative(renderRoot, resolve(file))) : [];
      const dossier = renderDossier(spec, { record, history });
      const dossierOut = writeRendering(outDir, "dossiers", spec.id, dossier.md);
      remember({ source: file, output: dossierOut, kind: "dossier", id: spec.id, spec, findings: dossier.findings, recordFile: rp, md: dossier.md });

      if (!draftSheets && !SHEET_STATES.includes(spec.status)) {
        console.log(`skip  ${file}: sheet is only for ${SHEET_STATES.join(", ")}; status is ${spec.status}`);
      } else if (selectedIndex?.blocked) {
        console.log(`skip  ${file}: selected Index ${selectedIndex.file} is blocked`);
      } else if (!ambiguousIndex) {
        const sheet = renderSheet(spec, { record, index: selectedIndex?.index ?? null, draft: draftSheets });
        const sheetBlocked = printFindings(file, sheet.findings);
        if (sheetBlocked) blocked = true;
        else {
          const sheetOut = writeRendering(outDir, draftSheets ? "drafts" : "sheets", spec.id, sheet.md);
          remember({ source: file, output: sheetOut, kind: "sheet", id: spec.id, spec, findings: sheet.findings, recordFile: rp, md: sheet.md });
        }
      }

      if (spec.status === "frozen") {
        const checked = lintFile(file);
        const request = renderRequest(spec, { record });
        const findings = [...checked.findings.filter((x) => x.severity === "block"), ...request.findings];
        const requestBlocked = printFindings(file, findings);
        if (requestBlocked) blocked = true;
        else {
          const requestOut = writeRendering(outDir, "requests", spec.id, request.md);
          remember({ source: file, output: requestOut, kind: "request", id: spec.id, spec, findings, recordFile: rp, md: request.md });
        }
      }
    }
    for (const { file, index: idx, rendered, blocked: indexBlocked } of renderedIndexes) {
      if (indexBlocked) {
        runItems.push({ file, kind: "index", id: idx.round, findings: rendered.findings, rendered: null });
        continue;
      }
      const output = writeRendering(outDir, "index", idx.round, rendered.md);
      remember({ source: file, output, kind: "index", id: idx.round, findings: rendered.findings, md: rendered.md });
    }

    const bibliography = renderRoot ? join(renderRoot, "references.bib") : null;
    if (bibliography && existsSync(bibliography)) {
      // Paperforge resolves a type-level bibliography from each collection
      // root. Keep the canonical copy beside documents.toml as promised, then
      // mirror the same bytes only into collection roots that were rendered.
      const targets = [join(resolve(outDir), "references.bib")];
      for (const output of written.filter((x) => ["dossier", "sheet"].includes(x.kind))) targets.push(join(dirname(resolve(output.output)), "references.bib"));
      for (const output of new Set(targets)) {
        mkdirSync(dirname(output), { recursive: true });
        if (resolve(bibliography) !== output) copyFileSync(bibliography, output);
        console.log(`wrote ${output}`);
        runItems.push({ file: bibliography, kind: "bibliography", id: null, findings: [], output });
      }
    }

    recordRuns("render", runItems.map((item) => ({ ...item, root: renderRoot })), flagText("label"));
    if (manifest) {
      const { snippets: missing, warnings } = missingManifestEntries(manifest, written);
      for (const warning of warnings) console.log(warning);
      if (missing.length) console.log(`\nmanifest entries missing from ${manifest}:\n\n${missing.join("\n\n")}\n`);
      else console.log(`manifest already names all ${written.length} rendered file(s)`);
    }
    process.exit(blocked ? 1 : 0);
  }
  case "paper": {
    const [specFile, mdFile] = positional;
    if (!specFile || !mdFile || !existsSync(mdFile)) die("paper needs <spec.yaml> <document.md>");
    const spec = loadSpec(specFile);
    const findings = checkPaper(spec, mdFile);
    const blocked = printFindings(mdFile, findings);
    recordRuns("paper", [
      { file: specFile, kind: "spec", id: spec.id, instance_version: spec.instance_version, status: spec.status, fingerprint: fingerprint(spec), findings: [], recordFile: recordPath(specFile, spec, flags.record) },
      // the document belongs to the spec's project for this purpose, wherever it lives
      { file: mdFile, kind: "document", findings, root: findRoot(dirname(resolve(specFile))) },
    ], flags.label && flags.label !== true ? String(flags.label) : null);
    process.exit(blocked ? 1 : 0);
  }
  case "help": case undefined: case "--help": case "-h":
    process.stdout.write(HELP);
    break;
  default:
    die(`unknown command '${cmd}'\n${HELP}`);
}
