# Pairing QSPEC with Paperforge

QSPEC decides which question is worth asking. Paperforge renders and gates the documents that answer it. Neither authors anything. This note is the contract between them, and it is deliberately a file contract: the two tools share no code and no runtime.

## The boundary

- Paperforge is TOML-only and refused a YAML parser on principle. It must never read a spec directly. Everything it consumes from QSPEC is markdown that `qspec` rendered.
- QSPEC never formats a bibliography. It checks structured closest-work keys and `[@key]` or `[@key; @key2]` markers in every prose field against the project-owned `references.bib`. Sheets, dossiers, Indexes, and requests pass prose markers through untouched, and `render` copies the bibliography beside the corpus manifest and collection roots. Paperforge alone formats the markers and appends the reference list.
- Paperforge's project lint rules run over document lines, not over the request file. So the gate that only a frozen question reaches a project lives on the QSPEC side: `qspec request` refuses any status but `frozen`.
- Paperforge's `todo` rule blocks the words TODO, TBD, FIXME, XXX, and PLACEHOLDER, case-insensitively, anywhere in a document. Do not use them in a spec field that a rendering carries. Attached notes are different: a dossier is a process record and is excluded from QSPEC's marker grep. QSPEC leaves each source note untouched and renders CLI-style angle-bracket placeholders such as `<run>` and `<handoff.md>` as `‹run›` and `‹handoff.md›` only in the dossier's rendered copy. Their contents begin with an ASCII letter and use ASCII letters, digits, spaces, dots, dashes, underscores, or pipes; comparison prose and standard Markdown autolinks remain unchanged. A comma-delimited CLI list such as `<a>,<b>` remains placeholder syntax even though those names are also HTML elements; valid void HTML and genuinely authored paired, attributed, closing, or self-closing tags take precedence and remain unchanged. Single angle quotation marks are not HTML syntax in either HTML or extracted PDF text, and no entity is emitted. Sheets, Indexes, and requests remain covered by the grep.

## Documents from a QSPEC project

`qspec render` makes the readable corpus while leaving the boundary intact: it writes markdown, and Paperforge alone makes HTML, PDF, and Word editions. From the QSPEC project root:

```sh
/path/to/paperforge/bin/paperforge init --into documents --publications brief --no-git
cp /path/to/qspec/templates/documents.qspec.toml documents/documents.toml
qspec render --out documents
/path/to/paperforge/bin/paperforge all --draft --config documents/documents.toml
```

The template declares `qspec-sheet` and `qspec-index` as unpublished brief layouts and `qspec-dossier` as a report-derived layout. The dossier type sets `narrow_layout = false`: Paperforge still checks 768 px and wider and reports `layout: wide only`, while sheets and the Index retain the complete phone-width probe. This preserves attached notes byte-for-byte even when they contain unbreakable fingerprints or command lines. The sheet and dossier types carry `bibliography = "references.bib"` and `citation_style = "apa"`; both request Typst PDF editions, and dossiers also request DOCX. Every document says `publish = false`. The dossier's head reads `# Process record (internal)`, so its rendered cover identifies its role even though Paperforge builds it. In one sentence: the Selection Sheet goes to a committee, while the dossier stays inside the process. `all --draft` runs lint, builds and verifies all declared documents, stops before publication, and cannot publish.

`render` writes `dossiers/<id>.md` for every parseable spec, `sheets/<id>.md` for `selectable`, `deferred`, and `frozen` specs, `index/<round>.md` for every Index, and `requests/<id>.md` for frozen specs. `render --draft` instead writes a preview for every state under `drafts/`, with an unsigned warning and the empty fields listed by label; it never mixes those previews into `sheets/`. When the project has `references.bib`, it is copied to `documents/references.bib` and beside rendered dossiers and committee sheets, where Paperforge resolves the type-level bibliography. Existing unrelated files under `documents/` are untouched.

The bibliography keys belong on both reader-bearing types:

```toml
[types.qspec-sheet]
layout = "brief"
bibliography = "references.bib"
citation_style = "apa"
pdf = "typst"
publish = false

[types.qspec-dossier]
extends = "report"
narrow_layout = false
bibliography = "references.bib"
citation_style = "apa"
pdf = "typst"
docx = true
publish = false

[[collection]]
slug = "qspec-dossiers"
root = "dossiers"
profile = "en"

  [[collection.document]]
  id = "qspec-dossier-q-001"
  type = "qspec-dossier"
  source = "Q-001.md"
  publish = false

[internal]
files = []
reason = "non-document process records; qspec-dossier documents are unpublished and buildable"
```

The empty `[internal]` table is intentional: current Paperforge raises a
`KeyError` when the table is absent. Dossiers are still declared documents, not
members of `internal.files`.

If the corpus has ids or rendered states not yet named by the installed manifest, ask for the missing TOML without editing it:

```sh
qspec render --out documents --manifest documents/documents.toml
```

The command prints complete `[[collection]]` blocks containing every absent
rendered document, including dossiers. Each names the matching output directory
as its root and can be reviewed and appended as printed. It also warns when a
declared `qspec-dossier` document has `publish = true`; the process record must
remain unpublished. qspec reports both conditions and never edits Paperforge's
manifest.

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
