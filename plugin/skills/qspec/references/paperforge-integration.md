# Pairing QSPEC with Paperforge

QSPEC decides which question is worth asking. Paperforge renders and gates the documents that answer it. Neither authors anything. This note is the contract between them, and it is deliberately a file contract: the two tools share no code and no runtime.

## The boundary

- Paperforge is TOML-only and refused a YAML parser on principle. It must never read a spec directly. Everything it consumes from QSPEC is markdown that `qspec` rendered.
- QSPEC never formats a bibliography. It checks keys in the project-owned `references.bib`, emits `[@key]` markers in sheets and dossiers, and copies the file beside the rendered corpus manifest. Paperforge alone formats the markers and appends the reference list.
- Paperforge's project lint rules run over document lines, not over the request file. So the gate that only a frozen question reaches a project lives on the QSPEC side: `qspec request` refuses any status but `frozen`.
- Paperforge's `todo` rule blocks the words TODO, TBD, FIXME, XXX, and PLACEHOLDER, case-insensitively, anywhere in a document. Do not use them in a spec field that a rendering carries. Attached notes are different: a dossier is a process record and copies each note whole, so dossiers are excluded from QSPEC's marker grep and listed under `[internal]`, never as documents. Sheets, Indexes, and requests remain covered by the grep.

## Documents from a QSPEC project

`qspec render` makes the readable corpus while leaving the boundary intact: it writes markdown, and Paperforge alone makes HTML, PDF, and Word editions. From the QSPEC project root:

```sh
/path/to/paperforge/bin/paperforge init --into documents --publications brief --no-git
cp /path/to/qspec/templates/documents.qspec.toml documents/documents.toml
qspec render --out documents
/path/to/paperforge/bin/paperforge all --draft --config documents/documents.toml
```

The template declares `qspec-sheet` and `qspec-index` as unpublished brief layouts. The sheet type carries `bibliography = "references.bib"`, `citation_style = "apa"`, and a Typst PDF edition. Dossiers appear only in `[internal]`, with the reason `process records: runs, review notes, decisions`; Paperforge cannot publish them. In one sentence: the Selection Sheet goes to a committee, while the dossier stays inside the process. `all --draft` runs lint, builds and verifies the declared committee documents, stops before publication, and cannot publish.

`render` writes `dossiers/<id>.md` for every parseable spec, `sheets/<id>.md` for `selectable`, `deferred`, and `frozen` specs, `index/<round>.md` for every Index, and `requests/<id>.md` for frozen specs. `render --draft` instead writes a preview for every state under `drafts/`, with an unsigned warning and the empty fields listed by label; it never mixes those previews into `sheets/`. When the project has `references.bib`, it is copied to `documents/references.bib` and beside rendered committee sheets, where Paperforge resolves the type-level bibliography. Existing unrelated files under `documents/` are untouched.

The bibliography keys and print format belong on the committee-sheet type:

```toml
[types.qspec-sheet]
layout = "brief"
bibliography = "references.bib"
citation_style = "apa"
pdf = "typst"
publish = false

[internal]
files = ["dossiers/Q-001.md"]
reason = "process records: runs, review notes, decisions"
```

If the corpus has ids or rendered states not yet named by the installed manifest, ask for the missing TOML without editing it:

```sh
qspec render --out documents --manifest documents/documents.toml
```

The command prints complete `[[collection]]` blocks containing absent committee
documents. Each names the matching output directory as its root and can be
reviewed and appended as printed. When a dossier path is absent from
`[internal].files`, it prints a complete replacement `[internal]` block instead;
review and replace that block rather than appending a duplicate. qspec never
edits Paperforge's manifest.

## Three points of contact

### 1. The request

Export the frozen spec and point the project at it:

```sh
qspec request specs/Q-201.yaml --out research-requests/Q-201.md
```

```toml
# documents.toml
[defaults]
request = "../research-requests/Q-201.md"
```

Paperforge snapshots the request with every run and cites it in `paperforge brief`. Paperforge's own guidance says that when the request is thin, the reading of it is the specification. A frozen spec is that reading, already signed.

### 2. The pointer

The document's head carries the question as a metadata row, which Paperforge renders on the cover:

```markdown
# RESEARCH REPORT
## Apical oxygen height and the superconducting dome
**Question:** Q-201, version 1
**Publisher:** RealTimeX Research
```

`qspec paper` accepts both `Q-201@1` and `Q-201, version 1`, and reports `manual` if neither row is present.

### 3. The claim

Label the load-bearing paragraph with the frozen `one_sentence` as its gist:

```markdown
Across four strain states at fixed hole doping, the dome maximum fell monotonically with refined apical height.
{#claim-q-201 gist="In the studied cuprate family, increasing apical oxygen height by the stated amount at fixed hole doping lowers the maximum critical temperature of the superconducting dome."}
```

Then:

```sh
qspec paper specs/Q-201.yaml report.md     # gist equals the frozen sentence, or block
paperforge claims --accept claim-q-201     # a person reread the paragraph; the gist holds
```

The two checks are different. QSPEC checks that the gist is the frozen claim. Paperforge checks that the paragraph has not moved since someone accepted the gist against it. Neither checks that the paragraph supports the claim; that is the reviewer's, per Paperforge decision 0003.

A `one_sentence` that contains a double quote or a brace cannot be a gist. `qspec paper` reports `gist-unrepresentable`; reword the claim before freezing.

## The selection meeting

`qspec sheet` and `qspec index` emit committee-clean markdown in Paperforge's head format. Declare them with the template's `qspec-sheet` and `qspec-index` types and build them like any other unpublished document:

```toml
[[collection.document]]
id = "sheet-q-201"
type = "qspec-sheet"
source = "Q-201.md"
publish = false
```

Regenerate rather than edit. A sheet is a rendering of a spec; editing the markdown makes a second copy that will drift.

## One vocabulary

`qspec` reports findings with Paperforge's four severities: `block`, `manual`, `warn`, `skip`. A `manual` finding always names the act that settles it, and the acts mirror each other:

| Paperforge | QSPEC |
|---|---|
| `paperforge claims --accept` stamps a fingerprint of the paragraph | `qspec sign` stamps a fingerprint of the spec |
| `stale-gist` blocks when the paragraph moved | `stale-signature` blocks when the spec moved |
| `unaccepted` is `manual` with the act named | `J-unsigned` is `manual` with the act named |
| run records are events; git records acts | the Decision Record records acts; it is tool-written and append-only |

## In a loop

The factual half of a routed handoff can be `paperforge brief` output plus the `qspec request` export. The routing message then carries only the method, the role, and the expected evidence, which no tool can derive.
