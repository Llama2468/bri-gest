"""Credibility (C), Salience (S), Attention (A) and the composite (YIR_SPEC §6). All constants from config."""
from __future__ import annotations

import math
from pathlib import Path

import yaml

from .models import Paper

CONFIG = Path(__file__).resolve().parents[2] / "config" / "scoring.yaml"


def load_config(path: Path = CONFIG) -> dict:
    with path.open(encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def _phase3(p: Paper) -> bool:
    return bool(p.phase and any(d in p.phase for d in ("3", "4")))


def credibility_start_key(p: Paper) -> str:
    a = p.appraisal
    if p.dclass == "guideline":
        return "guideline_grade" if a and a.guideline_method == "grade" else "guideline_other"
    if p.dclass == "sr_ma":
        d = a.sr_included_designs if a else "na"
        return {"rct": "sr_ma_of_rcts", "mixed": "sr_ma_mixed", "observational": "sr_ma_observational"}.get(d, "sr_ma_mixed")
    if p.dclass == "secondary":
        return "secondary"
    if p.dclass == "rct_p2":
        return "rct_mechanistic" if p.phase == "mechanistic" else "rct_phase2"
    return "rct_phase3" if _phase3(p) else "rct_pragmatic"


def credibility(p: Paper, cfg: dict) -> tuple[float, dict]:
    """Return C and an itemised breakdown (for the card's 'why' panel and the run report)."""
    c = cfg["credibility"]
    a = p.appraisal
    key = credibility_start_key(p)
    parts = {"start": (key, c["start"][key])}
    if p.dclass != "guideline" and a is not None:
        parts["outcome"] = (a.outcome_type, c["outcome"][a.outcome_type])
        parts["analysis"] = (a.analysis, c["analysis"][a.analysis])
        parts["masking"] = (a.masking, c["masking"][a.masking])
        prec = 0.0
        if p.n is not None or a.events is not None:
            for rule in c["precision"]:
                if "min_n" in rule and p.n is not None and p.n >= rule["min_n"]:
                    prec = rule["adj"]
                    break
                if "min_events" in rule and a.events is not None and a.events >= rule["min_events"]:
                    prec = rule["adj"]
                    break
        parts["precision"] = (p.n, prec)
        if p.dclass == "sr_ma":
            if a.sr_registered == "no":
                parts["sr_unregistered"] = ("no", c["sr_ma"]["unregistered"])
            if a.sr_certainty_rating == "no":
                parts["sr_no_certainty"] = ("no", c["sr_ma"]["no_certainty_rating"])
    total = sum(v for _, v in parts.values())
    return max(c["floor"], round(total, 4)), parts


def salience(p: Paper, cfg: dict) -> float:
    s = p.salience
    if s is None:
        raise ValueError(f"{p.pmid}: salience missing")
    base = ((s.relevance_7 + s.newsworthy_7) / 2 - 1) / 6
    return round(base * cfg["salience"]["nz_modifier"][s.nz_available], 4)


def months_since(epub: str, as_of: str) -> float:
    y1, m1, d1 = (int(x) for x in epub.split("-"))
    y2, m2, d2 = (int(x) for x in as_of.split("-"))
    return max(0.0, (y2 - y1) * 12 + (m2 - m1) + (d2 - d1) / 30.4)


def attention(p: Paper, cfg: dict, as_of: str) -> float:
    at = p.attention
    if at.journal_pct is None:
        raise ValueError(f"{p.pmid}: journal prior missing")
    if at.cites_pct_cohort is None:
        return round(at.journal_pct, 4)
    m = months_since(p.epub, as_of)
    lam = m / (m + cfg["attention"]["lambda_half_months"])
    return round(lam * at.cites_pct_cohort + (1 - lam) * at.journal_pct, 4)


def composite(C: float, S: float, A: float, weights: dict, aggregation: str, floor: float) -> float:
    W = weights["C"] + weights["S"] + weights["A"]
    if aggregation == "geometric":
        logs = (weights["C"] * math.log(max(C, floor)) + weights["S"] * math.log(max(S, floor))
                + weights["A"] * math.log(max(A, floor)))
        return round(100 * math.exp(logs / W), 2)
    return round(100 * (weights["C"] * C + weights["S"] * S + weights["A"] * A) / W, 2)


def score_all(papers: list[Paper], cfg: dict, as_of: str) -> list[dict]:
    out = []
    comp = cfg["composite"]
    for p in papers:
        C, parts = credibility(p, cfg)
        S = salience(p, cfg)
        A = attention(p, cfg, as_of)
        out.append({"pmid": p.pmid, "label": p.acronym or p.title[:50], "C": C, "S": S, "A": A,
                    "composite": composite(C, S, A, comp["weights"], comp["aggregation"], comp["geometric_floor"]),
                    "C_parts": {k: list(v) for k, v in parts.items()}})
    return out
