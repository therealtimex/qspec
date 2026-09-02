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
echo "== renderings carry nothing Paperforge lint would block"
if grep -qiE '\b(TODO|TBD|FIXME|XXX|PLACEHOLDER)\b' /tmp/qspec-index.md /tmp/qspec-sheet.md /tmp/qspec-request.md; then echo "UNEXPECTED: a blocked marker reached a rendering"; exit 1; fi
echo "all checks passed"
