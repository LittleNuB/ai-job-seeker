from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.pathfinder import (
    P1B_SCHEMA_VERSION,
    PathfinderRuleVersion,
    ProjectMatch,
    RecommendationEvidence,
    RecommendationRun,
    RolePathRecommendation,
    UserProfileInput,
    UserProfileSignal,
)
from app.services.pathfinder_profile_service import extract_profile_signals
from app.services.pathfinder_project_service import list_approved_projects


SCOPE_DISCLAIMER = (
    "P1-B.1 uses rule-first evidence from user-authorized profile fields, sample JD trend references, "
    "and manually reviewed public project fixtures. It does not call an LLM, certify ability, predict hiring "
    "outcomes, screen candidates, package resumes, or rank projects."
)

DEFAULT_RULE_VERSION = PathfinderRuleVersion(
    version="p1b-rule-first.v1",
    effectiveAt="2026-06-09",
    rolePathTaxonomyVersion="p1b-minimal-taxonomy.v1",
    projectLibraryVersion="p1a-opendocuments-fixture.v1",
    antiPackagingRuleVersion="p1a-rules.v1",
    notes=["DATA-004 fixture set is not present; using the existing OpenDocuments P1-A fixture."],
)


def build_recommendation_run(
    user_profile: UserProfileInput,
    *,
    preferred_role_path_ids: list[str] | None = None,
    rule_version_override: str | None = None,
) -> RecommendationRun:
    signals = extract_profile_signals(user_profile)
    rule_version = DEFAULT_RULE_VERSION
    if rule_version_override:
        rule_version = rule_version.model_copy(update={"version": rule_version_override})
    paths = _build_paths(signals, set(preferred_role_path_ids or []))
    return RecommendationRun(
        recommendationRunId=f"p1b-rec-{uuid4()}",
        schemaVersion=P1B_SCHEMA_VERSION,
        createdAt=_now_iso(),
        ruleVersion=rule_version,
        userProfileSnapshot=user_profile,
        profileSignals=signals,
        paths=paths,
        projectMatches=_build_project_matches(paths),
    )


def _build_paths(
    signals: list[UserProfileSignal],
    preferred_role_path_ids: set[str],
) -> list[RolePathRecommendation]:
    has_profile = not any(signal.confidence == "needs_user_clarification" for signal in signals)
    paths = [
        _path(
            path_id="industry-ai-product-assistant",
            title="Industry AI application product assistant",
            decision=_decision(
                has_profile=has_profile,
                preferred="industry-ai-product-assistant" in preferred_role_path_ids,
                matched=_matches(signals, ["document", "research", "prd", "requirement", "product", "knowledge", "资料", "文档", "产品"]),
                default="priority_trial",
            ),
            rationale="This path is supported when the profile contains domain-material, documentation, requirement breakdown, or product-scenario signals.",
            evidence=[
                _jd_evidence("jd-product", "Sample JD trend reference", "Product-assistant samples emphasize requirements, scenarios, QA examples, acceptance criteria, and demo feedback.", "sample:industry-ai-product-assistant"),
                _user_evidence(signals),
                _risk_evidence(),
            ],
            risk_notes=[
                "Do not present this as product-manager role fit or hiring judgment.",
                "Keep OpenDocuments as reference_only and separate public project capability from user trial output.",
            ],
            suggested_project_types=["document_qa", "knowledge_base"],
            next_trial_action="Generate a document QA or knowledge-base MVP trial package from an approved reference project.",
        ),
        _path(
            path_id="industry-ai-solution-assistant",
            title="Industry AI solution assistant",
            decision=_decision(
                has_profile=has_profile,
                preferred="industry-ai-solution-assistant" in preferred_role_path_ids,
                matched=_matches(signals, ["customer", "solution", "consult", "poc", "delivery", "沟通", "方案", "客户", "交付"]),
                default="explore",
            ),
            rationale="This path is supported when the profile contains customer communication, solution material, PoC, delivery coordination, or consulting signals.",
            evidence=[
                _jd_evidence("jd-solution", "Sample JD trend reference", "Solution-assistant samples emphasize customer scenarios, PoC scope, demo scripts, handoff lists, and delivery boundaries.", "sample:industry-ai-solution-assistant"),
                _user_evidence(signals),
                _risk_evidence(),
            ],
            risk_notes=[
                "Do not promise delivery outcome, implementation timeline, cost, or sales conversion.",
                "Keep the generated material as a trial brief, not an enterprise delivery plan.",
            ],
            suggested_project_types=["document_qa", "knowledge_base", "workflow_automation"],
            next_trial_action="Generate a PoC brief trial package only from an approved reference project.",
        ),
        _path(
            path_id="ai-data-evaluation-assistant",
            title="AI data evaluation assistant",
            decision=_decision(
                has_profile=has_profile,
                preferred="ai-data-evaluation-assistant" in preferred_role_path_ids,
                matched=_matches(signals, ["data", "evaluation", "annotation", "test", "quality", "spreadsheet", "数据", "评测", "标注", "测试"]),
                default="explore",
            ),
            rationale="This path is exploratory unless the profile includes data handling, annotation, QA, testing, or evaluation signals.",
            evidence=[
                _jd_evidence("jd-data-eval", "Sample JD trend reference", "Data/evaluation samples emphasize labeling guidelines, QA routes, error analysis, and metric summaries.", "sample:ai-data-evaluation-assistant"),
                _user_evidence(signals),
                _risk_evidence(),
            ],
            risk_notes=[
                "Do not claim model-quality conclusions or replace professional evaluation.",
                "Use the path for trial task design, not algorithm evaluation certification.",
            ],
            suggested_project_types=["data_annotation", "model_evaluation", "dashboard_analytics"],
            next_trial_action="Wait for an approved data/evaluation reference project before generating a full trial package.",
        ),
        _path(
            path_id="ai-application-ops-implementation-assistant",
            title="AI application ops / implementation assistant",
            decision=_decision(
                has_profile=has_profile,
                preferred="ai-application-ops-implementation-assistant" in preferred_role_path_ids,
                matched=_matches(signals, ["operation", "ops", "support", "training", "sop", "implementation", "运营", "实施", "客服", "培训"]),
                default="explore",
            ),
            rationale="This path is exploratory when the profile contains operations, implementation, support, training, SOP, or knowledge-base maintenance signals.",
            evidence=[
                _jd_evidence("jd-ops", "Sample JD trend reference", "Ops/implementation samples emphasize configuration, SOP, user feedback, training material, and support workflows.", "sample:ai-application-ops-implementation-assistant"),
                _user_evidence(signals),
                _risk_evidence(),
            ],
            risk_notes=[
                "Do not claim enterprise production implementation or replace security, compliance, and ops review.",
                "Keep generated outputs as trial runbooks and checklists.",
            ],
            suggested_project_types=["customer_support_assistant", "knowledge_base", "workflow_automation"],
            next_trial_action="Wait for an approved ops/implementation reference project before generating a full trial package.",
        ),
        _path(
            path_id="algorithm-llm-engineer",
            title="Algorithm / LLM engineer",
            decision="not_recommended_short_term",
            rationale="P1-B.1 treats algorithm or LLM engineering as a longer-term gap reference unless the user provides stronger coding, ML, model-training, or engineering evidence.",
            evidence=[
                _jd_evidence("jd-algorithm", "Sample JD trend reference", "Algorithm samples usually require stronger programming, ML, model evaluation, and engineering evidence.", "sample:algorithm-llm-engineer"),
                _user_evidence(signals),
                _risk_evidence(),
            ],
            risk_notes=[
                "Do not turn a public reference project review into an algorithm-engineering experience claim.",
                "Do not output fit, probability, or ability certification.",
            ],
            suggested_project_types=[],
            next_trial_action="Treat this as a learning gap reference, not as a generated trial package path.",
        ),
    ]
    return paths


