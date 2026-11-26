from yir import journals


def test_config_matches_brigest_selector():
    """config/journals.yaml must equal the Bri-gest JOURNAL_GROUPS (YIR_SPEC §2). Regenerate: python -m yir.journals"""
    assert journals.load() == journals.parse_brigest()


def test_routes_known_and_counts():
    groups = journals.load()
    assert all(g["route"] != "unknown" for g in groups)
    assert sum(len(g["journals"]) for g in groups) == 32


def test_if_percentile_in_unit_interval():
    pct = journals.if_percentiles(journals.load())
    assert all(0 < v <= 1 for v in pct.values())
    assert pct["Lancet"] == max(pct.values())
