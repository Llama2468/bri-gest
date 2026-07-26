# Bri-gest — Backlog

Working file. Hand-edited (the only one in this repo that is).
Last updated: 2026-07-26.

**Status:** Hub live at https://llama2468.github.io/bri-gest/ — Endocrine v5.9 and General Medicine v1.1 deployed (GM unlinked from the hub, still reachable directly). All three tools share one cool-blue design system as of this date.

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

## Found in production, 2026-07-26

Both found by live click-through on the deployed hub after the v5.9/v1.1 push — not caught by the syntax gate or any static check, since neither is a JS error.

### 9. Hub reference-doc links 404 — DONE (unbroken, not yet current)

Both links pointed at filenames that didn't match what's actually in `docs/`:

| Hub linked to | Actual file |
|---|---|
| `docs/endo-digest-queries-v5_6.docx` | `docs/endo-digest-queries-v5.6.docx` (underscore vs. period) |
| `docs/endo-digest-spec-v5_7.docx` | `docs/endo-digest-spec-v5.4.docx` (wrong separator *and* wrong version) |

`href`s corrected to the real filenames and the displayed spec version corrected to v5.4 (was falsely claiming v5.7) so the hub never asserts a version that isn't what's actually behind the link.

**This is the shallow fix (links resolve, versions displayed are honest) — not the deep one.** The spec doc is still genuinely v5.4 content against a v5.9 app. That's the Documentation backlog's job, not this one's — see below.

### 10. Hub header overflows sideways on narrow/mobile viewports — DONE (hub + endo)

The Aa and theme-toggle buttons in the hub header sat slightly off-screen on mobile, forcing a horizontal scroll of the *entire page* (cards included) even though the cards themselves fit the viewport fine.

**Root cause:** the title/subtitle text had no `overflow`/`text-overflow`/`white-space` handling, and in hub's case the wrapping `<div>` around them had no `min-width:0` either (a flex item defaults to `min-width:auto`, i.e. content-sized, unless told otherwise) — so at narrow widths the subtitle's natural width pushed the header's total content wider than the viewport, shoving `.hdr-actions` off the right edge. Endo had the same gap and, worse, its `.logo-row` was `flex-shrink:0` (explicitly refusing to shrink at all).

**Fixed in hub and endo:** `.logo-text-group` (the h1+subtitle wrapper) now has `min-width:0`; both `h1` and `.logo-sub` get `overflow:hidden;text-overflow:ellipsis;white-space:nowrap`; endo's `.logo-row` changed from `flex-shrink:0` to `min-width:0` so it can shrink instead of forcing overflow. `.logo-badge`/`.hub-link` keep their own `flex-shrink:0`, so only the text truncates, never the badge or the back-link.

No browser this session to click-confirm at a real narrow width — reasoned through the CSS (this is the standard flex-truncation pattern), but verify on-device before fully closing.

