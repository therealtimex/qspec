#!/usr/bin/env node
// The J7 rule a reviewer signs is read from schema/catalogs.json, but people read
// it in the overlay. If the two drift, `qspec sign` prints one sentence and the
// overlay states another, and the signature stops meaning what it says. This is
// the only place that pairing is checked, so it runs in `npm test`.
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogs = JSON.parse(readFileSync(join(ROOT, "schema", "catalogs.json"), "utf8"));
let bad = 0;

for (const [name, domain] of Object.entries(catalogs.domains)) {
  const overlay = readFileSync(join(ROOT, domain.overlay), "utf8");
  const inDoc = new Set([...overlay.matchAll(/^Judged \(J7\): (.+)$/gm)].map((m) => m[1].trim()));
  const inCatalog = new Map();
  for (const [family, p] of Object.entries(domain.profiles)) {
    const def = p.$ref ? domain.profile_sets[p.$ref] : p;
    if (!def?.judged) { console.error(`${name}: profile '${family}' has no judged rule; a reviewer would sign J7 against nothing`); bad++; continue; }
    inCatalog.set(def.judged, family);
  }
  for (const [rule, family] of inCatalog) if (!inDoc.has(rule)) { console.error(`${name}/${family}: the catalog's J7 rule is not in ${domain.overlay} as a "Judged (J7):" line`); bad++; }
  for (const rule of inDoc) if (!inCatalog.has(rule)) { console.error(`${name}: ${domain.overlay} states a J7 rule the catalog does not carry: ${rule}`); bad++; }
  if (!Array.isArray(domain.exploratory_goals) || !domain.exploratory_goals.length) { console.error(`${name}: no exploratory_goals, so core section 6.3 has no escape hatch in this domain`); bad++; }
  for (const g of domain.exploratory_goals ?? []) if (!domain.goals.includes(g)) { console.error(`${name}: exploratory goal '${g}' is not in the domain's goal catalog`); bad++; }
}

if (bad) { console.error(`\n${bad} mismatch(es) between schema/catalogs.json and the overlays`); process.exit(1); }
console.log("catalogs and overlays agree on every J7 rule and exploratory goal");
