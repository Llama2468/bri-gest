# Handoff Addendum — corrections to `README.md`

Read this **with** `README.md`. Where they conflict, this file wins. Every item below is a
divergence between the design reference and either the real codebase or the project's
standing build constraints. Several are silent failures: they render convincingly and
break later.

---

## 0. Verify before you start

The copy of `endo-digest.html` in project knowledge is **v5.3**, not v5.8. All statements
below about existing behaviour are derived from v5.3 plus the spec document.

**Confirm `const VERSION` in the real repo before applying any of this.** If the repo is
not v5.8, stop and re-derive. Do not transform a file whose version you have not checked.

---

## 1. Search-strategy audit — canonical query set is **v5.4**

`README.md` line 139 sources the audit queries from `docs/endo-digest-queries-v5_6.docx`.
**That document does not exist.** The canonical set is `endo-digest-queries-v5_4.docx`.

The audit sheet must display the *literal string sent to NCBI*, resolved at runtime from
the live `TOPICS` array — not a copied constant. This is a trust feature; a stale hardcoded
query is worse than no audit sheet.

---

## 2. Contrast — `--muted` fails WCAG AA in both themes

Not just PMID. The entire muted metadata tier fails. All affected text is 9–11px, so none
of it qualifies for the 3:1 large-text exemption.

Measured ratios for the design's `--muted` values:

| Token | on `surface2` | on `surface` | on `bg` |
|---|---|---|---|
| light `#948a78` | **2.92** FAIL | 3.41 FAIL | 3.19 FAIL |
| dark `#786c58` | **3.22** FAIL | 3.40 FAIL | 3.63 FAIL |

`--muted` carries: authors line, publication date, IF badge text, section labels, footer,
inactive topic tabs, inactive subdomain pills, header subtitle, empty-state helper.

### Required token changes

```
light:  --muted: #6f6656    /* was #948a78 — now 4.85 / 5.66 / 5.29 */
dark:   --muted: #968872    /* was #786c58 — now 4.78 / 5.05 / 5.39 */
```
(ratios given against `surface2` / `surface` / `bg` respectively; worst case is `surface2`)

All other tokens pass. `--accent` (7.3–8.6), `--text2` (6.5–7.8), `--text` and `--heading`
are all comfortably AA in both themes.

### PMID

Currently rendered in `var(--border)` — **1.26:1**. Deliberate de-emphasis, but
unreadable, not merely subtle. Move PMID to the corrected `var(--muted)`.

### Correspondence rows

Currently `opacity:.65`, which computes to **3.20:1** (light). Do **not** solve this with
a higher opacity. Remove the opacity entirely and let the existing structural
de-emphasis carry it — the LETTER tag, the smaller type, and the stripped
journal/date/author metadata are already sufficient signal.

Rationale: `opacity` composites over every descendant, so it silently defeats any
contrast gate applied to the tokens themselves. Never de-emphasise text with opacity in
this codebase.

### `--border` as a text colour

`--border` is a **1.2–1.4:1** hairline colour. It is never a valid text colour. Any use
of `color: var(--border)` is a bug.

---

## 3. localStorage — existing keys and required migration

v5.8 (per v5.3 + spec) persists five keys. They must survive.

| Key | Type | Content |
|---|---|---|
| `e_bm` | Array | Saved article PMIDs |
| `e_rd` | Array | **Read** article PMIDs |
| `e_jf` | Array | Selected journal **`ta`** strings (PubMed title abbreviations) |
| `e_th` | String | Active theme name |
| `e_ss` | Object | `{ topicId: subdomainIndex \| null }` |

GM uses the `gm_*` prefix. Hub uses `hub_*`. Do not collide.

### 3.1 `e_th` — **will hard-crash every existing user**

v5.8 stores one of `'midnight' | 'clinical' | 'slate' | 'amber'`.
Load logic is effectively:

```js
var th = localLoad('e_th');
if (typeof th === 'string') theme = th;
```

