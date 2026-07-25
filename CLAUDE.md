# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Bri-gest is a set of PubMed literature-surveillance tools for RACP Advanced Training CPD, built as static, self-contained HTML files with no build step, no server, and no framework. Each tool queries the NCBI E-utilities API directly from the browser, renders abstracts verbatim (no AI summarisation, ever), and persists state in `localStorage`.

Live at https://Llama2468.github.io/bri-gest/, served directly from this repo via GitHub Pages.

## Layout

```
index.html          Hub — landing page linking to both tools (currently unlinked from GM, see below)
endo/index.html      Endocrine Bri-gest — v5.8, 10 RACP endocrinology/metabolism domains, 53 subdomains
gm/index.html         General Medicine Bri-gest — v1.0, 15 lanes mapped to RACP GACM curriculum
docs/                Reference .docx documents (currently stale relative to the code — see BACKLOG.md)
GitHub repository redesign/   Design handoff for an in-progress editorial redesign (hub + shared digest shell)
```

There is no build tooling (no `package.json`, no bundler, no test runner). "Development" means editing these HTML files directly and opening them in a browser / pushing to GitHub Pages.

## Commands

There is no build/lint/test command — none exists in this repo. To verify a change:
- Open the file directly in a browser, or serve the directory locally (e.g. `python -m http.server`) and navigate to `/`, `/endo/`, or `/gm/`.
- Sanity-check JS syntax before committing (no CI gate exists yet for this — see BACKLOG.md item 1): extract the `<script>` block and run `node --check` on it, since a syntax error anywhere in the script silently kills the entire page (header/footer still render, everything else does nothing).
- After pushing, GitHub Pages' CDN caches for ~10 minutes. Append `?v=2` (or similar) to the URL to bypass the cache and confirm a fix actually deployed before debugging further.

## Architecture

### Two tools sharing one shape, at different code-style generations

`endo/index.html` and `gm/index.html` are independently self-contained files that share the same architectural pattern but were written at different times and are **not** currently byte-similar:
- `endo/index.html` — modern ES6 (`const`/`let`, arrow functions, template literals), already migrated to the two-theme (`light`/`dark`) editorial redesign.
- `gm/index.html` — ES5-conservative (`var`, `function` expressions), still on the legacy four-theme (`midnight`/`clinical`/`slate`/`amber`) visual system.

Both must stay ES5-conservative going forward regardless of current state — no optional chaining (`?.`), no nullish coalescing (`??`); iOS Safari is the primary target platform. `async`/`await`, `Set`, and `Promise.finally` are acceptable.

Each tool follows this internal structure (search for the numbered section comments in the script):
1. **`STORAGE_OK` probe** — feature-detects `localStorage` availability up front; if unavailable, shows a warning banner instead of silently failing later.
2. **`VERSION` constant** — a single source of truth per tool, driving every place the version is displayed. Bump it in exactly one place.
3. **Domain data** — `TOPICS` (endo) / lane array (gm): each entry has `id`, `section`, `color`, `label`, `short`, a broad domain-level PubMed `query`, and a `subdomains[]` array of `{label, query}` pairs. Query strings are the actual, versioned PubMed search strategies (sourced from ATA/Endocrine Society/ENETS/IOF-ESCEO/Teede 2023/ESC-EAS guideline strategies for endo); treat changes to these as clinical/scientific decisions requiring review before implementation, not routine code edits.
4. **Journal impact-factor table** — approximate 2024 JCR values, for triage display only, not embedded in queries.
5. **Fetch layer** — talks directly to `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/` (`esearch.fcgi` then `efetch.fcgi`, XML abstracts). This is the only permitted external origin at runtime besides (currently) Google Fonts.
6. **Persistence (`localStore`/`localLoad`)** — thin wrappers around `JSON.stringify`/`parse` with try/catch and `safeJSON` recovery (corrupt values are dropped, not thrown). Every persisted value must be validated against an allowlist on load with a safe fallback — a value having the right *type* is not evidence it's a valid *value* (this pattern already had to fix a legacy-theme crash: an old `e_th` value like `'midnight'` passing a naive `typeof === 'string'` check but not existing in the new two-theme token set, producing a blank page for every returning user).
7. **Rendering** — articles are built via string templates / `innerHTML`, never inline `onclick`. All interactivity is event-delegated through a single listener keyed on `data-action` + `data-pmid` attributes (see the `[data-action]` closest-match handler near the bottom of each script).
8. **Cache** — an in-memory + best-effort persisted cache keyed by `cKey(topicId)` (folds in active filters), TTL-gated (6 hours).

