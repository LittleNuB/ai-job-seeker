from __future__ import annotations

import asyncio

from httpx import AsyncClient

from app.main import app
from app.services.application_model import (
    ModelProviderUnavailableError,
    ModelTimeoutError,
    get_application_model,
)


CONCRETE_JD = """
AI 产品经理（智能应用方向）

岗位职责
1. 负责面向求职场景的 AI 产品规划，完成需求分析、原型设计和版本迭代。
2. 与算法和工程团队协作，设计大模型工作流、质量评测方案及异常处理机制。
3. 结合用户反馈和行为数据持续优化核心体验，并推动产品从验证走向稳定交付。

任职要求
1. 具备 AI 产品或大模型应用项目经验，能够清楚说明个人判断、关键取舍和结果。
2. 熟悉 Prompt、RAG 或 Agent 等常见方案，理解模型能力边界与评测方法。
3. 具备良好的跨团队沟通、项目推进和结构化表达能力。
""".strip()


RESUME_TEXT = """
工作经历
知音科技｜AI 产品实习生｜2025.01-2025.06
智能客服评测体系
- 负责整理 120 条高频失败案例，定义准确性、完整性和可执行性三类评测维度。
- 协同算法与运营完成两轮提示词迭代，将严重错误案例从 18 条降低到 7 条。

项目经历
AI Job Copilot
- 独立设计面向具体 JD 的求职准备工作流，覆盖经历拆分、简历主张与面试追问。
- 建立版本化评测样本和 rubric，用于比较系统提示词与通用改写基线。
""".strip()


async def _create_application(client: AsyncClient, headers: dict[str, str]) -> dict:
    response = await client.post(
        "/api/applications/commands",
        headers=headers,
        json={
            "type": "start_application",
            "target_role": "AI 产品经理",
            "jd_text": CONCRETE_JD,
            "resume_text": RESUME_TEXT,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


class FakeApplicationModel:
    provider_name = "deterministic-fake"
    model_name = "target-analysis-fixture-v1"

    def __init__(self, output: object) -> None:
        self.output = output
        self.calls = 0

    async def generate_json(self, *, system_prompt: str, user_prompt: str) -> object:
        self.calls += 1
        if isinstance(self.output, Exception):
            raise self.output
        return self.output


class BlockingApplicationModel(FakeApplicationModel):
    def __init__(self, output: object) -> None:
        super().__init__(output)
        self.started = asyncio.Event()
        self.release = asyncio.Event()

    async def generate_json(self, *, system_prompt: str, user_prompt: str) -> object:
        self.calls += 1
        self.started.set()
        await self.release.wait()
        return self.output


async def test_create_and_reopen_application_snapshot(client: AsyncClient, auth_headers):
    headers = await auth_headers(client)

    created = await _create_application(client, headers)

    assert created["workflow_phase"] == "source_review"
    assert created["target_application"] == {
        "target_role": "AI 产品经理",
        "jd_text": CONCRETE_JD,
    }
    assert created["resume_source"]["text"] == RESUME_TEXT
    assert created["resume_source"]["scope"] == "application_local"
    assert len(created["experience_entries"]) == 1
    assert created["experience_entries"][0]["organization"] == "知音科技"
    assert created["experience_entries"][0]["role"] == "AI 产品实习生"
    assert len(created["experience_entries"][0]["experience_items"]) == 1
    assert created["experience_entries"][0]["experience_items"][0]["title"] == "智能客服评测体系"
    assert len(created["standalone_experience_items"]) == 1
    assert created["standalone_experience_items"][0]["title"] == "AI Job Copilot"
    assert all(
        item["source_scope"] == "application_local"
        for item in [
            *created["experience_entries"][0]["experience_items"],
            *created["standalone_experience_items"],
        ]
    )
    assert created["role_signals"] == []
    assert created["competitive_claims"] == []
    assert created["source_change_notices"] == []
    assert "match_score" not in created

    reopened_response = await client.get(
        f"/api/applications/{created['application_id']}", headers=headers
    )
    assert reopened_response.status_code == 200, reopened_response.text
    assert reopened_response.json() == created

    list_response = await client.get("/api/applications", headers=headers)
    assert list_response.status_code == 200, list_response.text
    listed = list_response.json()["items"]
    assert [item["application_id"] for item in listed] == [created["application_id"]]
    assert listed[0]["target_role"] == "AI 产品经理"
    assert listed[0]["workflow_phase"] == "source_review"
    assert listed[0]["experience_item_count"] == 2


async def test_correct_item_grouping_and_persist_it(client: AsyncClient, auth_headers):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    entry_id = created["experience_entries"][0]["id"]
    standalone_item_id = created["standalone_experience_items"][0]["id"]

    moved_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=headers,
        json={
            "type": "move_experience_item",
            "experience_item_id": standalone_item_id,
            "destination_entry_id": entry_id,
        },
    )

    assert moved_response.status_code == 200, moved_response.text
    moved = moved_response.json()
    assert moved["standalone_experience_items"] == []
    assert [
        item["id"] for item in moved["experience_entries"][0]["experience_items"]
    ] == [
        created["experience_entries"][0]["experience_items"][0]["id"],
        standalone_item_id,
    ]

    reopened = await client.get(
        f"/api/applications/{created['application_id']}", headers=headers
    )
    assert reopened.status_code == 200
    assert reopened.json() == moved


async def test_correct_imported_item_boundaries_by_splitting_and_merging(client: AsyncClient, auth_headers):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    original_item = created["experience_entries"][0]["experience_items"][0]
    first_fact_id = original_item["base_facts"][0]["id"]

    split_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=headers,
        json={
            "type": "split_experience_item",
            "source_item_id": original_item["id"],
            "base_fact_ids": [first_fact_id],
            "new_item_title": "评测样本设计",
        },
    )

    assert split_response.status_code == 200, split_response.text
    split = split_response.json()
    entry_items = split["experience_entries"][0]["experience_items"]
    assert [item["title"] for item in entry_items] == ["智能客服评测体系", "评测样本设计"]
    assert [fact["id"] for fact in entry_items[0]["base_facts"]] != [first_fact_id]
    assert [fact["id"] for fact in entry_items[1]["base_facts"]] == [first_fact_id]

    merge_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=headers,
        json={
            "type": "merge_experience_items",
            "source_item_id": entry_items[1]["id"],
            "destination_item_id": entry_items[0]["id"],
        },
    )

    assert merge_response.status_code == 200, merge_response.text
    merged = merge_response.json()
    merged_items = merged["experience_entries"][0]["experience_items"]
    assert len(merged_items) == 1
    assert {fact["id"] for fact in merged_items[0]["base_facts"]} == {
        fact["id"] for fact in original_item["base_facts"]
    }

    reopened = await client.get(
        f"/api/applications/{created['application_id']}", headers=headers
    )
    assert reopened.status_code == 200
    assert reopened.json() == merged

    standalone_item_id = merged["standalone_experience_items"][0]["id"]
    cross_context_merge = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=headers,
        json={
            "type": "merge_experience_items",
            "source_item_id": standalone_item_id,
            "destination_item_id": merged_items[0]["id"],
        },
    )
    assert cross_context_merge.status_code == 422
    assert "先调整归属" in cross_context_merge.json()["detail"]


