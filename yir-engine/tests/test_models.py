import json
from pathlib import Path

import yaml

from yir.models import Paper, from_pilot

ENGINE = Path(__file__).resolve().parents[1]


def test_all_pilot_records_adapt_and_validate():
    data = json.loads((ENGINE / "tests/fixtures/pilot_83.json").read_text(encoding="utf-8"))
    papers = [from_pilot(r) for r in data["papers"]]
    assert len(papers) == 83
    assert len({p.pmid for p in papers}) == 83
    assert all(p.status == "unvetted" for p in papers)


def test_vocab_matches_model_literals():
    vocab = yaml.safe_load((ENGINE / "config/vocab.yaml").read_text(encoding="utf-8"))
    schema = Paper.model_json_schema()
    assert set(vocab["domains"]) == set(schema["properties"]["domain"]["enum"])
    assert set(vocab["qtypes"]) == set(schema["properties"]["qtype"]["enum"])
    assert set(vocab["dclasses"]) == set(schema["properties"]["dclass"]["enum"])


def test_streams_cover_every_domain_exactly_once():
    corpus = yaml.safe_load((ENGINE / "config/corpus.yaml").read_text(encoding="utf-8"))
    vocab = yaml.safe_load((ENGINE / "config/vocab.yaml").read_text(encoding="utf-8"))
    listed = corpus["streams"]["diabetes_metabolism"] + corpus["streams"]["endocrinology"]
    assert sorted(listed) == sorted(vocab["domains"])
    assert corpus["journal_caps"] == {"Front Endocrinol (Lausanne)": 15}