### Namespaced storage

`localStorage` keys are tool-prefixed so all tools can coexist in one browser: `e_*` (endocrine: `e_bm`/pool, `e_rd` read-set, `e_jf` journal filter by `ta` abbreviation, `e_th` theme, `e_ss` per-topic subdomain selection index, `e_ts` text-scale step), `gm_*` (parallel set), `hub_*` (currently just `hub_theme`). Never let two tools' keys collide.

### Security-relevant conventions (apply to any change touching rendering or storage)

- `esc()` on all PubMed-sourced strings before insertion into HTML.
- `sanitiseStr()` before writing user/PubMed-derived strings to storage.
- DOI links are regex-validated before rendering as a link.
- `isCorr()` derives the correspondence/letter flag from PubMed's `PublicationType` (Letter/Comment/Editorial/Erratum/etc.) — never hand-set. `studyType` is likewise derived/parsed metadata, never AI-generated or inferred.

### PubMed query semantics — the one recurring bug class

**PubMed has no operator precedence; queries evaluate strictly left to right.** A bare trailing `AND` clamps the entire preceding `OR`-union. Every `OR`-union that precedes an `AND` must be explicitly parenthesised. This was the root cause of a defect affecting most endocrine queries (fixed in v5.6) — re-check parenthesisation any time a query string is edited or a filter is appended.

Journal-view / journal-filter mode must query the **journal union directly**, never inherit a broad specialty base query and then filter by journal client-side — the latter silently restricts results to whatever the specialty index already covers.

## File-editing convention (important, has caused real corruption)

**These are whole-file rewrites, not patch targets.** Byte-level/incremental patching of these UTF-8 files (box-drawing characters, em-dashes, Unicode symbols throughout) has caused cumulative corruption in the past. Default to replacing the full file content rather than a series of small edits. Where patching is genuinely unavoidable, do it as a single clean pass, and verify `VERSION` plus anchor-string uniqueness before writing.

## Active work context

- The repo is mid-redesign: `endo/index.html` has been migrated to a new warm-paper editorial visual language (Newsreader serif + IBM Plex Mono, two-theme light/dark, `--tsize` scale multiplier for a 3-step text-size control). `index.html` (hub) and `gm/index.html` have **not** been migrated yet and remain on the old dark-navy multi-theme look. The design spec for this redesign lives in `GitHub repository redesign/design_handoff_bri-gest_redesign/README.md`, with corrections/reality-checks in the sibling `HANDOFF-ADDENDUM.md` — **where they conflict, the addendum wins**; it documents real repo state (storage key shapes, contrast failures, non-functional filters, etc.) that the original design reference got wrong. The `reference/*.dc.html` files in that folder are prototyping-runtime mockups (`support.js` templating) — recreate their look/behaviour in plain vanilla JS, do not port the mechanism.
- General Medicine is currently unlinked from the hub pending maturation (`gm/index.html` still exists and works, just isn't linked).
- A "connected hub" (ORCID identity, Cloudflare Workers + D1, a curation-graph data model where the standalone tools emit judgment-events rather than the hub storing papers itself) is specified but not built, and is an explicitly separate project/workstream on its own branch (`brigest-connected`, not yet created) — see `CONNECTED-HUB-DESIGN.md` for the full architecture, repo/branching strategy, and open decisions, and `BACKLOG.md`'s "The connected hub" section for the pointer, before conflating it with the visual redesign above.
- `BACKLOG.md` is the authoritative, hand-maintained task list (everything else in the repo is generated or is application code) — check it for current priorities before starting unscoped work. It also documents "known learnings" worth re-reading before touching queries, theming, or persistence.
- Releases are tagged per-tool, matching storage namespaces: `endo-v5.8`, `gm-v1.0`, etc.
