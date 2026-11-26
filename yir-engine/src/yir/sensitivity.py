"""Monte Carlo rank bands, effective importance and collinearity (YIR_SPEC §6.4)."""
from __future__ import annotations

import warnings

import numpy as np
from scipy.stats import rankdata, spearmanr


def _rho(x, y) -> float:
    """Spearman rho; 0 when either input is constant (rho undefined)."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        return float(np.nan_to_num(spearmanr(x, y).statistic))


def _composites(X: np.ndarray, w: np.ndarray, geometric: bool, floor: float) -> np.ndarray:
    """X: papers × 3 (C, S, A); w: 3 weights. Returns composite per paper (0–100)."""
    wn = w / w.sum()
    if geometric:
        return 100 * np.exp(np.log(np.maximum(X, floor)) @ wn)
    return 100 * (X @ wn)


def analyse(rows: list[dict], cfg: dict) -> dict:
    sc = cfg["sensitivity"]
    comp = cfg["composite"]
    X = np.array([[r["C"], r["S"], r["A"]] for r in rows], dtype=float)
    w0 = np.array([comp["weights"][k] for k in ("C", "S", "A")], dtype=float)
    floor = comp["geometric_floor"]
    base = _composites(X, w0, comp["aggregation"] == "geometric", floor)
    base_rank = rankdata(-base, method="min").astype(int)

    rng = np.random.default_rng(sc["seed"])
    lo, hi = np.log(sc["weight_factor_range"][0]), np.log(sc["weight_factor_range"][1])
    n = len(rows)
    ranks = np.empty((sc["draws"], n), dtype=int)
    for i in range(sc["draws"]):
        w = w0 * np.exp(rng.uniform(lo, hi, size=3))
        geo = rng.random() < sc["p_geometric"]
        ranks[i] = rankdata(-_composites(X, w, geo, floor), method="min")
    q_lo, q_hi = np.percentile(ranks, sc["interval"], axis=0)
    p_top = (ranks <= sc["top_n"]).mean(axis=0)

    # Effective importance: normalised squared Spearman of each construct with the composite.
    rho = np.array([_rho(X[:, j], base) for j in range(3)])
    share = rho ** 2 / (rho ** 2).sum() if (rho ** 2).sum() > 0 else np.zeros(3)
    pair = {}
    names = ("C", "S", "A")
    for a in range(3):
        for b in range(a + 1, 3):
            pair[f"{names[a]}-{names[b]}"] = round(_rho(X[:, a], X[:, b]), 3)

    warnings = []
    for k, s in zip(names, share):
        if s > sc["dominance_warn"]:
            warnings.append(f"dominance: {k} explains {s:.0%} of rank variance (> {sc['dominance_warn']:.0%})")
    for k, v in pair.items():
        if abs(v) > sc["collinearity_warn"]:
            warnings.append(f"collinearity: |rho({k})| = {abs(v):.2f} (> {sc['collinearity_warn']})")

    per_paper = [{"pmid": r["pmid"], "rank": int(base_rank[i]), "rank_lo": int(np.rint(q_lo[i])),
                  "rank_hi": int(np.rint(q_hi[i])), "p_topN": round(float(p_top[i]), 3)} for i, r in enumerate(rows)]
    return {"per_paper": per_paper,
            "effective_importance": {k: round(float(s), 3) for k, s in zip(names, share)},
            "spearman_with_composite": {k: round(float(v), 3) for k, v in zip(names, rho)},
            "collinearity": pair, "warnings": warnings,
            "settings": {"draws": sc["draws"], "seed": sc["seed"], "top_n": sc["top_n"]}}
