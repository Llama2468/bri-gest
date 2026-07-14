# Handoff: Bri-gest Face-lift (Hub + Endo/GM Digest)

## Overview
Editorial redesign of the Bri-gest app: the Hub landing page and the shared Digest shell used by both the Endocrine and General Medicine literature-surveillance tools. Moves the visual language from a dense clinical-terminal look (dark navy, multi-theme switcher) to a refined medical-journal aesthetic — warm paper background, serif reading type, monospace metadata, single accent color — while keeping density high on the digest feed.

## About the Design Files
The files in `reference/` are **design references built in HTML** (Design Components using a custom templating runtime — `.dc.html` + `support.js`) — prototypes showing intended look, structure, and behavior. They are **not production code to copy directly**. The task is to **recreate this design in Bri-gest's actual codebase** (plain HTML/CSS/JS per the existing repo — `index.html`, `endo/index.html`, `gm/index.html`) using its existing patterns (vanilla JS, direct DOM/fetch calls to NCBI E-utilities, no framework), applying the same look and interaction model shown here.

`support.js` is only the prototyping runtime (template binding, `sc-for`/`sc-if`) — do not port it into the app; it has no equivalent purpose in the real codebase.

## Fidelity
**High-fidelity.** Colors, type, spacing, and component states below are final. Recreate pixel-close using the existing repo's plain HTML/CSS/JS stack.

## Screens / Views

### 1. Hub (`Bri-gest Hub.dc.html` → replaces repo `index.html`)
**Purpose:** Landing page linking to the Endo and GM tools, plus reference docs and a short "method" statement.

**Layout:** Single column, `max-width: 720px`, centered, generous vertical rhythm. Sticky header; main content in four stacked sections (Tools, Reference documents, Method); footer.

**Header:** Sticky, `border-bottom: 1px solid var(--border)`, blurred background (`backdrop-filter: blur(6px)`). Left: 36px circular badge (1.4px accent-color border, italic serif "B" inside) + wordmark "BRI·GEST" (18px, weight 600, letter-spacing .09em) with mono subtitle "CPD Literature Surveillance" (9px, uppercase, letter-spacing .12em, muted color) underneath. Right: two controls — text-size button ("Aa" + step indicator, e.g. "1/3") and theme toggle (sun/moon glyph), both 30px square/pill, `surface2` background, `border` outline, hover switches border+text to accent.

**Tools section:** Section label "Tools" (10px mono, uppercase, letter-spacing .14em, muted, bottom-bordered). Two link-cards (Endocrine Bri-gest, General Medicine Bri-gest), each: `surface` background, 1px `border`, 10px radius, 20/22px padding, hover lifts (`translateY(-1px)`) and border turns accent. Card header: title (19px serif weight 600) + version tag (10px mono, accent, 80% opacity) on same baseline. Description line (14px, `text2`, 1.6 line-height). Below a top border: 2–3 stat blocks (mono 15px value / 9px uppercase label) separated by right borders.

**Reference documents section:** Same section-label style. Below it, a bordered/rounded list of document rows (13.5px `text2`), each row: doc name left, version + format tag right (10px mono, muted), divided by 1px borders, hover background `surface2`.

**Method section:** Same section-label style. A `surface` card with accent-colored left border (2px), containing 3 short paragraphs (14px, `text2`, 1.75 line-height) describing: no AI summarization, versioned search strategies with an audit trail, and IF/cache caveats.

**Footer:** Centered, mono 10px, muted, multi-line, separated by `·` — version, data source, "abstracts verbatim" disclaimer, and a not-a-clinical-tool disclaimer.

### 2. Digest shell (`Bri-gest Digest.dc.html` → replaces repo `endo/index.html`, and is reused as-is for `gm/index.html` with GM's own topic/subdomain data)
**Purpose:** The actual literature feed — browse by domain/topic, filter by subdomain/journal/impact factor, read abstracts inline, save articles, inspect the underlying PubMed search strategy.

**Layout:** Single column, `max-width: 760px`, centered. Sticky header stacks three rows (identity+actions, quick-filter selects, topic tab bar). Main content below; two bottom sheets (journal filter, search-strategy audit) overlay on demand.

**Header row 1:** 30px circular accent-bordered badge with italic "B" + tool name (15.5px weight 600) and mono meta line ("v5.8 · Endocrine & Diabetes", 9px uppercase muted) stacked to its right. Right-aligned icon buttons, all 29px square, `surface2`/`border`, hover→accent: journal filter (☰), search audit (🔍), text-size ("Aa" n/3), theme toggle, and a wider "↻ Refresh" button (accent text).

**Header row 2 (quick filters):** Three native `<select>` chips — Impact Factor (Any/≥5/≥10/≥20), Date range, Study type — 11px mono, `surface2` background, 5px radius.

