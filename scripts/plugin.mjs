#!/usr/bin/env node
// The RealTimeX skill bundle is generated from the repo: the tool under
// tool/, the schema documents under references/. `--check` fails on drift so
// a stale bundle is a visible failure; `--package <dir>` writes the zip that a
// release ships. SKILL.md and the manifest are authored in plugin/ directly.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILL = join(ROOT, "plugin", "skills", "qspec");
const SYNC = [
  ["bin", "tool/bin"], ["lib", "tool/lib"], ["schema", "tool/schema"], ["templates", "tool/templates"],
  ["QSPEC-CORE.md", "references/QSPEC-CORE.md"], ["QSPEC-SS.md", "references/QSPEC-SS.md"],
  ["QSPEC-NS.md", "references/QSPEC-NS.md"], ["QSPEC-ENG.md", "references/QSPEC-ENG.md"],
  ["docs/paperforge-integration.md", "references/paperforge-integration.md"],
  ["LICENSE", "LICENSE"], ["NOTICE", "NOTICE"],
];

function files(dir) {
  const out = [];
  const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = join(d, e.name); if (e.isSymbolicLink()) throw new Error(`symlink in bundle: ${p}`); e.isDirectory() ? walk(p) : out.push(p); } };
  if (existsSync(dir)) walk(dir);
  return out.sort();
}

function sync() {
  for (const [src, dst] of SYNC) {
    const to = join(SKILL, dst);
    rmSync(to, { recursive: true, force: true });
    mkdirSync(dirname(to), { recursive: true });
    cpSync(join(ROOT, src), to, { recursive: true });
  }
}

function check() {
  const problems = [];
  for (const [src, dst] of SYNC) {
    const a = join(ROOT, src), b = join(SKILL, dst);
    if (statSync(a).isDirectory()) {
      const fa = files(a).map((p) => relative(a, p)), fb = files(b).map((p) => relative(b, p));
      if (fa.join("\n") !== fb.join("\n")) problems.push(`${dst}: file list differs from ${src}`);
      for (const f of fa) if (existsSync(join(b, f)) && readFileSync(join(a, f)).compare(readFileSync(join(b, f))) !== 0) problems.push(`${dst}/${f}: differs from ${src}/${f}`);
    } else if (!existsSync(b) || readFileSync(a).compare(readFileSync(b)) !== 0) problems.push(`${dst}: differs from ${src}`);
  }
  const manifest = JSON.parse(readFileSync(join(ROOT, "plugin", "realtimex.plugin.json"), "utf8"));
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const skill = readFileSync(join(SKILL, "SKILL.md"), "utf8");
  const skillVersion = /^\s*version:\s*"?([\d.]+)"?/m.exec(skill)?.[1];
  const versions = { "package.json": pkg.version, "realtimex.plugin.json": manifest.version, "SKILL.md": skillVersion };
  if (new Set(Object.values(versions)).size !== 1) problems.push(`versions disagree: ${JSON.stringify(versions)}`);
  for (const ref of skill.matchAll(/\]\((references\/[^)]+|tool\/[^)]+)\)/g)) if (!existsSync(join(SKILL, ref[1]))) problems.push(`SKILL.md links to missing ${ref[1]}`);
  if (pkg.dependencies && Object.keys(pkg.dependencies).length) problems.push("package.json declares dependencies; the bundle must run with none");
  return problems;
}

function pack(dir) {
  mkdirSync(dir, { recursive: true });
  const manifest = JSON.parse(readFileSync(join(ROOT, "plugin", "realtimex.plugin.json"), "utf8"));
  const out = resolve(dir, `qspec-${manifest.version}.zip`);
  rmSync(out, { force: true });
  execFileSync("zip", ["-r", "-q", "-X", out, ".", "-x", ".gitignore"], { cwd: join(ROOT, "plugin") });
  return out;
}

const args = process.argv.slice(2);
if (args.includes("--check")) {
  const p = check();
  if (p.length) { console.error("plugin bundle drift:\n  " + p.join("\n  ") + "\nrun: node scripts/plugin.mjs"); process.exit(1); }
  console.log("plugin bundle: in sync, one version, references resolve");
} else if (args.includes("--package")) {
  sync();
  const p = check(); if (p.length) { console.error(p.join("\n")); process.exit(1); }
  console.log(`wrote ${pack(args[args.indexOf("--package") + 1] ?? "dist")}`);
} else {
  sync();
  console.log("plugin bundle synced from the repo");
}
