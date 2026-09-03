const { readFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");

const catalogs = JSON.parse(readFileSync(resolve(__dirname, "../schema/catalogs.json"), "utf8"));

const J_INVARIANTS = ["J1", "J2", "J3", "J4", "J5", "J6", "J7"];
const SEVERITIES = ["block", "manual", "warn", "skip"];

// What J1 to J6 say, so `qspec sign` can print the rules a reviewer is about to
// assert instead of asking them to remember seven numbers. J7 is per profile and
// lives in the overlay catalog; `judgedRule` resolves it.
const J_TEXT = {
  J1: "`one_sentence` is a claim that could be false, not a topic, technique, platform, or noun pile.",
  J2: "`increment_if_this_works` is not solely a new setting, dataset, organism, instrument, prototype, or simulator.",
  J3: "`kill_condition` is checkable by the next stage and is not \"collect more.\"",
  J4: "Every `blocking` item is a real precondition, or the claim has been rewritten so it is not required.",
  J5: "`failure_would_look_like` describes a result, and `kill_condition` describes a stop rule; they are not the same sentence.",
  J6: "If `secondary_method` is set, the primary claim is still singular and the rescue rule is specific.",
};

function resolveProfile(domain, family) {
  const p = domain.profiles[family];
  if (!p) return null;
  return p.$ref ? domain.profile_sets[p.$ref] : p;
}

// The overlay's judged (J7) rule for a spec's profile, or null when the spec
// names no resolvable profile.
function judgedRule(spec) {
  const domain = catalogs.domains[spec?.domain];
  if (!domain) return null;
  const def = resolveProfile(domain, spec?.question_type?.method_family);
  return def?.judged ?? null;
}

module.exports = { catalogs, J_INVARIANTS, J_TEXT, SEVERITIES, resolveProfile, judgedRule };
