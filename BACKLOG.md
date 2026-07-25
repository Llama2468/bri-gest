# Bri-gest — Backlog

Working file. Hand-edited (the only one in this repo that is).
Last updated: 2026-07-13, at the close of Phase 0.

**Status:** Hub live at https://llama2468.github.io/bri-gest/ — Endocrine v5.8 and General Medicine v1.0 deployed.

---

## Session rules

These exist because ignoring them has cost time.

- **One workstream per session.** v5.9 and the hub are different projects. Do not merge them.
- **Scope the stop before you start.** Name the finish line in the first message.
- **Review query and strategy changes before code is written.** Not after.
- **Generators are the deliverable, documents are the output.** If the generator is lost, the document is no longer trustworthy. `make-spec.js` taught this once.
- **Whole-file rewrites for tool HTML.** Byte-level patching corrupts these UTF-8 files. Where patching is genuinely unavoidable, use Python byte-string operations with explicit UTF-8 encoding and abort-on-mismatch.
- **Abort on mismatch.** Verify `VERSION` and anchor uniqueness before writing any output. This has caught two real defects that would otherwise have shipped.

---

## v5.9 — Endocrine tool

A point release on a tool in daily use. Bounded, one session. In order.

### 1. CI syntax gate — do this first

Ten lines of GitHub Actions YAML: extract the `<script>` block from each tool, run `node --check`, fail the build on error.

**Rationale.** Endo v5.8 shipped with a missing closing brace in the storage-availability check (line 303). A `SyntaxError` at parse time killed the entire 1,144-line script. The page still rendered — header, footer, controls, theme switching — and silently did nothing. It sat undetected in the "shipped" state and was only found when deployed to Pages and a console was opened.

The lesson is uncomfortable and worth writing down: **whole-file rewrites protect against corruption but offer no protection against being wrong.** Writing a file and trusting a file are currently the same act. This gate separates them permanently and makes the entire bug class unshippable. It protects every item below it, so it goes first.

### 2. Unlink General Medicine from the hub — DONE

GM card removed from `index.html`, along with its (already-broken, pointing at a nonexistent file) reference-doc link. `gm/index.html` itself is untouched — still syntax-clean, working code, just not surfaced from the hub. README now notes GM v1.1 is present but unlinked pending maturation.

### 3. Journal-mode lane selector — believed fixed, needs a manual click-through to confirm

Traced end-to-end in both tools' current code (tab/button entry point → `openJournalPanel()` → checkbox `change` handler → `curJournals()` → query construction) and found no defect. Endo's actual root cause was the missing "Journal View" tab (`setMode('journal')` had no UI entry point) — fixed by commit `0a9af2d`. GM never had this problem; its mode-switch buttons were always explicit.

The architectural rule still holds in both: journal mode builds its query directly from the journal union (`Array.from(jvJournals).map(ta => '"'+ta+'"[ta]').join(' OR ')`), never by filtering a broad specialty base query.

No browser access this session to click-test at runtime — static trace only. Confirm live before fully closing this out.

### 4. Creative Commons — DONE (decided: CC BY 4.0)

Resolved in favour of **CC BY 4.0**, matching the hub spec's recommendation — CC BY-NC-SA 4.0 would have blocked exactly the downstream consumers the project's direction depends on (medical colleges, guideline publishers, specialty societies).

Applied: endo footer, gm footer, README.

**Still open, outside this repo:** the ORCID registration description says NC-SA and needs updating manually on orcid.org to match — not something a code change can touch. Do this before any second contributor emits a judgment-event; relicensing a corpus with multiple contributors is functionally impossible after the fact.

### 5. Dark-mode contrast

- Save and star buttons are effectively invisible in dark mode. Raise contrast.
- Their label text should be larger and brighter.
- While in here: no WCAG AA contrast audit has ever been run across the four themes (midnight, clinical, slate, amber). Consider doing it properly once rather than patching by eye.

### 6. Light-mode type scale

Text is too small. Contrast is fine — do not touch the palette, only the sizes.

### 7. iOS hardening

All four — DONE, merged into main (no iOS fork).

Note: hosting on GitHub Pages fixed *access* on iOS, not these defects. They were in the code.

- **Export was broken on iOS — fixed.** `download()` in both tools now routes through the Web Share sheet (`navigator.share` with a `File`) when the UA looks like iOS Safari and file-sharing is supported; every other browser keeps the plain `<a download>` link unchanged.
- **`#journal-search` was 11px — fixed.** Now 16px under the same `@media(max-width:768px)` rule already used for `<select>`.
- **Sticky nav's hardcoded offset — fixed, GM only.** (Endo's header+tabs were already one sticky unit, no offset needed.) GM's `nav` and `.f-panel` now read `--header-h`, measured from the real header height at load, resize, orientation change, and once more after web fonts finish swapping — instead of a fixed `54px`/`60px` guess.
- **Polish — done.** `-webkit-tap-highlight-color:transparent` and the `100vh`/`100dvh` fallback pair added to endo/gm (hub already had both). Hover-stays-stuck-after-tap addressed via an empty `touchstart` listener on all three (the standard fix) rather than rewriting ~30 individual `:hover` rules into `@media(hover:hover)` blocks.

