from yir.score import load_config
from yir.sensitivity import analyse

CFG = load_config()


def _rows(triples):
    return [{"pmid": str(i), "C": c, "S": s, "A": a} for i, (c, s, a) in enumerate(triples)]


def test_dominance_warning_fires_when_one_construct_drives_ranks():
    """Pilot lesson 7: a dominant construct must be reported."""
    rows = _rows([(0.6, s / 20, 0.6) for s in range(1, 21)])
    rep = analyse(rows, CFG)
    assert any(w.startswith("dominance: S") for w in rep["warnings"])


def test_rank_bands_contain_rank_and_are_seeded():
    rows = _rows([(0.3 + 0.03 * i, 0.9 - 0.03 * i, 0.5) for i in range(15)])
    a, b = analyse(rows, CFG), analyse(rows, CFG)
    assert a == b
    for r in a["per_paper"]:
        assert r["rank_lo"] <= r["rank"] <= r["rank_hi"]
