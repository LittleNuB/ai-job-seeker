from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Annotated, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Response, UploadFile, status
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
    P1C_SCHEMA_VERSION,
    P1B_SCHEMA_VERSION,
    SCHEMA_VERSION,
    TRIAL_PACKAGE_ID,
    TRIAL_PACKAGE_VERSION,
    AntiPackagingCheck,
    AntiPackagingCheckStatus,
    GenerateTrialPackageRequest,
    GenerateTrialPackageResponse,
    ConfirmedSignalsRequest,
    ExtractedProfileSignal,
    InterviewMessage,
    InterviewSession,
    InterviewSessionCreateRequest,
    InterviewSessionResponse,
    InterviewTurnRequest,
    InterviewTurnResponse,
    MarkdownExportScope,
    MarkdownSnapshot,
    PathfinderCreateRequest,
    PathfinderCreateResponse,
    PathfinderProjectsResponse,
    PathfinderRecordResponse,
    PathfinderRecordStatus,
    PathfinderRecommendationRequest,
    PathfinderRecommendationResponse,
    PathfinderResumeParseResponse,
    PathfinderResultRequest,
    PathfinderResultResponse,
    PathfinderTrialAnswersResponse,
    RecommendationRun,
    SignalConfirmation,
    SignalExtractionResult,
    TrailRecord,
    TrialAnswersRequest,
    all_required_markdown_sections_present,
    are_trial_answers_complete,
    compute_pathfinder_status,
    default_anti_packaging_check,
    default_trial_answers,
    find_forbidden_keys,
    normalize_trial_answers,
    pydantic_to_json,
)
from app.services.pathfinder_interview_client import DeepSeekInterviewClient, InterviewModelJSONError, InterviewModelResult
from app.services.file_parser import extract_resume_text
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


def get_interview_llm_client() -> DeepSeekInterviewClient:
    return DeepSeekInterviewClient()


InterviewClientDep = Annotated[DeepSeekInterviewClient, Depends(get_interview_llm_client)]

RESUME_PARSE_ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "txt", "md"}
RESUME_PARSE_MAX_FILE_SIZE = 10 * 1024 * 1024
RESUME_PARSE_MIN_TEXT_LENGTH = 80
RESUME_PARSE_MODEL_TEXT_LIMIT = 30000
RESUME_SIGNAL_EVIDENCE_LIMIT = 180
RESUME_REQUIRED_SIGNAL_TYPES = (
    "background_source",
    "real_experience",
    "concrete_action",
    "tool_exposure",
    "career_goal",
    "constraint_or_self_awareness",
)
RESUME_ACTION_KEYWORDS = (
    "负责",
    "参与",
    "主导",
    "搭建",
    "开发",
    "设计",
    "整理",
    "分析",
    "推进",
    "优化",
    "交付",
    "built",
    "developed",
    "implemented",
    "led",
    "owned",
    "managed",
    "analyzed",
    "created",
)

CHINESE_INTERVIEW_FALLBACK_QUESTIONS = [
    (
        "请先讲一个你亲自参与过的真实项目或流程场景：当时要解决什么问题，"
        "你具体负责哪一部分？"
    ),
    "这个经历里你主要和谁协作？你需要理解或影响哪些人的需求、流程或决策？",
    "你当时处理了哪些资料、数据、文档或工具？最后形成了什么可展示的产出？",
    "这个过程中最难的一点是什么？你当时怎么判断、推进或调整？",
    (
        "如果把这段经历用于 AI 求职试航，哪些内容可以如实展示，"
        "哪些内容需要脱敏、人工核验或明确不能声称？"
    ),
]
MOJIBAKE_MARKERS = ("鎴", "璇", "鐢", "锛", "€", "涓")


