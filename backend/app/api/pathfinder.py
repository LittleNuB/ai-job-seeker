from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Annotated, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.middleware.auth import get_current_user, security
from app.models.analysis import AnalysisRecord
from app.schemas.pathfinder import (
    PATHFINDER_TYPE,
    P1A_TRIAL_PACKAGE,
    P1B_SCHEMA_VERSION,
    SCHEMA_VERSION,
    TRIAL_PACKAGE_ID,
    TRIAL_PACKAGE_VERSION,
    AntiPackagingCheck,
    AntiPackagingCheckStatus,
    GenerateTrialPackageRequest,
    GenerateTrialPackageResponse,
    MarkdownExportScope,
    MarkdownSnapshot,
    PathfinderCreateRequest,
    PathfinderCreateResponse,
    PathfinderProjectsResponse,
    PathfinderRecordResponse,
    PathfinderRecordStatus,
    PathfinderRecommendationRequest,
    PathfinderRecommendationResponse,
    PathfinderResultRequest,
    PathfinderResultResponse,
    PathfinderTrialAnswersResponse,
    RecommendationRun,
    TrailRecord,
    TrialAnswersRequest,
    all_required_markdown_sections_present,
    are_trial_answers_complete,
    compute_pathfinder_status,
    default_anti_packaging_check,
    default_trial_answers,
    normalize_trial_answers,
    pydantic_to_json,
)
from app.services.pathfinder_project_service import list_approved_projects
from app.services.pathfinder_recommendation_service import SCOPE_DISCLAIMER, build_recommendation_run
from app.services.pathfinder_trial_package_service import generate_trial_package_candidate

router = APIRouter(prefix="/api/pathfinder", tags=["pathfinder"])

SessionDep = Annotated[AsyncSession, Depends(get_db)]


async def get_pathfinder_user_id(
    session: SessionDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)] = None,
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> str:
    """Prefer JWT auth; keep X-User-Id only as a non-production demo fallback."""
    if credentials is not None:
        return await get_current_user(credentials=credentials, db=session)

    if x_user_id and not get_settings().is_production:
        return x_user_id

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录")


UserIdDep = Annotated[str, Depends(get_pathfinder_user_id)]


@router.post("/recommendations", response_model=PathfinderRecommendationResponse)
async def create_pathfinder_recommendations(
    payload: PathfinderRecommendationRequest,
    session: SessionDep,
    user_id: UserIdDep,
) -> PathfinderRecommendationResponse:
    recommendation_run = build_recommendation_run(
        payload.userProfile,
        preferred_role_path_ids=payload.preferredRolePathIds,
        rule_version_override=payload.ruleVersion,
    )
    record = AnalysisRecord(
        id=recommendation_run.recommendationRunId,
        user_id=user_id,
        type=PATHFINDER_TYPE,
        input_text=_dump_json(
            {
                "schemaVersion": P1B_SCHEMA_VERSION,
                "recordKind": "recommendation_run",
                "userProfileSnapshot": _jsonable(payload.userProfile),
                "preferredRolePathIds": payload.preferredRolePathIds,
                "constraints": payload.constraints,
            }
        ),
        input_file_url=None,
        result=_dump_json(
            {
                "schemaVersion": P1B_SCHEMA_VERSION,
                "recordKind": "recommendation_run",
                "recommendationRun": _jsonable(recommendation_run),
                "scopeDisclaimer": SCOPE_DISCLAIMER,
                "updatedAt": _now_iso(),
            }
        ),
        match_score=None,
    )
    session.add(record)
    await session.commit()

    return PathfinderRecommendationResponse(
        recommendationRun=recommendation_run,
        profileSignals=recommendation_run.profileSignals,
        paths=recommendation_run.paths,
        projectMatches=recommendation_run.projectMatches,
        scopeDisclaimer=SCOPE_DISCLAIMER,
    )


