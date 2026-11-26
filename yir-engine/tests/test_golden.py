import json
from pathlib import Path

from yir.checkpoint import GOLDEN, build


def test_checkpoint_matches_golden():
    """Scores and rank bands are reproducible bit-for-bit (seeded). Regenerate only when told: --write-golden."""
    assert build() == json.loads(Path(GOLDEN).read_text(encoding="utf-8"))
