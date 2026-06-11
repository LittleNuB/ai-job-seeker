from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


PATHFINDER_TYPE = "pathfinder"
SCHEMA_VERSION = "p1-a.v1"
P1B_SCHEMA_VERSION = "p1b.v1"
P1C_SCHEMA_VERSION = "p1c.v1"
TRIAL_PACKAGE_ID = "p1a-opendocuments-engineering-kb"
TRIAL_PACKAGE_VERSION = "1.0.0"
LEGACY_TRIAL_PACKAGE_ID = "p0-xiaoc-opendocuments"
DEMO_VERSION = LEGACY_TRIAL_PACKAGE_ID
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
    user_trial_contribution = "user_trial_contribution"
    # Legacy P0 snapshots may still carry this key; P1-A no longer requires it.
    xiaoc_trial_contribution = "xiaoc_trial_contribution"
    forbidden_claims = "forbidden_claims"
    six_question_answers = "six_question_answers"
    disclaimer = "disclaimer"


CURRENT_REQUIRED_MARKDOWN_SECTIONS = (
    RequiredMarkdownSection.candidate_background,
    RequiredMarkdownSection.path_conclusion,
    RequiredMarkdownSection.sample_jd_note,
    RequiredMarkdownSection.opendocuments_source_license,
    RequiredMarkdownSection.opendocuments_original_capabilities,
    RequiredMarkdownSection.user_trial_contribution,
    RequiredMarkdownSection.forbidden_claims,
    RequiredMarkdownSection.six_question_answers,
    RequiredMarkdownSection.disclaimer,
)


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
    "percent",
    "percentage",
    "probability",
    "offer_probability_percent",
    "offerProbabilityPercent",
    "employer_shortlist",
    "employerShortlist",
    "project_ownership",
    "projectOwnership",
    "openDocumentsOwnership",
    "resume_suggestion",
    "resumeSuggestion",
}


