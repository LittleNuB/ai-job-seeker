from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


PATHFINDER_TYPE = "pathfinder"
SCHEMA_VERSION = "p1-a.v1"
TRIAL_PACKAGE_ID = "p0-xiaoc-opendocuments"
TRIAL_PACKAGE_VERSION = "1.0.0"
DEMO_VERSION = TRIAL_PACKAGE_ID
SELECTED_PATH_ID = "industry-ai-product-assistant"


class TrialQuestionId(str, Enum):
    project_understanding = "project_understanding"
    role_connection = "role_connection"
    scenario_gap = "scenario_gap"
    application_solution = "application_solution"
    portfolio_extension = "portfolio_extension"
    ai_usage_explanation = "ai_usage_explanation"


REQUIRED_TRIAL_QUESTION_IDS = tuple(item.value for item in TrialQuestionId)
TRIAL_QUESTION_IDS = REQUIRED_TRIAL_QUESTION_IDS


class PathfinderRecordStatus(str, Enum):
    draft = "draft"
    answers_incomplete = "answers_incomplete"
    anti_packaging_blocked = "anti_packaging_blocked"
    ready_to_export = "ready_to_export"
    exported = "exported"


class TrialAnswerStatus(str, Enum):
    empty = "empty"
    draft = "draft"
    complete = "complete"


class AntiPackagingRiskLevel(str, Enum):
    info = "info"
    warning = "warning"
    blocking = "blocking"


class AntiPackagingBlockingPolicy(str, Enum):
    none = "none"
    warn_only = "warn_only"
    block_full_markdown_export = "block_full_markdown_export"


class AntiPackagingFindingContext(str, Enum):
    positive_claim = "positive_claim"
    negated_context = "negated_context"
    allowed_context = "allowed_context"


class AntiPackagingCheckStatus(str, Enum):
    not_run = "not_run"
    passed = "passed"
    warning = "warning"
    blocked = "blocked"


class RequiredMarkdownSection(str, Enum):
    candidate_background = "candidate_background"
    path_conclusion = "path_conclusion"
    sample_jd_note = "sample_jd_note"
    opendocuments_source_license = "opendocuments_source_license"
    opendocuments_original_capabilities = "opendocuments_original_capabilities"
    xiaoc_trial_contribution = "xiaoc_trial_contribution"
    forbidden_claims = "forbidden_claims"
    six_question_answers = "six_question_answers"
    disclaimer = "disclaimer"


class MarkdownTemplateSource(str, Enum):
    frontend = "frontend"


class MarkdownExportScope(str, Enum):
    draft = "draft"
    full = "full"


FORBIDDEN_RESULT_KEYS = {
    "match_score",
    "matchScore",
    "ability_score",
    "abilityScore",
    "competency_score",
    "competencyScore",
    "offer_probability",
    "offerProbability",
    "hire_probability",
    "hireProbability",
    "recommendation_score",
    "recommendationScore",
    "resume_optimization",
    "resumeOptimization",
    "resume_packaging",
    "resumePackaging",
    "company_recommendation",
    "companyRecommendation",
    "certification",
    # P0 guard aliases kept as a stricter safety net for nested result JSON.
    "score",
    "scores",
    "probability",
    "resume_suggestion",
    "resumeSuggestion",
}


P1A_TRIAL_PACKAGE: dict[str, Any] = {
    "id": TRIAL_PACKAGE_ID,
    "version": TRIAL_PACKAGE_VERSION,
    "title": "小 C 的 OpenDocuments 工程企业知识库 AI 助手试航",
    "targetUser": "小 C",
    "sourceProject": {
        "name": "OpenDocuments",
        "url": "https://github.com/joungminsung/OpenDocuments",
        "license": "MIT",
        "role": "reference_only",
    },
    "task": {
        "id": "engineering-enterprise-knowledge-base-ai-assistant",
        "title": "工程企业知识库 AI 助手试航",
    },
    "questionIds": list(REQUIRED_TRIAL_QUESTION_IDS),
}


