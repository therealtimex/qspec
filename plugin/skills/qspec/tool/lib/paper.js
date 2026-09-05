// Does a downstream document carry the frozen claim, verbatim, as the gist of
// a labelled claim? This is a string comparison against a frozen file: the
// answer is in the two files and there is exactly one. Whether the paper
// *supports* the claim is a reviewer's question and is not asked here.
const { readFileSync } = require("node:fs");

const collapse = (v) => String(v ?? "").replace(/\s+/g, " ").trim();

function claimLabel(spec) { return `claim-${String(spec.id).toLowerCase()}`; }
function claimGist(spec) { return collapse(spec.claim?.one_sentence); }
function gistRepresentable(value) { return !/["{}]/.test(collapse(value)); }

function checkPaper(spec, mdFile) {
  const findings = [];
  const f = (severity, rule, message, act) => findings.push({ severity, rule, message, act, file: mdFile });
  const label = claimLabel(spec);
  const sentence = claimGist(spec);
  if (!gistRepresentable(sentence)) f("block", "gist-unrepresentable", "one_sentence contains a quote or brace, which a Paperforge gist cannot hold; reword the claim");
  const text = readFileSync(mdFile, "utf8");
  const re = new RegExp(`\\{#${label}\\b([^}]*)\\}`, "g");
  const hits = [...text.matchAll(re)];
  if (hits.length === 0) { f("manual", "claim-absent", `no paragraph carries {#${label} gist="..."}`, `label the paper's load-bearing paragraph: {#${label} gist="<the frozen one_sentence>"}`); return findings; }
  if (hits.length > 1) f("block", "claim-duplicate", `{#${label}} appears ${hits.length} times`);
  const m = /gist="([^"]*)"/.exec(hits[0][1]);
  if (!m) { f("block", "gist-missing", `{#${label}} carries no gist`); return findings; }
  if (collapse(m[1]) !== sentence) f("block", "gist-differs", `the gist does not match ${spec.id}@${spec.instance_version} one_sentence`, "either the paper answers a different question (new spec version) or the gist drifted (restore it)");
  const escapedId = String(spec.id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pointer = new RegExp(`\\*\\*Question:\\*\\*\\s*${escapedId}(?:@${spec.instance_version}|,\\s*version\\s+${spec.instance_version})\\b`);
  if (!pointer.test(text)) f("manual", "pointer-absent", `no metadata row **Question:** ${spec.id}@${spec.instance_version} or **Question:** ${spec.id}, version ${spec.instance_version} in the head`, "add either row so the document cites id and instance_version (QSPEC-CORE section 12)");
  return findings;
}

module.exports = { claimGist, claimLabel, gistRepresentable, checkPaper };