P1A_TRIAL_PACKAGE: dict[str, Any] = {
    "id": TRIAL_PACKAGE_ID,
    "version": TRIAL_PACKAGE_VERSION,
    "title": "OpenDocuments 工程企业知识库 AI 助手试航",
    "targetUser": "真实转岗用户",
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


class UserProfileInput(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str | None = None
    displayName: str | None = None
    educationBackground: str | None = None
    industryBackground: list[str] = Field(default_factory=list)
    projectExperience: list[str] = Field(default_factory=list)
    documentAndResearchExperience: list[str] = Field(default_factory=list)
    technicalBasics: list[str] = Field(default_factory=list)
    aiToolUsage: list[str] = Field(default_factory=list)
    targetDirections: list[str] = Field(default_factory=list)
    careerConstraints: list[dict[str, Any]] = Field(default_factory=list)
    availableTimeWindow: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None


class PathfinderRuleVersion(P1ABaseModel):
    version: str
    effectiveAt: str
    rolePathTaxonomyVersion: str
    projectLibraryVersion: str
    antiPackagingRuleVersion: str
    notes: list[str] = Field(default_factory=list)


class UserProfileSignal(P1ABaseModel):
    signalId: str
    category: Literal[
        "industry_background",
        "domain_material",
        "communication",
        "data_handling",
        "ai_tool_usage",
        "technical_foundation",
        "career_constraint",
        "risk",
    ]
    label: str
    sourceField: str
    evidenceText: str
    confidence: Literal["rule_high", "rule_medium", "needs_user_clarification"]


class RecommendationEvidence(P1ABaseModel):
    evidenceId: str
    type: Literal["jd_sample", "user_profile", "open_source_project", "risk", "next_trial"]
    title: str
    detail: str
    sourceRef: str


class RolePathRecommendation(P1ABaseModel):
    pathId: str
    title: str
    decision: Literal["priority_trial", "explore", "not_recommended_short_term", "insufficient_information"]
    rationale: str
    evidence: list[RecommendationEvidence] = Field(default_factory=list)
    riskNotes: list[str] = Field(default_factory=list)
    suggestedProjectTypes: list[str] = Field(default_factory=list)
    nextTrialAction: str


class OpenSourceProjectRecord(P1ABaseModel):
    projectId: str
    name: str
    sourceUrl: str
    host: Literal["github", "gitlab", "other_public_source"]
    description: str = ""
    license: str
    licenseSpdxId: str | None = None
    licenseFileUrl: str | None = None
    licenseVerificationStatus: Literal["verified", "pending", "failed", "not_applicable"]
    lastManualCheckAt: str | None = None
    referenceRole: Literal["reference_only"]
    status: Literal["candidate", "approved_for_trial_package", "needs_review", "retired"]
    rolePathIds: list[str] = Field(default_factory=list)
    projectTags: list[str] = Field(default_factory=list)
    capabilityTags: list[str] = Field(default_factory=list)
    riskTags: list[str] = Field(default_factory=list)
    publicCapabilities: list[str] = Field(default_factory=list)
    notClaimed: list[str] = Field(default_factory=list)
    forbiddenClaims: list[str] = Field(default_factory=list)
    allowedContexts: list[str] = Field(default_factory=list)
    needsReview: bool = False
    generateEligible: bool = False


class ProjectMatch(P1ABaseModel):
    projectId: str
    rolePathId: str
    decision: Literal["matched_for_trial", "candidate_needs_review", "not_matched"]
    matchedRules: list[str] = Field(default_factory=list)
    evidence: list[RecommendationEvidence] = Field(default_factory=list)
    boundaryNotes: list[str] = Field(default_factory=list)


class TrialQuestionCandidate(P1ABaseModel):
    questionId: str
    title: str
    prompt: str
    required: bool = True


class TrialPackageGeneratedFrom(P1ABaseModel):
    recommendationRunId: str
    selectedPathId: str
    selectedProjectId: str
    ruleVersion: str


class TrialPackageCandidate(P1ABaseModel):
    trialPackageId: str
    trialPackageVersion: str
    generatedFrom: TrialPackageGeneratedFrom
    title: str
    targetRolePath: RolePathRecommendation
    sourceProject: OpenSourceProjectRecord
    trialQuestions: list[TrialQuestionCandidate]
    requiredMarkdownSections: list[str] = Field(default_factory=list)
    forbiddenClaims: list[str] = Field(default_factory=list)
    sampleJdDisclaimer: str


class RecommendationRun(P1ABaseModel):
    recommendationRunId: str
    schemaVersion: Literal["p1b.v1"] = P1B_SCHEMA_VERSION
    createdAt: str
    ruleVersion: PathfinderRuleVersion
    userProfileSnapshot: UserProfileInput
    profileSignals: list[UserProfileSignal]
    paths: list[RolePathRecommendation]
    projectMatches: list[ProjectMatch]
    selectedPathId: str | None = None
    selectedProjectId: str | None = None


class PathfinderRecommendationRequest(P1ABaseModel):
    userProfile: UserProfileInput
    preferredRolePathIds: list[str] = Field(default_factory=list)
    constraints: list[dict[str, Any]] = Field(default_factory=list)
    ruleVersion: str | None = None

    @model_validator(mode="after")
    def reject_forbidden_recommendation_fields(self) -> "PathfinderRecommendationRequest":
        forbidden = _find_forbidden_keys(self.model_dump(mode="json"))
        if forbidden:
            raise ValueError(_format_forbidden_fields_error("P1-B recommendation input", forbidden))
        return self


class PathfinderRecommendationResponse(P1ABaseModel):
    schemaVersion: Literal["p1b.v1"] = P1B_SCHEMA_VERSION
    recommendationRun: RecommendationRun
    profileSignals: list[UserProfileSignal]
    paths: list[RolePathRecommendation]
    projectMatches: list[ProjectMatch]
    scopeDisclaimer: str


class PathfinderProjectsResponse(P1ABaseModel):
    schemaVersion: Literal["p1b.v1"] = P1B_SCHEMA_VERSION
    projects: list[OpenSourceProjectRecord]
    dataBoundary: str


class GenerateTrialPackageRequest(P1ABaseModel):
    recommendationRunId: str
    userProfileSnapshot: UserProfileInput
    selectedPathId: str
    selectedProjectId: str

    @model_validator(mode="after")
    def reject_forbidden_generation_fields(self) -> "GenerateTrialPackageRequest":
        forbidden = _find_forbidden_keys(self.model_dump(mode="json"))
        if forbidden:
            raise ValueError(_format_forbidden_fields_error("P1-B generation input", forbidden))
        return self


class GenerateTrialPackageResponse(P1ABaseModel):
    schemaVersion: Literal["p1b.v1"] = P1B_SCHEMA_VERSION
    trialPackageCandidate: TrialPackageCandidate
    antiPackagingDefaults: AntiPackagingCheck


class InterviewMessage(P1ABaseModel):
    messageId: str
    role: Literal["user", "assistant"]
    content: str
    createdAt: str
    modelProvider: str | None = None
    modelStatus: Literal["ok", "no_key", "error", "invalid_json", "fallback"] | None = None

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message content is required")
        return value


class ExtractedProfileSignal(P1ABaseModel):
    signalId: str
    category: Literal[
        "industry_background",
        "domain_material",
        "project_experience",
        "communication",
        "data_handling",
        "ai_tool_usage",
        "technical_foundation",
        "career_constraint",
        "risk",
        "goal",
    ]
    label: str
    evidenceText: str
    sourceMessageIds: list[str] = Field(default_factory=list)
    confidence: Literal["low", "medium", "high", "needs_user_review"] = "needs_user_review"
    status: Literal["candidate", "confirmed", "edited", "rejected"] = "candidate"
    userEditedText: str | None = None

    @model_validator(mode="after")
    def reject_forbidden_signal_fields(self) -> "ExtractedProfileSignal":
        forbidden = _find_forbidden_keys(self.model_dump(mode="json"))
        if forbidden:
            raise ValueError(_format_forbidden_fields_error("P1-C signal", forbidden))
        return self


class SignalExtractionResult(P1ABaseModel):
    schemaVersion: Literal["p1c.v1"] = P1C_SCHEMA_VERSION
    sessionId: str
    modelProvider: str = "deepseek"
    modelName: str | None = None
    modelStatus: Literal["ok", "no_key", "error", "invalid_json"] = "ok"
    signals: list[ExtractedProfileSignal] = Field(default_factory=list)
    summary: str | None = None
    fallbackReason: str | None = None
    createdAt: str


class SignalConfirmation(P1ABaseModel):
    signalId: str
    category: ExtractedProfileSignal.model_fields["category"].annotation
    label: str
    evidenceText: str
    sourceMessageIds: list[str] = Field(default_factory=list)
    confidence: ExtractedProfileSignal.model_fields["confidence"].annotation = "needs_user_review"
    status: Literal["confirmed", "edited", "rejected"]
    userEditedText: str | None = None

    @model_validator(mode="after")
    def reject_forbidden_confirmation_fields(self) -> "SignalConfirmation":
        forbidden = _find_forbidden_keys(self.model_dump(mode="json"))
        if forbidden:
            raise ValueError(_format_forbidden_fields_error("P1-C confirmed signal", forbidden))
        return self


class InterviewSession(P1ABaseModel):
    schemaVersion: Literal["p1c.v1"] = P1C_SCHEMA_VERSION
    sessionId: str
    status: Literal["active", "signals_extracted", "signals_confirmed", "archived"] = "active"
    userProfileSnapshot: UserProfileInput | dict[str, Any] | None = None
    messages: list[InterviewMessage] = Field(default_factory=list)
    extractedSignals: list[ExtractedProfileSignal] = Field(default_factory=list)
    confirmedSignals: list[SignalConfirmation] = Field(default_factory=list)
    lastExtraction: SignalExtractionResult | None = None
    llmProvider: str = "deepseek"
    llmStatus: Literal["ok", "no_key", "error", "invalid_json", "fallback"] = "fallback"
    createdAt: str
    updatedAt: str


class InterviewSessionCreateRequest(P1ABaseModel):
    schemaVersion: Literal["p1c.v1"] = P1C_SCHEMA_VERSION
    initialUserInput: str | None = None
    userProfileSnapshot: UserProfileInput | dict[str, Any] | None = None

    @model_validator(mode="after")
    def reject_forbidden_create_fields(self) -> "InterviewSessionCreateRequest":
        forbidden = _find_forbidden_keys(self.model_dump(mode="json"))
        if forbidden:
            raise ValueError(_format_forbidden_fields_error("P1-C interview input", forbidden))
        return self


class InterviewTurnRequest(P1ABaseModel):
    schemaVersion: Literal["p1c.v1"] = P1C_SCHEMA_VERSION
    message: str

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message is required")
        return value

    @model_validator(mode="after")
    def reject_forbidden_turn_fields(self) -> "InterviewTurnRequest":
        forbidden = _find_forbidden_keys(self.model_dump(mode="json"))
        if forbidden:
            raise ValueError(_format_forbidden_fields_error("P1-C interview turn", forbidden))
        return self


class InterviewTurnResponse(P1ABaseModel):
    schemaVersion: Literal["p1c.v1"] = P1C_SCHEMA_VERSION
    sessionId: str
    assistantMessage: InterviewMessage
    session: InterviewSession


class ConfirmedSignalsRequest(P1ABaseModel):
    schemaVersion: Literal["p1c.v1"] = P1C_SCHEMA_VERSION
    confirmedSignals: list[SignalConfirmation]

    @model_validator(mode="after")
    def reject_forbidden_confirmed_fields(self) -> "ConfirmedSignalsRequest":
        forbidden = _find_forbidden_keys(self.model_dump(mode="json"))
        if forbidden:
            raise ValueError(_format_forbidden_fields_error("P1-C confirmed signals", forbidden))
        return self


InterviewSessionResponse = InterviewSession


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

    @model_validator(mode="before")
    @classmethod
    def accept_required_sections_alias(cls, value: Any) -> Any:
        if isinstance(value, dict) and "requiredSections" in value and "requiredMarkdownSections" not in value:
            value = dict(value)
            value["requiredMarkdownSections"] = value.pop("requiredSections")
        return value

    @model_validator(mode="after")
    def fill_required_markdown_sections(self) -> "AntiPackagingCheck":
        sections = dict(self.requiredMarkdownSections)
        for section in CURRENT_REQUIRED_MARKDOWN_SECTIONS:
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
    sourceProjectReference: OpenDocumentsReference | None = None
    opendocumentsReference: OpenDocumentsReference | None = None
    userTrialContribution: list[str] = Field(default_factory=list)
    xiaocTrialContribution: list[str] | None = None
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
    trialPackageId: str
    trialPackageVersion: str
    status: PathfinderRecordStatus
    userProfileSnapshot: UserProfileInput | dict[str, Any]
    selectedPathId: str
    selectedPath: dict[str, Any] | None = None
    evidenceMapping: dict[str, Any] | list[dict[str, Any]] | None = None
    trialAnswers: list[TrialAnswer]
    antiPackagingCheck: AntiPackagingCheck
    portfolioDraft: PortfolioDraft | None = None
    interviewPrep: InterviewPrep | None = None
    markdownSnapshot: MarkdownSnapshot | None = None
    createdAt: str | None = None
    updatedAt: str | None = None


class PathfinderCreateRequest(P1ABaseModel):
    schemaVersion: Literal["p1-a.v1"] = SCHEMA_VERSION
    trialPackageId: str = TRIAL_PACKAGE_ID
    trialPackageVersion: str = TRIAL_PACKAGE_VERSION
    selectedPathId: str | None = None
    selectedPath: dict[str, Any] | None = None
    userProfileSnapshot: UserProfileInput | dict[str, Any]
    trialPackageSnapshot: dict[str, Any] | None = None

    @model_validator(mode="after")
    def reject_forbidden_snapshot_fields(self) -> "PathfinderCreateRequest":
        forbidden = _find_forbidden_keys(
            {
                "userProfileSnapshot": self.userProfileSnapshot,
                "selectedPath": self.selectedPath,
                "trialPackageSnapshot": self.trialPackageSnapshot,
            }
        )
        if forbidden:
            raise ValueError(_format_forbidden_fields_error("P1-A input", forbidden))
        if not self.trialPackageId.strip():
            raise ValueError("trialPackageId is required")
        if not self.trialPackageVersion.strip():
            raise ValueError("trialPackageVersion is required")
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
    trialAnswers: list[TrialAnswer] | None = None
    evidenceMapping: dict[str, Any] | list[dict[str, Any]] | None = None
    portfolioDraft: PortfolioDraft | None = None
    interviewPrep: InterviewPrep | None = None
    markdownSnapshot: MarkdownSnapshot | None = None

    @model_validator(mode="after")
    def reject_forbidden_result_fields(self) -> "PathfinderResultRequest":
        payload = self.model_dump(mode="json")
        forbidden = _find_forbidden_keys(payload)
        if forbidden:
            raise ValueError(_format_forbidden_fields_error("P1-A result", forbidden))
        if self.trialAnswers is not None:
            _assert_exact_trial_answer_ids(self.trialAnswers)
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
        requiredMarkdownSections={section: False for section in CURRENT_REQUIRED_MARKDOWN_SECTIONS},
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
    return all(bool(anti_check.requiredMarkdownSections.get(section)) for section in CURRENT_REQUIRED_MARKDOWN_SECTIONS)


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


def find_forbidden_keys(value: Any) -> set[str]:
    return _find_forbidden_keys(value)


def _format_forbidden_fields_error(scope: str, forbidden: set[str]) -> str:
    forbidden_list = ", ".join(sorted(forbidden))
    return f"Forbidden {scope} field(s): {forbidden_list}"