`'midnight'` **passes** that check. In the new two-theme model `themes()['midnight']` is
`undefined`, and the first token read (`t.bg`) throws a TypeError. Result: blank page on
first load after deploy, for every returning user. This is not a degraded theme — it is a
dead application.

**Required:** validate against the known set and migrate legacy values, writing back.

```js
var LEGACY_THEME = { midnight:'dark', slate:'dark', amber:'dark', clinical:'light' };
var th = localLoad('e_th');
if (th === 'light' || th === 'dark') {
  theme = th;
} else if (typeof th === 'string' && LEGACY_THEME[th]) {
  theme = LEGACY_THEME[th];
  localStore('e_th', theme);          // migrate in place
} else {
  theme = 'light';                    // unknown / absent / corrupt
  localStore('e_th', theme);
}
```

Apply the same allowlist-with-fallback pattern to every persisted key. A value being the
right *type* is not evidence it is a valid *value*.

### 3.2 `e_jf` — abbreviation vs display name

`e_jf` stores PubMed **title abbreviations** (`ta`). The design reference filters with
`journalKeys.indexOf(a.journal)` against the journal's **display name**. These never
match: the filter silently returns an empty feed, and it looks like the fetch broke.

**Required:** key the journal filter on `ta` throughout — it is what PubMed actually
returns — and render the display name in the sheet UI. The checkbox row's identity is
`ta`; its label is the display name.

### 3.3 `e_rd` — dropped by the redesign, and it guts the progress ring

The redesign has no read-tracking. It has session-only `openAbstractIds`, and the
reading-progress ring is spec'd as `opened / total`.

That ring reads **0% every morning** — precisely when the tool is used. A "how much of
this week have I read" cue that resets nightly is decorative noise.

**Required:**
- Drive the progress ring from the persisted read set (`e_rd`), not session `openIds`.
- Preserve v5.8's existing read semantics: an article becomes read when its abstract is
  expanded **or** its PubMed link is clicked.
- Preserve the reduced-opacity treatment of read articles — but implement it with a
  token, not `opacity` (see §2).

`openAbstractIds` remains as separate, session-only expand/collapse state. Read ≠ open.

### 3.4 `e_ss` — shape mismatch

v5.8 persists subdomain selection **per topic, by index**: `{ dm: 2, thy: null }`.
The design uses a single global, non-persisted **label string** (`'All' | label`).

**Required:** keep v5.8's index-per-topic shape and persistence. Derive the label for
display from the index. Do not migrate the storage shape to labels — indices are stable
against subdomain relabelling; labels are not.

### 3.5 New key: text scale

The design's 3-step text scale has no counterpart in v5.8 and nothing in the reference
persists. Add `e_ts` / `gm_ts` / `hub_ts` — integer `0 | 1 | 2`, validated on load,
falling back to `0`.

---

## 4. Two-tap save → **removed**

The reference's star button saves on first tap and copies a citation on a second tap when
already saved. This leaves **no gesture that unsaves an article**. On a phone-first tool,
an accidentally starred article is permanently starred.

**Required:**
- The star reverts to a pure **save / unsave toggle** bound to `e_bm`.
- Citation copy moves to an explicit outlined **`Cite ⧉`** button in the action row,
  beside `PubMed ↗`, using the same button treatment.
- Retain the transient confirmation: swap the label to `Copied ✓` for ~1.6s, then revert.
- Citation format unchanged: `authors title. journal. date. PMID: n.`

No new gesture, no new component, unsave restored.

---

## 5. Fonts — self-host, no CDN

Both reference files load Newsreader + IBM Plex Mono from `fonts.googleapis.com`. This
violates the zero-CDN-egress constraint and will be rejected by the build's egress gate.
(It also leaks the user's IP and UA to Google on every session — already flagged as a
residual limitation in the spec.)

**Required:** self-host both faces as subset `woff2` under `assets/fonts/`, declared with
`@font-face`. Both are OFL-licensed; redistribution is permitted with the licence file.

