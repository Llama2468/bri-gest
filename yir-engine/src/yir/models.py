"""Record models (YIR_SPEC §4). Pydantic v2; JSON Schema is generated from these, not hand-written."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Domain = Literal[
    "diabetes_metabolism", "obesity_metabolic", "lipids", "thyroid", "pituitary", "adrenal", "bone_calcium",
    "reproductive_endocrinology", "pregnancy_endocrinology", "neuroendocrine", "genetics", "acute_endocrinology",
    "research_qi",
]
QType = Literal["treatment", "diagnostics", "prognosis_risk", "mechanism", "new_entities_genetics",
                "health_services", "research_methods"]
DClass = Literal["guideline", "sr_ma", "rct", "rct_p2", "secondary"]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Appraisal(Strict):
    outcome_type: Literal["hard", "validated_surrogate", "unvalidated_surrogate", "na"] = "na"
    analysis: Literal["primary", "secondary", "post_hoc", "na"] = "na"
    masking: Literal["blinded", "open_objective", "open_subjective", "na"] = "na"
    events: int | None = None
    guideline_method: Literal["grade", "other", "none", "na"] = "na"
    sr_included_designs: Literal["rct", "mixed", "observational", "na"] = "na"
    sr_registered: Literal["yes", "no", "na"] = "na"
    sr_certainty_rating: Literal["yes", "no", "na"] = "na"
    evidence_quote: str | None = None


class Salience(Strict):
    relevance_7: int = Field(ge=1, le=7)
    newsworthy_7: int = Field(ge=1, le=7)
    nz_available: Literal["funded", "registered", "neither", "unknown"] = "unknown"
    rationale: str | None = None
    proposed_by: str | None = None
    confirmed_by: str | None = None
    confirmed_at: str | None = None
    llm_original: dict | None = None


class Attention(Strict):
    journal_pct: float | None = Field(default=None, ge=0, le=1)
    cites: int | None = None
    cites_pct_cohort: float | None = Field(default=None, ge=0, le=1)
    rcr: float | None = None
    apt: float | None = None
    cited_by_clin: int | None = None
    altmetric: float | None = None
    fetched_at: str | None = None


class Scores(Strict):
    C: float
    S: float
    A: float
    composite: float
    rank: int | None = None
    rank_lo: int | None = None
    rank_hi: int | None = None
    p_topN: float | None = None
    scoring_version: str


class Paper(Strict):
    pmid: str = Field(pattern=r"^\d{1,9}$")
    doi: str = Field(pattern=r"^10\.\d{4,9}/\S+$")
    title: str
    acronym: str | None = None
    journal: str
    tier: Literal["A", "B", "C"]
    epub: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    date_note: str | None = None
    design: str
    dclass: DClass
    phase: str | None = None
    n: int | None = None
    followup_wk: int | None = None
    domain: Domain
    domains2: list[Domain] = []
    qtype: QType
    tags: list[str] = []
    take: str
    result: str
    cross_trial: bool = False
    industry: bool | None = None
    co_published: str | None = None
    oa_status: str | None = None
    stream: Literal["diabetes_metabolism", "endocrinology"] | None = None
    month: str | None = None
    appraisal: Appraisal | None = None
    salience: Salience | None = None
    attention: Attention = Attention()
    scores: Scores | None = None
    status: Literal["unvetted", "vetted", "rejected"] = "unvetted"
    atlas_nodes: list[str] = []
    review_note: str | None = None
    # legacy pilot fields kept for provenance until the LLM backfill replaces them
    legacy_relevance: Literal[1, 2, 3] | None = None


def from_pilot(rec: dict) -> Paper:
    """Adapt a pilot (v0.1) record to the v0.6 model. Pilot `relevance` is kept as `legacy_relevance`."""
    r = dict(rec)
    r["legacy_relevance"] = r.pop("relevance", None)
    for k in ("followup_wk",):
        if r.get(k) is not None:
            r[k] = int(r[k])
    return Paper.model_validate(r)