async def test_import_does_not_promote_education_or_skills_to_experience_items(client: AsyncClient, auth_headers):
    headers = await auth_headers(client)
    response = await client.post(
        "/api/applications/commands",
        headers=headers,
        json={
            "type": "start_application",
            "target_role": "AI 产品经理",
            "jd_text": CONCRETE_JD,
            "resume_text": """
教育经历
同济大学｜软件工程｜2021.09-2025.06
- 主修数据结构、数据库与人机交互课程。

专业技能
- Python、SQL、Figma、Prompt Engineering

项目经历
AI Job Copilot
- 独立设计面向具体 JD 的求职准备工作流。
""".strip(),
        },
    )

    assert response.status_code == 200, response.text
    snapshot = response.json()
    assert snapshot["experience_entries"] == []
    assert [item["title"] for item in snapshot["standalone_experience_items"]] == ["AI Job Copilot"]
    all_fact_text = [
        fact["text"]
        for item in snapshot["standalone_experience_items"]
        for fact in item["base_facts"]
    ]
    assert not any("同济大学" in text or "Python、SQL" in text for text in all_fact_text)

    ignored_only = await client.post(
        "/api/applications/commands",
        headers=headers,
        json={
            "type": "start_application",
            "target_role": "AI 产品经理",
            "jd_text": CONCRETE_JD,
            "resume_text": """
教育经历
同济大学｜软件工程｜2021.09-2025.06
- 主修数据结构、数据库与人机交互课程。
专业技能
- 熟悉 Python、SQL、Figma 和 Prompt Engineering。
""".strip(),
        },
    )
    assert ignored_only.status_code == 200, ignored_only.text
    assert ignored_only.json()["experience_entries"] == []
    assert ignored_only.json()["standalone_experience_items"] == []


