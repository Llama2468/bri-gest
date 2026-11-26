# Endocrine Year-in-Review Engine: Build Specification

**Version:** 0.7 (27 Nov 2026). It records the state of play and hands over to Claude Code for steps 3–7 of iteration 1. There are no design changes from 0.6.
**Date:** 2026-11-26
**Owner:** Brian Corley
**Builder:** Claude Code
**Companion docs:**

- *Paper salience scoring: a defensible framework* (Claude Docs). It gives the rationale and references for section 6.
- `yir-pilot-data.json`: 83 included, 26 excluded, 109 screened.
- The "Endocrine Year in Review 2026" prototype artifact (pilot v0.1.1), the UI reference.

**Relationship to atlas:** this implements pipeline milestone **M5.2**. It inherits the M5 invariant: LLM-extracted content is `unvetted` until approved, and nothing writes to atlas nodes automatically.

## Status and handover (27 Nov 2026)

**Where things stand**

| Item | State | Where |
|---|---|---|
| Pilot page | **Live** at https://llama2468.github.io/bri-gest/yir/ (`yir-v0.1-pilot`). It uses pilot scoring, not C/S/A, and is not linked from the hub. | `yir/index.html` (built from `yir-engine/template/index.src.html` + `tests/fixtures/pilot_83.json`) |
| Iteration 1, step 1: models, config, journal sync | **Done** | `src/yir/models.py`, `src/yir/journals.py`, `config/*.yaml` |
| Iteration 1, step 2: C/S/A scoring + sensitivity | **Done.** Checkpoint reviewed and accepted by Brian on 27 Nov 2026. | `src/yir/score.py`, `src/yir/sensitivity.py`, `src/yir/checkpoint.py`, `tests/golden/checkpoint_10.json` |
| Tests | 17 passing, all offline. CI runs ruff + pytest on `yir-engine/**` (`.github/workflows/yir-engine-tests.yml`). | `tests/` |
| Iteration 1, steps 3–7 | **Not started.** Handed to Claude Code (section 13). | — |

**Checkpoint result** (10 hand-filled pilot papers, `python -m yir.checkpoint`): effective importance C 55%, S 44%, A 1%. No dominance or collinearity warnings. The pilot's problem, where relevance explained ~77% of rank variance, is resolved. A carries ~1% because there are no citations yet and the journal prior barely varies within tier A. This is accepted for a current-year review and expected to rise as citations accrue.

**Accepted at the checkpoint**

- The 10 salience ratings in `tests/fixtures/appraisal_10.json` stand as the **test fixture** (proposed by Claude, accepted by Brian). They are not a calibration set: the 50-paper rater-agreement study (section 10) is separate.
- A non-GRADE guideline or consensus starts at credibility **0.6** (e.g. ADA/EASD 2026 → C = 0.60).
- **Interim attention prior:** J = impact-factor percentile within the Bri-gest journal list (`attention.journal_prior_source: if_percentile_within_brigest`). Replacing it with SJR category percentiles (`config/journals_sjr.csv`) is part of step 5.

**Constraints Claude Code needs to know**

- The pilot was built in a sandbox with no network access to PubMed, OpenAlex or Anthropic. Steps 3–7 need network access and the keys in `.env.example`. Live runs are CLI commands; tests stay offline.
- Step 3 needs **recorded PubMed XML fixtures**, which don't exist yet. First write `scripts/record_fixtures.py`. It is the one live-network script: efetch XML for the 83 pilot PMIDs plus ~10 Mendelian randomisation decoys and ~5 erratum/comment records, saved to `tests/fixtures/raw_xml/`. Run it once with `NCBI_API_KEY`, then commit the XML.
- CI ruff runs the current default rule set, which is stricter than older ruff. Use `X | None`, not `Optional[X]` (UP045). Use `re.DOTALL`, not `re.S`. Prefer dict literals over `dict()`. Use `int(np.rint(x))` for numpy rounding.
- Bri-gest repo rules still apply: whole-file rewrites for tool HTML, `yir_*` storage keys, no `?.`/`??` in page JS, a single delegated `data-action` listener, `esc()` on all data strings. The page template already follows them. Keep it that way when step 6 generates `../yir/index.html`.

### Changes from 0.6

- A status and handover section; the §13 kickoff now resumes at step 3; §14 is updated. No design changes.

### Changes from 0.5

- **Evidence-graph layer (section 6a).** It uses the atlas's existing graph rather than building a new store.
  - **Iteration 1** captures stable identifiers on every paper: trial registry IDs, MeSH descriptor UIs, ATC codes for interventions.
  - **Iteration 2** adds trial/programme families, an optional programme cap, and proposed atlas evidence edges (`supports`, `contradicts`, `extends`, `supersedes`). These go through the M5 review queue.
  - **Later:** theme clustering and novelty hints.
- **New schema fields:** `ids`, `family`. There are two new tests.

### Changes from 0.4

- **Front Endocrinol cap.** At most **15 Front Endocrinol papers in each top 100**, applied during Stage 1 selection. The cap is configurable for any journal (section 1a).
- **Hosting.** YIR lives at **`/yir/` in the Bri-gest repo**, served at `https://llama2468.github.io/bri-gest/yir/`. The pipeline code sits in `bri-gest/yir-engine/` (section 12).
- **Housekeeping.** The kickoff prompt now references v0.5. Iteration 1 builds in `public` display mode.

### Changes from 0.3

- **Journal list.** The list is now the Bri-gest `JOURNAL_GROUPS` (`endo/index.html` in `Llama2468/bri-gest`): 32 journals in 6 groups. It is mirrored to `config/journals.yaml`, with a sync test (section 2).
- **Specialty journals opened.** This includes *Front Endocrinol (Lausanne)*, which on its own yields ~311 eligible-design records in 2026 to date. That makes the Endocrinology top 100 genuinely selective, but it needs a stricter credibility start for meta-analyses of observational studies (section 6.1).
- **Hosting decided: public.** The licence-gated abstract rule in section 7a is active.
- **Streams confirmed.** Obesity, lipids and GDM sit in Diabetes & Metabolism.

