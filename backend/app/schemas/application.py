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


ApplicationMutationCommand = Annotated[
    MoveExperienceItemCommand
    | SplitExperienceItemCommand
    | MergeExperienceItemsCommand
    | AnalyzeTargetCommand,
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


class RecoverableAnalysisErrorSnapshot(BaseModel):
    code: Literal["invalid_output", "timeout", "provider_unavailable"]
    message: str
    retryable: Literal[True] = True


class TargetAnalysisSnapshot(BaseModel):
    status: Literal["not_started", "completed", "failed"] = "not_started"
    last_error: RecoverableAnalysisErrorSnapshot | None = None


class PromptRunSnapshot(BaseModel):
    id: str
    prompt_family: Literal["target_analysis"]
    prompt_version: str
    model_provider: str
    model_name: str
    status: Literal["completed", "failed"]
    error_code: Literal["invalid_output", "timeout", "provider_unavailable"] | None = None
    created_at: str


class ApplicationSnapshot(BaseModel):
    snapshot_version: Literal[1] = 1
    application_id: str
    workflow_phase: Literal["source_review", "role_signal_review"] = "source_review"
    target_application: TargetApplicationInputSnapshot
    resume_source: ResumeSourceSnapshot
    experience_entries: list[ExperienceEntrySnapshot]
    standalone_experience_items: list[ExperienceItemSnapshot]
    role_signals: list[RoleSignalSnapshot] = Field(default_factory=list)
    target_analysis: TargetAnalysisSnapshot = Field(default_factory=TargetAnalysisSnapshot)
    prompt_runs: list[PromptRunSnapshot] = Field(default_factory=list)
    achievement_leads: list[dict] = Field(default_factory=list)
    source_snapshots: list[dict] = Field(default_factory=list)
    competitive_claims: list[dict] = Field(default_factory=list)
    source_change_notices: list[dict] = Field(default_factory=list)
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