async def test_requires_concrete_jd_text(client: AsyncClient, auth_headers):
    headers = await auth_headers(client)

    title_only = await client.post(
        "/api/applications/commands",
        headers=headers,
        json={
            "type": "start_application",
            "target_role": "AI 产品经理",
            "jd_text": "AI 产品经理",
            "resume_text": RESUME_TEXT,
        },
    )
    missing_jd = await client.post(
        "/api/applications/commands",
        headers=headers,
        json={
            "type": "start_application",
            "target_role": "AI 产品经理",
            "position_id": "test-ai-pm",
            "resume_text": RESUME_TEXT,
        },
    )
    blank_role = await client.post(
        "/api/applications/commands",
        headers=headers,
        json={
            "type": "start_application",
            "target_role": "   ",
            "jd_text": CONCRETE_JD,
            "resume_text": RESUME_TEXT,
        },
    )

    assert title_only.status_code == 422
    assert missing_jd.status_code == 422
    assert blank_role.status_code == 422


async def test_application_is_owner_scoped_for_reads_and_mutations(client: AsyncClient, auth_headers):
    owner_headers = await auth_headers(client)
    other_headers = await auth_headers(client)
    created = await _create_application(client, owner_headers)
    application_id = created["application_id"]
    item_id = created["standalone_experience_items"][0]["id"]

    owner_list = await client.get("/api/applications", headers=owner_headers)
    other_list = await client.get("/api/applications", headers=other_headers)
    forbidden_read = await client.get(
        f"/api/applications/{application_id}", headers=other_headers
    )
    forbidden_mutation = await client.post(
        f"/api/applications/{application_id}/commands",
        headers=other_headers,
        json={
            "type": "move_experience_item",
            "experience_item_id": item_id,
            "destination_entry_id": None,
        },
    )

    assert len(owner_list.json()["items"]) == 1
    assert other_list.json()["items"] == []
    assert forbidden_read.status_code == 404
    assert forbidden_mutation.status_code == 404


async def test_application_studio_requires_authentication(client: AsyncClient):
    create_response = await client.post(
        "/api/applications/commands",
        json={
            "type": "start_application",
            "target_role": "AI 产品经理",
            "jd_text": CONCRETE_JD,
            "resume_text": RESUME_TEXT,
        },
    )
    list_response = await client.get("/api/applications")

    assert create_response.status_code == 401
    assert list_response.status_code == 401