@router.post("/resume/parse", response_model=PathfinderResumeParseResponse)
async def parse_pathfinder_resume(
    user_id: UserIdDep,
    llm_client: InterviewClientDep,
    file: UploadFile = File(...),
    source: str = Form(default="resume_upload"),
) -> PathfinderResumeParseResponse:
    _ = user_id
    if source != "resume_upload":
        raise HTTPException(status_code=422, detail="source must be resume_upload")

    filename = file.filename or "resume"
    ext = _file_extension(filename)
    if ext not in RESUME_PARSE_ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="请上传 PDF、Word、TXT 或 Markdown 简历文件")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="上传文件为空")
    if len(content) > RESUME_PARSE_MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="简历文件不能超过 10MB")

    try:
        resume_text, file_type = await extract_resume_text(content, filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail="简历解析失败，请转换为 PDF、DOCX、TXT 或 Markdown 后重试") from exc

    resume_text = _normalize_resume_text(resume_text)
    text_length = len(resume_text)
    if text_length < RESUME_PARSE_MIN_TEXT_LENGTH:
        raise HTTPException(status_code=400, detail="简历文本太短，暂时无法整理背景信号，请补充项目经历、工具使用和求职目标后重试")

    model_text = resume_text[:RESUME_PARSE_MODEL_TEXT_LIMIT]
    model_status = "fallback"
    model_provider = "deepseek"
    model_name = getattr(llm_client, "model", None)
    signals: list[ExtractedProfileSignal] = []

    try:
        model_result = await llm_client.extract_resume_signals(model_text)
    except InterviewModelJSONError:
        model_result = InterviewModelResult(status="invalid_json", payload={}, error="invalid_json")
    except Exception:
        model_result = InterviewModelResult(status="error", payload={}, error="model_error")

    model_provider = model_result.provider
    model_name = model_result.model
    if model_result.status == "ok":
        try:
            signals = _resume_signals_from_model_result(model_result)
        except ValueError:
            signals = []
        else:
            model_status = "ok" if signals else "fallback"

    if not signals:
        signals = _fallback_resume_signals(model_text)
        model_status = "fallback"

    readiness, missing_signal_types = _compute_resume_readiness(signals)
    return PathfinderResumeParseResponse(
        source="resume_upload",
        fileName=filename,
        fileType=file_type if file_type in RESUME_PARSE_ALLOWED_EXTENSIONS else ext,
        textLength=text_length,
        modelProvider=model_provider,
        modelName=model_name,
        modelStatus=model_status,
        signals=signals,
        readiness=readiness,
        missingSignalTypes=missing_signal_types,
        userMessage=_resume_user_message(model_status, readiness, missing_signal_types, text_length),
    )


