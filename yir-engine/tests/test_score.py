import json
from pathlib import Path

import pytest

from yir.models import Appraisal, Paper, Salience, from_pilot
from yir.score import attention, composite, credibility, load_config, salience

ENGINE = Path(__file__).resolve().parents[1]
CFG = load_config()


def _paper(**kw):
    base = {"pmid": "1", "doi": "10.1000/x", "title": "t", "journal": "Front Endocrinol (Lausanne)", "tier": "C",
            "epub": "2026-06-01", "design": "d", "dclass": "sr_ma", "domain": "thyroid", "qtype": "treatment",
            "take": "t", "result": "r"}
    base.update(kw)
    return Paper(**base)


def test_unregistered_observational_ma_is_035():
    """Worked example in YIR_SPEC §6.1: 0.5 − 0.10 − 0.05 = 0.35."""
    p = _paper(n=5000, appraisal=Appraisal(sr_included_designs="observational", sr_registered="no",
                                           sr_certainty_rating="no", outcome_type="hard", analysis="primary"))
    assert credibility(p, CFG)[0] == pytest.approx(0.35)


def test_registered_grade_rct_ma_keeps_1():
    p = _paper(n=5000, appraisal=Appraisal(sr_included_designs="rct", sr_registered="yes",
                                           sr_certainty_rating="yes", outcome_type="hard", analysis="primary"))
    assert credibility(p, CFG)[0] == pytest.approx(1.0)


def test_guideline_ignores_precision_and_downgrades():
    """Pilot lesson 8: n-less designs take precision 0."""
    p = _paper(dclass="guideline", n=None, appraisal=Appraisal(guideline_method="other"))
    C, parts = credibility(p, CFG)
    assert C == pytest.approx(0.6) and set(parts) == {"start"}


def test_floor_applies():
    p = _paper(dclass="rct_p2", phase="2", n=20, appraisal=Appraisal(
        outcome_type="unvalidated_surrogate", analysis="post_hoc", masking="open_subjective"))
    assert credibility(p, CFG)[0] == CFG["credibility"]["floor"]


def test_salience_scale_and_nz_modifier():
    p = _paper(salience=Salience(relevance_7=7, newsworthy_7=7, nz_available="neither"))
    assert salience(p, CFG) == pytest.approx(0.85)
    p = _paper(salience=Salience(relevance_7=1, newsworthy_7=1))
    assert salience(p, CFG) == 0


def test_attention_prior_fades():
    p = _paper()
    p.attention.journal_pct = 0.4
    assert attention(p, CFG, "2026-12-01") == pytest.approx(0.4)          # no citations yet → J
    p.attention.cites_pct_cohort = 1.0
    assert attention(p, CFG, "2027-06-01") == pytest.approx(0.7, abs=0.01)  # 12 months → λ ≈ 0.5


def test_geometric_is_non_compensatory():
    w = CFG["composite"]["weights"]
    f = CFG["composite"]["geometric_floor"]
    strong_s_weak_c = composite(0.2, 1.0, 1.0, w, "geometric", f)
    balanced = composite(0.7, 0.7, 0.7, w, "geometric", f)
    assert balanced > strong_s_weak_c
    assert composite(0.2, 1.0, 1.0, w, "arithmetic", f) > strong_s_weak_c


def test_every_pilot_record_has_a_credibility_start_key():
    from yir.score import credibility_start_key
    data = json.loads((ENGINE / "tests/fixtures/pilot_83.json").read_text(encoding="utf-8"))
    for r in data["papers"]:
        assert credibility_start_key(from_pilot(r)) in CFG["credibility"]["start"]
