# Run records, notes, and friction notes

Every command that reads a spec inside a project writes a record of what it saw
to `.qspec/runs/`, whether the run passed or failed: `lint`, `index`, `sign`,
`transition`, `sheet`, `dossier`, `request`, `render`, and `paper`. Nothing has to be remembered for
this to happen. A project is a directory `qspec init` prepared; outside one,
nothing is written.

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
                   instance_version, status, fingerprint, sha256, verdict, findings;
                   plus the notes attached, with actor, role, kind, and hash
  sources/         the spec, its Decision Record if any, or the Index, as they stood;
                   a document checked from outside the project sits under external/
  rendered/        the Selection Sheet, dossier, request, or aggregate-render markdown
  notes/           what a role said about this run, copied whole
```

A `sign --show` run keeps the seven judged rules as they were printed; a
`transition` run keeps the record after the act. One aggregate `render` run has
one entry per file it wrote; each entry names the output and keeps the markdown.

The files are kept, not only their hashes. What is wanted afterwards is the
lost draft, and a fingerprint would not return it. A spec is one small YAML, so
keeping every run costs nothing. A scaffolded project deliberately does **not**
gitignore `.qspec/`.

Two runs in one second get distinct names; `runs` lists them in the order they
were written, not the order their names sort in.

## Labels that repeat across questions

A label describes a pass through one question, so the same useful name can
appear in several loops. Scope listing, lookup, and comparison by spec id or
path when that makes the bare label ambiguous:

```bash
qspec runs --spec Q-003
qspec runs show reviewer-round-1 --spec Q-003
qspec runs --diff reviewer-round-1,reviewer-round-2 --spec specs/Q-003.yaml
```

Resolution considers only runs whose `files` include that spec. qspec does not
prefix or rewrite the label the person chose.

For routed work, use `<spec>-<role>-round-<n>`: for example,
`q001-reviewer-round-1` followed by `q001-approver-round-1`. Before attaching a
note, each role lints under its own label and attaches to that run, so the run
carries the file as that role saw it. `attach` warns, without refusing or
discarding the note, when `--role` differs from the role named by a conventional
run label.

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

## Notes: what a role concluded, beside what it saw

A run answers "what changed". Only a handoff answers "why". On the first
project to use runs, seven runs sat in the project while the reviewer's findings
and the approver's conditions sat in a loop's handoff files outside it, keyed by
a loop id nobody would search for in a month.

```bash
qspec attach <run> handoff.md --by "D. Reviewer" --role reviewer --kind review
qspec runs show <run>                       # the run, its findings, and every note as written
```

The note is copied into `notes/` under the run and listed in `record.json`
with actor, role, kind, and hash. The tool never summarises or edits it. Facts
stay in `files`; judgments live in `notes`, beside them, with the name of
whoever made them. Kinds are `handoff`, `review`, `decision`, and `note`.

**A note is not an act.** The Decision Record stays the only home for
signing, offering, freezing, killing, and dissent. While notes are attached to
a spec's runs and nobody has acted since, `lint` reports `notes-without-act` as
a warning naming the notes and the act that would settle it. A stack of notes
and no act is the shape of a review that happened only in prose.

## An act cites the run it read

```bash
qspec sign specs/Q-014.yaml --by "G. Reviewer" --run after-reviewer-round-3
qspec transition specs/Q-014.yaml --to frozen --by "Group lead" --role decision_maker --index round.yaml --run after-reviewer-round-3
```

`--run` writes the run's name into the Decision Record entry. The tool refuses
when the run's recorded fingerprint for the spec is not the spec's fingerprint
now: the actor read one text and would be acting on another. Lint again, cite
the new run. With the name on the act, what the signer read and the notes
beside it are one `runs show` away.

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