### 8. Housekeeping

- **Google Fonts CDN dependency — DONE.** Newsreader and IBM Plex Mono (latin + latin-ext subsets) are now self-hosted from `/fonts/` across all three tools; the `fonts.googleapis.com`/`fonts.gstatic.com` links and preconnects are gone.
- **`Inter` in the body font stack — moot.** The stack that referenced it no longer exists after the visual redesign; the current `--ff-sans` stack never named it.
- **`localStorage` may not be the right store** for the saved-article pool at scale. IndexedDB is still under consideration — no defined migration plan yet.

---

## Documentation backlog

**Every document lags the code it describes.** This is a known, recorded gap — not a discovery.

| Document | Current | Should be |
|---|---|---|
| Endocrine — search strategy reference | v5.6 | v5.8 |
| Endocrine — design rationale / spec | v5.7 | v5.8 |
| General Medicine — reference document | **does not exist** | v1.0 |

**Order of work, without exception: generator first, document second.**

1. Rebuild `make-queries.js` → endocrine strategy reference at v5.8
2. Rebuild `make-spec.js` → endocrine spec at v5.8
3. Write `make-gm-reference.js` → GM reference at v1.0, from scratch
4. Restore the Reference documents section in the hub `index.html` (currently cut, because it linked to files that do not exist)

**GM reference document contents:** design rationale, all architectural decisions, lane architecture with RACP GACM curriculum cross-map, full search-strategy table, journal set and impact-factor table, limitations, changelog. Document the CCJ toggle (`AND jsubsetaim[sb]`) — it restricts to NLM Core Clinical Journals and is the intended quality gate for a generalist tool.

**Do not link stale documents from the hub.** A reference document that does not match the code is worse than none, because it will be trusted.

`docs/` should probably be renamed `reference/` — `docs/` is a magic folder name in GitHub Pages and the collision will be annoying later. Free to fix now.

---

## The hub — a different project

**These are not features of the endocrine tool.** Bolting per-user save lists, sharing, or commenting onto a single-file `localStorage` app produces something that works for exactly one person and then has to be thrown away.

This is the `brigest-connected` branch. It needs its own sessions.

### Architecture (specified, not built)

- **Identity:** ORCID OAuth. Non-negotiable — it is the trust model, not just a login. Registration was in progress when the last session ended.
- **Backend:** Cloudflare Workers + D1 (SQLite).
- **Data model:** the hub is a **curation graph, not a paper library.** It stores PMID pointers plus typed, provenanced expert-judgment overlays. It does not store papers.
- **The standalone tools are sensors.** They emit judgment-events into the graph. This is why the tools stay useful on their own and why the hub does not replace them.

### The three features asked for, mapped onto the architecture

- **Persistent per-user save lists.** ORCID identity + D1 replaces `localStorage`. The pool becomes portable across devices, which is the actual user-facing win.
- **Forwarding a saved article into a shared pool.** This is an emission event: *this identified expert flagged this PMID as of interest to others*. It is the graph's most primitive judgment type and should be built first.
- **Ranking, reviewing, commenting.** Richer typed judgment-events on the same substrate. These are what make the graph worth more than a bookmark list — but they are meaningless without content in the graph.

**Build order is not negotiable:** identity → emission → accumulate real content → *then* the output-templating layer (atlas nodes, curriculum reading lists, gap analysis). The templating layer is architecturally specified and phase-gated. Do not build templates against an empty graph.

### Open architectural decisions

Seven (D1–D7) remain unresolved in the hub spec.

**D4 is a sleeper dependency.** RACP curriculum node IDs almost certainly do not exist as a machine-readable set. Everything in Phase 2 that maps judgment-events to curriculum nodes depends on this, and it will need to be built by hand or abandoned. Resolve it early — discovering it late invalidates work.

---

## Known learnings — do not relearn these

- **PubMed has no operator precedence.** Queries evaluate strictly left to right. A trailing bare `AND` clamps an entire preceding OR-union. Every OR-union preceding an `AND` must be explicitly parenthesised. This was the root cause of a defect affecting most endocrine queries (fixed v5.6). Filter-append on unwrapped queries is safe — left-to-right accumulation makes it inherently so.
- **Journal mode must query the journal union directly.** Inheriting a broad-specialty base query and filtering by journal silently restricts results to specialty-indexed articles only.
- **Abort-on-mismatch catches real bugs.** It has already caught a stale project file (v5.3 masquerading as v5.8, missing the operator-precedence fix) and hub schema lane codes that were wrong for the majority of lanes — the latter would have silently rejected every event while appearing to work.
- **Incremental patching corrupts these files.** Box-drawing characters, em-dashes, Unicode symbols. Clean single-pass whole-file rewrites are the only reliable pattern.
- **GitHub Pages caches for ~10 minutes at the CDN.** A pushed fix that "doesn't work" is a cache miss until proven otherwise. Append `?v=2` to see the truth before debugging correct code.
- **Silent failure is the dangerous failure.** The v5.8 syntax error produced a page that looked entirely alive. Nothing that renders can be assumed to run.
