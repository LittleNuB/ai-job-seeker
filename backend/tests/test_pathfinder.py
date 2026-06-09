from __future__ import annotations

import json
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.main import app
from app.models.analysis import AnalysisRecord
from app.models.user import User


TEST_USER_ID = "user-pathfinder-1"
OTHER_USER_ID = "user-pathfinder-2"
QUESTION_IDS = [
    "project_understanding",
    "role_connection",
    "scenario_gap",
    "application_solution",
    "portfolio_extension",
    "ai_usage_explanation",
]
REQUIRED_SECTIONS = [
    "candidate_background",
    "path_conclusion",
    "sample_jd_note",
    "opendocuments_source_license",
    "opendocuments_original_capabilities",
    "user_trial_contribution",
    "forbidden_claims",
    "six_question_answers",
    "disclaimer",
]


@pytest.fixture()
async def client(tmp_path) -> AsyncIterator[AsyncClient]:
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")
    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        session.add_all(
            [
                User(id=TEST_USER_ID, email="pathfinder@example.com", password="x", name="真实用户 A"),
                User(id=OTHER_USER_ID, email="other@example.com", password="x", name="其他用户"),
            ]
        )
        await session.commit()

    async def override_get_session() -> AsyncIterator[AsyncSession]:
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as test_client:
        yield test_client
    app.dependency_overrides.clear()
    await engine.dispose()


def auth_headers(user_id: str = TEST_USER_ID) -> dict[str, str]:
    return {"X-User-Id": user_id}


def create_payload() -> dict:
    return {
        "schemaVersion": "p1-a.v1",
        "trialPackageId": "p1a-opendocuments-engineering-kb",
        "trialPackageVersion": "1.0.0",
        "selectedPathId": "industry-ai-product-assistant",
        "selectedPath": {
            "id": "industry-ai-product-assistant",
            "title": "行业 AI 应用产品助理",
            "verdict": "priority_trial",
        },
        "userProfileSnapshot": {
            "displayName": "真实用户 A",
            "educationBackground": "传统工科硕士",
            "industryBackground": ["工程实施", "资料管理"],
            "projectExperience": ["参与过工程项目资料整理"],
            "documentAndResearchExperience": ["能做资料调研和结构化整理"],
            "technicalBasics": ["Python 基础", "表格处理"],
            "aiToolUsage": ["使用 AI 辅助整理草稿"],
            "targetDirections": ["行业 AI 应用产品助理", "行业 AI 解决方案助理"],
            "careerConstraints": [],
            "availableTimeWindow": "3 个月内求职",
        },
    }


def answer_items(complete: bool = True, empty_ids: set[str] | None = None) -> list[dict]:
    empty_ids = empty_ids or set()
    answers = {
        "project_understanding": "OpenDocuments 主要解决企业资料分散、查找成本高的问题。",
        "role_connection": "它连接到行业 AI 应用产品助理和行业 AI 解决方案助理的场景拆解能力。",
        "scenario_gap": "工程企业还需要权限、脱敏、术语表和人工复核节点。",
        "application_solution": "我会设计一个面向工程企业资料的 2 周试点 MVP。",
        "portfolio_extension": "我会整理背景、范围、指标、风险和试航贡献。",
        "ai_usage_explanation": "AI 用于辅助整理和草拟，最终筛选和边界由我负责。",
    }
    if not complete:
        empty_ids.add("ai_usage_explanation")
    return [
        {
            "id": question_id,
            "answer": "" if question_id in empty_ids else answers[question_id],
            "status": "empty" if question_id in empty_ids else "complete",
            "updatedAt": "2026-06-04T00:00:00Z",
        }
        for question_id in QUESTION_IDS
    ]


def answers_payload(complete: bool = True, empty_ids: set[str] | None = None) -> dict:
    return {
        "schemaVersion": "p1-a.v1",
        "changedQuestionId": "ai_usage_explanation",
        "trialAnswers": answer_items(complete=complete, empty_ids=empty_ids),
    }


def anti_check_payload(
    *,
    status: str = "passed",
    export_allowed: bool = True,
    blocking_count: int = 0,
    sections_present: bool = True,
) -> dict:
    return {
        "rulesVersion": "p1-a.v1",
        "status": status,
        "exportAllowed": export_allowed,
        "checkedAt": "2026-06-04T00:00:00Z",
        "findings": [],
        "requiredMarkdownSections": {section: sections_present for section in REQUIRED_SECTIONS},
        "blockingCount": blocking_count,
        "warningCount": 0,
    }


