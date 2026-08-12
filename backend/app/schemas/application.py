from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


def _require_concrete_jd(value: str) -> str:
    normalized = value.strip()
    lowered = normalized.lower()
    responsibility_markers = (
        "岗位职责",
        "工作职责",
        "职位职责",
        "负责",
        "responsibilities",
        "you will",
    )
    qualification_markers = (
        "任职要求",
        "岗位要求",
        "职位要求",
        "经验",
        "熟悉",
        "qualifications",
        "requirements",
        "experience",
    )
    if (
        len(normalized) < 80
        or not any(marker in lowered for marker in responsibility_markers)
        or not any(marker in lowered for marker in qualification_markers)
    ):
        raise ValueError("请粘贴包含岗位职责和任职要求的具体 JD，职位名称或岗位资料不能代替 JD")
    return normalized


class StartApplicationCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["start_application"]
    target_role: str = Field(min_length=1, max_length=120)
    jd_text: str
    resume_text: str = Field(min_length=20)

    @field_validator("target_role")
    @classmethod
    def validate_target_role(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("请填写目标岗位")
        return normalized

    @field_validator("resume_text")
    @classmethod
    def validate_resume_text(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 20:
            raise ValueError("请粘贴或上传包含经历内容的简历")
        return normalized

    @field_validator("jd_text")
    @classmethod
    def validate_jd(cls, value: str) -> str:
        return _require_concrete_jd(value)


class MoveExperienceItemCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["move_experience_item"]
    experience_item_id: str
    destination_entry_id: str | None = None


class SplitExperienceItemCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["split_experience_item"]
    source_item_id: str
    base_fact_ids: list[str] = Field(min_length=1)
    new_item_title: str = Field(min_length=1, max_length=160)

    @field_validator("base_fact_ids")
    @classmethod
    def require_unique_facts(cls, value: list[str]) -> list[str]:
        if len(set(value)) != len(value):
            raise ValueError("拆分材料不能包含重复事实")
        return value

    @field_validator("new_item_title")
    @classmethod
    def validate_new_item_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("请填写新的经历项目名称")
        return normalized


class MergeExperienceItemsCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["merge_experience_items"]
    source_item_id: str
    destination_item_id: str


class AnalyzeTargetCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["analyze_target"]


class GenerateClaimsCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["generate_claims"]


ApplicationMutationCommand = Annotated[
    MoveExperienceItemCommand
    | SplitExperienceItemCommand
    | MergeExperienceItemsCommand
    | AnalyzeTargetCommand
    | GenerateClaimsCommand,
    Field(discriminator="type"),
]


class BaseFactSnapshot(BaseModel):
    id: str
    text: str
    source_location: str


class ExperienceItemSnapshot(BaseModel):
    id: str
    title: str
    entry_id: str | None
    source_scope: Literal["application_local"] = "application_local"
    base_facts: list[BaseFactSnapshot]


class ExperienceEntrySnapshot(BaseModel):
    id: str
    organization: str
    role: str
    date_range: str | None = None
    experience_items: list[ExperienceItemSnapshot]


class TargetApplicationInputSnapshot(BaseModel):
    target_role: str
    jd_text: str


class ResumeSourceSnapshot(BaseModel):
    text: str
    scope: Literal["application_local"] = "application_local"


class TargetedResumeVersionSnapshot(BaseModel):
    resume_claims: list[dict] = Field(default_factory=list)


class RoleSignalModelOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    signal: str = Field(min_length=1, max_length=240)
    source_type: Literal["explicit", "interpretation"]
    jd_excerpt: str | None = Field(default=None, max_length=500)
    rationale: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def require_source_evidence(self) -> "RoleSignalModelOutput":
        if self.source_type == "explicit":
            if not self.jd_excerpt or not self.jd_excerpt.strip():
                raise ValueError("显式 Role Signal 必须引用 JD 原文")
            if self.rationale is not None:
                raise ValueError("显式 Role Signal 不需要推断说明")
        else:
            if self.jd_excerpt is not None:
                raise ValueError("推断 Role Signal 不能伪装成 JD 原文")
            if not self.rationale or not self.rationale.strip():
                raise ValueError("推断 Role Signal 必须说明解释依据")
        return self


class TargetAnalysisModelOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role_signals: list[RoleSignalModelOutput] = Field(max_length=3)

    @model_validator(mode="after")
    def require_distinct_signals(self) -> "TargetAnalysisModelOutput":
        normalized = [signal.signal.casefold() for signal in self.role_signals]
        if len(normalized) != len(set(normalized)):
            raise ValueError("Role Signal 不能重复")
        return self


class RoleSignalSnapshot(RoleSignalModelOutput):
    id: str


class StretchDirectionModelOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    expression_gap: str = Field(min_length=1, max_length=500)
    why_it_matters: str = Field(min_length=1, max_length=500)
    expansion_direction: str = Field(min_length=1, max_length=500)


class CompetitiveClaimModelOutput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    experience_item_id: str = Field(min_length=1)
    primary_role_signal_id: str = Field(min_length=1)
    source_focus: str = Field(min_length=1, max_length=240)
    opportunity_value: str = Field(min_length=1, max_length=300)
    supported_base_fact_ids: list[str] = Field(min_length=1)
    competitive_claim: str = Field(min_length=1, max_length=1200)
    stretch_direction: StretchDirectionModelOutput

    @field_validator("supported_base_fact_ids")
    @classmethod
    def require_distinct_fact_ids(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("Competitive Claim 不能重复引用同一 Base Fact")
        return value


class ClaimStudioModelOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    competitive_claims: list[CompetitiveClaimModelOutput] = Field(max_length=3)

    @model_validator(mode="after")
    def reject_duplicate_opportunities(self) -> "ClaimStudioModelOutput":
        claim_texts = [
            "".join(claim.competitive_claim.casefold().split())
            for claim in self.competitive_claims
        ]
        if len(claim_texts) != len(set(claim_texts)):
            raise ValueError("Competitive Claim 不能包含语义重复的表述")

        opportunity_keys = [
            (
                claim.experience_item_id,
                claim.primary_role_signal_id,
                "".join(claim.source_focus.casefold().split()),
                "".join(claim.opportunity_value.casefold().split()),
            )
            for claim in self.competitive_claims
        ]
        if len(opportunity_keys) != len(set(opportunity_keys)):
            raise ValueError("同一经历项目的重复机会必须有不同来源重点或 Role Signal")
        return self


class ClaimStudioReviewViolation(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    code: Literal["semantic_duplicate", "unsupported_material_fact"]
    claim_indexes: list[int] = Field(min_length=1)
    explanation: str = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def require_violation_scope(self) -> "ClaimStudioReviewViolation":
        if any(index < 0 for index in self.claim_indexes):
            raise ValueError("Claim Studio 审查索引不能为负数")
        if self.code == "semantic_duplicate" and len(set(self.claim_indexes)) < 2:
            raise ValueError("语义重复审查必须指出至少两条主张")
        return self


class ClaimStudioReviewModelOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    verdict: Literal["approved", "rejected"]
    violations: list[ClaimStudioReviewViolation] = Field(default_factory=list)

    @model_validator(mode="after")
    def require_consistent_verdict(self) -> "ClaimStudioReviewModelOutput":
        if self.verdict == "approved" and self.violations:
            raise ValueError("通过的 Claim Studio 审查不能包含违规项")
        if self.verdict == "rejected" and not self.violations:
            raise ValueError("拒绝的 Claim Studio 审查必须说明违规项")
        return self


class ExperienceEntryContextSnapshot(BaseModel):
    organization: str
    role: str
    date_range: str | None = None


class ClaimSourceSnapshot(BaseModel):
    id: str
    prompt_run_id: str
    experience_item_id: str
    source_scope: Literal["application_local"] = "application_local"
    item_title: str
    entry_context: ExperienceEntryContextSnapshot | None = None
    base_facts: list[BaseFactSnapshot]
    captured_at: str


class CompetitiveClaimSnapshot(BaseModel):
    id: str
    source_snapshot_id: str
    experience_item_id: str
    source_focus: str
    opportunity_value: str
    supported_base_fact_ids: list[str]
    primary_role_signal_id: str
    primary_role_signal: RoleSignalSnapshot
    competitive_claim: str
    stretch_direction: StretchDirectionModelOutput


class SourceChangeNoticeSnapshot(BaseModel):
    claim_id: str
    source_snapshot_id: str
    experience_item_id: str
    changed_dimensions: list[
        Literal["item_title", "entry_context", "base_facts", "source_removed"]
    ] = Field(min_length=1)
    message: str


class RecoverableAnalysisErrorSnapshot(BaseModel):
    code: Literal["invalid_output", "timeout", "provider_unavailable"]
    message: str
    retryable: Literal[True] = True


class TargetAnalysisSnapshot(BaseModel):
    status: Literal["not_started", "completed", "failed"] = "not_started"
    last_error: RecoverableAnalysisErrorSnapshot | None = None


class ClaimStudioSnapshot(BaseModel):
    status: Literal["not_started", "running", "completed", "failed"] = "not_started"
    last_error: RecoverableAnalysisErrorSnapshot | None = None


class PromptRunSnapshot(BaseModel):
    id: str
    prompt_family: Literal["target_analysis", "claim_studio"]
    prompt_version: str
    model_provider: str
    model_name: str
    status: Literal["running", "completed", "failed"]
    error_code: Literal["invalid_output", "timeout", "provider_unavailable"] | None = None
    created_at: str


class ApplicationSnapshot(BaseModel):
    snapshot_version: Literal[1] = 1
    application_id: str
    workflow_phase: Literal["source_review", "role_signal_review", "claim_review"] = "source_review"
    target_application: TargetApplicationInputSnapshot
    resume_source: ResumeSourceSnapshot
    experience_entries: list[ExperienceEntrySnapshot]
    standalone_experience_items: list[ExperienceItemSnapshot]
    role_signals: list[RoleSignalSnapshot] = Field(default_factory=list)
    target_analysis: TargetAnalysisSnapshot = Field(default_factory=TargetAnalysisSnapshot)
    claim_studio: ClaimStudioSnapshot = Field(default_factory=ClaimStudioSnapshot)
    prompt_runs: list[PromptRunSnapshot] = Field(default_factory=list)
    achievement_leads: list[dict] = Field(default_factory=list)
    source_snapshots: list[ClaimSourceSnapshot] = Field(default_factory=list)
    competitive_claims: list[CompetitiveClaimSnapshot] = Field(default_factory=list)
    source_change_notices: list[SourceChangeNoticeSnapshot] = Field(default_factory=list)
    targeted_resume_version: TargetedResumeVersionSnapshot = Field(
        default_factory=TargetedResumeVersionSnapshot
    )
    interview_rehearsal: dict | None = None
    created_at: str
    updated_at: str


class ApplicationListItem(BaseModel):
    application_id: str
    target_role: str
    workflow_phase: str
    experience_item_count: int
    updated_at: str


class ApplicationListResponse(BaseModel):
    items: list[ApplicationListItem]
