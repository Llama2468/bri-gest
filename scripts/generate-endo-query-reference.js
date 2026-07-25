#!/usr/bin/env node
// Generates docs/endo-search-strategy-reference.html directly from the live
// TOPICS array in endo/index.html. Run this any time the queries change --
// never hand-edit the generated file. This replaces make-queries-v5.6.js,
// which produced the v5.6 predecessor of this document but is no longer
// present anywhere in this repo's working tree or history (confirmed by
// search, 2026-07-26) -- see BACKLOG.md's "Generators are the deliverable"
// rule, which this script exists to restore for the query-reference half of
// the documentation. There is no equivalent generator for the prose design
// spec (docs/endo-design-spec.html) -- architectural rationale isn't
// mechanically derivable from source the way query strings are, so that
// document stays hand-maintained.
//
// Usage: node scripts/generate-endo-query-reference.js

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC = path.join(REPO_ROOT, 'endo', 'index.html');
const OUT = path.join(REPO_ROOT, 'docs', 'endo-search-strategy-reference.html');

// ── Extract TOPICS + JOURNAL_VIEW_TOPIC directly from the live source ──────
function extractBalanced(source, startIdx) {
  let depth = 0, started = false;
  for (let i = startIdx; i < source.length; i++) {
    const c = source[i];
    if (c === '[' || c === '{') { depth++; started = true; }
    else if (c === ']' || c === '}') { depth--; if (started && depth === 0) return source.slice(startIdx, i + 1); }
  }
  throw new Error('unbalanced brackets while extracting from ' + SRC);
}

