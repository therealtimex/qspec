#!/bin/sh
# Every command, every example, every negative. Exit non-zero on the first surprise.
set -e
Q="node bin/qspec.js"
echo "== specs pass, records agree, signatures current"
$Q lint examples/*.yaml
if $Q lint examples/*.yaml | grep -q 'cite-'; then echo "UNEXPECTED: a spec outside a project produced a cite-* finding"; exit 1; fi
echo "== the BibTeX reader handles the supported surface and names a malformed line"
node -e 'const a=require("node:assert/strict"),{readBib}=require("./lib/bib.js"); const good=readBib("test/fixtures/references-mixed.bib"); a.equal(good.error,null); a.equal(good.entries.size,2); a.equal(good.entries.get("nested-braces").fields.title,"An {Outer {and Inner}} Title"); a.equal(good.entries.get("nested-braces").fields.year,"2024"); a.equal(good.entries.get("quoted-fields").fields.url,"https://example.invalid/quoted"); const bad=readBib("test/fixtures/references-unparseable.bib"); a.equal(bad.entries.size,0); a.equal(bad.error.line,3)'
if grep -qiE '\bQSPEC\b' examples/references.bib; then echo "UNEXPECTED: the example bibliography would put the tool name in a committee sheet"; exit 1; fi
echo "== negatives block"
$Q lint --expect-fail examples/negative/*.yaml
echo "== empty templates block"
$Q lint --expect-fail templates/qspec-*.yaml
node -e 'const a=require("node:assert/strict"),y=require("./lib/vendor/js-yaml/js-yaml.js"),fs=require("node:fs"); for(const p of process.argv.slice(1)){const s=y.load(fs.readFileSync(p,"utf8"),{schema:y.CORE_SCHEMA}); a.equal(s.increment.closest_work.length,3,p)}' templates/qspec-*.yaml
echo "== index checks and renders"
$Q index examples/index-round-2026-09.yaml --specs examples --out /tmp/qspec-index.md
grep -q '| Rank | Question | Field | Design | Claim | Blocked | Recommended |' /tmp/qspec-index.md && grep -q 'Social science' /tmp/qspec-index.md && grep -q 'Causal empirical study' /tmp/qspec-index.md && grep -q 'Keep as a backup' /tmp/qspec-index.md || { echo "UNEXPECTED: the Index did not carry labelled committee cells"; exit 1; }
node -e 'const a=require("node:assert/strict"),fs=require("node:fs"),r=require("./lib/render.js"); a.deepEqual(r.committeeClean(fs.readFileSync("/tmp/qspec-index.md","utf8")),[])'
node -e 'const a=require("node:assert/strict"),y=require("./lib/vendor/js-yaml/js-yaml.js"),fs=require("node:fs"),r=require("./lib/render.js"); const i=y.load(fs.readFileSync("examples/index-round-2026-09.yaml","utf8"),{schema:y.CORE_SCHEMA}); i.entries[0].claim_20_words += " [@q101-work-1]"; const out=r.index(i); a.ok(out.md.includes("[@q101-work-1]")); a.deepEqual(out.findings,[])'
echo "== sheet renders for a selectable spec"
$Q sheet examples/ss-causal-procurement-cutoff.yaml --index examples/index-round-2026-09.yaml --out /tmp/qspec-sheet.md
grep -q '\[@q101-work-1\]' /tmp/qspec-sheet.md || { echo "UNEXPECTED: a keyed closest work did not reach the sheet"; exit 1; }
grep -q 'The design is causal empirical study, with effect estimation as its knowledge goal' /tmp/qspec-sheet.md && grep -q 'handles sensitive data' /tmp/qspec-sheet.md || { echo "UNEXPECTED: the sheet did not use sentence-form catalog labels for its design and constraints"; exit 1; }
grep -q '\*\*Intervention or exposure:\*\*' /tmp/qspec-sheet.md && grep -q '\*\*How units come to be treated:\*\*' /tmp/qspec-sheet.md && grep -q '\*\*Pre-committed checks:\*\*' /tmp/qspec-sheet.md || { echo "UNEXPECTED: the sheet did not use catalog labels for profile fields"; exit 1; }
node -e 'const a=require("node:assert/strict"),fs=require("node:fs"),r=require("./lib/render.js"); a.deepEqual(r.committeeClean(fs.readFileSync("/tmp/qspec-sheet.md","utf8")),[])'
node -e 'const a=require("node:assert/strict"),y=require("./lib/vendor/js-yaml/js-yaml.js"),fs=require("node:fs"),r=require("./lib/render.js"); const s=y.load(fs.readFileSync("examples/ss-causal-procurement-cutoff.yaml","utf8"),{schema:y.CORE_SCHEMA}); s.claim.object += "."; s.claim.scope += "."; s.increment.closest_work[0].cite += "."; const md=r.sheet(s).md; a.ok(!md.includes(`${s.claim.object}.`)); a.ok(!md.includes(`${s.claim.scope}.`)); a.ok(md.includes(s.claim.object)); a.ok(md.includes(s.claim.scope)); a.ok(!md.includes(`${s.increment.closest_work[0].cite} [@${s.increment.closest_work[0].key}].`))'
node -e 'const a=require("node:assert/strict"),y=require("./lib/vendor/js-yaml/js-yaml.js"),fs=require("node:fs"),r=require("./lib/render.js"); const s=y.load(fs.readFileSync("examples/ss-causal-procurement-cutoff.yaml","utf8"),{schema:y.CORE_SCHEMA}); delete s.increment.closest_work[0].key; const sheet=r.sheet(s).md,dossier=r.dossier(s).md; a.ok(sheet.includes(s.increment.closest_work[0].cite)); a.ok(dossier.includes(s.increment.closest_work[0].cite)); a.ok(!sheet.includes("[@q101-work-1]")); a.ok(!dossier.includes("[@q101-work-1]")); a.ok(sheet.includes("[@q101-work-2]")); a.ok(dossier.includes("[@q101-work-2]"))'
echo "== profile labels apply only to declared enums; free prose stays visible to committee-clean"
node -e 'const a=require("node:assert/strict"),y=require("./lib/vendor/js-yaml/js-yaml.js"),fs=require("node:fs"),r=require("./lib/render.js"); const s=y.load(fs.readFileSync("examples/ss-causal-procurement-cutoff.yaml","utf8"),{schema:y.CORE_SCHEMA}); s.profile.comparison="none"; let out=r.sheet(s); a.match(out.md,/\*\*Comparison:\*\* none/); a.ok(!out.md.includes("**Comparison:** No empirical role")); s.profile.design_risk="empirical_causal"; out=r.sheet(s); a.ok(out.md.includes("**Design risk:** empirical_causal")); a.ok(out.findings.some((f)=>f.rule==="committee-clean" && /empirical_causal.*line/.test(f.message)))'
echo "== committee-clean checks finished text, including prose a person supplied"
cp examples/ss-causal-procurement-cutoff.yaml /tmp/qspec-committee-dirty.yaml
node -e 'const fs=require("node:fs"),p=process.argv[1]; let text=fs.readFileSync(p,"utf8"); text=text.replace("One national procurement system, contracts within a stated band around the cutoff, five fiscal years", "One empirical_causal project"); fs.writeFileSync(p,text)' /tmp/qspec-committee-dirty.yaml
DIRTY_OUT=$($Q sheet /tmp/qspec-committee-dirty.yaml 2>&1 || true)
printf '%s\n' "$DIRTY_OUT" | grep -q 'committee-clean.*empirical_causal.*line' || { echo "UNEXPECTED: committee-clean did not name the token and rendered line"; exit 1; }
node -e 'const a=require("node:assert/strict"),r=require("./lib/render.js"); for(const rule of r.COMMITTEE_DENYLIST){const findings=r.committeeClean(rule.example); a.ok(findings.some((f)=>f.rule==="committee-clean" && /line 1/.test(f.message)),rule.id)}'
node -e 'const a=require("node:assert/strict"),r=require("./lib/render.js"); a.deepEqual(r.committeeClean("The comparison follows [@empirical_causal; @q101-work-1]."),[])'
echo "== sheet refused for a specified spec"
if $Q sheet examples/ss-ethnographic-scoring-weights.yaml >/dev/null 2>&1; then echo "UNEXPECTED: sheet rendered for a specified spec"; exit 1; fi
echo "== --draft previews any state and names empty fields for the owner"
cp templates/qspec-social.yaml /tmp/qspec-draft-source.yaml
node -e 'const fs=require("node:fs"),p=process.argv[1]; let text=fs.readFileSync(p,"utf8"); text=text.replace("method_family: \"\"", "method_family: empirical_causal"); fs.writeFileSync(p,text)' /tmp/qspec-draft-source.yaml
$Q sheet /tmp/qspec-draft-source.yaml --draft --out /tmp/qspec-draft-sheet.md >/dev/null
grep -q '^\*\*Draft:\*\* unsigned, not for submission$' /tmp/qspec-draft-sheet.md && grep -q '^### Before submission$' /tmp/qspec-draft-sheet.md && grep -q '^- Intervention or exposure$' /tmp/qspec-draft-sheet.md || { echo "UNEXPECTED: draft sheet did not carry its warning and labelled hole list"; exit 1; }
node -e 'const a=require("node:assert/strict"),y=require("./lib/vendor/js-yaml/js-yaml.js"),fs=require("node:fs"),{lintSpec}=require("./lib/lint.js"),r=require("./lib/render.js"); const s=y.load(fs.readFileSync("templates/qspec-social.yaml","utf8"),{schema:y.CORE_SCHEMA}); s.question_type.method_family="empirical_causal"; s.question_type.secondary_method="theoretical"; s.status="frozen"; s.profile.name=""; const findings=lintSpec(s),md=r.sheet(s,{draft:true}).md; for(const [rule,text,label] of [["M5","rescue_rule","Rescue rule"],["M7","vehicle_is_not_the_contribution","Why the vehicle is not the contribution"],["M8","uninteresting_even_if_true","Why a true result could still be uninteresting"],["M11","profile.name","Design profile"],["M14","first_check","First check for the next stage"]]){a.ok(findings.some((f)=>f.rule===rule && f.message.includes(text)),`${rule} fixture did not block`); a.ok(md.includes(`- ${label}`),`${rule} hole was absent from the owner preview`)}'
$Q sheet examples/ns-theoretical-mean-field-threshold.yaml --draft --out /tmp/qspec-draft-theory.md >/dev/null
grep -q '\*\*Role of empirical evidence:\*\* Later test' /tmp/qspec-draft-theory.md && ! grep -q 'later_test' /tmp/qspec-draft-theory.md || { echo "UNEXPECTED: a profile enum reached a draft without its catalog label"; exit 1; }
echo "== request exports for a frozen spec and is refused otherwise"
$Q request examples/ns-experimental-apical-oxygen.yaml --out /tmp/qspec-request.md
if grep -q '\[@q201-work-' /tmp/qspec-request.md; then echo "UNEXPECTED: request gained a citation marker"; exit 1; fi
node -e 'const a=require("node:assert/strict"),y=require("./lib/vendor/js-yaml/js-yaml.js"),fs=require("node:fs"),r=require("./lib/render.js"); const s=y.load(fs.readFileSync("examples/ns-experimental-apical-oxygen.yaml","utf8"),{schema:y.CORE_SCHEMA}); s.profile.intervention += " [@q201-work-1]"; a.ok(r.request(s,{record:y.load(fs.readFileSync("examples/ns-experimental-apical-oxygen.record.yaml","utf8"),{schema:y.CORE_SCHEMA})}).md.includes("[@q201-work-1]"))'
if $Q request examples/ss-causal-procurement-cutoff.yaml >/dev/null 2>&1; then echo "UNEXPECTED: request exported for a selectable spec"; exit 1; fi
echo "== paper carries the frozen claim"
$Q paper examples/ns-experimental-apical-oxygen.yaml examples/paper/Q-201-report.md
sed 's/Q-201@1/Q-201, version 1/' examples/paper/Q-201-report.md > /tmp/qspec-human-pointer.md
$Q paper examples/ns-experimental-apical-oxygen.yaml /tmp/qspec-human-pointer.md >/dev/null || { echo "UNEXPECTED: paper refused the committee form of the question pointer"; exit 1; }
echo "== paper with a drifted gist is refused"
sed 's/lowers the maximum critical temperature/raises the maximum critical temperature/' examples/paper/Q-201-report.md > /tmp/qspec-drift.md
if $Q paper examples/ns-experimental-apical-oxygen.yaml /tmp/qspec-drift.md >/dev/null 2>&1; then echo "UNEXPECTED: drifted gist passed"; exit 1; fi
echo "== the catalog and the overlays state the same J7 rules"
node scripts/check-judged.mjs
echo "== every committee value and profile field has a catalog label"
node scripts/check-catalog-labels.mjs
node -e 'const fs=require("node:fs"),c=JSON.parse(fs.readFileSync("schema/catalogs.json","utf8")); delete c.labels.values.empirical_causal; fs.writeFileSync("/tmp/qspec-catalogs-missing-label.json",JSON.stringify(c))'
if node scripts/check-catalog-labels.mjs /tmp/qspec-catalogs-missing-label.json >/dev/null 2>&1; then echo "UNEXPECTED: a fixture catalog with a missing emitted-value label passed"; exit 1; fi
node -e 'const fs=require("node:fs"),c=JSON.parse(fs.readFileSync("schema/catalogs.json","utf8")); delete c.labels.profile_fields.treatment; fs.writeFileSync("/tmp/qspec-catalogs-missing-label.json",JSON.stringify(c))'
if node scripts/check-catalog-labels.mjs /tmp/qspec-catalogs-missing-label.json >/dev/null 2>&1; then echo "UNEXPECTED: a fixture catalog with a missing profile-field label passed"; exit 1; fi
node -e 'const fs=require("node:fs"),c=JSON.parse(fs.readFileSync("schema/catalogs.json","utf8")); delete c.labels.values.empirical_causal.sentence; fs.writeFileSync("/tmp/qspec-catalogs-missing-sentence.json",JSON.stringify(c))'
if node scripts/check-catalog-labels.mjs /tmp/qspec-catalogs-missing-sentence.json >/dev/null 2>&1; then echo "UNEXPECTED: a fixture catalog with a missing sentence form passed"; exit 1; fi
echo "== sign prints the seven rules it is about to assert, and --show signs nothing"
$Q sign examples/ss-ethnographic-scoring-weights.yaml --by "D. Reviewer" --show | grep -q "overturning_observation" || { echo "UNEXPECTED: --show did not print this profile's J7 rule"; exit 1; }
grep -q "judged_rules" examples/ss-ethnographic-scoring-weights.record.yaml || { echo "UNEXPECTED: the signature did not record the J7 rule"; exit 1; }
echo "== a round refuses an act by someone it does not name as decision-maker"
if $Q index examples/negative/round/index-round-2026-09.yaml --specs examples/negative/round >/dev/null 2>&1; then echo "UNEXPECTED: a freeze by an unnamed decision-maker passed its round"; exit 1; fi
echo "== the acts a round can refuse, on a scratch copy"
rm -rf /tmp/qspec-acts && cp -r examples /tmp/qspec-acts
IDX="--index /tmp/qspec-acts/index-round-2026-09.yaml"
if $Q transition /tmp/qspec-acts/ss-causal-procurement-cutoff.yaml --to frozen --by "Nobody" --role decision_maker $IDX --reason x >/dev/null 2>&1; then echo "UNEXPECTED: an unnamed decision-maker froze a spec"; exit 1; fi
if $Q transition /tmp/qspec-acts/ss-causal-procurement-cutoff.yaml --to frozen --by "Group lead" --role decision_maker $IDX --specs /tmp/qspec-acts --reason x >/dev/null 2>&1; then echo "UNEXPECTED: a second freeze in one round passed the cap"; exit 1; fi
echo "== a decision_maker act must declare --index or --unbound"
if $Q transition /tmp/qspec-acts/ss-causal-procurement-cutoff.yaml --to deferred --by "Group lead" --role decision_maker --revisit-by 2026-12-01 >/dev/null 2>&1; then echo "UNEXPECTED: a decision_maker act ran without naming or disclaiming a round"; exit 1; fi
$Q transition /tmp/qspec-acts/ss-causal-procurement-cutoff.yaml --to deferred --by "Anyone At All" --role decision_maker --revisit-by 2026-12-01 --unbound >/dev/null 2>&1
$Q lint /tmp/qspec-acts/ss-causal-procurement-cutoff.yaml 2>&1 | grep -q "unbound-decision" || { echo "UNEXPECTED: an --unbound act left no warning on the record"; exit 1; }
if $Q transition /tmp/qspec-acts/ss-causal-procurement-cutoff.yaml --to selectable --by "A. Owner" --role owner --unbound >/dev/null 2>&1; then echo "UNEXPECTED: --unbound accepted for a role a spec already names"; exit 1; fi
$Q transition /tmp/qspec-acts/ss-causal-procurement-cutoff.yaml --to selectable --by "A. Owner" --role owner $IDX >/dev/null
echo "== a round refuses to show a claim its spec has moved away from"
rm -rf /tmp/qspec-stale && cp -r examples /tmp/qspec-stale
sed -i.bak 's/^  one_sentence: .*/  one_sentence: "The claim was quietly rewritten after the round was written."/' /tmp/qspec-stale/ss-causal-procurement-cutoff.yaml && rm -f /tmp/qspec-stale/*.bak
if $Q index /tmp/qspec-stale/index-round-2026-09.yaml --specs /tmp/qspec-stale >/dev/null 2>&1; then echo "UNEXPECTED: a round passed while a listed spec's signature was stale"; exit 1; fi
echo "== but a spec edited after the round killed it is the round's outcome, not its failure"
$Q transition /tmp/qspec-stale/ss-causal-procurement-cutoff.yaml --to killed --by "A. Owner" --role owner --reason "claim abandoned" >/dev/null
$Q index /tmp/qspec-stale/index-round-2026-09.yaml --specs /tmp/qspec-stale >/dev/null
echo "== a quote in the claim is a warning while it can still be reworded"
rm -rf /tmp/qspec-gist && cp -r examples /tmp/qspec-gist
sed -i.bak 's/^  one_sentence: .*/  one_sentence: "The so-called mean-field {threshold} shifts under quenched disorder."/' /tmp/qspec-gist/ns-theoretical-mean-field-threshold.yaml && rm -f /tmp/qspec-gist/*.bak
$Q lint /tmp/qspec-gist/ns-theoretical-mean-field-threshold.yaml 2>&1 | grep -q "gist-unrepresentable" || { echo "UNEXPECTED: a brace in one_sentence went unreported by lint"; exit 1; }
echo "== an owner withdraws from a round instead of killing, and can re-offer"
$Q transition /tmp/qspec-acts/ss-causal-procurement-cutoff.yaml --to specified --by "A. Owner" --role owner $IDX --reason "held back for the next round" >/dev/null
$Q index /tmp/qspec-acts/index-round-2026-09.yaml --specs /tmp/qspec-acts >/dev/null
$Q transition /tmp/qspec-acts/ss-causal-procurement-cutoff.yaml --to selectable --by "A. Owner" --role owner $IDX >/dev/null
echo "== a round survives its own outcome: a listed spec killed, and a freeze superseded"
$Q transition /tmp/qspec-acts/eng-experimental-converter-efficiency.yaml --to killed --by "J. Owner" --role owner $IDX --reason "vendor part removed the question" >/dev/null
$Q transition /tmp/qspec-acts/ns-experimental-apical-oxygen.yaml --to superseded --by "F. Owner" --role owner --successor "Q-202@1" --reason "claim narrowed" >/dev/null
$Q index /tmp/qspec-acts/index-round-2026-09.yaml --specs /tmp/qspec-acts >/dev/null
echo "== init prepares a project that passes its own checks"
ROOT="$PWD"
rm -rf /tmp/qspec-init
$Q init --into /tmp/qspec-init --title "Init Probe" --round 2026-09 --decision-maker "Group lead" --domain social --no-git >/dev/null
test -f /tmp/qspec-init/AGENTS.md && test -L /tmp/qspec-init/CLAUDE.md && test -f /tmp/qspec-init/.qspec/scaffold.json && test -f /tmp/qspec-init/specs/index-2026-09.yaml && test -f /tmp/qspec-init/references.bib || { echo "UNEXPECTED: init did not write the project"; exit 1; }
test ! -e /tmp/qspec-init/.git || { echo "UNEXPECTED: --no-git initialised a repository"; exit 1; }
$Q doctor --project /tmp/qspec-init >/dev/null
$Q doctor --project /tmp/qspec-init | grep -q 'bibliography.*0 unresolved, 0 unkeyed' || { echo "UNEXPECTED: doctor did not report the empty bibliography"; exit 1; }
$Q index /tmp/qspec-init/specs/index-2026-09.yaml --specs /tmp/qspec-init/specs --out /tmp/qspec-init-round.md >/dev/null
(cd /tmp/qspec-init/specs && node "$ROOT/bin/qspec.js" doctor | grep -q "scaffold   ok") || { echo "UNEXPECTED: doctor did not find the project from inside it"; exit 1; }
echo "== init refuses to run twice, refuses guidance it did not write, and appends below a shim on --append"
if $Q init --into /tmp/qspec-init --no-git >/dev/null 2>&1; then echo "UNEXPECTED: init ran twice on one directory"; exit 1; fi
rm -rf /tmp/qspec-shim && mkdir -p /tmp/qspec-shim && printf '# Workspace Agent Guide\n\nThis workspace delegates to LOOP_ROLE.md.\n' > /tmp/qspec-shim/AGENTS.md
if $Q init --into /tmp/qspec-shim --no-git >/dev/null 2>&1; then echo "UNEXPECTED: init overwrote an AGENTS.md it did not write"; exit 1; fi
$Q init --into /tmp/qspec-shim --append --no-git >/dev/null
head -1 /tmp/qspec-shim/AGENTS.md | grep -q "Workspace Agent Guide" || { echo "UNEXPECTED: --append did not keep the shim above the block"; exit 1; }
grep -q "qspec:project-guidance" /tmp/qspec-shim/AGENTS.md || { echo "UNEXPECTED: --append did not add the QSPEC block"; exit 1; }
echo "== new copies the domain template with the id set, takes the project's domain, and never overwrites"
(cd /tmp/qspec-init && node "$ROOT/bin/qspec.js" new Q-001 --slug probe --title "Probe" --owner "A. Owner" >/dev/null)
grep -q "^id: Q-001$" /tmp/qspec-init/specs/Q-001_probe.yaml && grep -q "^domain: social$" /tmp/qspec-init/specs/Q-001_probe.yaml && ! grep -q "YYYY-MM-DD" /tmp/qspec-init/specs/Q-001_probe.yaml || { echo "UNEXPECTED: new left a placeholder in the spec"; exit 1; }
$Q lint --expect-fail /tmp/qspec-init/specs/Q-001_probe.yaml >/dev/null
if (cd /tmp/qspec-init && node "$ROOT/bin/qspec.js" new Q-001 --slug probe >/dev/null 2>&1); then echo "UNEXPECTED: new overwrote a spec"; exit 1; fi
if $Q new Q-002 --specs /tmp/qspec-init/specs >/dev/null 2>&1; then echo "UNEXPECTED: new ran with no domain and no project to take one from"; exit 1; fi
$Q doctor --project /tmp/qspec-init | grep -q "1 draft" || { echo "UNEXPECTED: doctor did not count the new spec"; exit 1; }
echo "== doctor reports guidance that no longer matches what init writes"
sed -i.bak 's/"agents": "[0-9a-f]*"/"agents": "0000000000000000"/' /tmp/qspec-init/.qspec/scaffold.json && rm -f /tmp/qspec-init/.qspec/*.bak
if $Q doctor --project /tmp/qspec-init >/dev/null 2>&1; then echo "UNEXPECTED: doctor passed a stale scaffold"; exit 1; fi
$Q doctor --project /tmp/qspec-init | grep -q "STALE" || { echo "UNEXPECTED: doctor did not say STALE"; exit 1; }
echo "== init --refresh rewrites only the block init wrote, re-stamps, and clears STALE"
printf '\nMy own note below the block.\n' >> /tmp/qspec-init/AGENTS.md
printf '%% Writer-owned bibliography content.\n' >> /tmp/qspec-init/references.bib
REFERENCES_SHA=$(shasum -a 256 /tmp/qspec-init/references.bib | awk '{print $1}')
$Q init --refresh --into /tmp/qspec-init >/dev/null
$Q doctor --project /tmp/qspec-init | grep -q "scaffold   ok" || { echo "UNEXPECTED: refresh did not clear STALE"; exit 1; }
grep -q "My own note below the block" /tmp/qspec-init/AGENTS.md && head -1 /tmp/qspec-init/AGENTS.md | grep -q "Init Probe" || { echo "UNEXPECTED: refresh touched text outside the markers"; exit 1; }
test "$(grep -c -F -- "<!-- qspec:project-guidance -->" /tmp/qspec-init/AGENTS.md)" = "1" || { echo "UNEXPECTED: refresh duplicated the block"; exit 1; }
grep -q '"created"' /tmp/qspec-init/.qspec/scaffold.json && grep -q '"refreshed"' /tmp/qspec-init/.qspec/scaffold.json || { echo "UNEXPECTED: the stamp lost its creation date or gained no refresh date"; exit 1; }
test "$REFERENCES_SHA" = "$(shasum -a 256 /tmp/qspec-init/references.bib | awk '{print $1}')" || { echo "UNEXPECTED: init --refresh touched references.bib"; exit 1; }
$Q init --refresh --into /tmp/qspec-shim >/dev/null
head -1 /tmp/qspec-shim/AGENTS.md | grep -q "Workspace Agent Guide" || { echo "UNEXPECTED: refresh disturbed the shim above the block"; exit 1; }
if $Q init --refresh --into /tmp/qspec-nonesuch >/dev/null 2>&1; then echo "UNEXPECTED: refresh ran where there is no project"; exit 1; fi
echo "== citation findings are project-scoped warnings and malformed BibTeX is one skip"
rm -rf /tmp/qspec-citations && $Q init --into /tmp/qspec-citations --title "Citation Probe" --round 2026-09 --no-git >/dev/null
cp examples/ss-causal-procurement-cutoff.yaml examples/ss-causal-procurement-cutoff.record.yaml /tmp/qspec-citations/specs/
cp examples/references.bib /tmp/qspec-citations/references.bib
$Q lint /tmp/qspec-citations/specs/ss-causal-procurement-cutoff.yaml > /tmp/qspec-citations/clean.out
if grep -qE 'cite-unkeyed|cite-unresolved|bib-incomplete' /tmp/qspec-citations/clean.out; then echo "UNEXPECTED: keyed examples produced a citation warning"; exit 1; fi
echo "== prose citation markers resolve in every string field and render unchanged"
cp examples/ss-causal-procurement-cutoff.yaml /tmp/qspec-citations/specs/prose.yaml
node -e 'const fs=require("node:fs"),y=require("./lib/vendor/js-yaml/js-yaml.js"),p=process.argv[1],s=y.load(fs.readFileSync(p,"utf8"),{schema:y.CORE_SCHEMA}); s.profile.comparison += " [@q101-work-1]"; s.claim.why_it_matters += " [@unknown]"; fs.writeFileSync(p,y.dump(s,{noRefs:true,lineWidth:-1}))' /tmp/qspec-citations/specs/prose.yaml
CITE_OUT=$($Q lint /tmp/qspec-citations/specs/prose.yaml 2>&1 || true)
test "$(printf '%s\n' "$CITE_OUT" | grep -c cite-unresolved)" = 1 && printf '%s\n' "$CITE_OUT" | grep -q "claim.why_it_matters marker '\[@unknown\]'" || { echo "UNEXPECTED: prose citation lint did not report exactly the unresolved marker and its field path"; exit 1; }
if printf '%s\n' "$CITE_OUT" | grep -q 'profile.comparison.*cite-'; then echo "UNEXPECTED: the known prose citation did not resolve"; exit 1; fi
node -e 'const a=require("node:assert/strict"),y=require("./lib/vendor/js-yaml/js-yaml.js"),fs=require("node:fs"),r=require("./lib/render.js"); const s=y.load(fs.readFileSync(process.argv[1],"utf8"),{schema:y.CORE_SCHEMA}); for(const out of [r.sheet(s),r.dossier(s)]){a.ok(out.md.includes("[@q101-work-1]")); a.ok(out.md.includes("[@unknown]")); a.deepEqual(out.findings,[])}' /tmp/qspec-citations/specs/prose.yaml
cp /tmp/qspec-citations/specs/prose.yaml /tmp/qspec-prose-outside-project.yaml
CITE_OUT=$($Q lint /tmp/qspec-prose-outside-project.yaml 2>&1 || true)
if printf '%s\n' "$CITE_OUT" | grep -qE 'cite-unresolved|bib-incomplete'; then echo "UNEXPECTED: a prose marker outside a project produced a citation finding"; exit 1; fi
cp examples/ss-causal-procurement-cutoff.yaml /tmp/qspec-citations/specs/probe.yaml
node -e 'const fs=require("node:fs"),p=process.argv[1]; let s=fs.readFileSync(p,"utf8"); fs.writeFileSync(p,s.replace("key: q101-work-1","key: \"\""))' /tmp/qspec-citations/specs/probe.yaml
CITE_OUT=$($Q lint /tmp/qspec-citations/specs/probe.yaml 2>&1 || true)
test "$(printf '%s\n' "$CITE_OUT" | grep -c cite-unkeyed)" = 1 || { echo "UNEXPECTED: an empty key did not produce exactly one cite-unkeyed warning"; exit 1; }
if printf '%s\n' "$CITE_OUT" | grep -qE 'cite-unresolved|bib-incomplete'; then echo "UNEXPECTED: an empty key cascaded into another citation warning"; exit 1; fi
cp examples/ss-causal-procurement-cutoff.yaml /tmp/qspec-citations/specs/probe.yaml
node -e 'const fs=require("node:fs"),p=process.argv[1]; let s=fs.readFileSync(p,"utf8"); fs.writeFileSync(p,s.replace("key: q101-work-1","key: no-such-work"))' /tmp/qspec-citations/specs/probe.yaml
CITE_OUT=$($Q lint /tmp/qspec-citations/specs/probe.yaml 2>&1 || true)
test "$(printf '%s\n' "$CITE_OUT" | grep -c cite-unresolved)" = 1 || { echo "UNEXPECTED: a missing entry did not produce exactly one cite-unresolved warning"; exit 1; }
printf '\n@misc{q101-incomplete, title = {Incomplete example}}\n' >> /tmp/qspec-citations/references.bib
cp examples/ss-causal-procurement-cutoff.yaml /tmp/qspec-citations/specs/probe.yaml
node -e 'const fs=require("node:fs"),p=process.argv[1]; let s=fs.readFileSync(p,"utf8"); fs.writeFileSync(p,s.replace("key: q101-work-1","key: q101-incomplete"))' /tmp/qspec-citations/specs/probe.yaml
CITE_OUT=$($Q lint /tmp/qspec-citations/specs/probe.yaml 2>&1 || true)
test "$(printf '%s\n' "$CITE_OUT" | grep -c bib-incomplete)" = 1 || { echo "UNEXPECTED: an incomplete entry did not produce exactly one bib-incomplete warning"; exit 1; }
cp test/fixtures/references-unparseable.bib /tmp/qspec-citations/references.bib
CITE_OUT=$($Q lint /tmp/qspec-citations/specs/probe.yaml 2>&1 || true)
test "$(printf '%s\n' "$CITE_OUT" | grep -c bib-parse)" = 1 && printf '%s\n' "$CITE_OUT" | grep -q 'line 3' || { echo "UNEXPECTED: malformed BibTeX did not produce one line-numbered skip"; exit 1; }
if printf '%s\n' "$CITE_OUT" | grep -qE 'cite-unkeyed|cite-unresolved|bib-incomplete'; then echo "UNEXPECTED: malformed BibTeX cascaded into citation warnings"; exit 1; fi
rm -rf /tmp/qspec-no-bib && cp -R /tmp/qspec-citations /tmp/qspec-no-bib && rm /tmp/qspec-no-bib/references.bib
CITE_OUT=$($Q lint /tmp/qspec-no-bib/specs/probe.yaml 2>&1 || true)
if printf '%s\n' "$CITE_OUT" | grep -qE 'cite-unkeyed|cite-unresolved|bib-incomplete|bib-parse'; then echo "UNEXPECTED: a project without references.bib produced a citation finding"; exit 1; fi
$Q doctor --project /tmp/qspec-no-bib | grep -q 'bibliography.*none.*references.bib at the project root' || { echo "UNEXPECTED: doctor did not report the absent bibliography"; exit 1; }
echo "== lint and index record a run inside a project, and nothing outside one"
test ! -e .qspec || { echo "UNEXPECTED: a run was recorded in this repository, which is not a project"; exit 1; }
rm -rf /tmp/qspec-runs && $Q init --into /tmp/qspec-runs --title "Runs Probe" --round 2026-09 --domain social --no-git >/dev/null
(cd /tmp/qspec-runs && node "$ROOT/bin/qspec.js" new Q-001 --slug probe >/dev/null)
$Q lint /tmp/qspec-runs/specs/Q-001_probe.yaml --label "first look" >/dev/null 2>&1 || true
test -d /tmp/qspec-runs/.qspec/runs && test "$(ls /tmp/qspec-runs/.qspec/runs | wc -l | tr -d ' ')" = "1" || { echo "UNEXPECTED: lint in a project did not record exactly one run"; exit 1; }
test -f /tmp/qspec-runs/.qspec/runs/*first-look/sources/specs/Q-001_probe.yaml || { echo "UNEXPECTED: the run did not keep the spec as it stood"; exit 1; }
sed -i.bak 's/^owner: ""$/owner: "A. Owner"/; s/^  one_sentence: ""$/  one_sentence: "Cutoffs raise small-firm win rates."/' /tmp/qspec-runs/specs/Q-001_probe.yaml && rm -f /tmp/qspec-runs/specs/*.bak
$Q lint /tmp/qspec-runs/specs/Q-001_probe.yaml >/dev/null 2>&1 || true
$Q index /tmp/qspec-runs/specs/index-2026-09.yaml --specs /tmp/qspec-runs/specs >/dev/null
test "$($Q runs --project /tmp/qspec-runs | wc -l | tr -d ' ')" = "3" || { echo "UNEXPECTED: runs did not list three runs"; exit 1; }
$Q runs --project /tmp/qspec-runs | sed -n '1p' | grep -q "first-look" || { echo "UNEXPECTED: runs are not listed in the order they were written"; exit 1; }
echo "== runs --diff says the claim moved, which findings cleared, and shows the text"
SECOND=$($Q runs --project /tmp/qspec-runs | sed -n '2p' | awk '{print $1}')
$Q runs --project /tmp/qspec-runs --diff first-look,"$SECOND" --sources > /tmp/qspec-runs-diff.txt
grep -q "rewritten" /tmp/qspec-runs-diff.txt || { echo "UNEXPECTED: a changed claim was not reported as rewritten"; exit 1; }
grep -q -- "- block  M2" /tmp/qspec-runs-diff.txt || { echo "UNEXPECTED: the cleared M2 finding was not reported"; exit 1; }
grep -q '^+owner: "A. Owner"' /tmp/qspec-runs-diff.txt || { echo "UNEXPECTED: --sources did not show the changed line"; exit 1; }
if $Q runs --project /tmp/qspec-runs --diff first-look,nonesuch >/dev/null 2>&1; then echo "UNEXPECTED: --diff accepted a run that does not exist"; exit 1; fi
echo "== report writes a note carrying the facts, and --issue prints without filing"
(cd /tmp/qspec-runs && node "$ROOT/bin/qspec.js" report "lint kept blocking on M3 while a reviewer was assigned" >/dev/null)
test "$(ls /tmp/qspec-runs/.qspec/friction | wc -l | tr -d ' ')" = "1" || { echo "UNEXPECTED: report did not write one note"; exit 1; }
$Q report --issue --project /tmp/qspec-runs | grep -q "last_run: .*index" || { echo "UNEXPECTED: the note does not carry the last run"; exit 1; }
if $Q report --project /tmp/qspec-runs >/dev/null 2>&1; then echo "UNEXPECTED: report ran with nothing to say"; exit 1; fi
echo "== doctor counts runs since the last act and sees the friction note"
$Q doctor --project /tmp/qspec-runs | grep -q "runs       3 .*3 since the last recorded act" || { echo "UNEXPECTED: doctor did not report three runs since no act"; exit 1; }
$Q doctor --project /tmp/qspec-runs | grep -q "friction   1" || { echo "UNEXPECTED: doctor did not see the friction note"; exit 1; }
echo "== attach keeps a note beside its run, runs show prints it, and lint says a note is not an act"
rm -rf /tmp/qspec-notes && $Q init --into /tmp/qspec-notes --title "Notes Probe" --round 2026-09 --decision-maker "Group lead" --no-git >/dev/null
cp examples/ss-causal-procurement-cutoff.yaml examples/ss-causal-procurement-cutoff.record.yaml examples/index-round-2026-09.yaml /tmp/qspec-notes/specs/
$Q lint /tmp/qspec-notes/specs/ss-causal-procurement-cutoff.yaml --label baseline >/dev/null
printf '# Review round 1\n\nFinding 1: citation wording.\n' > /tmp/qspec-notes/handoff.md
$Q attach baseline /tmp/qspec-notes/handoff.md --by "D. Reviewer" --role reviewer --kind review --project /tmp/qspec-notes >/dev/null
test -f /tmp/qspec-notes/.qspec/runs/*-baseline/notes/*-review-d-reviewer.md || { echo "UNEXPECTED: attach did not copy the note beside the run"; exit 1; }
$Q runs show baseline --project /tmp/qspec-notes | grep -q "Finding 1: citation wording" || { echo "UNEXPECTED: runs show did not print the note as written"; exit 1; }
$Q runs --project /tmp/qspec-notes | grep -q "1 note(s)" || { echo "UNEXPECTED: runs did not count the note"; exit 1; }
$Q lint /tmp/qspec-notes/specs/ss-causal-procurement-cutoff.yaml | grep -q "notes-without-act" || { echo "UNEXPECTED: lint did not warn that a note is not an act"; exit 1; }
$Q lint /tmp/qspec-notes/specs/ss-causal-procurement-cutoff.yaml --label q001-reviewer-round-1 >/dev/null
ATTACH_OUT=$($Q attach q001-reviewer-round-1 /tmp/qspec-notes/handoff.md --by "A. Approver" --role approver --kind decision --project /tmp/qspec-notes 2>&1)
printf '%s\n' "$ATTACH_OUT" | grep -q "warning:.*does not match --role 'approver'" && printf '%s\n' "$ATTACH_OUT" | grep -q '^attached decision' || { echo "UNEXPECTED: cross-role attach did not warn and still attach"; exit 1; }
if $Q attach nonesuch /tmp/qspec-notes/handoff.md --by X --role reviewer --project /tmp/qspec-notes >/dev/null 2>&1; then echo "UNEXPECTED: attach accepted a run that does not exist"; exit 1; fi
if $Q attach baseline /tmp/qspec-notes/handoff.md --by X --role reviewer --kind verdict --project /tmp/qspec-notes >/dev/null 2>&1; then echo "UNEXPECTED: attach accepted an unlisted kind"; exit 1; fi
echo "== dossiers preserve notes, frozen claims carry gists, and run labels scope by spec"
rm -rf /tmp/qspec-render && $Q init --into /tmp/qspec-render --title "Render Probe" --round 2026-09 --decision-maker "Group lead" --no-git >/dev/null
cp examples/references.bib /tmp/qspec-render/references.bib
cp examples/ss-ethnographic-scoring-weights.yaml /tmp/qspec-render/specs/Q-102.yaml
sed -i.bak 's/^status: specified$/status: draft/' /tmp/qspec-render/specs/Q-102.yaml && rm -f /tmp/qspec-render/specs/*.bak
cp examples/ss-causal-procurement-cutoff.yaml examples/ss-causal-procurement-cutoff.record.yaml /tmp/qspec-render/specs/
cp examples/ns-experimental-apical-oxygen.yaml examples/ns-experimental-apical-oxygen.record.yaml /tmp/qspec-render/specs/
cp examples/index-round-2026-09.yaml /tmp/qspec-render/specs/index-2026-09.yaml
sed -i.bak '/  - id: Q-301/,/    rank: 3/d' /tmp/qspec-render/specs/index-2026-09.yaml && rm -f /tmp/qspec-render/specs/*.bak
$Q lint /tmp/qspec-render/specs/Q-102.yaml --label reviewer-round-1 >/dev/null
cp test/fixtures/dossier-note-placeholders.md /tmp/qspec-render/draft-review.md
$Q attach reviewer-round-1 /tmp/qspec-render/draft-review.md --by "D. Reviewer" --role reviewer --kind review --project /tmp/qspec-render >/dev/null
$Q lint /tmp/qspec-render/specs/ss-causal-procurement-cutoff.yaml --label reviewer-round-1 >/dev/null
if $Q runs show reviewer-round-1 --project /tmp/qspec-render >/dev/null 2>&1; then echo "UNEXPECTED: an ambiguous bare run label resolved"; exit 1; fi
$Q runs show reviewer-round-1 --spec Q-102 --project /tmp/qspec-render | grep -q "Re-run the check with" || { echo "UNEXPECTED: --spec did not resolve the draft's run label"; exit 1; }
$Q dossier /tmp/qspec-render/specs/Q-102.yaml --out /tmp/qspec-render/Q-102-dossier.md --label draft-dossier >/dev/null
NOTE=$(find /tmp/qspec-render/.qspec/runs -path '*/notes/*-review-d-reviewer.md' -print | head -1)
NOTE_SHA=$(shasum -a 256 "$NOTE" | awk '{print $1}')
node -e 'const a=require("node:assert/strict"),fs=require("node:fs"); const note=fs.readFileSync(process.argv[1],"utf8"),dossier=fs.readFileSync(process.argv[2],"utf8"),restored=dossier.replaceAll("‹","<").replaceAll("›",">"); a.ok(dossier.startsWith("# Process record (internal)\n")); a.ok(dossier.includes("‹run›")); a.ok(dossier.includes("‹handoff.md›")); a.ok(!dossier.includes("&lt;") && !dossier.includes("&gt;")); a.ok(!dossier.includes("`<run>`") && !dossier.includes("`<handoff.md>`")); a.ok(restored.includes(note))' "$NOTE" /tmp/qspec-render/Q-102-dossier.md || { echo "UNEXPECTED: dossier note was not identical after restoring ASCII angle brackets"; exit 1; }
node -e 'const a=require("node:assert/strict"),y=require("./lib/vendor/js-yaml/js-yaml.js"),fs=require("node:fs"),r=require("./lib/render.js"),s=y.load(fs.readFileSync("examples/ss-causal-procurement-cutoff.yaml","utf8"),{schema:y.CORE_SCHEMA}),md=r.dossier(s,{history:[{name:"probe",notes:[{kind:"review",actor:"A",role:"reviewer",attached:"2026-09-05",text:"Keep <strong>real HTML</strong> and already-coded `<run>` as written.\n"}]}]}).md; a.ok(md.includes("<strong>real HTML</strong>")); a.ok(md.includes("already-coded `<run>`")); a.ok(!md.includes("``<run>``"))'
test "$NOTE_SHA" = "$(shasum -a 256 "$NOTE" | awk '{print $1}')" || { echo "UNEXPECTED: dossier rendering modified the attached note file"; exit 1; }
if grep -q 'claim-q-102' /tmp/qspec-render/Q-102-dossier.md; then echo "UNEXPECTED: a draft dossier carried a frozen claim label"; exit 1; fi
$Q dossier /tmp/qspec-render/specs/ns-experimental-apical-oxygen.yaml --out /tmp/qspec-render/Q-201-dossier.md >/dev/null
grep -q '{#claim-q-201 gist="In the studied cuprate family' /tmp/qspec-render/Q-201-dossier.md || { echo "UNEXPECTED: a frozen dossier did not carry the frozen claim gist"; exit 1; }
grep -q '\[@q201-work-1\]' /tmp/qspec-render/Q-201-dossier.md || { echo "UNEXPECTED: a keyed closest work did not reach the dossier"; exit 1; }
$Q runs --project /tmp/qspec-render --diff reviewer-round-1,draft-dossier --spec Q-102 >/dev/null || { echo "UNEXPECTED: --spec did not scope runs --diff"; exit 1; }
echo "== render writes the state-appropriate corpus and one run names every output"
$Q render --specs /tmp/qspec-render/specs --out /tmp/qspec-render/documents --index /tmp/qspec-render/specs/index-2026-09.yaml --label render-probe > /tmp/qspec-render/render.out
grep -q 'skip.*Q-102.yaml.*status is draft' /tmp/qspec-render/render.out || { echo "UNEXPECTED: render did not name the skipped draft sheet"; exit 1; }
test ! -d /tmp/qspec-render/documents/drafts || test -z "$(find /tmp/qspec-render/documents/drafts -type f -name '*.md' -print -quit)" || { echo "UNEXPECTED: render wrote a draft without --draft"; exit 1; }
test "$(find /tmp/qspec-render/documents -type f -name '*.md' | wc -l | tr -d ' ')" = "7" || { echo "UNEXPECTED: render did not write exactly three dossiers, two sheets, one request, and one Index"; exit 1; }
node -e 'const r=require("./lib/runs.js").load("/tmp/qspec-render", "render-probe").record; const outputs=r.files.map(f=>f.output).filter(Boolean); if(r.command!=="render" || outputs.length!==10 || new Set(outputs).size!==10 || r.files.filter(f=>f.kind==="bibliography").length!==3) process.exit(1)' || { echo "UNEXPECTED: the render run did not name every written file exactly once"; exit 1; }
cmp -s /tmp/qspec-render/references.bib /tmp/qspec-render/documents/references.bib || { echo "UNEXPECTED: render did not copy references.bib beside the manifest"; exit 1; }
cmp -s /tmp/qspec-render/references.bib /tmp/qspec-render/documents/dossiers/references.bib && cmp -s /tmp/qspec-render/references.bib /tmp/qspec-render/documents/sheets/references.bib || { echo "UNEXPECTED: render did not mirror references.bib into Paperforge collection roots"; exit 1; }
echo "== render --draft writes previews under drafts, never sheets"
rm -rf /tmp/qspec-render-drafts
$Q render --draft --specs /tmp/qspec-render/specs --out /tmp/qspec-render-drafts --index /tmp/qspec-render/specs/index-2026-09.yaml --label draft-render-probe >/dev/null
test -f /tmp/qspec-render-drafts/drafts/Q-102.md || { echo "UNEXPECTED: render --draft omitted a draft-state preview"; exit 1; }
if test -d /tmp/qspec-render-drafts/sheets && test -n "$(find /tmp/qspec-render-drafts/sheets -type f -name '*.md' -print -quit)"; then echo "UNEXPECTED: render --draft wrote a preview under sheets/"; exit 1; fi
grep -q '^\*\*Draft:\*\* unsigned, not for submission$' /tmp/qspec-render-drafts/drafts/Q-102.md || { echo "UNEXPECTED: aggregate draft rendering omitted the draft warning"; exit 1; }
test "$(grep -c '^bibliography = "references.bib"$' templates/documents.qspec.toml)" = 2 && test "$(grep -c '^citation_style = "apa"$' templates/documents.qspec.toml)" = 2 || { echo "UNEXPECTED: the sheet and dossier types do not declare the bibliography and style"; exit 1; }
grep -q '^\[types.qspec-dossier\]$' templates/documents.qspec.toml && grep -q '^  type = "qspec-dossier"$' templates/documents.qspec.toml || { echo "UNEXPECTED: dossiers are not Paperforge documents"; exit 1; }
sed -n '/^\[types.qspec-dossier\]$/,/^$/p' templates/documents.qspec.toml | grep -q '^pdf = "typst"$' && sed -n '/^\[types.qspec-dossier\]$/,/^$/p' templates/documents.qspec.toml | grep -q '^docx = true$' || { echo "UNEXPECTED: the dossier type does not carry its PDF and DOCX editions"; exit 1; }
grep -A2 '^\[internal\]$' templates/documents.qspec.toml | grep -q '^files = \[\]$' || { echo "UNEXPECTED: Paperforge's required internal table contains dossier files"; exit 1; }
grep -B1 '^\[internal\]$' templates/documents.qspec.toml | grep -q 'KeyError.*internal' || { echo "UNEXPECTED: the required empty internal table is unexplained"; exit 1; }
test "$(grep -c '^  publish = false$' templates/documents.qspec.toml)" -ge 4 || { echo "UNEXPECTED: dossier and committee documents are not explicitly unpublished"; exit 1; }
# The shipped manifest carries illustrative dossier entries. Remove that sample
# collection for this corpus so render can print entries for the actual ids.
node -e 'const fs=require("node:fs"),p=process.argv[1],t=fs.readFileSync("templates/documents.qspec.toml","utf8"),a=t.indexOf("[[collection]]\nslug = \"qspec-dossiers\""),b=t.indexOf("[[collection]]\nslug = \"qspec-index\""); if(a<0||b<0||b<=a) process.exit(1); fs.writeFileSync(p,t.slice(0,a)+t.slice(b))' /tmp/qspec-render/documents/documents.toml
MANIFEST_SHA=$(shasum -a 256 /tmp/qspec-render/documents/documents.toml | awk '{print $1}')
$Q render --specs /tmp/qspec-render/specs --out /tmp/qspec-render/documents --index /tmp/qspec-render/specs/index-2026-09.yaml --manifest /tmp/qspec-render/documents/documents.toml --label manifest-probe > /tmp/qspec-render/manifest.out
grep -q 'root = "dossiers"' /tmp/qspec-render/manifest.out && grep -q 'type = "qspec-dossier"' /tmp/qspec-render/manifest.out && grep -q 'source = "Q-102.md"' /tmp/qspec-render/manifest.out || { echo "UNEXPECTED: render did not print the missing dossier as an unpublished document"; exit 1; }
grep -q 'root = "sheets"' /tmp/qspec-render/manifest.out && grep -q 'root = "requests"' /tmp/qspec-render/manifest.out || { echo "UNEXPECTED: render did not give each document kind its own collection root"; exit 1; }
if grep -q 'source = "dossiers/Q-102.md"' /tmp/qspec-render/manifest.out; then echo "UNEXPECTED: render repeated a collection root inside a document source"; exit 1; fi
if grep -q 'source = "index/2026-09.md"' /tmp/qspec-render/manifest.out; then echo "UNEXPECTED: render reported an Index already declared under its collection root"; exit 1; fi
test "$MANIFEST_SHA" = "$(shasum -a 256 /tmp/qspec-render/documents/documents.toml | awk '{print $1}')" || { echo "UNEXPECTED: render edited the Paperforge manifest"; exit 1; }
echo "== the printed manifest collections paste into the template and Paperforge resolves every source"
sed -n '/^\[\[collection\]\]/,$p' /tmp/qspec-render/manifest.out >> /tmp/qspec-render/documents/documents.toml
PAPERFORGE_REPO="$ROOT/../paperforge"
if test -f "$PAPERFORGE_REPO/paperforge/cli.py"; then
  PAPERFORGE_PYTHON="${PAPERFORGE_PYTHON:-python3}"
  if test -x /Applications/RealTimeX.AI.app/Contents/Resources/app/src/electron/features/pty/compat/macos/python3; then PAPERFORGE_PYTHON=/Applications/RealTimeX.AI.app/Contents/Resources/app/src/electron/features/pty/compat/macos/python3; fi
  PYTHONPATH="$PAPERFORGE_REPO" "$PAPERFORGE_PYTHON" -c 'import sys; from paperforge.cli import load; _, docs = load(sys.argv[1]); missing = [str(d["source_path"]) for d in docs if not d["source_path"].is_file()]; assert len(docs) == 7, len(docs); assert not missing, missing; assert sum(d["type"] == "qspec-dossier" for d in docs) == 3; assert all(d["publish"] is False for d in docs)' /tmp/qspec-render/documents/documents.toml || { echo "UNEXPECTED: Paperforge could not resolve every unpublished document, including dossiers"; exit 1; }
else
  echo "SKIP: sibling Paperforge checkout is absent; manifest structure assertions still ran"
fi
echo "== render --manifest warns when a dossier document is publishable and edits nothing"
cp /tmp/qspec-render/documents/documents.toml /tmp/qspec-render/documents/publishable-dossier.toml
node -e 'const fs=require("node:fs"),p=process.argv[1]; let t=fs.readFileSync(p,"utf8"),i=t.indexOf("type = \"qspec-dossier\""); if(i<0) process.exit(1); const j=t.indexOf("publish = false",i); if(j<0) process.exit(1); t=t.slice(0,j)+"publish = true"+t.slice(j+"publish = false".length); fs.writeFileSync(p,t)' /tmp/qspec-render/documents/publishable-dossier.toml
PUBLISHABLE_SHA=$(shasum -a 256 /tmp/qspec-render/documents/publishable-dossier.toml | awk '{print $1}')
$Q render --specs /tmp/qspec-render/specs --out /tmp/qspec-render/documents --index /tmp/qspec-render/specs/index-2026-09.yaml --manifest /tmp/qspec-render/documents/publishable-dossier.toml --label publish-warning-probe > /tmp/qspec-render/publish-warning.out
grep -q "warning: dossier document .* has publish = true; process records must remain unpublished" /tmp/qspec-render/publish-warning.out || { echo "UNEXPECTED: render did not warn about a publishable dossier"; exit 1; }
test "$PUBLISHABLE_SHA" = "$(shasum -a 256 /tmp/qspec-render/documents/publishable-dossier.toml | awk '{print $1}')" || { echo "UNEXPECTED: render edited the publishable Paperforge manifest"; exit 1; }
echo "== a blocked selected Index writes no sheets or blocked Index document and exits nonzero"
rm -rf /tmp/qspec-render-invalid
if $Q render --specs /tmp/qspec-render/specs --out /tmp/qspec-render-invalid --index templates/index.yaml --label invalid-index-probe > /tmp/qspec-render-invalid.out 2>&1; then echo "UNEXPECTED: render exited zero for a blocked selected Index"; exit 1; fi
grep -q 'index-claim' /tmp/qspec-render-invalid.out && grep -q 'selected Index.*blocked; no sheets were rendered' /tmp/qspec-render-invalid.out || { echo "UNEXPECTED: render did not explain the blocked Index and dependent sheets"; exit 1; }
test "$(find /tmp/qspec-render-invalid/dossiers -type f -name '*.md' | wc -l | tr -d ' ')" = "3" && test -f /tmp/qspec-render-invalid/requests/Q-201.md || { echo "UNEXPECTED: a blocked Index suppressed independent dossiers or request"; exit 1; }
test ! -d /tmp/qspec-render-invalid/sheets || test -z "$(find /tmp/qspec-render-invalid/sheets -type f -name '*.md' -print -quit)" || { echo "UNEXPECTED: a sheet was written from a blocked selected Index"; exit 1; }
test ! -e /tmp/qspec-render-invalid/index/unnamed.md || { echo "UNEXPECTED: the blocked selected Index was written as a successful document"; exit 1; }
echo "== sign --show, sheet, and request record runs; the sheet keeps what was rendered"
$Q sign /tmp/qspec-notes/specs/ss-causal-procurement-cutoff.yaml --by "D. Reviewer" --show >/dev/null
$Q sheet /tmp/qspec-notes/specs/ss-causal-procurement-cutoff.yaml --index /tmp/qspec-notes/specs/index-round-2026-09.yaml --out /tmp/qspec-notes/sheets/Q-101.md >/dev/null
$Q runs --project /tmp/qspec-notes | grep -q "sign --show" && $Q runs --project /tmp/qspec-notes | grep -q " sheet " || { echo "UNEXPECTED: sign --show or sheet left no run"; exit 1; }
ls /tmp/qspec-notes/.qspec/runs/*/rendered/*.md >/dev/null 2>&1 || { echo "UNEXPECTED: the sheet run kept no rendering"; exit 1; }
echo "== an act cites the run whose text it acts on, and refuses a run whose text has moved"
$Q lint /tmp/qspec-notes/specs/ss-causal-procurement-cutoff.yaml --label before-withdraw >/dev/null
$Q transition /tmp/qspec-notes/specs/ss-causal-procurement-cutoff.yaml --to specified --by "A. Owner" --role owner --reason "held back" --run before-withdraw >/dev/null
grep -q "run: .*before-withdraw" /tmp/qspec-notes/specs/ss-causal-procurement-cutoff.record.yaml || { echo "UNEXPECTED: the act did not record the run it cited"; exit 1; }
$Q runs --project /tmp/qspec-notes | grep -q "transition" || { echo "UNEXPECTED: the transition left no run"; exit 1; }
if $Q lint /tmp/qspec-notes/specs/ss-causal-procurement-cutoff.yaml | grep -q "notes-without-act"; then echo "UNEXPECTED: lint still warns about the note after an act"; exit 1; fi
sed -i.bak 's/^  one_sentence: .*/  one_sentence: "Below the cutoff, small-firm win rates rise and prices do not fall."/' /tmp/qspec-notes/specs/ss-causal-procurement-cutoff.yaml && rm -f /tmp/qspec-notes/specs/*.bak
if $Q transition /tmp/qspec-notes/specs/ss-causal-procurement-cutoff.yaml --to killed --by "A. Owner" --role owner --reason x --run before-withdraw >/dev/null 2>&1; then echo "UNEXPECTED: an act cited a run whose text has since moved"; exit 1; fi
echo "== paper keeps a document from outside the project inside the run"
cp examples/ns-experimental-apical-oxygen.yaml examples/ns-experimental-apical-oxygen.record.yaml /tmp/qspec-notes/specs/
cp examples/paper/Q-201-report.md /tmp/qspec-external-paper.md
$Q paper /tmp/qspec-notes/specs/ns-experimental-apical-oxygen.yaml /tmp/qspec-external-paper.md >/dev/null
ls /tmp/qspec-notes/.qspec/runs/*/sources/external/qspec-external-paper.md >/dev/null 2>&1 || { echo "UNEXPECTED: the paper run did not keep the external document"; exit 1; }
echo "== the commands the guidance names are the commands help lists"
for c in $(node -e 'console.log(require("./lib/scaffold.js").COMMANDS.join(" "))'); do $Q help | grep -q "^  $c " || { echo "UNEXPECTED: guidance names '$c' but help does not list it"; exit 1; }; done
echo "== renderings carry nothing Paperforge lint would block"
if grep -qiE '\b(TODO|TBD|FIXME|XXX|PLACEHOLDER)\b' /tmp/qspec-index.md /tmp/qspec-sheet.md /tmp/qspec-draft-sheet.md /tmp/qspec-request.md /tmp/qspec-init-round.md /tmp/qspec-init/AGENTS.md /tmp/qspec-runs/AGENTS.md /tmp/qspec-notes/AGENTS.md /tmp/qspec-render/documents/sheets/*.md /tmp/qspec-render-drafts/drafts/*.md /tmp/qspec-render/documents/index/*.md /tmp/qspec-render/documents/requests/*.md; then echo "UNEXPECTED: a blocked marker reached a sheet, Index, request, or guidance"; exit 1; fi
echo "all checks passed"