class P1ABaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class SourceProject(P1ABaseModel):
    name: str
    url: str
    license: str
    role: Literal["reference_only"]


class TrialPackageTask(P1ABaseModel):
    id: str
    title: str


class TrialPackage(P1ABaseModel):
    id: str
    version: str
    title: str
    targetUser: str
    sourceProject: SourceProject
    task: TrialPackageTask
    questionIds: list[TrialQuestionId]


class TrialAnswer(P1ABaseModel):
    id: TrialQuestionId
    answer: str = ""
    status: TrialAnswerStatus = TrialAnswerStatus.empty
    questionSnapshot: str | None = None
    impactModuleIds: list[str] | None = None
    updatedAt: str | None = None

    @field_validator("answer")
    @classmethod
    def strip_answer(cls, value: str) -> str:
        return value.strip()


class AntiPackagingFinding(P1ABaseModel):
    ruleId: str
    riskLevel: AntiPackagingRiskLevel
    matchedText: str
    riskReason: str
    suggestedRewrite: str | None = None
    blockingPolicy: AntiPackagingBlockingPolicy
    context: AntiPackagingFindingContext


class AntiPackagingCheck(P1ABaseModel):
    rulesVersion: str
    status: AntiPackagingCheckStatus
    exportAllowed: bool
    checkedAt: str | None = None
    findings: list[AntiPackagingFinding] = Field(default_factory=list)
    requiredMarkdownSections: dict[RequiredMarkdownSection, bool] = Field(default_factory=dict)
    blockingCount: int = 0
    warningCount: int = 0

    @model_validator(mode="after")
    def fill_required_markdown_sections(self) -> "AntiPackagingCheck":
        sections = dict(self.requiredMarkdownSections)
        for section in RequiredMarkdownSection:
            sections.setdefault(section, False)
        self.requiredMarkdownSections = sections
        return self


class PortfolioMetric(P1ABaseModel):
    dimension: str
    metric: str
    acceptanceLens: str


class PortfolioRisk(P1ABaseModel):
    risk: str
    manifestation: str
    mitigation: str


class OpenDocumentsReference(P1ABaseModel):
    name: Literal["OpenDocuments"]
    url: str
    license: str
    role: Literal["reference_only"]
    originalCapabilities: list[str]


class PortfolioDraft(P1ABaseModel):
    title: str
    targetPathId: str
    problemContext: str
    userScenario: str
    solutionOutline: str
    mvpScope: list[str]
    metrics: list[PortfolioMetric]
    risks: list[PortfolioRisk]
    opendocumentsReference: OpenDocumentsReference
    xiaocTrialContribution: list[str]
    notClaimed: list[str]
    disclaimer: str
    updatedAt: str | None = None


class EvidenceSource(P1ABaseModel):
    sourceType: Literal[
        "trial_package",
        "trial_answer",
        "portfolio_draft",
        "opendocuments_reference",
    ]
    sourceId: str
    note: str


class InterviewPrepItem(P1ABaseModel):
    question: str
    answerPoints: list[str]
    evidenceSources: list[EvidenceSource]
    boundaryReminder: str
    forbiddenClaims: list[str]


class InterviewPrep(P1ABaseModel):
    items: list[InterviewPrepItem]
    updatedAt: str | None = None


class MarkdownSnapshot(P1ABaseModel):
    templateSource: Literal["frontend"]
    templateVersion: str
    exportScope: MarkdownExportScope
    content: str
    contentHash: str | None = None
    createdAt: str