@router.post(
    "/interview/sessions",
    response_model=InterviewSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_interview_session(
    payload: InterviewSessionCreateRequest,
    session: SessionDep,
    user_id: UserIdDep,
    llm_client: InterviewClientDep,
) -> InterviewSessionResponse:
    now = _now_iso()
    messages: list[InterviewMessage] = []
    if payload.initialUserInput and payload.initialUserInput.strip():
        messages.append(_new_interview_message("user", payload.initialUserInput.strip(), created_at=now))

    assistant_message = await _build_assistant_message(llm_client, messages)
    messages.append(assistant_message)

    interview_session = InterviewSession(
        sessionId=str(uuid4()),
        status="active",
        userProfileSnapshot=_jsonable(payload.userProfileSnapshot),
        messages=messages,
        extractedSignals=[],
        confirmedSignals=[],
        llmStatus=assistant_message.modelStatus or "fallback",
        createdAt=now,
        updatedAt=assistant_message.createdAt,
    )
    record = AnalysisRecord(
        id=interview_session.sessionId,
        user_id=user_id,
        type=PATHFINDER_TYPE,
        input_text=_dump_json(
            {
                "schemaVersion": P1C_SCHEMA_VERSION,
                "recordKind": "interview_session",
                "initialUserInput": payload.initialUserInput,
                "userProfileSnapshot": _jsonable(payload.userProfileSnapshot),
                "createdAt": now,
            }
        ),
        input_file_url=None,
        result=_dump_json(_interview_session_to_result(interview_session)),
        match_score=None,
    )
    session.add(record)
    await session.commit()

    return interview_session


@router.get("/interview/sessions/{session_id}", response_model=InterviewSessionResponse)
async def get_interview_session(
    session_id: str,
    session: SessionDep,
    user_id: UserIdDep,
) -> InterviewSessionResponse:
    record = await _get_owned_interview_record(session, user_id, session_id)
    return _to_interview_session(record)


@router.post("/interview/sessions/{session_id}/turns", response_model=InterviewTurnResponse)
async def add_interview_turn(
    session_id: str,
    payload: InterviewTurnRequest,
    session: SessionDep,
    user_id: UserIdDep,
    llm_client: InterviewClientDep,
) -> InterviewTurnResponse:
    record = await _get_owned_interview_record(session, user_id, session_id)
    interview_session = _to_interview_session(record)
    user_message = _new_interview_message("user", payload.message)
    next_messages = [*interview_session.messages, user_message]
    assistant_message = await _build_assistant_message(llm_client, next_messages)
    interview_session.messages = [*next_messages, assistant_message]
    interview_session.llmStatus = assistant_message.modelStatus or "fallback"
    interview_session.updatedAt = assistant_message.createdAt
    interview_session.status = "active"

    record.result = _dump_json(_interview_session_to_result(interview_session))
    await session.commit()

    return InterviewTurnResponse(
        sessionId=session_id,
        assistantMessage=assistant_message,
        session=interview_session,
    )


@router.post("/interview/sessions/{session_id}/signals", response_model=SignalExtractionResult)
async def extract_interview_signals(
    session_id: str,
    session: SessionDep,
    user_id: UserIdDep,
    llm_client: InterviewClientDep,
) -> SignalExtractionResult:
    record = await _get_owned_interview_record(session, user_id, session_id)
    interview_session = _to_interview_session(record)
    model_messages = [_message_for_model(message) for message in interview_session.messages]
    extracted_at = _now_iso()
    try:
        model_result = await llm_client.extract_signals(model_messages)
    except InterviewModelJSONError:
        extraction = SignalExtractionResult(
            sessionId=session_id,
            modelStatus="invalid_json",
            signals=[],
            summary="Model returned invalid JSON; no signals were accepted.",
            fallbackReason="invalid_json",
            createdAt=extracted_at,
        )
    else:
        extraction = _build_signal_extraction(session_id, model_result, extracted_at)

    interview_session.lastExtraction = extraction
    interview_session.extractedSignals = extraction.signals
    interview_session.llmStatus = extraction.modelStatus
    interview_session.status = "signals_extracted" if extraction.signals else "active"
    interview_session.updatedAt = extraction.createdAt
    record.result = _dump_json(_interview_session_to_result(interview_session))
    await session.commit()

    return extraction


@router.put("/interview/sessions/{session_id}/confirmed-signals", response_model=InterviewSessionResponse)
async def update_confirmed_interview_signals(
    session_id: str,
    payload: ConfirmedSignalsRequest,
    session: SessionDep,
    user_id: UserIdDep,
) -> InterviewSessionResponse:
    record = await _get_owned_interview_record(session, user_id, session_id)
    interview_session = _to_interview_session(record)
    interview_session.confirmedSignals = payload.confirmedSignals
    interview_session.status = "signals_confirmed"
    interview_session.updatedAt = _now_iso()
    record.result = _dump_json(_interview_session_to_result(interview_session))
    await session.commit()

    return interview_session


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


async def _get_owned_interview_record(
    session: AsyncSession,
    user_id: str,
    session_id: str,
) -> AnalysisRecord:
    result = await session.execute(
        select(AnalysisRecord).where(
            AnalysisRecord.id == session_id,
            AnalysisRecord.user_id == user_id,
            AnalysisRecord.type == PATHFINDER_TYPE,
        )
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")
    input_payload = _load_input(record)
    result_payload = _load_result(record)
    if input_payload.get("recordKind") != "interview_session" and result_payload.get("recordKind") != "interview_session":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")
    return record


def _file_extension(filename: str | None) -> str:
    if not filename or "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def _normalize_resume_text(text: str) -> str:
    lines = [line.strip() for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    return "\n".join(line for line in lines if line)


def _resume_signals_from_model_result(model_result: InterviewModelResult) -> list[ExtractedProfileSignal]:
    forbidden = find_forbidden_keys(model_result.payload)
    if forbidden:
        raise ValueError("forbidden model field")

    raw_signals = model_result.payload.get("signals") if isinstance(model_result.payload, dict) else []
    if not isinstance(raw_signals, list):
        raise ValueError("signals must be a list")

    signals: list[ExtractedProfileSignal] = []
    for index, raw_signal in enumerate(raw_signals, start=1):
        if not isinstance(raw_signal, dict):
            raise ValueError("signal must be an object")
        label = str(raw_signal.get("label") or "").strip()
        evidence = str(raw_signal.get("evidenceText") or "").strip()
        if not label or not evidence:
            continue
        source_message_ids = raw_signal.get("sourceMessageIds")
        if not isinstance(source_message_ids, list) or not all(isinstance(item, str) for item in source_message_ids):
            source_message_ids = ["resume_upload"]
        signal_payload = {
            "signalId": str(raw_signal.get("signalId") or f"resume-sig-{index}"),
            "category": raw_signal.get("category"),
            "label": _truncate_resume_text(label, 80),
            "evidenceText": _truncate_resume_text(evidence, RESUME_SIGNAL_EVIDENCE_LIMIT),
            "sourceMessageIds": source_message_ids or ["resume_upload"],
            "confidence": raw_signal.get("confidence") or "needs_user_review",
            "status": "candidate",
        }
        try:
            signals.append(ExtractedProfileSignal.model_validate(signal_payload))
        except ValidationError as exc:
            raise ValueError("invalid signal") from exc
    return signals[:12]


def _fallback_resume_signals(text: str) -> list[ExtractedProfileSignal]:
    lines = _candidate_resume_lines(text)
    candidates: list[tuple[str, str, str, tuple[str, ...]]] = [
        (
            "resume-background",
            "industry_background",
            "背景来源",
            (
                "专业",
                "本科",
                "硕士",
                "学校",
                "教育",
                "行业",
                "engineering",
                "university",
                "master",
                "bachelor",
                "background",
            ),
        ),
        (
            "resume-project",
            "project_experience",
            "真实项目或流程经历",
            (
                "项目",
                "实习",
                "工作",
                "负责",
                "参与",
                "主导",
                "project",
                "intern",
                "worked",
                "led",
                "built",
                "developed",
                "implemented",
            ),
        ),
        (
            "resume-communication",
            "communication",
            "协作或沟通信号",
            ("沟通", "协作", "客户", "用户", "stakeholder", "collaborat", "customer", "user"),
        ),
        (
            "resume-data",
            "data_handling",
            "资料或数据处理",
            ("资料", "数据", "表格", "分析", "调研", "excel", "sql", "dashboard", "research", "report"),
        ),
        (
            "resume-technical",
            "technical_foundation",
            "技术或工具基础",
            ("python", "sql", "javascript", "typescript", "react", "api", "docker", "git", "tableau", "figma"),
        ),
        (
            "resume-ai-tool",
            "ai_tool_usage",
            "AI 工具接触",
            ("chatgpt", "copilot", "deepseek", "llm", "ai", "prompt", "提示词", "大模型", "智能体", "agent"),
        ),
        (
            "resume-goal",
            "goal",
            "求职目标",
            ("目标", "求职", "应聘", "转型", "方向", "希望", "target", "seeking", "apply", "looking for"),
        ),
        (
            "resume-constraint",
            "career_constraint",
            "约束或自我认知",
            ("时间", "城市", "远程", "约束", "限制", "脱敏", "隐私", "边界", "remote", "part-time", "constraint"),
        ),
    ]

    signals: list[ExtractedProfileSignal] = []
    for signal_id, category, label, keywords in candidates:
        line = _first_resume_line(lines, keywords)
        if line is None:
            continue
        signals.append(
            _make_resume_signal(
                signal_id=signal_id,
                category=category,
                label=label,
                evidence=line,
            )
        )
    return signals


def _candidate_resume_lines(text: str) -> list[str]:
    lines: list[str] = []
    for raw_line in text.split("\n"):
        line = " ".join(raw_line.strip().split())
        if len(line) < 6:
            continue
        if "@" in line:
            continue
        digits = sum(1 for char in line if char.isdigit())
        if digits >= 8 and digits > len(line) // 3:
            continue
        lines.append(_truncate_resume_text(line, RESUME_SIGNAL_EVIDENCE_LIMIT))
    return lines


def _first_resume_line(lines: list[str], keywords: tuple[str, ...]) -> str | None:
    for line in lines:
        if _line_contains(line, keywords):
            return line
    return None


def _line_contains(line: str, keywords: tuple[str, ...]) -> bool:
    lower_line = line.casefold()
    return any(keyword.casefold() in lower_line for keyword in keywords)


def _make_resume_signal(
    *,
    signal_id: str,
    category: str,
    label: str,
    evidence: str,
) -> ExtractedProfileSignal:
    return ExtractedProfileSignal.model_validate(
        {
            "signalId": signal_id,
            "category": category,
            "label": label,
            "evidenceText": evidence,
            "sourceMessageIds": ["resume_upload"],
            "confidence": "needs_user_review",
            "status": "candidate",
        }
    )


def _truncate_resume_text(text: str, limit: int) -> str:
    text = " ".join(text.strip().split())
    if len(text) <= limit:
        return text
    return f"{text[: limit - 3]}..."


def _compute_resume_readiness(signals: list[ExtractedProfileSignal]) -> tuple[str, list[str]]:
    present = _present_resume_signal_types(signals)
    missing = [signal_type for signal_type in RESUME_REQUIRED_SIGNAL_TYPES if signal_type not in present]
    if "real_experience" in missing or "concrete_action" in missing:
        return "insufficient", missing
    if missing:
        return "suggested_more", missing
    return "ready", []


def _present_resume_signal_types(signals: list[ExtractedProfileSignal]) -> set[str]:
    present: set[str] = set()
    for signal in signals:
        if signal.category in {"industry_background", "domain_material", "technical_foundation"}:
            present.add("background_source")
        if signal.category == "project_experience":
            present.add("real_experience")
        if signal.category in {"ai_tool_usage", "technical_foundation", "data_handling"}:
            present.add("tool_exposure")
        if signal.category == "goal":
            present.add("career_goal")
        if signal.category in {"career_constraint", "risk"}:
            present.add("constraint_or_self_awareness")
        if _has_action_signal(signal):
            present.add("concrete_action")
    return present


def _has_action_signal(signal: ExtractedProfileSignal) -> bool:
    text = f"{signal.label} {signal.evidenceText}".casefold()
    return any(keyword.casefold() in text for keyword in RESUME_ACTION_KEYWORDS)


def _resume_user_message(model_status: str, readiness: str, missing_signal_types: list[str], text_length: int) -> str:
    prefix = "已通过模型整理出可确认背景信号。" if model_status == "ok" else "模型暂不可用或输出未被采纳，已用规则整理有限背景信号。"
    length_note = "简历较长，已优先处理前段核心文本。" if text_length > RESUME_PARSE_MODEL_TEXT_LIMIT else ""
    if readiness == "ready":
        readiness_note = "这些信号足够生成第一版星图，请先核对并确认。"
    elif readiness == "suggested_more":
        readiness_note = f"可以先生成星图，但建议补充：{', '.join(missing_signal_types)}。"
    else:
        readiness_note = "当前仍缺少真实经历或具体动作，请继续 AI 访谈补充后再生成星图。"
    return " ".join(part for part in (prefix, readiness_note, length_note) if part)


async def _build_assistant_message(
    llm_client: DeepSeekInterviewClient,
    messages: list[InterviewMessage],
) -> InterviewMessage:
    try:
        model_result = await llm_client.next_question([_message_for_model(message) for message in messages])
    except InterviewModelJSONError:
        return _new_interview_message(
            "assistant",
            "模型返回格式不可用。请先手动补充一个真实经历：项目背景、你的职责、处理的资料或流程，以及使用过的工具。",
            model_provider="deepseek",
            model_status="invalid_json",
        )

    content = ""
    if isinstance(model_result.payload, dict):
        content = str(model_result.payload.get("message") or "").strip()
    if not content:
        content = "模型暂时不可用。请继续补充一个真实项目经历，我会记录后用于候选信号确认。"
    content = _ensure_chinese_interview_question(content, messages)
    return _new_interview_message(
        "assistant",
        content,
        model_provider=model_result.provider,
        model_status=model_result.status if model_result.status in {"ok", "no_key", "error", "invalid_json"} else "fallback",
    )


def _ensure_chinese_interview_question(content: str, messages: list[InterviewMessage]) -> str:
    text = content.strip()
    if not _is_usable_chinese_question(text):
        return _fallback_interview_question(messages)
    return text


def _is_usable_chinese_question(text: str) -> bool:
    if not text:
        return False
    if any(marker in text for marker in MOJIBAKE_MARKERS):
        return False
    cjk_count = sum(1 for char in text if "\u4e00" <= char <= "\u9fff")
    ascii_letter_count = sum(1 for char in text if char.isascii() and char.isalpha())
    if cjk_count < 6:
        return False
    return ascii_letter_count <= max(18, cjk_count)


def _fallback_interview_question(messages: list[InterviewMessage]) -> str:
    answered_turns = sum(1 for message in messages if message.role == "user")
    index = min(max(answered_turns - 1, 0), len(CHINESE_INTERVIEW_FALLBACK_QUESTIONS) - 1)
    return CHINESE_INTERVIEW_FALLBACK_QUESTIONS[index]


def _build_signal_extraction(
    session_id: str,
    model_result: InterviewModelResult,
    created_at: str,
) -> SignalExtractionResult:
    forbidden = find_forbidden_keys(model_result.payload)
    if forbidden:
        raise HTTPException(
            status_code=422,
            detail=f"Forbidden P1-C signal extraction field(s): {', '.join(sorted(forbidden))}",
        )

    raw_signals = model_result.payload.get("signals") if isinstance(model_result.payload, dict) else []
    if raw_signals is None:
        raw_signals = []
    if not isinstance(raw_signals, list):
        raise HTTPException(status_code=422, detail="Signal extraction result must contain a signals array")

    signals: list[ExtractedProfileSignal] = []
    for index, raw_signal in enumerate(raw_signals, start=1):
        if not isinstance(raw_signal, dict):
            raise HTTPException(status_code=422, detail="Signal extraction item must be an object")
        signal_payload = {
            "signalId": raw_signal.get("signalId") or f"sig-{index}",
            "status": "candidate",
            **raw_signal,
        }
        try:
            signals.append(ExtractedProfileSignal.model_validate(signal_payload))
        except ValidationError as exc:
            raise HTTPException(status_code=422, detail="Invalid extracted profile signal") from exc

    return SignalExtractionResult(
        sessionId=session_id,
        modelProvider=model_result.provider,
        modelName=model_result.model,
        modelStatus=model_result.status if model_result.status in {"ok", "no_key", "error", "invalid_json"} else "error",
        signals=signals,
        summary=str(model_result.payload.get("summary") or "") if isinstance(model_result.payload, dict) else None,
        fallbackReason=model_result.error,
        createdAt=created_at,
    )


def _to_interview_session(record: AnalysisRecord) -> InterviewSession:
    result_payload = _load_result(record)
    try:
        return InterviewSession.model_validate(result_payload.get("session") or result_payload)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail="Invalid interview session snapshot") from exc


def _interview_session_to_result(interview_session: InterviewSession) -> dict[str, Any]:
    return {
        "schemaVersion": P1C_SCHEMA_VERSION,
        "recordKind": "interview_session",
        "session": interview_session.model_dump(mode="json", exclude_none=True),
        "updatedAt": interview_session.updatedAt,
    }


def _new_interview_message(
    role: str,
    content: str,
    *,
    created_at: str | None = None,
    model_provider: str | None = None,
    model_status: str | None = None,
) -> InterviewMessage:
    return InterviewMessage(
        messageId=f"msg-{uuid4().hex}",
        role=role,
        content=content,
        modelProvider=model_provider,
        modelStatus=model_status,
        createdAt=created_at or _now_iso(),
    )


def _message_for_model(message: InterviewMessage) -> dict[str, str]:
    return {
        "role": message.role,
        "content": f"[{message.messageId}] {message.content}",
    }


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
