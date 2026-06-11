from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import PROJECT_ROOT
from app.schemas.pathfinder import (
    RecommendationRun,
    TrialPackageCandidate,
    TrialPackageGeneratedFrom,
    TrialQuestionCandidate,
)
from app.services.pathfinder_project_service import (
    OPENDOCUMENTS_PROJECT_ID,
    get_approved_project,
    load_project_matching_fixture,
)


_TRIAL_PACKAGE_FIXTURE = (
    PROJECT_ROOT / "data" / "pathfinder" / "trial-packages" / "p1a-opendocuments-engineering-kb.json"
)


def generate_trial_package_candidate(
    *,
    recommendation_run: RecommendationRun,
    selected_path_id: str,
    selected_project_id: str,
) -> TrialPackageCandidate:
    source_project = get_approved_project(selected_project_id)
    target_path = next((path for path in recommendation_run.paths if path.pathId == selected_path_id), None)
    if target_path is None:
        raise ValueError("Selected path is not part of this recommendation run.")
    if selected_path_id not in source_project.rolePathIds:
        raise ValueError("Selected project is not approved for the selected path.")
    if not any(
        match.projectId == selected_project_id
        and match.rolePathId == selected_path_id
        and match.decision == "matched_for_trial"
        for match in recommendation_run.projectMatches
    ):
        raise ValueError("Selected path and project are not matched for trial generation.")

    fixture = _trial_package_fixture() if selected_project_id == OPENDOCUMENTS_PROJECT_ID else _generic_trial_template()
    title = str(
        fixture.get("title")
        or source_project.name
        or "Audited project reference trial package"
    )
    if selected_project_id != OPENDOCUMENTS_PROJECT_ID:
        title = f"{source_project.name} - {title}"

    return TrialPackageCandidate(
        trialPackageId=str(fixture.get("trialPackageId") or f"p1c-{selected_project_id}-{selected_path_id}-trial"),
        trialPackageVersion=str(fixture.get("version") or "1.0.0"),
        generatedFrom=TrialPackageGeneratedFrom(
            recommendationRunId=recommendation_run.recommendationRunId,
            selectedPathId=selected_path_id,
            selectedProjectId=selected_project_id,
            ruleVersion=recommendation_run.ruleVersion.version,
        ),
        title=title,
        targetRolePath=target_path,
        sourceProject=source_project,
        trialQuestions=_trial_questions(fixture.get("fixedQuestions")),
        requiredMarkdownSections=list(fixture.get("requiredMarkdownSections") or []),
        forbiddenClaims=_dedupe_strings(list(fixture.get("forbiddenClaims") or []) + source_project.forbiddenClaims),
        sampleJdDisclaimer=_trial_disclaimer(fixture, source_project),
    )


@lru_cache(maxsize=1)
def _trial_package_fixture() -> dict[str, Any]:
    with _TRIAL_PACKAGE_FIXTURE.open("r", encoding="utf-8") as file:
        value = json.load(file)
    return value if isinstance(value, dict) else {}


def _generic_trial_template() -> dict[str, Any]:
    raw_template = load_project_matching_fixture().get("genericTrialTemplate")
    return raw_template if isinstance(raw_template, dict) else {}


def _trial_questions(raw_questions: Any) -> list[TrialQuestionCandidate]:
    if not isinstance(raw_questions, list):
        return []
    questions: list[TrialQuestionCandidate] = []
    for question in raw_questions:
        if not isinstance(question, dict):
            continue
        questions.append(
            TrialQuestionCandidate(
                questionId=str(question.get("questionId") or ""),
                title=str(question.get("title") or ""),
                prompt=str(question.get("prompt") or ""),
                required=bool(question.get("required", True)),
            )
        )
    return questions


def _trial_disclaimer(fixture: dict[str, Any], source_project) -> str:
    base_notice = str(
        fixture.get("sampleJdNotice")
        or fixture.get("disclaimer")
        or "Sample JD trend reference only; not a concrete company requirement or hiring judgment."
    )
    source_boundary = "; ".join(source_project.allowedContexts[:2])
    return (
        f"{base_notice} License boundary for {source_project.name}: {source_project.license}. "
        f"Source boundary: {source_boundary}"
    )


def _dedupe_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result
