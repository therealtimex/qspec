#!/usr/bin/env node
// qspec: lint specs, record acts, and render selection sheets, indexes and
// frozen requests. `qspec help` lists the commands.
const { existsSync, readFileSync, readdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const yaml = require("../lib/vendor/js-yaml/js-yaml.js");
const { J_INVARIANTS } = require("../lib/catalogs.js");
const { format, hasBlock, lintFile, loadSpec } = require("../lib/lint.js");
const { checkPaper } = require("../lib/paper.js");
const { appendEntry, fingerprint, loadRecord, newRecord, recordPath, saveRecord, setStatus, signingEntry } = require("../lib/record.js");
const { index: renderIndex, request: renderRequest, sheet: renderSheet } = require("../lib/render.js");

const HELP = `usage: qspec <command> [args]

  lint <spec.yaml>...            M invariants, Decision Record, and signature (M16)
       [--record path] [--json] [--expect-fail]
  fingerprint <spec.yaml>        print the fingerprint a signature is taken over
  sign <spec.yaml> --by <reviewer> [--date YYYY-MM-DD] [--reason text]
                                 record draft -> specified with all J invariants signed
  transition <spec.yaml> --to <state> --by <actor> --role <owner|reviewer|decision_maker>
       [--reason text] [--cite Jn|Mn] [--revisit-by date] [--successor id@ver] [--date date]
  sheet <spec.yaml> [--index index.yaml] [--out file.md]
                                 selection sheet in Paperforge head format
  index <index.yaml> [--specs dir] [--out file.md]
                                 portfolio index table, with its checks
  request <spec.yaml> [--out file.md]
                                 frozen request for a Paperforge project's request key
  paper <spec.yaml> <document.md>
                                 does the document carry the frozen claim as a gist
`;

const argv = process.argv.slice(2);
const cmd = argv.shift();
const BOOLEAN = new Set(["expect-fail", "json"]);
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

function emit(md, out) {
  if (out) { writeFileSync(out, md); console.log(`wrote ${out}`); } else process.stdout.write(md);
}

switch (cmd) {
  case "lint": {
    if (!positional.length) die("lint needs at least one spec file");
    let exit = 0;
    const results = positional.map((f) => lintFile(f, { record: flags.record }));
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
      appendEntry(record, spec, { date: flags.date ?? today(), actor: flags.by, role: "reviewer", from: "draft", to: "specified", reason: flags.reason ?? "judged invariants reread and signed", signed_invariants: [...J_INVARIANTS], spec_fingerprint: fingerprint(spec) });
    } catch (e) { die(e.message); }
    saveRecord(rp, record);
    setStatus(file, "specified");
    console.log(`signed ${J_INVARIANTS.join(" ")} for ${spec.id}@${spec.instance_version} by ${flags.by}\nrecord: ${rp}\nstatus: specified`);
    break;
  }
  case "transition": {
    const [file] = positional;
    if (!file || !flags.to || !flags.by || !flags.role) die("transition needs <spec.yaml> --to <state> --by <actor> --role <role>");
    const spec = loadSpec(file);
    const rp = recordPath(file, spec, flags.record);
    const record = loadRecord(rp) ?? newRecord(spec);
    if (flags.to === "specified") die("use `qspec sign` for draft -> specified; it must carry the signature");
    if (["frozen", "superseded"].includes(flags.to) && !(spec.handoff?.first_check ?? "").trim()) die("handoff.first_check must be filled before freeze (M14)");
    let entry;
    try {
      entry = appendEntry(record, spec, { date: flags.date ?? today(), actor: flags.by, role: flags.role, to: flags.to, reason: flags.reason ?? "", cited_invariant: flags.cite ?? null, revisit_by: flags["revisit-by"] ?? null, successor: flags.successor ?? null });
    } catch (e) { die(e.message); }
    saveRecord(rp, record);
    setStatus(file, flags.to);
    console.log(`${entry.from} -> ${entry.to} by ${entry.actor} (${entry.role}) for ${spec.id}@${spec.instance_version}\nrecord: ${rp}\nstatus: ${entry.to}`);
    break;
  }
  case "sheet": {
    const [file] = positional;
    if (!file) die("sheet needs a spec file");
    const spec = loadSpec(file);
    const record = loadRecord(recordPath(file, spec, flags.record));
    const idx = flags.index ? yaml.load(readFileSync(flags.index, "utf8"), { schema: yaml.CORE_SCHEMA }) : null;
    const { md, findings } = renderSheet(spec, { record, index: idx });
    const blocked = printFindings(file, findings);
    if (blocked) process.exit(1);
    emit(md, flags.out);
    break;
  }
  case "index": {
    const [file] = positional;
    if (!file) die("index needs an index file");
    const idx = yaml.load(readFileSync(file, "utf8"), { schema: yaml.CORE_SCHEMA });
    let specsById = null;
    if (flags.specs) {
      specsById = {};
      for (const f of readdirSync(flags.specs)) if (/\.ya?ml$/.test(f) && !/\.record\.ya?ml$/.test(f)) { try { const sp = loadSpec(join(flags.specs, f)); if (sp?.id) specsById[sp.id] = sp; } catch {} }
    }
    const { md, findings } = renderIndex(idx, specsById);
    const blocked = printFindings(file, findings);
    if (blocked) process.exit(1);
    emit(md, flags.out);
    break;
  }
  case "request": {
    const [file] = positional;
    if (!file) die("request needs a spec file");
    const spec = loadSpec(file);
    const record = loadRecord(recordPath(file, spec, flags.record));
    const lint = lintFile(file, { record: flags.record });
    const { md, findings } = renderRequest(spec, { record });
    const blocked = printFindings(file, [...lint.findings.filter((x) => x.severity === "block"), ...findings]);
    if (blocked) process.exit(1);
    emit(md, flags.out);
    break;
  }
  case "paper": {
    const [specFile, mdFile] = positional;
    if (!specFile || !mdFile || !existsSync(mdFile)) die("paper needs <spec.yaml> <document.md>");
    const spec = loadSpec(specFile);
    const blocked = printFindings(mdFile, checkPaper(spec, mdFile));
    process.exit(blocked ? 1 : 0);
  }
  case "help": case undefined: case "--help": case "-h":
    process.stdout.write(HELP);
    break;
  default:
    die(`unknown command '${cmd}'\n${HELP}`);
}
