#!/usr/bin/env node
// A committee rendering must never fall back to schema vocabulary. Keep every
// value it can emit, and every profile field it can name, paired with a human
// label in the catalog. An optional path lets the suite prove a broken catalog
// is refused without changing the installed one.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const path = resolve(process.argv[2] ?? join(ROOT, "schema", "catalogs.json"));
const catalogs = JSON.parse(readFileSync(path, "utf8"));
const values = new Set([
  ...Object.keys(catalogs.domains ?? {}),
  ...(catalogs.core?.states ?? []),
  ...(catalogs.core?.levels ?? []),
  ...(catalogs.core?.ceiling ?? []),
  ...(catalogs.core?.actions ?? []),
]);
const profileFields = new Set();

for (const domain of Object.values(catalogs.domains ?? {})) {
  for (const key of ["families", "goals", "safety"]) for (const value of domain[key] ?? []) values.add(value);
  for (const choices of Object.values(domain.hints_extra ?? {})) for (const value of choices) values.add(value);
  for (const design of Object.keys(domain.designs ?? {})) values.add(design);
  for (const standards of Object.values(domain.designs ?? {})) for (const threat of standards) values.add(threat);
  for (const threat of domain.threats ?? []) values.add(threat);
  if (domain.threat_field) profileFields.add(domain.threat_field);
  if (domain.designs) profileFields.add("design");
  for (const profile of Object.values(domain.profiles ?? {})) {
    const definition = profile.$ref ? domain.profile_sets?.[profile.$ref] : profile;
    for (const field of [...(definition?.required ?? []), ...(definition?.optional ?? [])]) profileFields.add(field);
    for (const choices of Object.values(definition?.enums ?? {})) for (const value of choices) values.add(value);
  }
}

let bad = 0;
const labelled = (entry) => typeof entry?.en === "string" && entry.en.trim()
  && typeof entry?.sentence === "string" && entry.sentence.trim();
for (const value of [...values].sort()) {
  if (!labelled(catalogs.labels?.values?.[value])) {
    console.error(`catalog value '${value}' has no complete English committee label (en and sentence)`);
    bad++;
  }
}
for (const field of [...profileFields].sort()) {
  if (!labelled(catalogs.labels?.profile_fields?.[field])) {
    console.error(`profile field '${field}' has no complete English committee label (en and sentence)`);
    bad++;
  }
}

if (bad) {
  console.error(`\n${bad} missing committee label(s) in ${path}`);
  process.exit(1);
}
console.log(`catalog carries English committee labels for ${values.size} values and ${profileFields.size} profile fields`);