### Changes from 0.2

- **Two streams.** Output is capped at the **top 100 Diabetes & Metabolism** papers and the **top 100 Endocrinology** papers (all other domains), each ranked separately (section 1a).
- **Two-stage ranking.** Candidates are scored on C, S and the journal prior J. Then exactly **one OpenAlex call per stream** (100 DOIs each, 2 calls in total) enriches the finalists with citations, OA status and licence.
- **Full abstracts on cards.** The PubMed abstract appears with its structured sections, PubMed, DOI and PMC links, and NLM attribution. A licence-aware display rule applies for public hosting (section 7a).
- **New pilot lesson.** The title/abstract fallback `randomized[tiab]` pulls in Mendelian randomisation studies (section 8).

### Changes from 0.1

- The single composite score is replaced by three constructs (Credibility, Salience, Attention), aggregated by a weighted geometric mean, with rank intervals.
- New fields for appraisal (credibility), 7-point salience ratings and attention enrichment.
- New modules: `appraise` (inside classify), `enrich`, `score`, `sensitivity`, `validate`, `review`.
- Feasibility budget for 500–1,000 papers (section 0).
- Iteration-1 scope, repo layout and Claude Code kickoff (sections 11–13).

---

## 0. Feasibility at 500–1,000 papers per year

**Verdict: feasible.** Ranking and sensitivity analysis are computationally trivial. The cost sits in three places: the LLM appraisal pass, API enrichment, and human confirmation of salience.

| Stage | Volume for 1,000 papers | Calls | Expected runtime | Notes |
|---|---|---|---|---|
| Harvest (E-utilities) | ~1,500 candidates → ~1,000 included | ~10 esearch + ~8 efetch (200 IDs each) | < 2 min | NCBI API key gives 10 req/s |
| Rules pass | 1,000 | local | seconds | |
| LLM classify + appraise | 1,000 × (~2k input + ~500 output tokens) ≈ 2M in / 0.5M out | 1,000 requests | Batch API: hours, asynchronous. Live: ~20–40 min at modest concurrency | Cache the system prompt (rubric and vocabularies). Use the Message Batches API for the annual backfill, and live calls for weekly increments (~20–40 papers). Check current API pricing before the first full run. |
| OpenAlex enrichment | **200 finalist DOIs (100 per stream)** | **2 calls** (100 DOIs per call, `per_page=100`) | seconds | Needs a free API key. Free daily budget; 100 OR-values per filter. See section 3. Optional boundary buffer: a third and fourth call for ranks 101–150 (section 1a). |
| iCite enrichment | 1,000 PMIDs | 3–5 calls (≤ 400 PMIDs, conservative) | < 1 min | RCR, `cited_by_clin`, APT |
| SJR journal percentiles | ~20 journals | 1 annual CSV in config | — | Static, refreshed yearly |
| Score + sensitivity | 1,000 papers × 5,000 Monte Carlo draws | numpy, vectorised | < 5 s | |
| Human salience confirmation | Triage set (section 6.5) ≈ 120–160 papers across both streams | review CSV | ~1–1.5 h a year at ~30 s per paper | Confirming all 1,000 papers would take ~8 h. Not required. |

The design rule follows: **the LLM proposes everything, and the human confirms only where it changes the ranking.** That means the top of the list, papers near the cut, and a random calibration sample.

---

## 1. Purpose

Produce a searchable, filterable annual (and rolling) review of high-yield endocrine evidence from a defined journal set. Each paper is organised by:

- domain (12 atlas domains + `lipids`)
- question type
- study design
- journal tier

Each paper also gets a **three-construct profile** (C, S, A) with an optional composite and its rank band. A one-line take-home carries an epistemic tier label.

## 1a. Two streams and the top-100 cap

### Stream assignment

Streams are assigned by the paper's primary `domain`. A paper never appears in both streams. Its secondary domains still show as tags.

| Stream | Domains | Expected eligible pool, 2026 YTD (PubMed counts, 26 Nov 2026) |
|---|---|---|
| **Diabetes & Metabolism** | `diabetes_metabolism`, `obesity_metabolic`, `lipids`, plus `pregnancy_endocrinology` where the topic is GDM or pre-existing diabetes in pregnancy | Bri-gest Diabetes & Metabolism journals + JCEM + Front Endocrinol, strict design filter, diabetes/obesity/dyslipidaemia as MeSH major topics: **352** in 2026 to date. Add ~52 from the general journals plus a few from the cardiovascular journals → ~400–450 before exclusions, or ~450–500 a year. The top 100 is about the top fifth. |
| **Endocrinology** | `thyroid`, `pituitary`, `adrenal`, `bone_calcium`, `reproductive_endocrinology`, `neuroendocrine`, `genetics`, `acute_endocrinology`, `research_qi`, other `pregnancy_endocrinology` | Bri-gest Endocrinology and Bone & Mineral journals + JCEM + Lancet D&E, strict design filter, excluding diabetes/obesity as MeSH major topics: **265** in 2026 to date. Add ~10–15 from the general and oncology journals → ~250–300 after exclusions, or ~280–320 a year. The top 100 is about the top third. Front Endocrinol is a large share of this pool (section 6.1). |

**Confirmed by Brian (26 Nov 2026):** obesity, lipids and GDM, including pre-existing diabetes in pregnancy, belong to Diabetes & Metabolism.