class TrailRecord(P1ABaseModel):
    schemaVersion: Literal["p1-a.v1"] = SCHEMA_VERSION
    recordId: str | None = None
    trialPackageId: Literal["p0-xiaoc-opendocuments"]
    trialPackageVersion: str
    status: PathfinderRecordStatus
    userProfileSnapshot: Any
    selectedPathId: Literal["industry-ai-product-assistant"]
    trialAnswers: list[TrialAnswer]
    antiPackagingCheck: AntiPackagingCheck
    portfolioDraft: PortfolioDraft | None = None
    interviewPrep: InterviewPrep | None = None
    markdownSnapshot: MarkdownSnapshot | None = None
    createdAt: str | None = None
    updatedAt: str | None = None


class PathfinderCreateRequest(P1ABaseModel):
    schemaVersion: Literal["p1-a.v1"] = SCHEMA_VERSION
    trialPackageId: Literal["p0-xiaoc-opendocuments"]
    trialPackageVersion: Literal["1.0.0"]
    selectedPathId: Literal["industry-ai-product-assistant"]
    userProfileSnapshot: Any

    @model_validator(mode="after")
    def reject_forbidden_snapshot_fields(self) -> "PathfinderCreateRequest":
        forbidden = _find_forbidden_keys(self.userProfileSnapshot)
        if forbidden:
            raise ValueError(_format_forbidden_fields_error("P1-A input", forbidden))
        return self


class TrialAnswersRequest(P1ABaseModel):
    schemaVersion: Literal["p1-a.v1"] = SCHEMA_VERSION
    changedQuestionId: TrialQuestionId | None = None
    trialAnswers: list[TrialAnswer]

    @model_validator(mode="after")
    def require_fixed_trial_answer_package(self) -> "TrialAnswersRequest":
        _assert_exact_trial_answer_ids(self.trialAnswers)
        return self


class PathfinderResultRequest(P1ABaseModel):
    schemaVersion: Literal["p1-a.v1"] = SCHEMA_VERSION
    status: PathfinderRecordStatus
    antiPackagingCheck: AntiPackagingCheck
    portfolioDraft: PortfolioDraft | None = None
    interviewPrep: InterviewPrep | None = None
    markdownSnapshot: MarkdownSnapshot | None = None

    @model_validator(mode="after")
    def reject_forbidden_result_fields(self) -> "PathfinderResultRequest":
        payload = self.model_dump(mode="json")
        forbidden = _find_forbidden_keys(payload)
        if forbidden:
            raise ValueError(_format_forbidden_fields_error("P1-A result", forbidden))
        return self


class PathfinderTrialAnswersResponse(P1ABaseModel):
    recordId: str
    status: PathfinderRecordStatus
    trialAnswers: list[TrialAnswer]
    updatedAt: str


class PathfinderResultResponse(P1ABaseModel):
    recordId: str
    status: PathfinderRecordStatus
    markdownSnapshotSaved: bool
    updatedAt: str


PathfinderCreateResponse = TrailRecord
PathfinderRecordResponse = TrailRecord


def default_trial_answers() -> list[TrialAnswer]:
    return [
        TrialAnswer(id=TrialQuestionId(question_id), answer="", status=TrialAnswerStatus.empty)
        for question_id in REQUIRED_TRIAL_QUESTION_IDS
    ]


def default_anti_packaging_check() -> AntiPackagingCheck:
    return AntiPackagingCheck(
        rulesVersion=SCHEMA_VERSION,
        status=AntiPackagingCheckStatus.not_run,
        exportAllowed=False,
        findings=[],
        requiredMarkdownSections={section: False for section in RequiredMarkdownSection},
        blockingCount=0,
        warningCount=0,
    )