**GM deliberately skipped — see the GM-paused placeholder below.** Same root cause almost certainly applies there too (shorter subtitle string just hasn't visibly triggered it yet); fix it in the same pass whenever GM work resumes.

**Superseded/extended by item 11 below for endo** — the text-truncation fix here was necessary but not sufficient; endo's header needed actual restructuring, found on the next round of live testing.

### 11. Endo header still cramped on mobile — actions crowded the title, filter row overflowed — DONE

Found on the same live-testing pass as item 10, after that fix shipped: even with title truncation working, endo's header packed the back-link, wordmark, *and* five action controls (journal filter, audit, Aa, theme, refresh) onto one row, which visually crowded/obscured the title on narrow screens. Separately, the IF / date-range / study-type `<select>` row overflowed — browsers commonly size a closed `<select>`'s box to its *widest option*, not its selected value, so "IF ≥ 40 (flagship)" and "Systematic review" were forcing width regardless of what was actually selected.

**Restructured endo's header from 3 rows to 4:**
1. Back-link + title only (the "B" logo badge removed entirely — pure decoration, and the first thing to go when a row is tight).
2. Actions, now their own row: journal filter, audit, Aa, theme toggle, divider, refresh.
3. The IF/date/study-type filter row — `select` elements now `flex:1;min-width:0` with `overflow:hidden;text-overflow:ellipsis`, so they share the row width equally and truncate instead of forcing it wider, independent of option text length. "All study types" shortened to "All studies" too (shrinks the widest option, though the flex fix is what actually solves the layout regardless of label length).
4. Topic tabs (unchanged).

`.hub-link` (the back-to-hub button) also enlarged — was `10px`/`3px 7px` padding, now `11.5px`/`7px 13px` with a background matching the other header buttons, since it was flagged as too small/low-contrast to comfortably tap.

**GM not touched** — same crowding pattern almost certainly exists there (GM's row 1 has the identical shape: hub-link + badge + title + actions all together), but per the GM-pause decision, defer it to that tool's resumption rather than fixing piecemeal. Added to the GM-paused placeholder below.

No browser this session to click-confirm the actual rendered result at a real mobile width — reasoned through the CSS/flex model, but verify on-device.

---

## General Medicine — paused, resume later

**GM tool work is on hold as of 2026-07-26, by explicit decision, so it doesn't get dragged along piecemeal while attention is on the hub/connected-hub work below.** `gm/index.html` is untouched and stays fully working in the meantime — nothing here is urgent, it's a marker for what to pick up.

Deferred:
- **Header-overflow fix (item 10's GM half).** Same `.logo-sub`/flex `min-width:0` gap as hub and endo had — apply the identical fix (`.logo-text-group{min-width:0}`, ellipsis on `h1`/`.logo-sub`) when GM work resumes. Check whether `.logo-row` there is also `flex-shrink:0` like endo's was, rather than assuming.
- **Header restructure (item 11's GM half).** GM's `.controls` row packs the hub-link, wordmark, and every filter/action control (date, study-type, IF, CCJ toggle, journal, theme, audit, refresh) into one crowded flex row — almost certainly the same "everything crowds the title" problem just fixed in endo (back-link+title / actions / filters split onto separate rows, `<select>` elements given `flex:1;min-width:0` so they don't size to their widest option). Apply the same restructuring pattern, adapted to GM's actual control set (CCJ toggle included), when GM work resumes — not a smaller fix than endo's, GM's row was more crowded to begin with.
- Anything else that surfaces from live use in the meantime should land here, not get fixed as a one-off — keep GM changes batched into one deliberate pass rather than scattered across sessions.

Do not delete or let `gm/index.html` bit-rot relative to the shared token/font system — if hub or endo's shared CSS custom properties change again before GM's pass, reconcile GM against the *current* tokens then, not against whatever they were on 2026-07-26.

---

## Documentation backlog

**Every document lags the code it describes.** This was a known, recorded gap — partly closed 2026-07-26.

**What was actually found, 2026-07-26:** the two endo `.docx` files were real, substantial authored documents (executive summary, architecture, security, version history) — not raw HTML dumps as first suspected — but badly stale: wrong product name ("Endo Digest"), the old four-theme system, a false "no external fonts" claim, an "ES5-compatible" description that no longer matched the ES6+ code, and a reference to a `preflight-v5.4.py` checker that does not exist anywhere in this repo's history. Both documents ended with an explicit note that they were generated from `make-queries-v5.6.js` / `make-spec.js` — **confirmed, by searching the full working tree, every branch, and git history, that neither generator exists anywhere in this repo.** This is the exact failure mode this file's own session rule warns about ("if the generator is lost, the document is no longer trustworthy") — it had already happened, silently, before this was noticed.

| Document | Was | Now |
|---|---|---|
| Endocrine — search strategy reference | v5.6 docx, generator lost | **v5.9, `docs/endo-search-strategy-reference.html`, regenerated by `scripts/generate-endo-query-reference.js`** — DONE |
| Endocrine — design rationale / spec | v5.4 docx, generator lost | **v5.9, `docs/endo-design-spec.html`, hand-updated** — DONE, but see caveat below |
| General Medicine — reference document | does not exist | still does not exist |

**The search-strategy reference is generator-backed again.** `scripts/generate-endo-query-reference.js` extracts the `TOPICS` array directly from the live `endo/index.html` and emits the HTML page — it cannot drift from the actual queries the app runs, because it reads them from the same place the app does. Spot-checked several queries against the old v5.6 docx before rewriting: all identical, confirming the queries themselves haven't changed since v5.6, only the surrounding app description had gone stale. Domain source citations (Cochrane/ADA/NICE/etc. per domain) and the Boolean-precedence methodology note are carried over as hardcoded narrative in the generator, since they're not derivable from `TOPICS` data.

**The design spec has no generator, and this is not fully solved.** Architectural rationale isn't mechanically derivable from source the way query strings are — `docs/endo-design-spec.html` is hand-updated against verified current facts (checked localStorage keys, ES-level, theme/font system, IF table size directly against the code rather than trusting the old doc), but it is exactly as capable of going stale again as its predecessor was. There is no `make-spec.js` to restore. Whoever next changes endo's architecture significantly should update this document in the same session, not defer it — that's the actual lesson here, not a generator that doesn't exist yet.

### 12. Version/design-spec update generator — proposed, not built

Raised 2026-07-26 in direct response to the drift just found and fixed above: the query-reference doc has a generator now and can't silently go stale again; the design spec still can, because prose rationale isn't mechanically derivable from source the way query strings are. This item proposes narrowing that gap without pretending the whole document can be auto-generated.

**Scope: capture the facts that ARE derivable from source, not the narrative around them.** The class of drift that actually happened wasn't subtle judgement calls going stale — it was concrete, checkable facts (product name, theme count, font hosting, ES-level, IF table size, localStorage key names) silently going wrong because nothing cross-checked them against the code. That class is fixable mechanically; the "why we built it this way" prose around it isn't, and shouldn't be auto-generated pretend-prose either.

**Proposed approach, extending the existing pattern rather than inventing a new one:**
- A script (e.g. `scripts/check-spec-facts.js`) that extracts the same class of checkable facts `generate-endo-query-reference.js` already proves is extractable — `VERSION` constant, theme names from the `data-theme` blocks, font families actually `@font-face`'d, approximate `IF_MAP` size, the actual `localStorage` key list (grep for `localStore(`/`localLoad(`/`localStorage.setItem(` call sites) — and diffs them against what `docs/endo-design-spec.html` currently states.
- Wired into CI alongside `.github/workflows/syntax-check.yml` (or as a separate workflow) so a mismatch is a build warning, not a silent gap discovered the next time someone happens to read the doc closely — the same principle as the syntax gate, applied to documentation-fact drift instead of JS syntax errors.
- On a `VERSION` bump specifically: fail (or at minimum warn) if the design spec's stated version doesn't match, the same way the hub's card versions and reference-doc version labels needed manual reconciliation this session — make that reconciliation automatic instead of a thing a human has to remember.
- **Explicitly not in scope:** auto-writing the "why" sections (rationale, roadmap reconciliation, version-history narrative). Those stay human-authored. The goal is a tripwire for fact drift, not a document-writing bot standing in for the judgement this file already says elsewhere should happen before code is written.
- Apply the same pattern to General Medicine once its reference document exists (item above) — build the checker to cover both tools' spec docs from the start rather than bolting GM on later.

**GM reference document:** still not written. Contents when it is: design rationale, all architectural decisions, lane architecture with RACP GACM curriculum cross-map, full search-strategy table, journal set and impact-factor table, limitations, changelog. Document the CCJ toggle (`AND jsubsetaim[sb]`) — it restricts to NLM Core Clinical Journals and is the intended quality gate for a generalist tool. Deferred along with the rest of GM's work — see the GM-paused section above.

**Hub's Reference documents section now links to real, current pages** — `docs/endo-search-strategy-reference.html` and `docs/endo-design-spec.html`, replacing the two `.docx` links that 404'd (item 9, further up this file). The old `.docx` files are left in `docs/` unlinked, as historical record, not deleted.

**Do not link stale documents from the hub.** A reference document that does not match the code is worse than none, because it will be trusted.

`docs/` should probably be renamed `reference/` — `docs/` is a magic folder name in GitHub Pages and the collision will be annoying later. Free to fix now.

---

## The connected hub — a different project

**Full design lives in [`CONNECTED-HUB-DESIGN.md`](CONNECTED-HUB-DESIGN.md)**, written
2026-07-26. Section 6's D1–D8 architectural decisions — OAuth flow shape, judgment-event
schema, where tools emit from, curriculum-node mapping, data retention, moderation, D1
backup, and dev/staging/production topology — were reviewed one at a time and **confirmed**
(no longer a first draft) before any code was written, per the design doc's own rule.

**Build-order items 1 and 2 (design doc section 5) are both done, on the `brigest-connected`
branch, pushed to `origin`, with an open [draft PR #1](https://github.com/Llama2468/bri-gest/pull/1):**
- A Cloudflare Worker (`/hub-api/`) deployed to a **staging-only** environment at
  `bri-gest-hub-api-staging.llama2468.workers.dev`, with a D1 database
  (`bri-gest-hub-staging`) running the judgment-event schema.
- ORCID OAuth working end-to-end against the **sandbox** registry — confirmed identity, token
  exchange server-side in the Worker, never in a frontend.
- A signed, stateless session cookie issued after login (`/me` to check it, `/auth/logout` to
  clear it) — no D1 sessions table needed.
- The single primitive judgment-event — `POST /events` (an ORCID-identified person flags a
  PMID as of interest to others) — verified writing to D1 and reading back correctly via
  `GET /events?pmid=`.

No production environment, database, or ORCID registration exists yet; none of that is
retrofitted, it's stood up deliberately when that phase actually starts. `index.html`,
`endo/`, `gm/` are untouched — the branch's diff against `main` is purely additive
(commit-by-commit history and endpoint documentation live in `hub-api/README.md`).

**Not yet built:** the hub's one deliberate integration touchpoint (design doc §4) — a small
`/connected/` frontend surface plus a single link added to `index.html`, so a signed-in person
can trigger an emission without opening DevTools. That's what's blocking PR #1 from leaving
draft (§4's merge criteria (a) — identity + first emission working end-to-end — is now met;
(b) — the touchpoint reviewed and deliberate — isn't yet). After that: let real content
accumulate (no code, just usage), then richer judgment types and the templating layer. See
design doc section 5 for why that sequencing is deliberate, not just the next item on a list.

**These are not features of the endocrine or GM tools.** Bolting per-user save lists, sharing,
or commenting onto a single-file `localStorage` app produces something that works for exactly
one person and then has to be thrown away. This work stays on its own branch and its own
sessions until the merge criteria in the design doc's section 4 are met, so it doesn't put
the current polished, live main branch at risk.

---

## Known learnings — do not relearn these

- **PubMed has no operator precedence.** Queries evaluate strictly left to right. A trailing bare `AND` clamps an entire preceding OR-union. Every OR-union preceding an `AND` must be explicitly parenthesised. This was the root cause of a defect affecting most endocrine queries (fixed v5.6). Filter-append on unwrapped queries is safe — left-to-right accumulation makes it inherently so.
- **Journal mode must query the journal union directly.** Inheriting a broad-specialty base query and filtering by journal silently restricts results to specialty-indexed articles only.
- **Abort-on-mismatch catches real bugs.** It has already caught a stale project file (v5.3 masquerading as v5.8, missing the operator-precedence fix) and hub schema lane codes that were wrong for the majority of lanes — the latter would have silently rejected every event while appearing to work.
- **Incremental patching corrupts these files.** Box-drawing characters, em-dashes, Unicode symbols. Clean single-pass whole-file rewrites are the only reliable pattern.
- **GitHub Pages caches for ~10 minutes at the CDN.** A pushed fix that "doesn't work" is a cache miss until proven otherwise. Append `?v=2` to see the truth before debugging correct code.
- **Silent failure is the dangerous failure.** The v5.8 syntax error produced a page that looked entirely alive. Nothing that renders can be assumed to run.