@router.get("/projects", response_model=PathfinderProjectsResponse)
async def list_pathfinder_projects(
    user_id: UserIdDep,
    rolePathId: str | None = Query(default=None),
    capabilityTag: str | None = Query(default=None),
    statusFilter: str | None = Query(default=None, alias="status"),
) -> PathfinderProjectsResponse:
    _ = user_id
    projects = list_approved_projects(
        role_path_id=rolePathId,
        capability_tag=capabilityTag,
        status_filter=statusFilter,
    )
    return PathfinderProjectsResponse(
        projects=projects,
        dataBoundary=(
            "Only manually reviewed approved_for_trial_package projects are returned to users. "
            "Candidate, pending, and needs_review records are excluded from generation."
        ),
    )


@router.post("/trial-packages/generate", response_model=GenerateTrialPackageResponse)
async def generate_pathfinder_trial_package(
    payload: GenerateTrialPackageRequest,
    session: SessionDep,
    user_id: UserIdDep,
) -> GenerateTrialPackageResponse:
    record = await _get_owned_recommendation_record(session, user_id, payload.recommendationRunId)
    result_payload = _load_result(record)
    raw_run = result_payload.get("recommendationRun")
    if not isinstance(raw_run, dict):
        raise HTTPException(status_code=404, detail="Recommendation run not found")
    try:
        recommendation_run = RecommendationRun.model_validate(raw_run)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail="Invalid recommendation run snapshot") from exc

    recommendation_run = recommendation_run.model_copy(
        update={
            "selectedPathId": payload.selectedPathId,
            "selectedProjectId": payload.selectedProjectId,
        }
    )
    try:
        trial_package = generate_trial_package_candidate(
            recommendation_run=recommendation_run,
            selected_path_id=payload.selectedPathId,
            selected_project_id=payload.selectedProjectId,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    anti_packaging = default_anti_packaging_check()
    record.input_text = _dump_json(
        {
            **_load_input(record),
            "selectedPathId": payload.selectedPathId,
            "selectedProjectId": payload.selectedProjectId,
            "trialPackageSnapshot": _jsonable(trial_package),
        }
    )
    record.result = _dump_json(
        {
            "schemaVersion": P1B_SCHEMA_VERSION,
            "recordKind": "trial_package_candidate",
            "recommendationRun": _jsonable(recommendation_run),
            "trialPackageCandidate": _jsonable(trial_package),
            "antiPackagingDefaults": _jsonable(anti_packaging),
            "scopeDisclaimer": SCOPE_DISCLAIMER,
            "updatedAt": _now_iso(),
        }
    )
    await session.commit()

    return GenerateTrialPackageResponse(
        trialPackageCandidate=trial_package,
        antiPackagingDefaults=anti_packaging,
    )


@router.post(
    "/records",
    response_model=PathfinderCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_pathfinder_record(
    payload: PathfinderCreateRequest,
    session: SessionDep,
    user_id: UserIdDep,
) -> PathfinderCreateResponse:
    now = _now_iso()
    anti_check = default_anti_packaging_check()
    trial_answers = default_trial_answers()
    selected_path_id = payload.selectedPathId or _selected_path_id_from_snapshot(payload.selectedPath)
    trial_package_snapshot = payload.trialPackageSnapshot or P1A_TRIAL_PACKAGE
    result_payload = {
        "schemaVersion": SCHEMA_VERSION,
        "status": PathfinderRecordStatus.draft.value,
        "trialAnswers": [answer.model_dump(mode="json", exclude_none=True) for answer in trial_answers],
        "antiPackagingCheck": anti_check.model_dump(mode="json", exclude_none=True),
        "updatedAt": now,
    }

    record = AnalysisRecord(
        id=str(uuid4()),
        user_id=user_id,
        type=PATHFINDER_TYPE,
        input_text=_dump_json(
            {
                "schemaVersion": SCHEMA_VERSION,
                "trialPackageId": payload.trialPackageId,
                "trialPackageVersion": payload.trialPackageVersion,
                "selectedPathId": selected_path_id,
                "selectedPath": _jsonable(payload.selectedPath),
                "userProfileSnapshot": _jsonable(payload.userProfileSnapshot),
                "trialPackageSnapshot": _jsonable(trial_package_snapshot),
            }
        ),
        input_file_url=None,
        result=_dump_json(result_payload),
        match_score=None,
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)

    return _to_record_response(record)


@router.get("/records/{record_id}", response_model=PathfinderRecordResponse)
async def get_pathfinder_record(
    record_id: str,
    session: SessionDep,
    user_id: UserIdDep,
) -> PathfinderRecordResponse:
    record = await _get_owned_pathfinder_record(session, user_id, record_id)
    return _to_record_response(record)


@router.patch("/records/{record_id}/trial-answers", response_model=PathfinderTrialAnswersResponse)
async def update_trial_answers(
    record_id: str,
    payload: TrialAnswersRequest,
    session: SessionDep,
    user_id: UserIdDep,
) -> PathfinderTrialAnswersResponse:
    record = await _get_owned_pathfinder_record(session, user_id, record_id)
    result_payload = _load_result(record)
    trial_answers = normalize_trial_answers(payload.trialAnswers)
    anti_check = _extract_anti_packaging_check(result_payload)
    updated_at = _now_iso()
    next_status = compute_pathfinder_status(trial_answers, anti_check, markdown_snapshot=None)

    next_result = {
        "schemaVersion": SCHEMA_VERSION,
        "status": next_status.value,
        "trialAnswers": [answer.model_dump(mode="json", exclude_none=True) for answer in trial_answers],
        "antiPackagingCheck": anti_check.model_dump(mode="json", exclude_none=True),
        "updatedAt": updated_at,
    }
    if portfolio_draft := result_payload.get("portfolioDraft"):
        next_result["portfolioDraft"] = portfolio_draft
    if interview_prep := result_payload.get("interviewPrep"):
        next_result["interviewPrep"] = interview_prep
    if evidence_mapping := result_payload.get("evidenceMapping"):
        next_result["evidenceMapping"] = evidence_mapping

    record.result = _dump_json(next_result)

    await session.commit()
    await session.refresh(record)

    return PathfinderTrialAnswersResponse(
        recordId=record.id,
        status=next_status,
        trialAnswers=trial_answers,
        updatedAt=updated_at,
    )


@router.put("/records/{record_id}/result", response_model=PathfinderResultResponse)
async def save_pathfinder_result(
    record_id: str,
    payload: PathfinderResultRequest,
    session: SessionDep,
    user_id: UserIdDep,
) -> PathfinderResultResponse:
    record = await _get_owned_pathfinder_record(session, user_id, record_id)
    current_result = _load_result(record)
    trial_answers = normalize_trial_answers(payload.trialAnswers) if payload.trialAnswers is not None else _extract_trial_answers(current_result)
    anti_check = payload.antiPackagingCheck
    markdown_snapshot = payload.markdownSnapshot

    _validate_markdown_snapshot_save(trial_answers, anti_check, markdown_snapshot)

    updated_at = _now_iso()
    next_status = compute_pathfinder_status(trial_answers, anti_check, markdown_snapshot)
    next_result: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "status": next_status.value,
        "trialAnswers": [answer.model_dump(mode="json", exclude_none=True) for answer in trial_answers],
        "antiPackagingCheck": anti_check.model_dump(mode="json", exclude_none=True),
        "updatedAt": updated_at,
    }

    for key, value in (
        ("evidenceMapping", _jsonable(payload.evidenceMapping)),
        ("portfolioDraft", pydantic_to_json(payload.portfolioDraft)),
        ("interviewPrep", pydantic_to_json(payload.interviewPrep)),
        ("markdownSnapshot", pydantic_to_json(markdown_snapshot)),
    ):
        if value is not None:
            next_result[key] = value

    record.result = _dump_json(next_result)

    await session.commit()
    await session.refresh(record)

    return PathfinderResultResponse(
        recordId=record.id,
        status=next_status,
        markdownSnapshotSaved=markdown_snapshot is not None,
        updatedAt=updated_at,
    )


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pathfinder_record(
    record_id: str,
    session: SessionDep,
    user_id: UserIdDep,
) -> Response:
    record = await _get_owned_pathfinder_record(session, user_id, record_id)
    await session.delete(record)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _get_owned_pathfinder_record(
    session: AsyncSession,
    user_id: str,
    record_id: str,
) -> AnalysisRecord:
    result = await session.execute(
        select(AnalysisRecord).where(
            AnalysisRecord.id == record_id,
            AnalysisRecord.user_id == user_id,
            AnalysisRecord.type == PATHFINDER_TYPE,
        )
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pathfinder record not found")
    return record


async def _get_owned_recommendation_record(
    session: AsyncSession,
    user_id: str,
    recommendation_run_id: str,
) -> AnalysisRecord:
    result = await session.execute(
        select(AnalysisRecord).where(
            AnalysisRecord.id == recommendation_run_id,
            AnalysisRecord.user_id == user_id,
            AnalysisRecord.type == PATHFINDER_TYPE,
        )
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recommendation run not found")
    return record


def _to_record_response(record: AnalysisRecord) -> TrailRecord:
    input_payload = _load_input(record)
    result_payload = _load_result(record)

    if input_payload.get("schemaVersion") == SCHEMA_VERSION or result_payload.get("schemaVersion") == SCHEMA_VERSION:
        return _to_p1a_record_response(record, input_payload, result_payload)
    return _to_legacy_record_response(record, input_payload, result_payload)


def _to_p1a_record_response(
    record: AnalysisRecord,
    input_payload: dict[str, Any],
    result_payload: dict[str, Any],
) -> TrailRecord:
    trial_answers = _extract_trial_answers(result_payload)
    anti_check = _extract_anti_packaging_check(result_payload)
    markdown_snapshot = _extract_markdown_snapshot(result_payload.get("markdownSnapshot"), record)
    status_value = compute_pathfinder_status(trial_answers, anti_check, markdown_snapshot)

    return TrailRecord(
        schemaVersion=SCHEMA_VERSION,
        recordId=record.id,
        trialPackageId=str(input_payload.get("trialPackageId") or TRIAL_PACKAGE_ID),
        trialPackageVersion=str(input_payload.get("trialPackageVersion") or TRIAL_PACKAGE_VERSION),
        status=status_value,
        userProfileSnapshot=input_payload.get(
            "userProfileSnapshot",
            input_payload.get("candidateProfile") or {},
        ),
        selectedPathId=str(input_payload.get("selectedPathId") or _selected_path_id_from_snapshot(input_payload.get("selectedPath"))),
        selectedPath=input_payload.get("selectedPath"),
        evidenceMapping=result_payload.get("evidenceMapping"),
        trialAnswers=trial_answers,
        antiPackagingCheck=anti_check,
        portfolioDraft=result_payload.get("portfolioDraft"),
        interviewPrep=result_payload.get("interviewPrep"),
        markdownSnapshot=markdown_snapshot,
        createdAt=_format_dt(record.created_at),
        updatedAt=result_payload.get("updatedAt") or _format_dt(record.created_at),
    )


def _to_legacy_record_response(
    record: AnalysisRecord,
    input_payload: dict[str, Any],
    result_payload: dict[str, Any],
) -> TrailRecord:
    trial_answers = _extract_trial_answers(result_payload)
    anti_check = default_anti_packaging_check()
    markdown_snapshot = _extract_markdown_snapshot(result_payload.get("markdownSnapshot"), record)

    return TrailRecord(
        schemaVersion=SCHEMA_VERSION,
        recordId=record.id,
        trialPackageId=str(input_payload.get("trialPackageId") or input_payload.get("demoVersion") or TRIAL_PACKAGE_ID),
        trialPackageVersion=TRIAL_PACKAGE_VERSION,
        status=_infer_legacy_status(trial_answers, markdown_snapshot),
        userProfileSnapshot=input_payload.get("candidateProfile") or input_payload.get("userProfileSnapshot") or {},
        selectedPathId=str(input_payload.get("selectedPathId") or _selected_path_id_from_snapshot(input_payload.get("selectedPath"))),
        selectedPath=input_payload.get("selectedPath"),
        evidenceMapping=result_payload.get("evidenceMapping"),
        trialAnswers=trial_answers,
        antiPackagingCheck=anti_check,
        markdownSnapshot=markdown_snapshot,
        createdAt=_format_dt(record.created_at),
        updatedAt=_format_dt(record.created_at),
    )


def _extract_trial_answers(result_payload: dict[str, Any]) -> list:
    return normalize_trial_answers(result_payload.get("trialAnswers") or result_payload.get("answers") or {})


def _extract_anti_packaging_check(result_payload: dict[str, Any]) -> AntiPackagingCheck:
    raw_value = result_payload.get("antiPackagingCheck") or result_payload.get("antiPackagingResult")
    if not isinstance(raw_value, dict):
        return default_anti_packaging_check()
    try:
        return AntiPackagingCheck.model_validate(raw_value)
    except ValidationError:
        return default_anti_packaging_check()


def _extract_markdown_snapshot(raw_value: Any, record: AnalysisRecord) -> MarkdownSnapshot | None:
    if isinstance(raw_value, MarkdownSnapshot):
        return raw_value
    if isinstance(raw_value, dict):
        try:
            return MarkdownSnapshot.model_validate(raw_value)
        except ValidationError:
            return None
    if isinstance(raw_value, str) and raw_value.strip():
        return MarkdownSnapshot(
            templateSource="frontend",
            templateVersion="legacy-p0",
            exportScope=MarkdownExportScope.full,
            content=raw_value,
            createdAt=_format_dt(record.created_at) or _now_iso(),
        )
    return None


def _validate_markdown_snapshot_save(
    trial_answers: list,
    anti_check: AntiPackagingCheck,
    markdown_snapshot: MarkdownSnapshot | None,
) -> None:
    if markdown_snapshot is None or markdown_snapshot.exportScope != MarkdownExportScope.full:
        return

    if not are_trial_answers_complete(trial_answers):
        raise HTTPException(
            status_code=422,
            detail="Full Markdown snapshot requires all six fixed trial answers.",
        )

    if (
        anti_check.status in {AntiPackagingCheckStatus.not_run, AntiPackagingCheckStatus.blocked}
        or anti_check.blockingCount > 0
        or anti_check.exportAllowed is False
    ):
        raise HTTPException(
            status_code=422,
            detail="Full Markdown snapshot is blocked by AntiPackagingCheck.",
        )

    if not all_required_markdown_sections_present(anti_check):
        raise HTTPException(
            status_code=422,
            detail="Full Markdown snapshot requires all required Markdown sections.",
        )


def _infer_legacy_status(
    trial_answers: list,
    markdown_snapshot: MarkdownSnapshot | None,
) -> PathfinderRecordStatus:
    if not any(answer.answer.strip() for answer in trial_answers):
        return PathfinderRecordStatus.draft
    if not are_trial_answers_complete(trial_answers):
        return PathfinderRecordStatus.answers_incomplete
    if markdown_snapshot is not None and markdown_snapshot.exportScope == MarkdownExportScope.full:
        return PathfinderRecordStatus.exported
    return PathfinderRecordStatus.ready_to_export


def _load_input(record: AnalysisRecord) -> dict[str, Any]:
    return _load_json_object(record.input_text, default={})


def _load_result(record: AnalysisRecord) -> dict[str, Any]:
    return _load_json_object(record.result, default={})


def _load_json_object(value: str | None, default: dict[str, Any]) -> dict[str, Any]:
    if not value:
        return dict(default)
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return dict(default)
    return parsed if isinstance(parsed, dict) else dict(default)


def _dump_json(value: dict[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _format_dt(value: Any) -> str | None:
    return value.isoformat() if value is not None else None


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _selected_path_id_from_snapshot(value: Any) -> str:
    if isinstance(value, dict) and value.get("id"):
        return str(value["id"])
    return "industry-ai-product-assistant"


def _jsonable(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json", exclude_none=True)
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {key: _jsonable(child) for key, child in value.items()}
    return value