def normalize_trial_answers(answers: list[TrialAnswer] | dict[str, str] | Any) -> list[TrialAnswer]:
    if isinstance(answers, dict):
        items = [
            TrialAnswer(
                id=TrialQuestionId(question_id),
                answer=str(answers.get(question_id) or "").strip(),
                status=_answer_status_from_text(str(answers.get(question_id) or "")),
            )
            for question_id in REQUIRED_TRIAL_QUESTION_IDS
        ]
        return items

    if isinstance(answers, list):
        parsed_items: list[TrialAnswer] = []
        for item in answers:
            parsed = item if isinstance(item, TrialAnswer) else TrialAnswer.model_validate(item)
            status = parsed.status
            if not parsed.answer.strip():
                status = TrialAnswerStatus.empty
            elif status == TrialAnswerStatus.empty:
                status = TrialAnswerStatus.draft
            parsed_items.append(parsed.model_copy(update={"answer": parsed.answer.strip(), "status": status}))

        _assert_exact_trial_answer_ids(parsed_items)
        by_id = {answer.id.value: answer for answer in parsed_items}
        return [by_id[question_id] for question_id in REQUIRED_TRIAL_QUESTION_IDS]

    return default_trial_answers()


def are_trial_answers_complete(answers: list[TrialAnswer]) -> bool:
    try:
        normalized = normalize_trial_answers(answers)
    except ValueError:
        return False
    return all(answer.answer.strip() for answer in normalized)


def all_required_markdown_sections_present(anti_check: AntiPackagingCheck) -> bool:
    return all(bool(anti_check.requiredMarkdownSections.get(section)) for section in RequiredMarkdownSection)


def compute_pathfinder_status(
    trial_answers: list[TrialAnswer],
    anti_packaging_check: AntiPackagingCheck,
    markdown_snapshot: MarkdownSnapshot | None = None,
) -> PathfinderRecordStatus:
    normalized_answers = normalize_trial_answers(trial_answers)
    if not any(answer.answer.strip() for answer in normalized_answers):
        return PathfinderRecordStatus.draft
    if not are_trial_answers_complete(normalized_answers):
        return PathfinderRecordStatus.answers_incomplete
    if (
        anti_packaging_check.status == AntiPackagingCheckStatus.blocked
        or anti_packaging_check.blockingCount > 0
        or anti_packaging_check.exportAllowed is False
    ):
        return PathfinderRecordStatus.anti_packaging_blocked
    if markdown_snapshot is not None and markdown_snapshot.exportScope == MarkdownExportScope.full:
        return PathfinderRecordStatus.exported
    return PathfinderRecordStatus.ready_to_export


def pydantic_to_json(value: BaseModel | None) -> dict[str, Any] | None:
    if value is None:
        return None
    return value.model_dump(mode="json", exclude_none=True)


def _answer_status_from_text(answer: str) -> TrialAnswerStatus:
    return TrialAnswerStatus.complete if answer.strip() else TrialAnswerStatus.empty


def _assert_exact_trial_answer_ids(answers: list[TrialAnswer]) -> None:
    ids = [answer.id.value if isinstance(answer.id, TrialQuestionId) else str(answer.id) for answer in answers]
    duplicates = sorted({question_id for question_id in ids if ids.count(question_id) > 1})
    if duplicates:
        raise ValueError(f"Duplicate trial answer question id(s): {', '.join(duplicates)}")

    received = set(ids)
    required = set(REQUIRED_TRIAL_QUESTION_IDS)
    unknown = sorted(received - required)
    if unknown:
        raise ValueError(f"Unknown trial answer question id(s): {', '.join(unknown)}")

    missing = sorted(required - received)
    if missing:
        raise ValueError(f"Missing trial answer question id(s): {', '.join(missing)}")


def _find_forbidden_keys(value: Any) -> set[str]:
    found: set[str] = set()
    if isinstance(value, BaseModel):
        value = value.model_dump(mode="json")
    if isinstance(value, dict):
        for key, child in value.items():
            if str(key) in FORBIDDEN_RESULT_KEYS:
                found.add(str(key))
            found.update(_find_forbidden_keys(child))
    elif isinstance(value, list):
        for child in value:
            found.update(_find_forbidden_keys(child))
    return found


def _format_forbidden_fields_error(scope: str, forbidden: set[str]) -> str:
    forbidden_list = ", ".join(sorted(forbidden))
    return f"Forbidden {scope} field(s): {forbidden_list}"