def _build_project_matches(paths: list[RolePathRecommendation]) -> list[ProjectMatch]:
    projects = list_approved_projects()
    matches: list[ProjectMatch] = []
    for path in paths:
        for project in projects:
            if path.pathId in project.rolePathIds and path.decision in {"priority_trial", "explore"}:
                matches.append(
                    ProjectMatch(
                        projectId=project.projectId,
                        rolePathId=path.pathId,
                        decision="matched_for_trial",
                        matchedRules=["approved-project-hard-gate", f"role-path:{path.pathId}"],
                        evidence=[
                            RecommendationEvidence(
                                evidenceId=f"project-{project.projectId}-{path.pathId}",
                                type="open_source_project",
                                title=f"{project.name} public reference",
                                detail="The project is manually reviewed, license verified, reference_only, and approved for trial package generation.",
                                sourceRef=f"project:{project.projectId}",
                            )
                        ],
                        boundaryNotes=project.allowedContexts + project.forbiddenClaims,
                    )
                )
            else:
                matches.append(
                    ProjectMatch(
                        projectId=project.projectId,
                        rolePathId=path.pathId,
                        decision="not_matched",
                        matchedRules=[],
                        evidence=[],
                        boundaryNotes=["No approved trial template is available for this path in P1-B.1."],
                    )
                )
    return matches


def _decision(*, has_profile: bool, preferred: bool, matched: bool, default: str) -> str:
    if not has_profile:
        return "insufficient_information"
    if preferred or matched:
        return "priority_trial" if default == "priority_trial" else "explore"
    return default


def _matches(signals: list[UserProfileSignal], keywords: list[str]) -> bool:
    text = " ".join(signal.evidenceText.lower() for signal in signals)
    return any(keyword.lower() in text for keyword in keywords)


def _path(
    *,
    path_id: str,
    title: str,
    decision: str,
    rationale: str,
    evidence: list[RecommendationEvidence],
    risk_notes: list[str],
    suggested_project_types: list[str],
    next_trial_action: str,
) -> RolePathRecommendation:
    return RolePathRecommendation(
        pathId=path_id,
        title=title,
        decision=decision,  # type: ignore[arg-type]
        rationale=rationale,
        evidence=evidence,
        riskNotes=risk_notes,
        suggestedProjectTypes=suggested_project_types,
        nextTrialAction=next_trial_action,
    )


def _jd_evidence(evidence_id: str, title: str, detail: str, source_ref: str) -> RecommendationEvidence:
    return RecommendationEvidence(
        evidenceId=evidence_id,
        type="jd_sample",
        title=title,
        detail=detail,
        sourceRef=source_ref,
    )


def _user_evidence(signals: list[UserProfileSignal]) -> RecommendationEvidence:
    first_signal = signals[0]
    return RecommendationEvidence(
        evidenceId="user-profile-signal",
        type="user_profile",
        title="User-authorized profile signal",
        detail=first_signal.evidenceText,
        sourceRef=f"userProfile:{first_signal.sourceField}",
    )


def _risk_evidence() -> RecommendationEvidence:
    return RecommendationEvidence(
        evidenceId="risk-boundary",
        type="risk",
        title="Scope boundary",
        detail="The result is a trial-path suggestion with evidence notes, not a score, ranking, ability certification, or hiring prediction.",
        sourceRef="scope:p1b-rule-first",
    )


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
