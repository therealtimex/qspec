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
echo "== renderings carry nothing Paperforge lint would block"
if grep -qiE '\b(TODO|TBD|FIXME|XXX|PLACEHOLDER)\b' /tmp/qspec-index.md /tmp/qspec-sheet.md /tmp/qspec-request.md; then echo "UNEXPECTED: a blocked marker reached a rendering"; exit 1; fi
echo "all checks passed"
