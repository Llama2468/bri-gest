"""Journal list: parse Bri-gest JOURNAL_GROUPS (source of truth) and load config/journals.yaml."""
from __future__ import annotations

import re
from pathlib import Path

import yaml

ENGINE = Path(__file__).resolve().parents[2]
REPO = ENGINE.parent
BRIGEST_ENDO = REPO / "endo" / "index.html"
JOURNALS_YAML = ENGINE / "config" / "journals.yaml"

# Filter route per Bri-gest group (YIR_SPEC §2).
ROUTES = {
    "General High-Impact": "endocrine_majr",
    "Diabetes & Metabolism": "all_designs",
    "Endocrinology": "all_designs",
    "Bone & Mineral": "all_designs",
    "Cardiovascular": "cardiometabolic_majr",
    "Oncology": "endocrine_neoplasm_majr",
}

_GROUP_RE = re.compile(r"\{\s*label:'([^']+)',\s*journals:\[(.*?)\]\s*\}", re.S)
_JOURNAL_RE = re.compile(r"\{name:'([^']+)',\s*ta:'([^']+)',\s*if:([0-9.]+)\}")


def parse_brigest(path: Path = BRIGEST_ENDO) -> list[dict]:
    """Parse JOURNAL_GROUPS from the Bri-gest endo page without executing it."""
    text = path.read_text(encoding="utf-8")
    start = text.index("const JOURNAL_GROUPS = [")
    end = text.index("\n];", start)
    block = text[start:end]
    groups = []
    for label, body in _GROUP_RE.findall(block):
        journals = [{"name": n, "ta": ta, "if": float(i)} for n, ta, i in _JOURNAL_RE.findall(body)]
        groups.append({"label": label, "route": ROUTES.get(label, "unknown"), "journals": journals})
    return groups


def load() -> list[dict]:
    with JOURNALS_YAML.open(encoding="utf-8") as fh:
        return yaml.safe_load(fh)["groups"]


def write_yaml(groups: list[dict]) -> None:
    header = (
        "# GENERATED from bri-gest/endo/index.html JOURNAL_GROUPS by `python -m yir.journals`.\n"
        "# Do not edit by hand: change the Bri-gest selector, then regenerate. test_journals_sync enforces this.\n"
    )
    JOURNALS_YAML.write_text(header + yaml.safe_dump({"groups": groups}, sort_keys=False, allow_unicode=True), encoding="utf-8")


def if_percentiles(groups: list[dict]) -> dict[str, float]:
    """Interim attention prior J: impact-factor percentile rank within the Bri-gest list (0–1).

    YIR_SPEC §6.3 specifies SJR category percentiles. Until config/journals_sjr.csv is populated,
    this within-list IF percentile is used and the run report says so.
    """
    items = sorted({j["ta"]: j["if"] for g in groups for j in g["journals"]}.items(), key=lambda kv: kv[1])
    n = len(items)
    out = {}
    for rank, (ta, _) in enumerate(items):
        ties = [i for i, (_, v) in enumerate(items) if v == items[rank][1]]
        out[ta] = (sum(ties) / len(ties) + 1) / n  # mid-rank, in (0, 1]
    return out


if __name__ == "__main__":
    write_yaml(parse_brigest())
    print(f"wrote {JOURNALS_YAML}")