async def test_target_analysis_persists_sourced_and_inferred_role_signals(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    model = FakeApplicationModel(
        {
            "role_signals": [
                {
                    "signal": "大模型工作流与质量评测设计",
                    "source_type": "explicit",
                    "jd_excerpt": "设计大模型工作流、质量评测方案及异常处理机制",
                    "rationale": None,
                },
                {
                    "signal": "从验证走向稳定交付的推进能力",
                    "source_type": "interpretation",
                    "jd_excerpt": None,
                    "rationale": "JD 同时强调持续优化核心体验和推动产品稳定交付。",
                },
            ]
        }
    )
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert response.status_code == 200, response.text
    analyzed = response.json()
    assert analyzed["workflow_phase"] == "role_signal_review"
    assert analyzed["role_signals"] == [
        {
            "id": analyzed["role_signals"][0]["id"],
            "signal": "大模型工作流与质量评测设计",
            "source_type": "explicit",
            "jd_excerpt": "设计大模型工作流、质量评测方案及异常处理机制",
            "rationale": None,
        },
        {
            "id": analyzed["role_signals"][1]["id"],
            "signal": "从验证走向稳定交付的推进能力",
            "source_type": "interpretation",
            "jd_excerpt": None,
            "rationale": "JD 同时强调持续优化核心体验和推动产品稳定交付。",
        },
    ]
    assert analyzed["target_analysis"] == {"status": "completed", "last_error": None}
    assert analyzed["prompt_runs"][-1]["prompt_family"] == "target_analysis"
    assert analyzed["prompt_runs"][-1]["prompt_version"] == "target-analysis-v1"
    assert analyzed["prompt_runs"][-1]["model_provider"] == "deterministic-fake"
    assert analyzed["prompt_runs"][-1]["model_name"] == "target-analysis-fixture-v1"
    assert analyzed["prompt_runs"][-1]["status"] == "completed"
    assert "match_score" not in analyzed
    assert model.calls == 1

    reopened = await client.get(
        f"/api/applications/{created['application_id']}", headers=headers
    )
    assert reopened.status_code == 200
    assert reopened.json() == analyzed


async def test_invalid_target_analysis_preserves_signals_and_can_be_retried(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    model = FakeApplicationModel(
        {
            "role_signals": [
                {
                    "signal": "跨团队推动 AI 产品稳定交付",
                    "source_type": "explicit",
                    "jd_excerpt": "推动产品从验证走向稳定交付",
                    "rationale": None,
                }
            ]
        }
    )
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        first_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        first = first_response.json()

        model.output = {
            "role_signals": [
                {
                    "signal": f"为了凑数生成的信号 {index}",
                    "source_type": "interpretation",
                    "jd_excerpt": None,
                    "rationale": "这条输出仅用于验证超过三条时会被拒绝。",
                }
                for index in range(4)
            ]
        }
        invalid_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        invalid = invalid_response.json()

        model.output = {
            "role_signals": [
                {
                    "signal": "模型能力边界与评测方法",
                    "source_type": "explicit",
                    "jd_excerpt": "理解模型能力边界与评测方法",
                    "rationale": None,
                }
            ]
        }
        retried_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert first_response.status_code == 200
    assert invalid_response.status_code == 200
    assert invalid["target_analysis"]["status"] == "failed"
    assert invalid["target_analysis"]["last_error"]["code"] == "invalid_output"
    assert invalid["target_analysis"]["last_error"]["retryable"] is True
    assert invalid["role_signals"] == first["role_signals"]
    assert invalid["workflow_phase"] == "role_signal_review"
    assert [run["status"] for run in invalid["prompt_runs"]] == ["completed", "failed"]

    assert retried_response.status_code == 200
    retried = retried_response.json()
    assert retried["target_analysis"] == {"status": "completed", "last_error": None}
    assert [signal["signal"] for signal in retried["role_signals"]] == [
        "模型能力边界与评测方法"
    ]
    assert [run["status"] for run in retried["prompt_runs"]] == [
        "completed",
        "failed",
        "completed",
    ]
    assert model.calls == 3


async def test_target_analysis_rejects_an_explicit_excerpt_not_found_in_the_jd(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    model = FakeApplicationModel(
        {
            "role_signals": [
                {
                    "signal": "招聘方保证候选人入职后直接负责全部业务",
                    "source_type": "explicit",
                    "jd_excerpt": "入职后直接负责全部业务并拥有最终决策权",
                    "rationale": None,
                }
            ]
        }
    )
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert response.status_code == 200
    snapshot = response.json()
    assert snapshot["role_signals"] == []
    assert snapshot["target_analysis"]["status"] == "failed"
    assert snapshot["target_analysis"]["last_error"]["code"] == "invalid_output"


async def test_target_analysis_timeout_is_recoverable_and_preserves_the_application(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    model = FakeApplicationModel(ModelTimeoutError("fixture timeout"))
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert response.status_code == 200
    snapshot = response.json()
    assert snapshot["target_application"] == created["target_application"]
    assert snapshot["experience_entries"] == created["experience_entries"]
    assert snapshot["standalone_experience_items"] == created["standalone_experience_items"]
    assert snapshot["target_analysis"]["status"] == "failed"
    assert snapshot["target_analysis"]["last_error"]["code"] == "timeout"
    assert snapshot["prompt_runs"][-1]["status"] == "failed"
    assert snapshot["prompt_runs"][-1]["error_code"] == "timeout"


async def test_target_analysis_unavailable_provider_returns_a_retryable_state(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    model = FakeApplicationModel(ModelProviderUnavailableError("fixture unavailable"))
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert response.status_code == 200
    snapshot = response.json()
    assert snapshot["target_analysis"]["status"] == "failed"
    assert snapshot["target_analysis"]["last_error"]["code"] == "provider_unavailable"
    assert snapshot["role_signals"] == []
    assert model.calls == 1


async def test_target_analysis_keeps_experience_changes_saved_while_the_model_runs(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    standalone_item = created["standalone_experience_items"][0]
    destination_entry = created["experience_entries"][0]
    model = BlockingApplicationModel(
        {
            "role_signals": [
                {
                    "signal": "大模型工作流与质量评测设计",
                    "source_type": "explicit",
                    "jd_excerpt": "设计大模型工作流、质量评测方案及异常处理机制",
                    "rationale": None,
                }
            ]
        }
    )
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        analysis_task = asyncio.create_task(
            client.post(
                f"/api/applications/{created['application_id']}/commands",
                headers=headers,
                json={"type": "analyze_target"},
            )
        )
        await asyncio.wait_for(model.started.wait(), timeout=2)

        moved_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "move_experience_item",
                "experience_item_id": standalone_item["id"],
                "destination_entry_id": destination_entry["id"],
            },
        )
        assert moved_response.status_code == 200, moved_response.text

        model.release.set()
        analyzed_response = await asyncio.wait_for(analysis_task, timeout=2)
    finally:
        model.release.set()
        app.dependency_overrides.pop(get_application_model, None)

    assert analyzed_response.status_code == 200, analyzed_response.text
    analyzed = analyzed_response.json()
    assert analyzed["standalone_experience_items"] == []
    assert [
        item["id"] for item in analyzed["experience_entries"][0]["experience_items"]
    ] == [
        created["experience_entries"][0]["experience_items"][0]["id"],
        standalone_item["id"],
    ]
    assert analyzed["target_analysis"]["status"] == "completed"

    reopened = await client.get(
        f"/api/applications/{created['application_id']}", headers=headers
    )
    assert reopened.status_code == 200
    assert reopened.json() == analyzed
