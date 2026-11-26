"""Step-2 checkpoint: score the hand-filled pilot subset and print the scoring + sensitivity report.

Usage:  PYTHONPATH=src python -m yir.checkpoint [--write-golden]
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from . import journals
from .models import Appraisal, Salience, from_pilot
from .score import load_config, score_all
from .sensitivity import analyse

ENGINE = Path(__file__).resolve().parents[2]
PILOT = ENGINE / "tests" / "fixtures" / "pilot_83.json"
APPRAISAL = ENGINE / "tests" / "fixtures" / "appraisal_10.json"
GOLDEN = ENGINE / "tests" / "golden" / "checkpoint_10.json"


def build() -> dict:
    cfg = load_config()
    pilot = {r["pmid"]: r for r in json.loads(PILOT.read_text(encoding="utf-8"))["papers"]}
    fill = json.loads(APPRAISAL.read_text(encoding="utf-8"))
    jpct = journals.if_percentiles(journals.load())
    papers = []
    for pmid, f in fill["papers"].items():
        p = from_pilot(pilot[pmid])
        p.appraisal = Appraisal(**f["appraisal"])
        p.salience = Salience(**f["salience"], proposed_by="claude (hand-filled, unconfirmed)")
        p.attention.journal_pct = round(jpct[p.journal], 4)
        papers.append(p)
    rows = score_all(papers, cfg, fill["as_of"])
    sens = analyse(rows, cfg)
    by = {s["pmid"]: s for s in sens["per_paper"]}
    for r in rows:
        r.update({k: by[r["pmid"]][k] for k in ("rank", "rank_lo", "rank_hi", "p_topN")})
    rows.sort(key=lambda r: r["rank"])
    return {"scoring_version": cfg["scoring_version"], "as_of": fill["as_of"],
            "journal_prior_source": cfg["attention"]["journal_prior_source"],
            "rows": rows, "sensitivity": {k: v for k, v in sens.items() if k != "per_paper"}}


def render(rep: dict) -> str:
    lines = [f"YIR scoring checkpoint, scoring_version {rep['scoring_version']}, as of {rep['as_of']}",
             f"Journal prior: {rep['journal_prior_source']} (interim; SJR pending)", "",
             f"{'rank':>4} {'band':>9} {'p_top':>5}  {'C':>5} {'S':>5} {'A':>5}  {'score':>6}  paper"]
    for r in rep["rows"]:
        lines.append(f"{r['rank']:>4} {str(r['rank_lo'])+'-'+str(r['rank_hi']):>9} {r['p_topN']:>5.2f}  "
                     f"{r['C']:>5.2f} {r['S']:>5.2f} {r['A']:>5.2f}  {r['composite']:>6.1f}  {r['label']}")
    s = rep["sensitivity"]
    lines += ["", "Effective importance (share of rank variance): " +
              ", ".join(f"{k} {v:.0%}" for k, v in s["effective_importance"].items()),
              "Spearman with composite: " + ", ".join(f"{k} {v:+.2f}" for k, v in s["spearman_with_composite"].items()),
              "Construct collinearity: " + ", ".join(f"{k} {v:+.2f}" for k, v in s["collinearity"].items()),
              "Warnings: " + ("; ".join(s["warnings"]) if s["warnings"] else "none"), "",
              "Credibility breakdown:"]
    for r in rep["rows"]:
        parts = ", ".join(f"{k} {v[0]}:{v[1]:+.2f}" if k != "start" else f"start {v[0]} {v[1]:.2f}"
                          for k, v in r["C_parts"].items())
        lines.append(f"  {r['label']}: C={r['C']:.2f}  [{parts}]")
    return "\n".join(lines)


if __name__ == "__main__":
    rep = build()
    print(render(rep))
    if "--write-golden" in sys.argv:
        GOLDEN.write_text(json.dumps(rep, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"\nwrote {GOLDEN}")
