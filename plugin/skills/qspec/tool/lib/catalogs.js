const { readFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");

const catalogs = JSON.parse(readFileSync(resolve(__dirname, "../schema/catalogs.json"), "utf8"));

const J_INVARIANTS = ["J1", "J2", "J3", "J4", "J5", "J6", "J7"];
const SEVERITIES = ["block", "manual", "warn", "skip"];

function resolveProfile(domain, family) {
  const p = domain.profiles[family];
  if (!p) return null;
  return p.$ref ? domain.profile_sets[p.$ref] : p;
}

module.exports = { catalogs, J_INVARIANTS, SEVERITIES, resolveProfile };