**Header row 3 (topic tabs):** Horizontal scrollable tab row, top-bordered. Each topic (Diabetes/Thyroid/Bone in Endo; GM's own lanes) is a text button (11.5px mono weight 500), active tab gets a 2px accent underline and accent text color, inactive tabs are muted. A "Saved N" tab is pinned right (`margin-left:auto`) with a small pill badge (accent bg, bg-color text) showing the saved count; acts as a toggle into a saved-articles view.

**Main — topic header row:** Topic name (23px serif weight 300) left, "Fetched HH:MM today" timestamp (10px mono, muted) right.

**Subdomain pill row:** Horizontal scroll of pill buttons ("All" + each subdomain), 11px mono, 20px pill radius; active pill = accent-tinted background/border/text, inactive = transparent bg with border/muted text. Hidden in Saved view.

**Article card** (repeats per article): `surface` bg, 1px border, **3px left accent border** (uses `border` color instead of accent for correspondence/letter items — `art.corr`), 8px radius, 16/18px padding, 10px bottom margin. Card contents top to bottom:
- Meta row: journal name (11px mono, accent), publish date (10px mono, muted), an "IF n.n" badge (9.5px mono, muted text, `surface2` chip, `white-space:nowrap`), and PMID pushed right (10px mono, `border`-color, very low contrast — intentionally de-emphasized).
- Title (16.5px serif, weight 400, 1.5 line-height) — clickable, toggles abstract open/closed, hover darkens to heading color.
- Authors line (10.5px mono, muted).
- Abstract (only when open): left-bordered indent (2px `border`), 13.5px `text2`, 1.75 line-height.
- Action row: "PubMed ↗" outlined link-button (11px mono, accent text, opens PMID on pubmed.ncbi.nlm.nih.gov) + a star save-toggle button pinned right (☆/★, muted/accent).

**Empty state:** Centered, ~50px vertical padding: "Nothing here" (19px serif weight 300) + mono helper line (11px, muted).

**Footer:** Same pattern as Hub footer, tool-specific version/copy.

**Journal-filter bottom sheet:** Full-width sheet pinned to viewport bottom (`position:fixed;left:0;right:0;bottom:0`), 14px top corner radius, max-height 70vh, dark scrim behind (`rgba(0,0,0,.4)`). Header row: title + ✕ close button. Scrollable checklist: each journal name row with a 14px square checkbox indicator (accent fill when selected) — click row to toggle. Footer: "Clear" button (outlined, `text2`).

**Search-strategy audit bottom sheet:** Same sheet chrome, max-height 75vh, titled "Search strategy audit — {topic}". Body lists each subdomain's raw PubMed query string in a mono, wrapped, `surface2`-chip block (10px, `text2`) under its bold subdomain label (11px mono weight 600).

## Interactions & Behavior
- **Theme toggle:** binary light/dark (no longer 4 themes). Instant background/color crossfade (`transition: background .35s ease, color .35s ease`). Persist choice across sessions (localStorage) in production.
- **Text-size cycle:** 3 steps (1×, 1.15×, 1.3×) applied via a single `--tsize` scale multiplier on every spacing/font value in the design — this is the accessibility "larger text" control called out by the user; port it as a real CSS custom property multiplier, not per-element overrides, so it stays maintainable. Persist step across sessions.
- **Topic tab click:** switches active domain, resets subdomain filter to "All", exits Saved view.
- **Saved tab click:** toggles a filtered view showing only starred articles across all topics (hides subdomain pills in this view).
- **Subdomain pill click:** filters current topic's articles by subdomain client-side.
- **IF-minimum select:** filters current article list by `article.impactFactor >= selected`.
- **Title click:** expands/collapses that article's abstract in place (no navigation).
- **Star button click:** toggles saved state for that article (independent of open/closed state).
- **Journal-filter sheet:** multi-select checklist; empty selection = no journal filter applied (shows all). "Clear" empties the selection.
- **Audit sheet:** read-only, shows the literal PubMed search string per subdomain for the current topic — this is a transparency/trust feature, must show the *real* query the app sends to NCBI, not a static string.
- **Refresh button:** re-fetches from source and clears the 6-hour cache (existing behavior — preserve, not part of visual work).
- Bottom sheets: click on scrim or ✕ closes; sheet slides from bottom (add a translateY transition on open/close in production — prototype opens instantly).
- No hover states on touch devices — all hover treatments (`style-hover`) should have equivalent `:active` states for mobile, since the primary usage is phone (iOS/Android).

## State Management
Per digest instance (Endo, GM): `theme` ('light'|'dark'), `textScaleStep` (0-2), `activeTopicId`, `activeSubdomain` ('All' | subdomain label), `viewMode` ('feed'|'saved'), `openAbstractIds` (set/map of expanded article ids), `savedArticleIds` (set/map, persisted), `ifMin` (number), `journalFilterSelection` (set of journal names), `journalSheetOpen` / `auditSheetOpen` (booleans). Saved-article ids and theme/text-scale should persist locally (localStorage) — carry over any existing persistence the app already has.

Data requirement: article records need `pmid, journal, date, impactFactor, subdomain, title, authors, abstract, isCorrespondence, studyType` (the `isCorrespondence`/`corr` flag drives both the muted left-border treatment and the collapsed-by-default row for letters/correspondence vs primary research; `studyType` feeds the PICO/study-type chip).

Additional per-instance state for the refinements: `copiedCitationIds` (transient set, ~1.6s display of "Cite ✓" after a second tap on an already-saved article's star).

## Design Tokens

**Color — Light theme**
- `--bg`: #faf7f1 (warm paper)
- `--surface`: #ffffff
- `--surface2`: #f2ede2 (recessed/chip surface)
- `--border`: #e5ddcd
- `--text`: #1d1a16
- `--text2`: #5c5346 (secondary text)
- `--muted`: #948a78
- `--accent`: #1f5c46 (deep green)
- `--heading`: #151210

**Color — Dark theme**
- `--bg`: #141210
- `--surface`: #1c1916
- `--surface2`: #221e18
- `--border`: #332d24
- `--text`: #ece5d7
- `--text2`: #b3a692
- `--muted`: #786c58
- `--accent`: #6fbf9c (light green, dark-mode-safe)
- `--heading`: #f6efe1

**Typography**
- Reading/display face: **Newsreader** (serif; italic weight 500 for the logo mark, weight 300 for large topic titles, 400/600 for body/emphasis).
- UI chrome / metadata / labels: **IBM Plex Mono** (400/500/600), always uppercase + letter-spaced for section labels and small caps-style tags.
- Fallbacks: `Georgia, serif` / `monospace`.
- Base sizes (at 1× scale): section labels 10px, meta/mono tags 9–11px, body copy 13.5–16.5px, topic title 23px, hub card title 19px. Everything scales by the `--tsize` multiplier (1 / 1.15 / 1.3).

**Spacing**
- All spacing values are `px * var(--tsize)` — base scale roughly: 4, 6, 7, 8, 10, 12, 14, 16, 18, 20, 22, 30, 38, 50, 60px.
- Content max-widths: 720px (Hub), 760px (Digest).

**Radius**
- Small chips/buttons: 4–6px. Cards: 8–10px. Pills: 20px (full). Bottom sheets: 14px top corners only. Circular badge: 50%.

**Shadows**
- Bottom sheets only: `0 -8px 30px rgba(0,0,0,.25)`. No shadows elsewhere — borders carry elevation instead (flat editorial look).

**Borders**
- Standard hairline: `1px solid var(--border)`. Accent card border (Hub method card, article left-edge): 2–3px `var(--accent)` (or `var(--border)` for de-emphasized/correspondence items).

## Assets
No image assets. The only mark is a typographic monogram: a circular outline (1.3–1.4px, accent color) containing an italic serif capital "B" — used at 30px (digest) and 36px (hub). No external icon set; glyphs used are Unicode symbols (☰ ⚙ 🔍 ↻ ★ ☆ ✕ ☀ ☾) rendered in the same mono/serif stack, not an icon font/SVG sprite — recreate with a proper icon set (e.g. Lucide/Feather) at implementation time for crisper rendering, matching stroke weight to the hairline border style.

## Recent refinements (added after initial handoff draft)
Four subtle enhancements are now built into `reference/Bri-gest Digest.dc.html` — carry these into the real implementation:

1. **Reading-progress ring** — each topic tab now shows a small 8px dot rendered as a `conic-gradient(accent pct%, border 0)` ring, where `pct = opened articles in that topic / total articles in that topic`. Purely a visual "how much of this week have I read" cue; recompute whenever `openAbstractIds` changes.
2. **Study-type / PICO tag** — a small mono chip (e.g. "RCT · non-inferiority", "Cohort · retrospective") sits above the title on every article card, sourced from a new `studyType` field per article (parsed/tagged metadata, not AI-generated summary text).
3. **Correspondence de-emphasis** — articles flagged `isCorrespondence` render **collapsed by default**: a single muted one-line row ("LETTER" tag + title only, ~65% opacity, no journal/date/authors/meta). Tapping the row expands it in place into the normal full card (with abstract, actions, etc). Non-correspondence articles are unaffected and always show the full card.
4. **Two-tap save → cite** — the star button's behavior is now two-step: first tap saves the article (star fills, accent color). If the article is already saved, tapping the star again copies a formatted citation string to the clipboard (`authors title. journal. date. PMID: n.`) and shows a small inline "Cite ✓" confirmation next to the star for ~1.6s, then reverts. No new screen or gesture — same control, second state.

## Files
- `reference/Bri-gest Hub.dc.html` — Hub screen, full markup + theme/scale logic.
- `reference/Bri-gest Digest.dc.html` — Digest shell (used for both Endo and GM), full markup + all filter/state logic, with illustrative sample data for 3 Endo topics (Diabetes, Thyroid, Bone) — **not the full domain/subdomain taxonomy**; pull the real list from the repo's existing search-strategy reference docs (`docs/endo-digest-queries-v5_6.docx`, `docs/gm-digest-reference-v1_0.docx`) when wiring up production data. Includes the four refinements above.
- `reference/support.js` — prototyping runtime only; do not port.

Corresponding files to modify in the `bri-gest` repo: `index.html` (Hub), `endo/index.html` (Endo Digest), `gm/index.html` (GM Digest, reusing the Digest shell/layout with GM's own lanes and "Core Clinical Journals" filter in place of subdomain pills where applicable).
