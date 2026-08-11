from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class ApplicationSnapshot(BaseModel):
    snapshot_version: Literal[1] = 1
    application_id: str
    workflow_phase: Literal["source_review"] = "source_review"
    target_application: TargetApplicationInputSnapshot
    resume_source: ResumeSourceSnapshot
    experience_entries: list[ExperienceEntrySnapshot]
    standalone_experience_items: list[ExperienceItemSnapshot]
    role_signals: list[dict] = Field(default_factory=list)
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
