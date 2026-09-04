# Run records and friction notes

Every `qspec lint` and `qspec index` run inside a project writes a record of
what it saw to `.qspec/runs/`, whether the run passed or failed. Nothing has to
be remembered for this to happen. A project is a directory `qspec init`
prepared; outside one, nothing is written.

```bash
qspec lint specs/Q-014_apical-oxygen.yaml --label "after reviewer round 1"
qspec runs                                  # what has been recorded, oldest first
qspec runs --diff <a>,<b>                   # what changed between two of them
qspec runs --diff <a>,<b> --sources         # the text that changed, as a unified diff
```

## Why it exists

The pattern and the reason are Paperforge's. A spec on a real project went
through three versions in twenty minutes of review, each overwriting the last
in place. The repository had git and nobody committed; the reviewer's findings
and the approver's corrections lived in chat handoffs outside the project; the
first two versions survived only in one agent's transcript. Nothing in the
project could put version 1 beside version 3 and say what the review changed.

**So the record is a by-product of checking rather than an act of
discipline.** The Decision Record is still the audit trail for acts, and only
for acts: signing, offering, freezing, killing. A run is the audit trail for
looking.

## What a record holds

```
.qspec/runs/20260904T192935Z-after-reviewer-round-1/
  record.json      label, timestamp, tool version, command, and per file: id,
                   instance_version, status, fingerprint, sha256, verdict, findings
  sources/         the spec, its Decision Record if any, or the Index, as they stood
```

The files are kept, not only their hashes. What is wanted afterwards is the
lost draft, and a fingerprint would not return it. A spec is one small YAML, so
keeping every run costs nothing. A scaffolded project deliberately does **not**
gitignore `.qspec/`.

Two runs in one second get distinct names; `runs` lists them in the order they
were written, not the order their names sort in.

## Reading a diff

```
20260904T192935Z-first -> 20260904T192935Z.2
  specs/Q-001_p.yaml: reworded, verdict block -> ok
      - block  M2                 owner missing
```

| Reported | Means |
|---|---|
| `unchanged` | byte-identical file |
| `reworded` | the file changed but the fingerprinted fields did not: a signature would still hold |
| `rewritten` | the fingerprinted text moved: a signature over the earlier text is stale |
| `record changed` | the Decision Record beside it gained an entry |
| `+` / `-` lines | findings that appeared or cleared between the two runs |

`reworded` against `rewritten` is the distinction a changelog line cannot make.
It is the same one `lint` reports as `stale-signature`, read across two runs
instead of against one signature.

## What it cannot tell you

A record says what each run saw. It cannot say whether the spec got better. The
judgment that a claim is now singular, or that a citation says what the spec
attributes to it, is a reviewer's and is signed as J1 to J7. What the record
buys is the ability to put two versions side by side and see it.

## Friction: what the tool made somebody do instead

`qspec report "what happened"` writes a note under `.qspec/friction/`, beside
the runs and for the same reason: a workaround made under a deadline is the
right call and removes the only trace that anything was wrong. Solve it and
report it.

```
qspec report "lint kept blocking on M3 while a reviewer was being assigned, so I proceeded in chat"
qspec report --issue      # the latest note, as something to paste into a tracker
```

The note carries what an author cannot be expected to assemble: the tool
version, whether the project's guidance is current, and which run was the last
one. `--issue` **prints**; it never files. An agent's reading of a symptom is
usually right and its reading of a cause often is not.

`qspec doctor` reports how many runs there are, how many since the last
recorded act, and whether friction notes exist. Many runs and no act is the
shape of a spec being polished in chat while nobody signs.
