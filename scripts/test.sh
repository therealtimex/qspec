#!/bin/sh
# Every command, every example, every negative. Exit non-zero on the first surprise.
set -e
Q="node bin/qspec.js"
echo "== specs pass, records agree, signatures current"
$Q lint examples/*.yaml
echo "== negatives block"
$Q lint --expect-fail examples/negative/*.yaml
echo "== empty templates block"
$Q lint --expect-fail templates/qspec-*.yaml
echo "== index checks and renders"
$Q index examples/index-round-2026-09.yaml --specs examples --out /tmp/qspec-index.md
echo "== sheet renders for a selectable spec"
$Q sheet examples/ss-causal-procurement-cutoff.yaml --index examples/index-round-2026-09.yaml --out /tmp/qspec-sheet.md
echo "== sheet refused for a specified spec"
if $Q sheet examples/ss-ethnographic-scoring-weights.yaml >/dev/null 2>&1; then echo "UNEXPECTED: sheet rendered for a specified spec"; exit 1; fi
echo "== request exports for a frozen spec and is refused otherwise"
$Q request examples/ns-experimental-apical-oxygen.yaml --out /tmp/qspec-request.md
if $Q request examples/ss-causal-procurement-cutoff.yaml >/dev/null 2>&1; then echo "UNEXPECTED: request exported for a selectable spec"; exit 1; fi
echo "== paper carries the frozen claim"
$Q paper examples/ns-experimental-apical-oxygen.yaml examples/paper/Q-201-report.md
echo "== paper with a drifted gist is refused"
sed 's/lowers the maximum critical temperature/raises the maximum critical temperature/' examples/paper/Q-201-report.md > /tmp/qspec-drift.md
if $Q paper examples/ns-experimental-apical-oxygen.yaml /tmp/qspec-drift.md >/dev/null 2>&1; then echo "UNEXPECTED: drifted gist passed"; exit 1; fi
echo "== the catalog and the overlays state the same J7 rules"
node scripts/check-judged.mjs
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
test -f /tmp/qspec-init/AGENTS.md && test -L /tmp/qspec-init/CLAUDE.md && test -f /tmp/qspec-init/.qspec/scaffold.json && test -f /tmp/qspec-init/specs/index-2026-09.yaml || { echo "UNEXPECTED: init did not write the project"; exit 1; }
test ! -e /tmp/qspec-init/.git || { echo "UNEXPECTED: --no-git initialised a repository"; exit 1; }
$Q doctor --project /tmp/qspec-init >/dev/null
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
$Q init --refresh --into /tmp/qspec-init >/dev/null
$Q doctor --project /tmp/qspec-init | grep -q "scaffold   ok" || { echo "UNEXPECTED: refresh did not clear STALE"; exit 1; }
grep -q "My own note below the block" /tmp/qspec-init/AGENTS.md && head -1 /tmp/qspec-init/AGENTS.md | grep -q "Init Probe" || { echo "UNEXPECTED: refresh touched text outside the markers"; exit 1; }
test "$(grep -c -F -- "<!-- qspec:project-guidance -->" /tmp/qspec-init/AGENTS.md)" = "1" || { echo "UNEXPECTED: refresh duplicated the block"; exit 1; }
grep -q '"created"' /tmp/qspec-init/.qspec/scaffold.json && grep -q '"refreshed"' /tmp/qspec-init/.qspec/scaffold.json || { echo "UNEXPECTED: the stamp lost its creation date or gained no refresh date"; exit 1; }
$Q init --refresh --into /tmp/qspec-shim >/dev/null
head -1 /tmp/qspec-shim/AGENTS.md | grep -q "Workspace Agent Guide" || { echo "UNEXPECTED: refresh disturbed the shim above the block"; exit 1; }
if $Q init --refresh --into /tmp/qspec-nonesuch >/dev/null 2>&1; then echo "UNEXPECTED: refresh ran where there is no project"; exit 1; fi
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
echo "== the commands the guidance names are the commands help lists"
for c in $(node -e 'console.log(require("./lib/scaffold.js").COMMANDS.join(" "))'); do $Q help | grep -q "^  $c " || { echo "UNEXPECTED: guidance names '$c' but help does not list it"; exit 1; }; done
echo "== renderings carry nothing Paperforge lint would block"
if grep -qiE '\b(TODO|TBD|FIXME|XXX|PLACEHOLDER)\b' /tmp/qspec-index.md /tmp/qspec-sheet.md /tmp/qspec-request.md /tmp/qspec-init-round.md /tmp/qspec-init/AGENTS.md /tmp/qspec-runs/AGENTS.md; then echo "UNEXPECTED: a blocked marker reached a rendering"; exit 1; fi
echo "all checks passed"
