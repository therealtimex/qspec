# Pairing QSPEC with Paperforge

QSPEC decides which question is worth asking. Paperforge renders and gates the documents that answer it. Neither authors anything. This note is the contract between them, and it is deliberately a file contract: the two tools share no code and no runtime.

## The boundary

- Paperforge is TOML-only and refused a YAML parser on principle. It must never read a spec directly. Everything it consumes from QSPEC is markdown that `qspec` rendered.
- Paperforge's project lint rules run over document lines, not over the request file. So the gate that only a frozen question reaches a project lives on the QSPEC side: `qspec request` refuses any status but `frozen`.
- Paperforge's `todo` rule blocks the words TODO, TBD, FIXME, XXX, and PLACEHOLDER, case-insensitively, anywhere in a document. Do not use them in a spec field that a rendering carries. The QSPEC test suite greps its renderings for them.

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
**Question:** Q-201@1
**Publisher:** RealTimeX Research
```

`qspec paper` reports `manual` if the row is absent.

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

`qspec sheet` and `qspec index` emit markdown in Paperforge's head format. Declare them in a Paperforge project as `type = "note"` (a brief without page numbers) and build them like any other document:

```toml
[[collection.document]]
id = "sheet-q-201"
type = "note"
source = "sheets/Q-201.md"
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