**Journal volume caveat:** *Front Endocrinol (Lausanne)* is an open-access mega-journal. Its 311 eligible-design records in 2026 to date outnumber all the other endocrine specialty journals combined. Many are meta-analyses of observational studies or Mendelian randomisation work. Section 6.1 handles quality through credibility. **Volume is handled by a hard cap of 15 Front Endocrinol papers per top 100** (decided 26 Nov 2026), so the list can't be dominated by one mega-journal even where its papers score well. The run report must show each journal's share of the candidate pool and of the final top 100, so any skew is visible.

### Two-stage selection

1. **Stage 1, the whole candidate pool for each stream.** Run the LLM pass, then compute C and S. Set A₀ = J, the journal SJR percentile from the static config table, with no API call. Then:
   - Score1 = geometric composite of C, S and A₀, using the section 6.4 weights.
   - Take the **top 100** per stream by Score1, subject to the **journal caps** in `config/corpus.yaml` (`journal_caps: {"Front Endocrinol (Lausanne)": 15}`). Fill in rank order. Once a capped journal reaches its limit, skip its further papers and take the next eligible paper instead. List the skipped papers in the run report, with Stage 1 rank and score, so you can see what the cap displaced.
   - Also report the boundary set, ranks 90–120, with their Stage 1 rank bands.
2. **Stage 2, finalists only.**
   - **One OpenAlex call per stream** (100 DOIs, `filter=doi:a|b|…`, `per_page=100`, `select=doi,cited_by_count,publication_date,open_access,primary_location,best_oa_location`). That gives citations, OA status and licence.
   - **One iCite call per stream** (100 PMIDs) for RCR, APT and `cited_by_clin`. This is optional in iteration 1.
   - Compute A = λ·K + (1 − λ)·J and the final composite. Re-rank within the 100, and run the sensitivity analysis on the final set.

**Why it's defensible:**

- For papers under 12 months old, λ is small. At the median 2026 paper's age of ~5 months, λ ≈ 0.3, so J carries ~70% of A. Article citations would rarely move a paper across the 100 line.
- The boundary report makes any such case visible.
- If you want a buffer, fetch ranks 101–150 as well, at one extra call per stream. Promote a paper if its final composite beats the 100th.

**Caveat:** citations cannot rescue a paper that Stage 1 placed below 150. That is acceptable only because J dominates A at this age. Revisit this if the window is ever more than 18 months.

## 2. Scope parameters (versioned in `config/corpus.yaml`)

Unchanged from 0.1:

- Entrez date (`[edat]`) window.
- Design filter: `[pt]` OR the title/abstract fallback.
- Logged exclusion rules.
- Full text is not an inclusion criterion.
- `[majr]` endocrine filter on the general journals, with an oncology post-filter and a recent-record `[tiab]` safety net.

### Journal list (source of truth: Bri-gest)

The journal list mirrors `JOURNAL_GROUPS` in `Llama2468/bri-gest/endo/index.html`. It is copied to `config/journals.yaml`, and a test checks the two match. A change to the Bri-gest selector must therefore be a deliberate change here too.

| Bri-gest group | Journals (NLM abbreviation) | Filter route |
|---|---|---|
| General High-Impact | N Engl J Med, Lancet, JAMA, BMJ, Nat Med, Ann Intern Med, JAMA Intern Med | Endocrine MeSH major-topic filter (section 2, unchanged) |
| Diabetes & Metabolism | Lancet Diabetes Endocrinol, Diabetes Care, Diabetologia, Diabetes, Metabolism, J Clin Endocrinol Metab, Obes Rev, Obesity (Silver Spring) | All eligible designs. Stream by domain. |
| Endocrinology | Endocr Rev, Eur J Endocrinol, Clin Endocrinol (Oxf), Endocrinology, Front Endocrinol (Lausanne), Thyroid, Neuroendocrinology | All eligible designs. Stream by domain. |
| Bone & Mineral | J Bone Miner Res, Osteoporos Int, Bone, Calcif Tissue Int | All eligible designs. Endocrinology stream. |
| Cardiovascular | Eur Heart J, Circulation, J Am Coll Cardiol | MeSH major topic must include Diabetes Mellitus, Obesity, Dyslipidemias or an Endocrine System Disease. Mostly lands in Diabetes & Metabolism. |
| Oncology | J Clin Oncol, JAMA Oncol, Ann Oncol | MeSH major topic must be an endocrine-gland neoplasm (thyroid, adrenal, pituitary, parathyroid, neuroendocrine tumours, MEN). Endocrinology stream. |

Bri-gest's hard-coded impact factors are used for **display only** (the "IF ≥ x" chips match Bri-gest). The attention prior J uses SJR percentiles (section 6.3). Tier never enters credibility.

**Expected near-empty sources:** Endocrinology (the journal) and Neuroendocrinology publish mostly basic science, so few records pass the design filter. That is expected and not a fault.

## 3. Architecture

```
yir run --window 2026 [--incremental]          (CLI; GitHub Actions weekly in iteration 2)
  harvest     E-utilities esearch/efetch (XML) → raw/*.xml (cached, immutable)
  dedupe      DOI→PMID; co-publication merge; errata/comments → excluded log
  rules       design class, phase, n, registry IDs, funding sentence, MeSH→domain prior, outcome-type hints
  classify    LLM (JSON schema): taxonomy, take, result, flags, APPRAISAL fields, SALIENCE proposals
  stream      assign diabetes_metabolism | endocrinology by primary domain (section 1a)
  select      Stage 1: C, S, A0=J → top 100 per stream + boundary report (ranks 90–120)
  enrich      Stage 2: finalists only — OpenAlex 1 call/stream (cites, OA, licence); iCite 1 call/stream (RCR, APT, cited_by_clin)
  score       final C, S, A per finalist → composite (geometric default) → effective-importance report
  sensitivity Monte Carlo rank bands; flags papers whose band crosses the top-N line
  review      triage queue → human confirm/override (CSV round-trip in iteration 1; web form later)
  build       data/yir.json → site/ (prototype HTML as template)
  validate    (iteration 2) back-test against guideline uptake; rater-agreement report
```