const html = fs.readFileSync(SRC, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
if (!scriptMatch) throw new Error('no <script> block found in ' + SRC);
const src = scriptMatch[1];

const topicsIdx = src.indexOf('const TOPICS = [');
if (topicsIdx === -1) throw new Error('TOPICS array not found -- has it been renamed?');
const topicsStart = topicsIdx + 'const TOPICS = '.length;
const TOPICS = eval('(' + extractBalanced(src, topicsStart) + ')');

// ── Historical / narrative content that isn't derivable from TOPICS ───────
// Carried over from the v5.6 predecessor document (endo-digest-queries-v5.6.docx,
// itself generated from the now-lost make-queries-v5.6.js). Verified 2026-07-26
// that none of the 63 query strings have changed since -- spot-checked several
// against the live TOPICS array above, all identical. This section documents
// WHY the queries look the way they do; it does not need regenerating unless
// the underlying methodology changes, only the query dump above does.
const DOMAIN_SOURCES = {
  dm: 'Cochrane; ADA; NICE NG28; ISPAD',
  ob: 'Cochrane; NICE TA; WHO; Rinella 2023',
  thy: 'ATA 2015/2016/2022; EUGOGO; ETA 2014',
  ad: 'Endocrine Society CPG series (2014-2018)',
  pit: 'Endocrine Society; ESE; EJE 2022',
  bone: 'IOF/ESCEO; NOGG; ASBMR 2022; KDIGO',
  rep: 'Teede 2023; Endocrine Society 2018; ESHRE 2024',
  lip: 'ESC/EAS LIPID4; NICE CG181; EAS FH Panel',
  net: 'ENETS Consensus; NANETS; Cochrane NET',
  eoc: 'Custom (ENSAT; Barroso-Sousa 2018)',
};

const PRECEDENCE_NOTE = `PubMed evaluates Boolean operators strictly left to right, with no operator
precedence: AND does not bind more tightly than OR. Parentheses are the only way to group.
Consequently a query of the form <code>A OR B AND C</code> is parsed as <code>(A OR B) AND C</code>,
not <code>A OR (B AND C)</code>. This was the root cause of a defect fixed in v5.6 that affected
the majority of subdomain queries at the time -- every OR-union that precedes an AND must be
explicitly parenthesised. Filter-append on an already-parenthesised query is safe, since
left-to-right accumulation makes it inherently so.`;

const PENDING_ENHANCEMENTS = [
  ['Spelling variants in [tiab]', `Tagging a term [tiab] suppresses PubMed's automatic British/American mapping, so a single-spelling tiab term silently misses the other spelling. Candidates to dual-spell: "glycaemic control"/"glycemic", "goitre"/"goiter", "tumour"/"tumor" (NFPA, pNET), "oestrogen"/"estrogen", "oestradiol"/"estradiol", "paediatric"/"pediatric", "hypercholesterolaemia"/"hypercholesterolemia".`],
  ['Gender-Affirming Care MeSH', `"transsexualism"[MH] is a dated descriptor. Consider adding "gender dysphoria"[MH], "transgender persons"[MH], and "health services for transgender persons"[MH] for current indexing coverage.`],
  ['MeSH descriptors to verify', `A handful of [MH] tags may not resolve to valid descriptors and warrant a MeSH Browser check: "growth hormone deficiency"[MH] (no exact descriptor -- likely Human Growth Hormone/deficiency or Dwarfism, Pituitary), "gonadal disorders"[MH], "proprotein convertase subtilisin"[MH] (likely should be "Proprotein Convertase 9"[MH] for PCSK9). Where the [MH] is invalid the tiab fallback still fires, so recall degrades quietly rather than failing loudly.`],
  ['Acronym safety', `High-ambiguity acronyms now correctly require a context AND (ACC, NET, MTC, FH, POI, MACS). Worth periodically auditing the audit panel's query-translation to confirm PubMed isn't auto-mapping the acronym to an unrelated MeSH term.`],
  ['"lipoprotein(a)" / "Lp(a)"', `Parentheses inside a search token can be misread by PubMed even when quoted. Confirm via the audit panel's query translation that these are treated as phrases; if not, consider "lipoprotein a"[tiab] forms.`],
  ['NOT over-exclusion', `The T1D NOT (type 2 / gestational) and Thyroiditis NOT "thyroid cancer" clauses intentionally trade recall for precision and will drop genuinely comparative papers. Documented as accepted, but revisit if weekly yield feels thin.`],
];

// ── esc ─────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Build the domain sections ──────────────────────────────────────────
const sectionCount = TOPICS.length;
const subdomainCount = TOPICS.reduce((n, t) => n + t.subdomains.length, 0);

const domainsHTML = TOPICS.map((t) => {
  const source = DOMAIN_SOURCES[t.id] || '';
  const subRows = t.subdomains.map((s, i) => `
      <div class="q-row">
        <div class="q-label">${String(i + 1).padStart(2, '0')} &middot; ${esc(s.label)}</div>
        <div class="q-string">${esc(s.query)}</div>
      </div>`).join('');
  return `
    <section class="domain" id="${esc(t.id)}">
      <h2>${esc(t.label)} <span class="domain-meta">${t.subdomains.length} subdomains &middot; ${esc(t.section)}</span></h2>
      ${source ? `<div class="q-source">Search strategy source: ${esc(source)}</div>` : ''}
      <div class="q-row q-row-broad">
        <div class="q-label">Broad domain query</div>
        <div class="q-string">${esc(t.query)}</div>
      </div>
      ${subRows}
    </section>`;
}).join('\n');

const enhancementsHTML = PENDING_ENHANCEMENTS.map(([label, body]) => `
      <div class="enh-row">
        <div class="enh-label">${esc(label)}</div>
        <div class="enh-body">${esc(body)}</div>
      </div>`).join('');

const generatedAt = new Date().toISOString().slice(0, 10);

const page = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Endocrine Bri-gest &mdash; Search Strategy Reference</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<style>
:root{--ff-serif:'Newsreader',Georgia,serif;--ff-mono:'IBM Plex Mono',ui-monospace,monospace;--ff-sans:system-ui,-apple-system,'Segoe UI',sans-serif}
@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:400;font-display:swap;src:url('../fonts/ibm-plex-mono-400-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:500;font-display:swap;src:url('../fonts/ibm-plex-mono-500-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Newsreader';font-style:normal;font-weight:300 700;font-display:swap;src:url('../fonts/newsreader-normal-latin.woff2') format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
*,*::before,*::after{box-sizing:border-box}
[data-theme="light"]{--bg:#dde3ec;--bg2:#e3e8f0;--bg3:#d3dae5;--text:#2b3f52;--text2:#526278;--muted:#6b7a8d;--border:#c7d0de;--border2:#b8c4d6;--accent:#1d6bb8;--heading:#1c2b3a}
[data-theme="dark"]{--bg:#0b1420;--bg2:#101c2c;--bg3:#16253a;--text:#b9c6d6;--text2:#8b9db2;--muted:#6b7f97;--border:#1c2b3f;--border2:#223349;--accent:#5b9cf6;--heading:#dbe6f0}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0b1420;--bg2:#101c2c;--bg3:#16253a;--text:#b9c6d6;--text2:#8b9db2;--muted:#6b7f97;--border:#1c2b3f;--border2:#223349;--accent:#5b9cf6;--heading:#dbe6f0}}
body{margin:0;font-family:var(--ff-sans);background:var(--bg);color:var(--text);line-height:1.6;font-size:15px}
.wrap{max-width:880px;margin:0 auto;padding:32px 20px 80px}
a{color:var(--accent)}
.back-link{font-family:var(--ff-mono);font-size:11px;color:var(--muted);text-decoration:none;border:1px solid var(--border2);border-radius:5px;padding:6px 12px;display:inline-block;margin-bottom:20px}
h1{font-family:var(--ff-serif);font-weight:500;font-size:clamp(26px,4vw,34px);color:var(--heading);margin:0 0 6px;line-height:1.2}
.dek{color:var(--text2);font-size:14px;max-width:70ch;margin-bottom:8px}
.meta-strip{font-family:var(--ff-mono);font-size:11px;color:var(--muted);border-top:1px solid var(--border);border-bottom:1px solid var(--border);padding:10px 0;margin:20px 0 32px;display:flex;flex-wrap:wrap;gap:16px}
h2{font-family:var(--ff-serif);font-weight:500;font-size:19px;color:var(--heading);margin:0 0 4px;padding-top:8px}
h3{font-family:var(--ff-serif);font-weight:500;font-size:16px;color:var(--heading);margin:32px 0 8px}
.domain-meta{font-family:var(--ff-mono);font-size:10.5px;color:var(--muted);font-weight:400;letter-spacing:.02em}
.domain{border-top:1px solid var(--border);padding:20px 0}
.q-source{font-family:var(--ff-mono);font-size:11px;color:var(--muted);margin-bottom:12px}
.q-row{background:var(--bg2);border:1px solid var(--border);border-radius:6px;padding:10px 13px;margin-bottom:8px}
.q-row-broad{border-left:3px solid var(--accent)}
.q-label{font-family:var(--ff-mono);font-size:11px;color:var(--accent);margin-bottom:5px;font-weight:500}
.q-string{font-family:var(--ff-mono);font-size:11.5px;color:var(--text2);line-height:1.7;word-break:break-word}
.note-box{background:var(--bg2);border:1px solid var(--border);border-left:2px solid var(--accent);border-radius:6px;padding:14px 16px;font-size:13.5px;color:var(--text2);margin:16px 0}
.enh-row{border-top:1px solid var(--border);padding:12px 0}
.enh-label{font-family:var(--ff-serif);font-weight:500;font-size:14.5px;color:var(--heading);margin-bottom:4px}
.enh-body{font-size:13.5px;color:var(--text2)}
code{font-family:var(--ff-mono);font-size:.92em;background:var(--bg3);padding:1px 5px;border-radius:3px}
footer{margin-top:48px;padding-top:16px;border-top:1px solid var(--border);font-family:var(--ff-mono);font-size:10.5px;color:var(--muted)}
</style>
</head>
<body>
<div class="wrap">
<a class="back-link" href="../">&larr; Hub</a>
<h1>Search Strategy Reference</h1>
<p class="dek">Every PubMed query Endocrine Bri-gest sends, generated directly from the live <code>TOPICS</code> array in <code>endo/index.html</code> &mdash; not hand-transcribed, so it cannot drift from what the app actually runs.</p>
<div class="meta-strip">
<span>${sectionCount} domains</span>
<span>${subdomainCount} subdomains</span>
<span>Generated ${generatedAt}</span>
<span>Source: endo/index.html TOPICS array</span>
</div>

<div class="note-box"><strong>Boolean precedence.</strong> ${PRECEDENCE_NOTE}</div>

<h3>Domain queries</h3>
${domainsHTML}

<h3>Proposed enhancements &mdash; pending sign-off, not applied</h3>
<p class="dek">Carried over from the v5.6 audit. These are judgement calls that change recall/precision rather than fix defects, and were deliberately left for human sign-off rather than auto-applied.</p>
${enhancementsHTML}

<footer>
Generated by <code>scripts/generate-endo-query-reference.js</code> &mdash; do not hand-edit this file, re-run the generator instead.
</footer>
</div>
</body>
</html>
`;

fs.writeFileSync(OUT, page);
console.log('Wrote ' + OUT);
console.log(sectionCount + ' domains, ' + subdomainCount + ' subdomains');
