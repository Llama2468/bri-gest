# CLAUDE.md — Endocrine Year-in-Review engine (lives at bri-gest/yir-engine/)

The spec is `YIR_SPEC.md` (v0.7). **Read its "Status and handover" section first.** Steps 1–2 of iteration 1 are done and accepted. Resume at step 3 (§13). The only output location is `../yir/`; never write elsewhere in the Bri-gest repo. The root Bri-gest `CLAUDE.md` still applies. Section numbers below refer to it. Build iteration 1 only (§11) unless told otherwise.

## Non-negotiables
- **Nothing auto-writes to the atlas.** LLM output is `status: unvetted` until a human decision in `review/decisions.csv` vets it.
- **No secrets in the repo.** Keys come from `.env` (gitignored) or CI secrets only. `.env.example` lists the names. Never log keys or full request URLs that contain them.
- **No live network calls in tests.** Use recorded fixtures under `tests/fixtures/`. A live run is a CLI command, not a test.
- **Reproducibility.** Raw API responses are cached and immutable (`data/raw/`). Monte Carlo is seeded. Every output carries `scoring_version` and the run ID.
- **Provenance.** Every number shown on the site traces to a source field: abstract, OpenAlex, iCite or SJR, each with `fetched_at`.
- **Guards before trust.** The §5 code guards run on every LLM record. On a failure, the record goes to the review queue; never silently fix it.

## Conventions
- Python ≥ 3.11, `src/` layout, pydantic models that mirror `schema/*.json`, type hints, `ruff` + `pytest`.
- Config-driven constants: no magic numbers in code for weights, credibility adjustments, journals or thresholds. Read them from `config/*.yaml`.
- Rate limits: NCBI ≤ 10 req/s with a key, OpenAlex batched (≤ 100 DOIs per call) with exponential backoff on 429, iCite in batches of ≤ 400 PMIDs.
- Windows users: prefix Python commands with `PYTHONIOENCODING=utf-8`.
- Use the stated working order (§13). The current checkpoint is **after step 3**: show the harvest counts and the exclusion log before any LLM calls.
- Don't modify `score.py`, `sensitivity.py`, `config/scoring.yaml` or `tests/golden/` unless asked. They're the accepted checkpoint.
- Ruff in CI uses the current default rules: `X | None` (not `Optional`), `re.DOTALL`, dict literals, `int(np.rint(x))`.

## Checks before saying a step is done
- `pytest -q` passes, and `ruff check` is clean.
- For scoring changes, regenerate the golden files only when told to, and show the diff.
- For the site, render at 360 px and 1280 px with headless Chrome or Playwright, then confirm no overflow and no console errors.

## Owner preferences
- Peer-level, direct reporting. State uncertainty and limitations plainly.
- Code outputs over 300 lines: outline first, write once. If a write is interrupted, continue from the cut point; don't restart.
- Brian wants independent architecture, security and dependency review before anything is hosted publicly. Produce a short review checklist at the end of iteration 1.