**API notes, to verify at build time:**

- **OpenAlex** requires an API key with a free daily usage budget ([authentication docs](https://developers.openalex.org/api-reference/authentication)). It allows up to 100 values per OR filter and 100 per page ([filtering](https://help.openalex.org/api/filtering.md)). Batch DOIs, and back off exponentially on 429.
- **iCite** accepts comma-separated PMIDs at `/api/pubs?pmids=…` and returns fields including `relative_citation_ratio`, `apt` and `cited_by_clin` ([iCite API](https://support.icite.nih.gov/hc/en-us/articles/9513563045787-Bulk-Data-and-API)). It now gives RCR even for very recent papers ([release notes](https://support.icite.nih.gov/hc/en-us/articles/9513782003867-Release-Notes)). Treat RCR under 12 months as provisional.
- All keys come from environment variables or GitHub secrets. Nothing is committed.

## 4. Record schema (`paper`): additions in bold

```json
{
  "pmid": "", "doi": "", "title": "", "acronym": null, "journal": "", "tier": "A|B|C",
  "epub": "YYYY-MM-DD", "date_note": null, "design": "", "dclass": "guideline|sr_ma|rct|rct_p2|secondary",
  "phase": null, "n": null, "followup_wk": null,
  "domain": "", "domains2": [], "qtype": "", "tags": [], "take": "", "result": "",
  "cross_trial": false, "industry": null, "co_published": null, "oa_status": null,
  "stream": "diabetes_metabolism|endocrinology",
  "abstract": {
    "sections": [{"label": "BACKGROUND", "text": "..."}],
    "copyright": "string from <CopyrightInformation> or null",
    "source": "PubMed efetch", "fetched_at": "ISO-8601"
  },
  "license": "cc-by|cc-by-nc|...|publisher-specific-oa|other-oa|null (OpenAlex primary_location.license, else best_oa_location.license)",
  "links": {"pubmed": "https://pubmed.ncbi.nlm.nih.gov/<pmid>/", "doi": "https://doi.org/<doi>", "pmc": "https://pmc.ncbi.nlm.nih.gov/articles/<pmcid>/ | null", "oa_url": "null|url"},
  "stage1": {"score": 0.0, "rank": 0, "rank_lo": 0, "rank_hi": 0},
  "ids": {
    "registry": ["NCT01234567", "ISRCTN…", "ChiCTR…", "jRCT…", "EUCT/EudraCT…"],
    "mesh_major": [{"ui": "D003924", "term": "Diabetes Mellitus, Type 2"}],
    "interventions": [{"name": "orforglipron", "atc": "A10BJ (class-level if no substance code)", "source": "rules|llm"}],
    "pmcid": null
  },
  "family": {"trial_key": "NCT… or acronym-root", "programme": "e.g. orforglipron|cagrisema|null", "role": "primary|secondary|pooled|extension|null"},

  "appraisal": {
    "outcome_type": "hard|validated_surrogate|unvalidated_surrogate|na",
    "analysis": "primary|secondary|post_hoc|na",
    "masking": "blinded|open_objective|open_subjective|na",
    "events": null,
    "guideline_method": "grade|other|none|na",
    "sr_included_designs": "rct|mixed|observational|na",
    "sr_registered": "yes|no|na",
    "sr_certainty_rating": "yes|no|na",
    "evidence_quote": "≤25-word span from abstract supporting outcome_type/analysis"
  },
  "salience": {
    "relevance_7": 1, "newsworthy_7": 1, "nz_available": "funded|registered|neither|unknown",
    "rationale": "≤30 words", "proposed_by": "llm:<model-id>", "confirmed_by": null, "confirmed_at": null,
    "llm_original": {"relevance_7": 1, "newsworthy_7": 1}
  },
  "attention": {
    "journal_pct": null, "cites": null, "cites_pct_cohort": null, "rcr": null,
    "apt": null, "cited_by_clin": null, "altmetric": null, "fetched_at": null
  },
  "scores": {
    "C": 0.0, "S": 0.0, "A": 0.0, "composite": 0.0,
    "rank": 0, "rank_lo": 0, "rank_hi": 0, "p_topN": 0.0, "scoring_version": "0.2.0"
  },

  "status": "unvetted|vetted|rejected", "atlas_nodes": [], "review_note": null
}
```

The legacy `relevance` (1–3) stays as a derived display label:

- relevance_7 ≥ 6 → practice-changing
- 4–5 → practice-informing
- ≤ 3 → pipeline/hypothesis

## 5. LLM classification and appraisal contract

**One call per paper.** The input is title, abstract, MeSH, publication types and the rules-pass output. The output is strict JSON validated against `schema/paper_llm.json`. Retry once on schema failure, then send the paper to the review queue.

**Required outputs:**

- the taxonomy fields
- `take`, `result`, `cross_trial`, `industry`
- the `appraisal.*` fields, with `evidence_quote`
- `salience.relevance_7`, `salience.newsworthy_7`, `salience.rationale`

`nz_available` comes from `config/nz_access.yaml`, not from the LLM.

**Salience rubric** (in the cached system prompt; adapted from the McMaster PLUS scales):

| Score | Relevance to an adult endocrinology/diabetes specialist in NZ | Newsworthiness |
|---|---|---|
| 7 | Directly changes a common decision now | Major new information most specialists won't know |
| 5–6 | Pertinent to a common decision; may change practice in a subgroup | Important update or a confirmatory trial with a new population or comparator |
| 3–4 | Pertinent to an uncommon condition, or practice-informing only | Incremental (dose-finding, regional replication) |
| 1–2 | Background, pipeline, or methods only | Already known or unlikely to matter |

**Validation guards (code, not prompt):**

1. Every number in `result` appears in the abstract.
2. `evidence_quote` is a verbatim substring of the abstract.
3. `analysis = post_hoc` is forced when the title or abstract matches `/post[- ]hoc|exploratory/i`.
4. A take-home that names an agent not studied in the trial sets `cross_trial = true`.

**Models:**

- One Sonnet-class model for the whole call in iteration 1, for simplicity.
- Log `proposed_by` with the exact model ID.
- Record per-run token usage in `runs/<date>.json`.

## 6. Scoring framework

All constants live in `config/scoring.yaml`. They are approximate and tunable, not derived.

### 6.1 Credibility C ∈ [0.2, 1]

C is the design starting level minus the downgrades, floored at 0.2. Journal identity never enters C.

```yaml
credibility:
  start: {sr_ma_of_rcts: 1.0, sr_ma_mixed: 0.7, sr_ma_observational: 0.5,
          guideline_grade: 1.0, rct_phase3: 0.85, rct_pragmatic: 0.85,
          guideline_other: 0.6, rct_phase2: 0.6, rct_mechanistic: 0.6, secondary: 0.6}
  outcome: {hard: 0.0, validated_surrogate: -0.10, unvalidated_surrogate: -0.20, na: 0.0}
  analysis: {primary: 0.0, secondary: -0.05, post_hoc: -0.10, na: 0.0}
  precision: [{min_n: 1000, adj: 0.0}, {min_events: 300, adj: 0.0}, {min_n: 100, adj: -0.05}, {min_n: 0, adj: -0.10}]
  masking: {blinded: 0.0, open_objective: 0.0, open_subjective: -0.10, na: 0.0}
  sr_ma: {unregistered: -0.10, no_certainty_rating: -0.05}   # applies only to sr_ma_*; PROSPERO/registration and GRADE-type certainty
  floor: 0.2
```

**Why the meta-analysis split:** in 0.2, every SR/MA started at 1.0. With Front Endocrinol in the pool, that would let unregistered meta-analyses of observational studies outrank phase 3 RCTs on credibility. Now:

- an unregistered MA of observational studies with no certainty rating scores 0.5 − 0.10 − 0.05 = 0.35
- a registered, GRADE-rated MA of RCTs keeps 1.0

Mendelian randomisation studies are excluded upstream (section 8, lesson 9).

`validated_surrogate` is a whitelist in config: HbA1c, BMD, UACR, eGFR slope, LDL-C, body weight for obesity trials. Anything else counts as `unvalidated`.

### 6.2 Salience S ∈ [0, 1]

```
S = ((relevance_7 + newsworthy_7) / 2 − 1) / 6  ×  m_nz
m_nz = 1.0 if funded|registered, 0.85 if neither, 1.0 if unknown (flag)
```

Confirmed values override the LLM proposal. `llm_original` is kept for calibration.

### 6.3 Attention A ∈ [0, 1]

```
J = journal SJR percentile within its SCImago category (config/journals_sjr.csv)
K = article citation percentile within its journal × publication-month cohort (OpenAlex);
    switches to the RCR percentile within the corpus once RCR exists and the paper is ≥ 12 months old
λ = m / (m + 12),  m = months since epub
A = λ·K + (1 − λ)·J
```

Altmetric and downloads are stored as a separate `public_attention` facet, with weight 0 by default.

### 6.4 Composite and robustness

```
composite = 100 × C^(w_C/W) · S^(w_S/W) · A^(w_A/W),  W = w_C + w_S + w_A
defaults: w_C = 1.0, w_S = 1.5, w_A = 0.5      (re-fit in iteration 2 from the back-test)
toggle:   arithmetic mean (for comparison)
```

- **Sensitivity.** Run 5,000 draws, each weight drawn log-uniform between ×0.5 and ×2, with aggregation geometric or arithmetic at 50/50. Store `rank` (at default weights), `rank_lo`/`rank_hi` (2.5th/97.5th percentile) and `p_topN` (N = 20 by default). Seed the draws so output is reproducible.
- **Effective importance.** Report each construct's normalised squared Spearman correlation with the composite. Warn when any construct exceeds 60%.
- **Multicollinearity check.** Warn if any pair of constructs has |Spearman| > 0.7.

### 6.5 Human triage (what gets confirmed)

Triage runs per stream, on the Stage 1 ranking, before Stage 2. A paper enters the review queue if any of these holds:

- (a) Stage 1 `rank_lo` ≤ 20, so it is a top-20 contender
- (b) its Stage 1 rank band crosses 100 (the boundary set, roughly ranks 90–120)
- (c) relevance_7 ≥ 6 or newsworthy_7 ≥ 6
- (d) it's in the 25-paper random calibration sample per stream (drawn once per year, seeded)
- (e) a schema guard failed

Expect about 60–80 papers per stream. Confirmed salience feeds back into Stage 1 before finalists are locked.

Iteration 1 reviews by CSV round-trip: `review/queue.csv` goes out, the edited CSV is ingested, and it's merged with an audit trail.

## 6a. Evidence-graph layer (identifiers now, graph in iteration 2)

**Principle.** The atlas already is a knowledge graph: per-node files, typed node-to-node edges in `edges/edges.json`, and the M4 query module. YIR doesn't build a second graph store. It adds paper-level entities and **paper → atlas node** evidence edges that the atlas can consume.

- No graph database. ~1,000 papers a year plus a few hundred atlas nodes is small enough for JSON edge lists and `networkx`.
- Every edge is either **deterministic**, resting on an identifier, or **human-vetted**. Free-text relation extraction at scale is excluded.

### 6a.1 Iteration 1: capture identifiers (cheap now, costly to retrofit)

| Identifier | Source | Rule |
|---|---|---|
| Trial registry IDs | PubMed XML `<DataBankList>` / `<AccessionNumber>` plus a regex on the abstract (NCT, ISRCTN, ChiCTR, jRCT, EUCT/EudraCT, ACTRN) | Deterministic. Normalise to upper case, deduplicate. |
| MeSH descriptor UIs | PubMed XML `<MeshHeading>` with `UI` and `MajorTopicYN` | Deterministic. Keep majors only in `ids.mesh_major`. |
| Interventions + ATC | LLM names the intervention. The ATC code comes from `config/atc_map.yaml` (manual map, class level allowed) | The LLM never invents codes. An unmapped name stays `atc: null` and is listed in the run report for map maintenance. |
| PMCID | PubMed XML `<ArticleIdList>` | Deterministic. |

### 6a.2 Iteration 2: trial and programme families

- **`family.trial_key`.** Use the first registry ID. If there is none, use the normalised acronym root (e.g. `SELECT`, `SURPASS-CVOT`).
- **`family.role`.** The paper whose title or abstract reports the primary endpoint is `primary`. Secondary, prespecified or post hoc reports are `secondary`. Pooled analyses are `pooled`. Use title/abstract regex and the existing `analysis` field.
- **`family.programme`.** Every paper sharing an intervention substance plus a sponsor-named phase 3 programme, from `config/programmes.yaml` (e.g. orforglipron: ATTAIN*/ACHIEVE*; CagriSema: REDEFINE*/REIMAGINE*).
- **UI.** Papers from one trial show as **one family card**: the primary paper on top, secondary papers listed under it. Each keeps its own score.
- **Optional programme cap.** In `config/corpus.yaml`, e.g. `programme_caps: {default: null}`, it works like the journal cap. In the pilot, the orforglipron programme supplied 7 of 83 papers and CagriSema 5. *Off by default; a decision for after the first full run.*

### 6a.3 Iteration 2: atlas evidence edges (feeds M5)

The atlas has no paper → node relation today; all its edge types are node → node. This proposes a new **evidence-edge** record, stored in YIR (`data/evidence_edges.json`) and imported into the atlas only after vetting:

```json
{"paper": "PMID", "node": "atlas_node_id", "relation": "supports|contradicts|extends|supersedes",
 "claim": "≤30 words: which node statement this bears on", "evidence_quote": "verbatim abstract span",
 "proposed_by": "llm:<model-id>", "status": "unvetted|vetted|rejected", "reviewed_by": null, "reviewed_at": null}
```

- **Candidate generation.** Match the paper's MeSH UIs, ATC codes and domain against atlas node tags. Then the LLM proposes a relation only for matched pairs. That gives at most 3 candidate nodes per paper, which bounds both cost and hallucination.
- **On vetting:**
  - `contradicts` or `supersedes` sets the atlas node's `reviewStatus: due_review`, or `contested` if it already has a controversy entry.
  - `supports` or `extends` appends to the node's `evidenceDossier` refs through the existing atlas pipeline (`repair.py → build-refs.py → build-edges.py → build-index.py → validate.py`).
- **Proposed atlas schema addition.** It is listed here so the atlas repo can adopt it deliberately: an `evidenceEdges` vocabulary with the four relations above, distinct from the node-to-node `edgeType` list.

### 6a.4 Later

- **Theme clustering.** Communities in the paper × intervention-class × condition graph seed the Themes auto-draft (open decision 3).
- **Novelty hint.** The first appearance of an intervention–condition pair in the corpus (e.g. semaglutide × alcohol use disorder) is shown to the human salience rater as a hint. It is **not** a score term, because novel isn't the same as important.
- **Validation edges.** Guideline → cites → paper edges, collected for the iteration-2 back-test, are stored in the same edge list year on year.

## 7. Front end (prototype architecture plus the following)

- The site has two tabs, Diabetes & Metabolism and Endocrinology, each with its own map, top-100 list and boundary note.
- Each card shows a three-bar profile (C, S, A), the composite and its rank band ("rank 4 (3–7)"). Flags show as chips: industry, cross-trial, negative trial, unconfirmed salience.
- Sort by C, S, A, composite or date. An aggregation toggle switches between geometric and arithmetic.
- The weight panel shows sliders with effective importance beside each, and warns above 60%.
- The Method tab shows the formulas, the credibility table, the salience rubric, the journal-percentile refresh date, the run log and the excluded log.
- Also in this build: OA facet, atlas-node links, year selector, "copy as citation list", "new since last visit".

## 7a. Abstracts on cards

**Content.** Each card gets a "Read abstract" toggle. It shows the PubMed abstract as retrieved, with its structured section labels (Background, Methods, Findings, Interpretation, Funding) kept as headings.

- The editorial take-home and the "Reported" result stay above the toggle.
- They are visibly separated from the abstract, so the reader can tell synthesis from source.
- The abstract is harvested in the existing efetch step, so it costs no extra calls.

**Links on every card:**

- PubMed
- DOI (publisher)
- PMC full text, when a PMCID exists
- OpenAlex `oa_url`, when the paper is open access

Each link is labelled with its destination. The site footer and the Method tab carry the attribution: "Abstracts and bibliographic data from MEDLINE®/PubMed®, a database of the U.S. National Library of Medicine." The site must also state the date the data were retrieved.

**Copyright.** NLM does not hold copyright on PubMed abstracts. Publishers have given NLM permission, and NLM tells users to take legal advice for any use they plan ([NLM: Abstract element](https://dtd.nlm.nih.gov/ncbi/pubmed/doc/out/240101/el-Abstract.html)). NLM's data licence asks that reuse of third-party abstracts be guided by fair use ([NLM licence](https://www.nlm.nih.gov/databases/license/weblic/)). The build therefore uses a display mode in `config/site.yaml`:

| Mode | When | Abstract shown |
|---|---|---|
| `private` | Site not publicly indexed: local, password-protected, or a private GitHub Pages / intranet | Full abstract for every paper |
| **`public` (selected by Brian, 26 Nov 2026)** | Publicly hosted | Full abstract only where the OpenAlex licence is a CC licence or public domain (`cc-*`, `public-domain`). Otherwise the card shows the structured result, the take-home, and the PubMed and DOI links (the PubMed page shows the abstract). |

The OpenAlex call that already runs in Stage 2 returns the licence on each location, so this rule needs no extra calls. Check `primary_location.license` first, then `best_oa_location.license` ([OpenAlex location object](https://docs.openalex.org/api-entities/works/work-object/location-object)). I'm not a lawyer. Get local advice before launch; the University of Otago library is a sensible first stop.

**Consistency with Bri-gest:** the Bri-gest endo page currently describes itself as showing "Abstracts verbatim" for all papers, publicly. If YIR adopts the licence gate, decide whether Bri-gest should follow the same rule, so the two sites take one position (open decision 5).

**Expected share shown in full:** OA status and licence come from the Stage 2 OpenAlex call. Fully OA journals (Front Endocrinol, many Nat Commun-type venues) will mostly show full abstracts. Subscription flagships (NEJM, Lancet, Diabetes Care) will mostly show the structured result plus a PubMed link. The run report states the proportion per stream.

**Data currency.** NLM's terms require redistributed data to be kept current or clearly marked as possibly out of date. The weekly run re-fetches finalists' records and shows a "data as of" date. Retracted or corrected records are flagged on the card.

## 8. Lessons from the pilot (encode as tests)

These are unchanged from 0.1 (pt lag, co-publication, issue-dated records, guideline commentaries, "guideline" in cohort titles, volume). Two more:

7. **Dominance.** At the pilot weights, editorial relevance explained ~77% of rank variance and journal tier ~1%. *Test:* `sensitivity` emits a dominance warning on the pilot fixture.
8. **Imputed size.** Guidelines without n were sensitive to the size imputation (EASO consensus rank band 3–21). *Test:* in the new framework, n-less designs take precision adjustment 0, and their band is reported.
9. **Mendelian randomisation leak.** `randomized[tiab]` / `randomised[tiab]` matches Mendelian randomisation studies. Excluding Diabetes and Obesity as MeSH major topics, the Endocrinology query returned 179 records with the fallback against 103 for a stricter query. The two queries also differ in journal list, so not all of the gap is Mendelian randomisation. Quantify the gap in iteration 1. *Rule:* when the design match comes only from the title/abstract fallback, exclude on `/mendelian randomi[sz]/i` or the MeSH term "Mendelian Randomization Analysis". *Test:* a fixture of MR papers is excluded with `rule_id = mr_not_rct`.
10. **Stream assignment.** *Test:* each pilot record lands in exactly one stream, and no record appears in both top-100 lists.
11. **OpenAlex call budget.** *Test:* a full run with mocked HTTP makes exactly 2 OpenAlex calls, or 4 with the boundary buffer on.
12. **Journal cap.** *Test:* with a fixture in which Front Endocrinol holds 30 of the Stage 1 top 100, the final list has exactly 15 from Front Endocrinol, the next 15 eligible papers from other journals fill the gap in rank order, and the 15 displaced papers appear in the run report.
13. **Registry ID capture.** *Test:* on the pilot fixture's recorded XML, every RCT with an NCT ID in `<DataBankList>` has it in `ids.registry`, and no ID is invented (each one appears in the XML or the abstract).
14. **ATC discipline.** *Test:* no `ids.interventions[].atc` value is absent from `config/atc_map.yaml`.

## 9. Acceptance criteria (iteration 1)

- `yir run --window 2026` completes end to end on a fresh clone with keys in `.env`. Cached runs are idempotent.
- All pilot-lesson tests pass. Schema validation covers 100% of records. 100% of exclusions carry a `rule_id`.
- All guards pass on 100% of included records, or the record is queued for review.
- `scores` are reproducible bit-for-bit with the same seed and inputs.
- The site renders with no horizontal overflow at 360 px, no console errors, and Lighthouse accessibility ≥ 95.
- Run report includes counts per stage, token usage, API calls, the dominance and collinearity warnings, and the triage queue size.
- An independent review (architecture, security, dependencies) is done before any public hosting.

## 10. Validation (iteration 2)

- **Back-test.** Run the pipeline on 2021–23 papers. The outcome is citation within 3 years by a major guideline, or iCite `cited_by_clin > 0`. Report AUC and NDCG@20 for C, S, A, the composite, and a journal-tier-only baseline.
  - Pass: the composite beats tier-only by ≥ 0.05 AUC.
  - Re-fit weights with ordinal logistic regression (fit on 2021–22, test on 2023).
- **Rater agreement.** Brian plus one colleague rate 50 papers blind. Target human–human ICC ≥ 0.6, with LLM–human no worse than human–human.
- **Construct check.** Compare C against published RoB 2 or GRADE ratings where they exist. Target Spearman ≥ 0.5.

## 11. Iteration-1 scope

**In:**

- CLI pipeline: harvest → build.
- LLM classify and appraise. Enrichment from OpenAlex, iCite and SJR.
- C/S/A scoring, sensitivity, triage CSV.
- Static site generated from the prototype template.
- Tests: pilot fixtures, the guards, and scoring golden files.
- Two streams with the two-stage top-100 selection and journal caps (section 1a), and licence-gated abstracts on cards in `public` mode (section 7a).
- Identifier capture for the evidence graph (section 6a.1). No family grouping or atlas edges yet.
- Backfill the 83 pilot records into the new schema (LLM pass), then run 2026 year to date across the full journal list.

**Out (iteration 2+):**

- GitHub Actions schedule and Pages deploy
- Back-test and weight fitting
- Web review form
- Themes auto-draft
- Trial/programme families, the optional programme cap, atlas evidence edges (section 6a.2–6a.3)
- Altmetric

## 12. Repo layout (inside `Llama2468/bri-gest`)

YIR lives in the Bri-gest repo, so it shares the journal list, the design language and GitHub Pages. The pipeline is Python and kept apart from the static site. Only built files land in `yir/`.

```
bri-gest/
  CLAUDE.md                  # existing Bri-gest conventions (root) — unchanged
  endo/index.html            # existing; JOURNAL_GROUPS = source of truth for config/journals.yaml
  yir/                       # PUBLISHED: built static site → https://llama2468.github.io/bri-gest/yir/
    index.html  data/yir_2026.json  data/excluded_2026.json
  yir-engine/                # NOT published as a page (no index.html); Python pipeline
    CLAUDE.md                # YIR conventions (from claude/yir-CLAUDE.md in the Endocrine CPD project)
    pyproject.toml           # python ≥3.11; deps: httpx, pydantic, numpy, scipy, pyyaml, jinja2, anthropic, lxml, pytest
    .env.example             # NCBI_API_KEY, NCBI_EMAIL, OPENALEX_API_KEY, ANTHROPIC_API_KEY
    config/  corpus.yaml (incl. journal_caps, programme_caps)  atc_map.yaml  programmes.yaml  journals.yaml  scoring.yaml  journals_sjr.csv  nz_access.yaml  site.yaml  vocab.yaml
    schema/  paper.json  paper_llm.json  excluded.json
    prompts/ classify_system.md  classify_user.jinja
    src/yir/ harvest.py dedupe.py rules.py classify.py stream.py select.py enrich.py score.py sensitivity.py review.py build.py cli.py
    tests/   fixtures/pilot_83.json  fixtures/raw_xml/  test_*.py
    template/ (from claude/yir-site-template.html)
    data/raw/ (gitignored cache)   runs/   review/queue.csv  review/decisions.csv
```

**Rules for living inside Bri-gest:**

- `yir-engine/` never writes outside `../yir/`. The build refuses any other output path.
- The journal-sync test parses `../endo/index.html` directly and fails on drift.
- `.gitignore` covers `yir-engine/.env`, `yir-engine/data/raw/` and any `__pycache__`.
- A Pages deploy only publishes `yir/`. Nothing from `yir-engine/` (configs, prompts, review CSVs) is linked from the site.
- Bri-gest's root `CLAUDE.md` still governs the rest of the repo. `yir-engine/CLAUDE.md` adds the YIR rules and doesn't override them.

## 13. Claude Code kickoff: resume at step 3 (paste as the first message)

> Read `yir-engine/YIR_SPEC.md` (v0.7), starting with "Status and handover", then `yir-engine/CLAUDE.md` and the repo-root `CLAUDE.md`. Steps 1–2 of iteration 1 are done and accepted. Don't change `score.py`, `sensitivity.py` or the golden files unless I ask. Work on a branch (`yir-engine-it1-steps3-7`), one PR per step, with CI green before each PR.
>
> **Finish line for this workstream:** `yir run --window 2026` produces `../yir/index.html` with two top-100 lists (Diabetes & Metabolism, Endocrinology), C/S/A profiles and rank bands, licence-gated abstracts, the Front Endocrinol cap applied, and a run report. Iteration-2 items (section 11 "Out") are out of scope.
>
> Steps:
>
> 3. `scripts/record_fixtures.py` (one live run, then commit the XML) → `harvest.py`, `dedupe.py`, `rules.py` against the recorded XML. Include identifier capture (section 6a.1) and the Mendelian randomisation exclusion (lesson 9).
> 4. `classify.py`: Anthropic API, strict JSON schema, the section 5 guards. On guard failure, the record goes to the review queue. Test with recorded LLM responses.
> 5. `enrich.py`: OpenAlex (one call per stream, 100 DOIs) and iCite. Populate `config/journals_sjr.csv` and switch `journal_prior_source` to SJR.
> 6. `stream.py`, `select.py` (two-stage selection, journal caps, boundary report, triage queue CSV), then `build.py`, rendering the template into `../yir/index.html`. Bump the page `VERSION` to `yir-v0.2`. Check at 360 px and 1280 px with no overflow or console errors, and run `node .github/scripts/check-syntax.js`.
> 7. `cli.py` and the run report (section 9), plus the independent-review checklist (yir-engine `CLAUDE.md`).
>
> Stop after step 3 and show me the harvest counts per journal and stream, and the exclusion log by rule, before running any LLM calls.

## 14. Decisions

**Resolved (26 Nov 2026)**

- Journal list = the Bri-gest `JOURNAL_GROUPS` (section 2).
- Hosting = public, with licence-gated abstracts (section 7a).
- Obesity, lipids and GDM sit in Diabetes & Metabolism (section 1a).
- Front Endocrinol is capped at 15 per top 100 (section 1a).
- YIR is hosted at `/yir/` in the Bri-gest repo (section 12).

**Resolved (27 Nov 2026)**

- Step-2 checkpoint accepted: C/S/A weights 1.0/1.5/0.5, geometric aggregation, the 10-paper fixture ratings.
- A non-GRADE consensus or guideline starts at credibility 0.6.
- The interim IF-percentile journal prior is used until SJR is added in step 5.
- Steps 3–7 are handed to Claude Code.

**Open**

1. Should large cohorts (n ≥ 10,000, or multicentre safety questions) be admitted as a sixth design class, with credibility start 0.5? This is less urgent now that the Endocrinology pool is ~265.
2. Who is the second rater for the agreement study (an SMO colleague or an advanced trainee)?
3. Is the Themes narrative auto-drafted quarterly for editing, or written by hand?
4. The NZ availability list (`nz_access.yaml`). Is it maintained by hand, or seeded from the PHARMAC Schedule each year?
5. Bri-gest abstract policy: align it with the YIR licence gate, or keep verbatim abstracts there (section 7a)?
