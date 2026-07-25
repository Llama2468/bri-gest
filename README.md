# Bri-gest

PubMed literature-surveillance tools for RACP Advanced Training CPD.

**Live:** https://Llama2468.github.io/bri-gest/

Each tool is a single self-contained HTML file. It queries the [NCBI E-utilities](https://www.ncbi.nlm.nih.gov/books/NBK25501/) API directly from the browser, displays abstracts verbatim, and stores state in `localStorage`. No build step, no server, no dependencies, no language model in the pipeline.

---

## Tools

| Tool | Version | Scope | URL                                                    |
|---|---|---|--------------------------------------------------------|
| **Endocrine Bri-gest** | 5.9 | 10 RACP endocrinology and metabolism domains, 53 subdomains | [`/endo/`](https://LLama2468.github.io/bri-gest/endo/) |
| **General Medicine Bri-gest** | 1.1 | 15 clinical lanes mapped to the RACP GACM curriculum | [`/gm/`](https://Llama2468.github.io/bri-gest/gm/)     |

Both cache results for 6 hours, return up to 50 records per lane, and expose the full PubMed query for every lane in an audit panel so it can be pasted into PubMed and reproduced.

General Medicine is present and working but currently **unlinked from the hub** pending maturation — it's reachable directly at `/gm/`, just not surfaced from the landing page yet.

---

## Layout

```
index.html          Hub. Links to each tool and to the reference documents.
endo/index.html     Endocrine Bri-gest.
gm/index.html       General Medicine Bri-gest.
docs/               Built reference documents (.docx).
scripts/            Generators for docs/. The generator is the source of truth.
archive/            Superseded versions, kept for provenance.
```

---

## Method

- **Verbatim only.** Abstracts are rendered exactly as PubMed returns them. Nothing is summarised, re-ranked or paraphrased.
- **Strategies are versioned with the code.** Search strategies derive from published guideline strategies (ATA, Endocrine Society, ENETS, IOF/ESCEO, Teede 2023 PCOS, ESC/EAS). They live in `docs/`, and the version stamp on a document matches the app version it describes.
- **Impact factors** are approximate 2024 JCR values, present for triage only and not as a quality judgement.
- **Not clinical decision support.** These are personal CPD reading tools.

---

## Conventions

These exist because breaking them has cost time before.

- **One version constant.** A single `const VERSION` in each tool drives every place the version is displayed. Bump it in one place or not at all.
- **Whole-file rewrites for the tool HTML.** Byte-level patching of these UTF-8 files has caused cumulative corruption. Replace the file; don't nibble at it.
- **Documents are generated, never hand-edited.** Every `.docx` in `docs/` has a generator in `scripts/`. If the generator is lost, the document is no longer trustworthy.
- **ES5-conservative JavaScript.** No optional chaining (`?.`), no nullish coalescing (`??`) — iOS Safari compatibility. `async`/`await`, `Set` and `Promise.finally` are fine.
- **Namespaced storage.** `localStorage` keys are tool-prefixed (`e_*` endocrine, `gm_*` general medicine, `hub_*` hub) so all three can coexist in one browser.
- **PubMed has no operator precedence.** Queries are evaluated strictly left to right. Every OR-union preceding an `AND` must be explicitly parenthesised. This was the root cause of a defect affecting most endocrine queries, fixed in v5.6.
- **Query changes are reviewed before implementation.** Not after.

---

## Releases

Tags are tool-prefixed, matching the storage namespaces:

```bash
git tag -a endo-v5.8 -m "Endocrine Bri-gest v5.8"
git tag -a gm-v1.0   -m "General Medicine Bri-gest v1.0"
git push --tags
```

---

## Known issues

- **Google Fonts is a live CDN dependency.** Fraunces and IBM Plex Mono load from `fonts.googleapis.com`, so "zero-dependency" is not strictly true and the type degrades to system fallbacks on networks that block Google. Self-hosting the `woff2` files is queued.
- **`Inter` is declared but never loaded.** The body stack resolves to `system-ui` in practice. Either load it or drop it from the stack.
- **iOS hardening pending (endo v5.9).** Four chunks scoped: Web Share API export fallback, 16px input font-size to stop zoom-on-focus, dynamic sticky-nav offset, and polish (tap-highlight, hover rules, `dvh`).
- **Persistence is `localStorage`.** IndexedDB is under consideration for the saved-article pool.
- **No WCAG AA contrast audit yet** across the four themes.
- **Reference documents lag the code.** Endocrine strategy doc is v5.6 and
  spec is v5.7 against a v5.8 app. The General Medicine reference document
  has not been written. Docs are not linked from the hub until reconciled.

---

## Licence

Code and content are licensed under [Creative Commons BY 4.0](https://creativecommons.org/licenses/by/4.0/). Personal project, no warranty. PubMed content is subject to NCBI's terms of use.