def markdown_snapshot_payload(export_scope: str = "full") -> dict:
    return {
        "templateSource": "frontend",
        "templateVersion": "frontend.pathfinder.p1-a.v1",
        "exportScope": export_scope,
        "content": "# 寻径星图试航记录\n\n完整 Markdown 由前端生成。",
        "contentHash": "djb2-test",
        "createdAt": "2026-06-04T00:00:00Z",
    }


def portfolio_draft_payload() -> dict:
    return {
        "title": "工程企业知识库 AI 助手试航作品集草稿",
        "targetPathId": "industry-ai-product-assistant",
        "problemContext": "工程资料分散，知识检索和复用成本高。",
        "userScenario": "面向工程企业资料管理团队的内部知识库试点。",
        "solutionOutline": "以公开参考项目为来源边界，设计资料上传、检索和人工复核流程。",
        "mvpScope": ["资料目录整理", "检索问答流程", "人工复核节点"],
        "metrics": [
            {
                "dimension": "效率",
                "metric": "资料定位时间",
                "acceptanceLens": "试点阶段只观察样本流程变化",
            }
        ],
        "risks": [
            {
                "risk": "公开项目归属表达越界",
                "manifestation": "把参考项目写成个人贡献",
                "mitigation": "保留来源、License 和不可声称边界",
            }
        ],
        "sourceProjectReference": {
            "name": "OpenDocuments",
            "url": "https://github.com/joungminsung/OpenDocuments",
            "license": "MIT",
            "role": "reference_only",
            "originalCapabilities": ["公开项目参考", "文档问答能力参考"],
        },
        "userTrialContribution": ["完成场景拆解", "设计试点范围和风险边界"],
        "notClaimed": ["不声称参与 OpenDocuments 官方开发"],
        "disclaimer": "本记录只用于试航作品集草稿，不构成能力认证。",
    }


def interview_prep_payload() -> dict:
    return {
        "items": [
            {
                "question": "这个试航项目中你的贡献是什么？",
                "answerPoints": ["我完成了场景拆解、MVP 范围和风险边界整理。"],
                "evidenceSources": [
                    {
                        "sourceType": "trial_answer",
                        "sourceId": "application_solution",
                        "note": "对应第 4 问作答",
                    }
                ],
                "boundaryReminder": "OpenDocuments 是公开参考项目，不声称官方贡献。",
                "forbiddenClaims": ["不声称能力认证", "不声称录用概率"],
            }
        ],
        "updatedAt": "2026-06-04T00:00:00Z",
    }


async def create_record(client: AsyncClient) -> str:
    response = await client.post("/api/pathfinder/records", json=create_payload(), headers=auth_headers())
    assert response.status_code == 201
    return response.json()["recordId"]


def recommendation_payload() -> dict:
    return {
        "userProfile": {
            "displayName": "Real user A",
            "educationBackground": "Mechanical engineering master",
            "industryBackground": ["engineering implementation", "knowledge base operations"],
            "projectExperience": ["customer communication and delivery coordination"],
            "documentAndResearchExperience": ["requirements notes", "document research", "PRD drafts"],
            "technicalBasics": ["Python basics", "spreadsheet analysis"],
            "aiToolUsage": ["uses AI to organize drafts"],
            "targetDirections": ["industry AI product assistant"],
            "careerConstraints": [{"type": "time", "detail": "three months"}],
            "availableTimeWindow": "three months",
        },
        "preferredRolePathIds": ["industry-ai-product-assistant"],
    }


async def save_answers(client: AsyncClient, record_id: str, *, complete: bool = True) -> dict:
    response = await client.patch(
        f"/api/pathfinder/records/{record_id}/trial-answers",
        json=answers_payload(complete=complete),
        headers=auth_headers(),
    )
    assert response.status_code == 200
    return response.json()