Note the design changed the serif from **Fraunces** (v5.3) to **Newsreader**. Accept
this — but the spec document claims v5.8 already moved to *system font stacks*, which the
v5.3 file contradicts. **Confirm what v5.8 actually ships before assuming a baseline.**

---

## 6. Icons

Unicode glyphs (`★ ☆ ↻ ✕ ☰ 🔍 ☀ ☾`) render as full-colour emoji on iOS, which will
wreck the monochrome editorial look on the primary target platform. Replace with **inline
SVG** paths (Lucide/Feather geometry), stroke weight matched to the 1px hairline border.
Inline, not sprite-linked, not icon-font — zero external requests.

---

## 7. Quick-filter selects — two of three are non-functional

In the reference, only the **Impact Factor** select has a handler. **Date range** and
**Study type** are visual placeholders with no `onchange` and no filter logic, despite the
README describing all three as filters.

v5.8 already implements date-range and study-type filtering, and both participate in the
cache key (`cKey()`). **Wire the new selects to the existing v5.8 filter logic and cache
key.** Do not reimplement, and do not ship them inert.

---

## 8. Do not port the reference's CSS mechanism

The reference is built entirely from inline `style=""` attributes with
`calc(Npx * var(--tsize))` repeated on every element, plus a non-standard `style-hover=""`
attribute. This is an artefact of the prototyping runtime.

**Required:**
- Recreate the *appearance and behaviour*, not the mechanism.
- One stylesheet. `--tsize` as a single real custom property multiplier applied to a
  spacing/type scale — not repeated per-element `calc()`.
- `style-hover` has no meaning in a browser. Use `:hover` **and** a matching `:active`
  state — the primary platform is touch, where `:hover` never fires (README §Interactions).
- `support.js` is prototyping scaffolding. Do not port it. `sc-for` / `sc-if` have no
  equivalent in the real codebase; the app renders via `innerHTML` with event delegation.

Preserve the existing security controls exactly: `esc()` on all PubMed strings,
`sanitiseStr()` before storage, `safeJSON()` / per-key `localJSON()` recovery, DOI regex
validation, and **event delegation via `data-action` / `data-pmid`** — no inline `onclick`
on generated content. The reference uses inline handlers throughout; that pattern must not
reach production.

---

## 9. Regressions to check before merge

The redesign silently drops these v5.8 features. Restore or consciously retire — do not
lose them by omission.

- [ ] **DOI links** — v5.8 renders a validated DOI link per article. The new action row is
      PubMed-only.
- [ ] **Read-state dimming** of already-read articles.
- [ ] **Unread count badges** per topic tab (the progress ring is an addition, not a
      replacement).
- [ ] **NCBI query translation** in the audit panel (how PubMed *actually parsed* the
      query) — the single most useful field for catching MeSH mismatches, and absent from
      the redesigned sheet.
- [ ] **Shown/total result count** in the audit panel, incl. the truncation warning when
      `retmax=50` is insufficient.
- [ ] **"Verify on PubMed"** link per audit row.
- [ ] **`STORAGE_OK` probe** and the Private Mode warning banner.
- [ ] **iOS select `font-size:16px`** — prevents auto-zoom. The reference sets 11px on the
      quick-filter selects, which will zoom on every tap. Use `16px` at the media-query
      level and scale down visually if needed.
- [ ] **Correspondence detection** must remain driven by PubMed `PublicationType`
      (Letter / Comment / Editorial / Erratum) via `isCorr()`, not a hand-set flag.
- [ ] **`studyType`** likewise: derive from `PublicationType` via the existing badge logic.
      It is parsed metadata. It is never AI-generated, inferred, or summarised.

---

## 10. Non-negotiables (unchanged)

- ES5-conservative JS. No optional chaining, no nullish coalescing.
- Zero external CDN requests at runtime. NCBI E-utilities is the only permitted origin.
- No AI summarisation, paraphrase, or interpretation of article content anywhere. Abstracts
  are verbatim.
- iOS Safari is the primary target, not a compatibility afterthought.
- Whole-file regeneration. Never hand-patch a generated file.
