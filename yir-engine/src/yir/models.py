"""Record models (YIR_SPEC §4). Pydantic v2; JSON Schema is generated from these, not hand-written."""
from __future__ import annotations

from typing import Literal, Optional

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
    events: Optional[int] = None
    guideline_method: Literal["grade", "other", "none", "na"] = "na"
    sr_included_designs: Literal["rct", "mixed", "observational", "na"] = "na"
    sr_registered: Literal["yes", "no", "na"] = "na"
    sr_certainty_rating: Literal["yes", "no", "na"] = "na"
    evidence_quote: Optional[str] = None


class Salience(Strict):
    relevance_7: int = Field(ge=1, le=7)
    newsworthy_7: int = Field(ge=1, le=7)
    nz_available: Literal["funded", "registered", "neither", "unknown"] = "unknown"
    rationale: Optional[str] = None
    proposed_by: Optional[str] = None
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[str] = None
    llm_original: Optional[dict] = None


class Attention(Strict):
    journal_pct: Optional[float] = Field(default=None, ge=0, le=1)
    cites: Optional[int] = None
    cites_pct_cohort: Optional[float] = Field(default=None, ge=0, le=1)
    rcr: Optional[float] = None
    apt: Optional[float] = None
    cited_by_clin: Optional[int] = None
    altmetric: Optional[float] = None
    fetched_at: Optional[str] = None


class Scores(Strict):
    C: float
    S: float
    A: float
    composite: float
    rank: Optional[int] = None
    rank_lo: Optional[int] = None
    rank_hi: Optional[int] = None
    p_topN: Optional[float] = None
    scoring_version: str


class Paper(Strict):
    pmid: str = Field(pattern=r"^\d{1,9}$")
    doi: str = Field(pattern=r"^10\.\d{4,9}/\S+$")
    title: str
    acronym: Optional[str] = None
    journal: str
    tier: Literal["A", "B", "C"]
    epub: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    date_note: Optional[str] = None
    design: str
    dclass: DClass
    phase: Optional[str] = None
    n: Optional[int] = None
    followup_wk: Optional[int] = None
    domain: Domain
    domains2: list[Domain] = []
    qtype: QType
    tags: list[str] = []
    take: str
    result: str
    cross_trial: bool = False
    industry: Optional[bool] = None
    co_published: Optional[str] = None
    oa_status: Optional[str] = None
    stream: Optional[Literal["diabetes_metabolism", "endocrinology"]] = None
    month: Optional[str] = None
    appraisal: Optional[Appraisal] = None
    salience: Optional[Salience] = None
    attention: Attention = Attention()
    scores: Optional[Scores] = None
    status: Literal["unvetted", "vetted", "rejected"] = "unvetted"
    atlas_nodes: list[str] = []
    review_note: Optional[str] = None
    # legacy pilot fields kept for provenance until the LLM backfill replaces them
    legacy_relevance: Optional[Literal[1, 2, 3]] = None


def from_pilot(rec: dict) -> Paper:
    """Adapt a pilot (v0.1) record to the v0.6 model. Pilot `relevance` is kept as `legacy_relevance`."""
    r = dict(rec)
    r["legacy_relevance"] = r.pop("relevance", None)
    for k in ("followup_wk",):
        if r.get(k) is not None:
            r[k] = int(r[k])
    return Paper.model_validate(r)