@pytest.mark.asyncio()
async def test_create_pathfinder_recommendations_stores_p1b_run_without_scores(client: AsyncClient) -> None:
    response = await client.post("/api/pathfinder/recommendations", json=recommendation_payload(), headers=auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert body["schemaVersion"] == "p1b.v1"
    assert body["recommendationRun"]["schemaVersion"] == "p1b.v1"
    assert body["recommendationRun"]["recommendationRunId"].startswith("p1b-rec-")
    assert len(body["profileSignals"]) >= 3
    assert {path["pathId"] for path in body["paths"]} >= {
        "industry-ai-product-assistant",
        "industry-ai-solution-assistant",
        "ai-data-evaluation-assistant",
        "ai-application-ops-implementation-assistant",
    }
    assert body["paths"][0]["decision"] in {"priority_trial", "explore"}
    assert any(match["decision"] == "matched_for_trial" for match in body["projectMatches"])
    forbidden_keys = {"score", "ranking", "probability", "recommendationScore", "matchScore"}
    assert forbidden_keys.isdisjoint(json.dumps(body).split('"'))

    async for session in app.dependency_overrides[get_db]():
        record = await session.get(AnalysisRecord, body["recommendationRun"]["recommendationRunId"])
        assert record is not None
        assert record.type == "pathfinder"
        assert record.match_score is None
        assert json.loads(record.result)["schemaVersion"] == "p1b.v1"


@pytest.mark.asyncio()
async def test_pathfinder_projects_returns_only_approved_opendocuments(client: AsyncClient) -> None:
    response = await client.get("/api/pathfinder/projects", headers=auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert body["schemaVersion"] == "p1b.v1"
    assert [project["projectId"] for project in body["projects"]] == ["opendocuments"]
    project = body["projects"][0]
    assert project["status"] == "approved_for_trial_package"
    assert project["licenseVerificationStatus"] == "verified"
    assert project["referenceRole"] == "reference_only"
    assert project["generateEligible"] is True

    candidate_response = await client.get("/api/pathfinder/projects?status=candidate", headers=auth_headers())
    assert candidate_response.status_code == 200
    assert candidate_response.json()["projects"] == []


@pytest.mark.asyncio()
async def test_generate_trial_package_for_approved_opendocuments(client: AsyncClient) -> None:
    recommendation_response = await client.post(
        "/api/pathfinder/recommendations",
        json=recommendation_payload(),
        headers=auth_headers(),
    )
    assert recommendation_response.status_code == 200
    run_id = recommendation_response.json()["recommendationRun"]["recommendationRunId"]

    response = await client.post(
        "/api/pathfinder/trial-packages/generate",
        json={
            "recommendationRunId": run_id,
            "userProfileSnapshot": recommendation_payload()["userProfile"],
            "selectedPathId": "industry-ai-product-assistant",
            "selectedProjectId": "opendocuments",
        },
        headers=auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["schemaVersion"] == "p1b.v1"
    candidate = body["trialPackageCandidate"]
    assert candidate["generatedFrom"]["recommendationRunId"] == run_id
    assert candidate["generatedFrom"]["selectedProjectId"] == "opendocuments"
    assert candidate["sourceProject"]["status"] == "approved_for_trial_package"
    assert len(candidate["trialQuestions"]) == 6
    assert body["antiPackagingDefaults"]["status"] == "not_run"


@pytest.mark.asyncio()
async def test_generate_trial_package_rejects_unmatched_path(client: AsyncClient) -> None:
    recommendation_response = await client.post(
        "/api/pathfinder/recommendations",
        json=recommendation_payload(),
        headers=auth_headers(),
    )
    assert recommendation_response.status_code == 200
    run_id = recommendation_response.json()["recommendationRun"]["recommendationRunId"]

    response = await client.post(
        "/api/pathfinder/trial-packages/generate",
        json={
            "recommendationRunId": run_id,
            "userProfileSnapshot": recommendation_payload()["userProfile"],
            "selectedPathId": "ai-data-evaluation-assistant",
            "selectedProjectId": "opendocuments",
        },
        headers=auth_headers(),
    )

    assert response.status_code == 422


@pytest.mark.asyncio()
async def test_create_pathfinder_record_stores_p1a_envelopes(client: AsyncClient) -> None:
    response = await client.post("/api/pathfinder/records", json=create_payload(), headers=auth_headers())

    assert response.status_code == 201
    body = response.json()
    record_id = body["recordId"]
    assert body["schemaVersion"] == "p1-a.v1"
    assert body["trialPackageId"] == "p1a-opendocuments-engineering-kb"
    assert body["trialPackageVersion"] == "1.0.0"
    assert body["selectedPathId"] == "industry-ai-product-assistant"
    assert body["selectedPath"]["title"] == "行业 AI 应用产品助理"
    assert body["status"] == "draft"
    assert len(body["trialAnswers"]) == 6
    assert body["antiPackagingCheck"]["status"] == "not_run"
    assert "match_score" not in body
    assert "matchScore" not in body

    async for session in app.dependency_overrides[get_db]():
        record = await session.get(AnalysisRecord, record_id)
        assert record is not None
        assert record.type == "pathfinder"
        assert record.input_file_url is None
        assert record.match_score is None

        input_payload = json.loads(record.input_text)
        result_payload = json.loads(record.result)
        assert input_payload["schemaVersion"] == "p1-a.v1"
        assert input_payload["trialPackageId"] == "p1a-opendocuments-engineering-kb"
        assert input_payload["trialPackageVersion"] == "1.0.0"
        assert input_payload["selectedPathId"] == "industry-ai-product-assistant"
        assert input_payload["trialPackageSnapshot"]["id"] == "p1a-opendocuments-engineering-kb"
        assert result_payload["schemaVersion"] == "p1-a.v1"
        assert result_payload["status"] == "draft"
        assert len(result_payload["trialAnswers"]) == 6
        assert result_payload["antiPackagingCheck"]["status"] == "not_run"


@pytest.mark.asyncio()
async def test_get_pathfinder_record_success_and_scope_guard(client: AsyncClient) -> None:
    record_id = await create_record(client)

    response = await client.get(f"/api/pathfinder/records/{record_id}", headers=auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert body["recordId"] == record_id
    assert body["schemaVersion"] == "p1-a.v1"
    assert body["userProfileSnapshot"]["educationBackground"] == "传统工科硕士"
    forbidden_response_keys = {
        "matchScore",
        "match_score",
        "abilityScore",
        "competencyScore",
        "offerProbability",
        "hireProbability",
        "recommendationScore",
        "resumeOptimization",
        "resumePackaging",
        "companyRecommendation",
        "certification",
    }
    assert forbidden_response_keys.isdisjoint(set(body))


@pytest.mark.asyncio()
async def test_get_pathfinder_record_rejects_other_user(client: AsyncClient) -> None:
    record_id = await create_record(client)

    response = await client.get(f"/api/pathfinder/records/{record_id}", headers=auth_headers(OTHER_USER_ID))

    assert response.status_code == 404


@pytest.mark.asyncio()
async def test_update_trial_answers_accepts_full_package_with_empty_answers(client: AsyncClient) -> None:
    record_id = await create_record(client)

    body = await save_answers(client, record_id, complete=False)

    assert body["recordId"] == record_id
    assert body["status"] == "answers_incomplete"
    assert {answer["id"] for answer in body["trialAnswers"]} == set(QUESTION_IDS)
    assert next(answer for answer in body["trialAnswers"] if answer["id"] == "ai_usage_explanation")["status"] == "empty"

    get_response = await client.get(f"/api/pathfinder/records/{record_id}", headers=auth_headers())
    assert get_response.json()["status"] == "answers_incomplete"


@pytest.mark.asyncio()
async def test_update_trial_answers_rejects_unknown_duplicate_and_missing_question_ids(client: AsyncClient) -> None:
    record_id = await create_record(client)

    unknown_payload = answers_payload()
    unknown_payload["trialAnswers"][0]["id"] = "q1"
    unknown_response = await client.patch(
        f"/api/pathfinder/records/{record_id}/trial-answers",
        json=unknown_payload,
        headers=auth_headers(),
    )
    assert unknown_response.status_code == 422

    duplicate_payload = answers_payload()
    duplicate_payload["trialAnswers"][1]["id"] = duplicate_payload["trialAnswers"][0]["id"]
    duplicate_response = await client.patch(
        f"/api/pathfinder/records/{record_id}/trial-answers",
        json=duplicate_payload,
        headers=auth_headers(),
    )
    assert duplicate_response.status_code == 422

    missing_payload = answers_payload()
    missing_payload["trialAnswers"] = missing_payload["trialAnswers"][:-1]
    missing_response = await client.patch(
        f"/api/pathfinder/records/{record_id}/trial-answers",
        json=missing_payload,
        headers=auth_headers(),
    )
    assert missing_response.status_code == 422


@pytest.mark.asyncio()
async def test_save_result_passed_check_without_markdown_is_ready_to_export(client: AsyncClient) -> None:
    record_id = await create_record(client)
    await save_answers(client, record_id, complete=True)

    response = await client.put(
        f"/api/pathfinder/records/{record_id}/result",
        json={
            "schemaVersion": "p1-a.v1",
            "status": "ready_to_export",
            "antiPackagingCheck": anti_check_payload(),
        },
        headers=auth_headers(),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "ready_to_export"
    get_response = await client.get(f"/api/pathfinder/records/{record_id}", headers=auth_headers())
    assert get_response.json()["status"] == "ready_to_export"


@pytest.mark.asyncio()
async def test_save_result_preserves_frontend_markdown_snapshot_and_marks_exported(client: AsyncClient) -> None:
    record_id = await create_record(client)
    await save_answers(client, record_id, complete=True)
    snapshot = markdown_snapshot_payload(export_scope="full")

    response = await client.put(
        f"/api/pathfinder/records/{record_id}/result",
        json={
            "schemaVersion": "p1-a.v1",
            "status": "exported",
            "antiPackagingCheck": anti_check_payload(),
            "evidenceMapping": {
                "summary": "样例 JD、用户背景、公开项目来源和试航作答已形成轻量追溯摘要。",
                "nodes": [
                    {
                        "sourceType": "trial_answer",
                        "sourceId": "application_solution",
                        "targetType": "portfolio_section",
                    }
                ],
            },
            "portfolioDraft": portfolio_draft_payload(),
            "interviewPrep": interview_prep_payload(),
            "markdownSnapshot": snapshot,
        },
        headers=auth_headers(),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "exported"
    assert response.json()["markdownSnapshotSaved"] is True

    get_response = await client.get(f"/api/pathfinder/records/{record_id}", headers=auth_headers())
    body = get_response.json()
    assert body["status"] == "exported"
    assert body["evidenceMapping"]["summary"].startswith("样例 JD")
    assert body["portfolioDraft"]["userTrialContribution"] == ["完成场景拆解", "设计试点范围和风险边界"]
    assert body["interviewPrep"]["items"][0]["question"] == "这个试航项目中你的贡献是什么？"
    assert body["markdownSnapshot"]["templateSource"] == "frontend"
    assert body["markdownSnapshot"]["content"] == snapshot["content"]


@pytest.mark.asyncio()
async def test_blocked_check_allows_draft_snapshot_but_rejects_full_snapshot(client: AsyncClient) -> None:
    record_id = await create_record(client)
    await save_answers(client, record_id, complete=True)
    blocked_check = anti_check_payload(status="blocked", export_allowed=False, blocking_count=1)

    full_response = await client.put(
        f"/api/pathfinder/records/{record_id}/result",
        json={
            "schemaVersion": "p1-a.v1",
            "status": "anti_packaging_blocked",
            "antiPackagingCheck": blocked_check,
            "markdownSnapshot": markdown_snapshot_payload(export_scope="full"),
        },
        headers=auth_headers(),
    )
    assert full_response.status_code == 422

    draft_response = await client.put(
        f"/api/pathfinder/records/{record_id}/result",
        json={
            "schemaVersion": "p1-a.v1",
            "status": "anti_packaging_blocked",
            "antiPackagingCheck": blocked_check,
            "markdownSnapshot": markdown_snapshot_payload(export_scope="draft"),
        },
        headers=auth_headers(),
    )
    assert draft_response.status_code == 200
    assert draft_response.json()["status"] == "anti_packaging_blocked"
    assert draft_response.json()["markdownSnapshotSaved"] is True


@pytest.mark.asyncio()
async def test_full_markdown_snapshot_requires_complete_answers_sections_and_frontend_source(client: AsyncClient) -> None:
    record_id = await create_record(client)
    await save_answers(client, record_id, complete=False)

    incomplete_answers_response = await client.put(
        f"/api/pathfinder/records/{record_id}/result",
        json={
            "schemaVersion": "p1-a.v1",
            "status": "exported",
            "antiPackagingCheck": anti_check_payload(),
            "markdownSnapshot": markdown_snapshot_payload(export_scope="full"),
        },
        headers=auth_headers(),
    )
    assert incomplete_answers_response.status_code == 422

    await save_answers(client, record_id, complete=True)
    missing_sections_response = await client.put(
        f"/api/pathfinder/records/{record_id}/result",
        json={
            "schemaVersion": "p1-a.v1",
            "status": "exported",
            "antiPackagingCheck": anti_check_payload(sections_present=False),
            "markdownSnapshot": markdown_snapshot_payload(export_scope="full"),
        },
        headers=auth_headers(),
    )
    assert missing_sections_response.status_code == 422

    bad_source_snapshot = markdown_snapshot_payload(export_scope="full")
    bad_source_snapshot["templateSource"] = "backend"
    bad_source_response = await client.put(
        f"/api/pathfinder/records/{record_id}/result",
        json={
            "schemaVersion": "p1-a.v1",
            "status": "exported",
            "antiPackagingCheck": anti_check_payload(),
            "markdownSnapshot": bad_source_snapshot,
        },
        headers=auth_headers(),
    )
    assert bad_source_response.status_code == 422


@pytest.mark.asyncio()
async def test_forbidden_scope_fields_are_rejected(client: AsyncClient) -> None:
    create_response = await client.post(
        "/api/pathfinder/records",
        json={
            **create_payload(),
            "userProfileSnapshot": {"displayName": "真实用户 A", "offerProbability": 0.9},
        },
        headers=auth_headers(),
    )
    assert create_response.status_code == 422

    record_id = await create_record(client)
    await save_answers(client, record_id, complete=True)
    result_response = await client.put(
        f"/api/pathfinder/records/{record_id}/result",
        json={
            "schemaVersion": "p1-a.v1",
            "status": "ready_to_export",
            "antiPackagingCheck": {
                **anti_check_payload(),
                "recommendationScore": 99,
            },
        },
        headers=auth_headers(),
    )
    assert result_response.status_code == 422


@pytest.mark.asyncio()
async def test_legacy_p0_record_can_be_read_as_p1a_trail_record(client: AsyncClient) -> None:
    legacy_record = AnalysisRecord(
        id="legacy-pathfinder",
        user_id=TEST_USER_ID,
        type="pathfinder",
        input_text=json.dumps(
            {
                "demoVersion": "p0-xiaoc-opendocuments",
                "selectedPathId": "industry-ai-product-assistant",
                "candidateProfile": {"identity": "传统工科硕士"},
            },
            ensure_ascii=False,
        ),
        input_file_url=None,
        result=json.dumps(
            {
                "trialAnswers": {question_id: f"{question_id} answer" for question_id in QUESTION_IDS},
                "report": {"pathConclusion": "legacy report"},
                "markdownSnapshot": "# legacy markdown",
            },
            ensure_ascii=False,
        ),
        match_score=None,
    )
    async for session in app.dependency_overrides[get_db]():
        session.add(legacy_record)
        await session.commit()

    response = await client.get("/api/pathfinder/records/legacy-pathfinder", headers=auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert body["schemaVersion"] == "p1-a.v1"
    assert body["recordId"] == "legacy-pathfinder"
    assert body["status"] == "exported"
    assert len(body["trialAnswers"]) == 6
    assert body["antiPackagingCheck"]["status"] == "not_run"
    assert body["markdownSnapshot"]["templateSource"] == "frontend"
    assert body["markdownSnapshot"]["templateVersion"] == "legacy-p0"
    assert body["markdownSnapshot"]["content"] == "# legacy markdown"
    assert "match_score" not in body


@pytest.mark.asyncio()
async def test_delete_pathfinder_record_success_and_non_pathfinder_is_not_accessible(client: AsyncClient) -> None:
    record_id = await create_record(client)

    response = await client.delete(f"/api/pathfinder/records/{record_id}", headers=auth_headers())

    assert response.status_code == 204
    get_response = await client.get(f"/api/pathfinder/records/{record_id}", headers=auth_headers())
    assert get_response.status_code == 404

    record = AnalysisRecord(
        id="analysis-not-pathfinder",
        user_id=TEST_USER_ID,
        type="resume",
        input_text="{}",
        input_file_url=None,
        result="{}",
        match_score=None,
    )
    async for session in app.dependency_overrides[get_db]():
        session.add(record)
        await session.commit()

    non_pathfinder_response = await client.get("/api/pathfinder/records/analysis-not-pathfinder", headers=auth_headers())
    assert non_pathfinder_response.status_code == 404
