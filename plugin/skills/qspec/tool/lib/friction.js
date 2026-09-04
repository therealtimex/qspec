// What somebody had to do because the tool would not. A workaround made under a
// deadline is the right call and removes the only trace that anything was
// wrong, so the rule is solve it and report it. The note carries the facts an
// author cannot be expected to assemble: version, whether the project's
// guidance is current, and which run was the last one. Local, never filed: an
// agent's reading of a symptom is usually right and of a cause often is not.
const { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { catalogs } = require("./catalogs.js");
const runs = require("./runs.js");

const NOTES = ".qspec/friction";

function facts(root, invocation = "qspec") {
  const { drift } = require("./scaffold.js"); // lazy: scaffold's doctor reads this module
  const found = drift(root);
  const last = runs.latest(root);
  return {
    version: catalogs.version, node: process.version, tool: invocation,
    scaffold: `${found.state}${found.version ? ` (written by ${found.version})` : ""}`,
    last_run: last ? `${last.name} (${last.record.command}): ${runs.summary(last.record)}` : "none recorded",
  };
}

function write(root, what, f) {
  const dir = join(root, NOTES);
  mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const path = join(dir, `${ts}.md`);
  const body = [`# ${what.trim()}`, "", ...Object.entries(f).map(([k, v]) => `- ${k}: ${v}`), ""].join("\n");
  writeFileSync(path, body);
  return path;
}

function listing(root) {
  const dir = join(root, NOTES);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".md")).sort().map((f) => join(dir, f));
}

function latest(root) {
  const all = listing(root);
  return all.length ? all[all.length - 1] : null;
}

// The latest note as something to paste into a tracker. Printed, never filed.
function issueBody(path) {
  const text = readFileSync(path, "utf8");
  const [title, ...rest] = text.split("\n");
  return [`${title.replace(/^# /, "")}`, "", "What happened: see title.", "", "Facts at the time:", ...rest.filter(Boolean)].join("\n");
}

module.exports = { NOTES, facts, write, listing, latest, issueBody };
