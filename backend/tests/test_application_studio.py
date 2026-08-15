from __future__ import annotations

import asyncio
import json

from httpx import AsyncClient

from app.main import app
from app.schemas.application import ApplicationSnapshot
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
        self.requests: list[dict[str, str]] = []

    def _record_request(self, *, system_prompt: str, user_prompt: str) -> None:
        self.calls += 1
        self.requests.append(
            {"system_prompt": system_prompt, "user_prompt": user_prompt}
        )

    async def generate_json(self, *, system_prompt: str, user_prompt: str) -> object:
        self._record_request(
            system_prompt=system_prompt, user_prompt=user_prompt
        )
        output = self.output.pop(0) if isinstance(self.output, list) else self.output
        if isinstance(output, Exception):
            raise output
        return output


class BlockingApplicationModel(FakeApplicationModel):
    def __init__(self, output: object) -> None:
        super().__init__(output)
        self.started = asyncio.Event()
        self.release = asyncio.Event()

    async def generate_json(self, *, system_prompt: str, user_prompt: str) -> object:
        self._record_request(
            system_prompt=system_prompt, user_prompt=user_prompt
        )
        self.started.set()
        await self.release.wait()
        if isinstance(self.output, Exception):
            raise self.output
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


async def test_claim_studio_generates_fewer_than_three_traceable_claims(
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
        analyzed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        analyzed = analyzed_response.json()
        source_item = analyzed["experience_entries"][0]["experience_items"][0]
        standalone_item = analyzed["standalone_experience_items"][0]
        first_signal, second_signal = analyzed["role_signals"]
        model.output = [
            {
                "competitive_claims": [
                {
                    "experience_item_id": source_item["id"],
                    "primary_role_signal_id": first_signal["id"],
                    "source_focus": "评测样本与质量维度设计",
                    "opportunity_value": "体现用质量评测驱动模型迭代的完整闭环。",
                    "supported_base_fact_ids": [
                        fact["id"] for fact in source_item["base_facts"]
                    ],
                    "competitive_claim": "围绕 120 条高频失败案例建立三维质量评测框架，并协同算法与运营完成两轮提示词迭代，将严重错误案例从 18 条降至 7 条。",
                    "stretch_direction": {
                        "expression_gap": "尚未说明三类评测维度如何影响迭代优先级。",
                        "why_it_matters": "能更直接体现质量判断如何转化为产品决策。",
                        "expansion_direction": "回想一次由评测结论改变提示词或异常处理方案的具体取舍。",
                    },
                },
                {
                    "experience_item_id": standalone_item["id"],
                    "primary_role_signal_id": second_signal["id"],
                    "source_focus": "从工作流设计到评测基线",
                    "opportunity_value": "体现从产品工作流设计到评测治理的系统能力。",
                    "supported_base_fact_ids": [
                        fact["id"] for fact in standalone_item["base_facts"]
                    ],
                    "competitive_claim": "独立设计面向具体 JD 的求职准备工作流，并建立版本化样本与 rubric 比较系统提示词和通用改写基线。",
                    "stretch_direction": {
                        "expression_gap": "当前表述没有呈现评测结果如何驱动工作流迭代。",
                        "why_it_matters": "岗位需要候选人说明如何结合质量评测推动产品稳定交付。",
                        "expansion_direction": "梳理一项因评测结果而调整的节点、交互或提示词决策。",
                    },
                },
                ]
            },
            {"verdict": "approved", "violations": []},
        ]
        response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert analyzed_response.status_code == 200, analyzed_response.text
    assert response.status_code == 200, response.text
    snapshot = response.json()
    assert snapshot["workflow_phase"] == "claim_review"
    assert snapshot["claim_studio"] == {"status": "completed", "last_error": None}
    assert len(snapshot["competitive_claims"]) == 2
    assert len(snapshot["competitive_claims"]) < 3
    assert snapshot["targeted_resume_version"]["resume_claims"] == []
    assert [run["prompt_family"] for run in snapshot["prompt_runs"][-2:]] == [
        "claim_studio",
        "claim_studio",
    ]
    assert [run["prompt_version"] for run in snapshot["prompt_runs"][-2:]] == [
        "claim-studio-v2",
        "claim-studio-review-v1",
    ]
    assert [run["status"] for run in snapshot["prompt_runs"][-2:]] == [
        "completed",
        "completed",
    ]

    sources_by_id = {source["id"]: source for source in snapshot["source_snapshots"]}
    signals_by_id = {signal["id"]: signal for signal in snapshot["role_signals"]}
    for claim in snapshot["competitive_claims"]:
        source = sources_by_id[claim["source_snapshot_id"]]
        assert source["experience_item_id"] == claim["experience_item_id"]
        assert claim["primary_role_signal_id"] in signals_by_id
        assert set(claim["supported_base_fact_ids"]).issubset(
            {fact["id"] for fact in source["base_facts"]}
        )
        assert set(claim["stretch_direction"]) == {
            "expression_gap",
            "why_it_matters",
            "expansion_direction",
        }
        assert "question" not in claim
        assert "score" not in claim


async def test_claim_studio_rejects_duplicate_opportunities_and_can_be_retried(
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
                }
            ]
        }
    )
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        analyzed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        analyzed = analyzed_response.json()
        item = analyzed["experience_entries"][0]["experience_items"][0]
        signal = analyzed["role_signals"][0]
        duplicate = {
            "experience_item_id": item["id"],
            "primary_role_signal_id": signal["id"],
            "source_focus": "评测样本与质量维度设计",
            "opportunity_value": "体现用质量评测驱动模型迭代的完整闭环。",
            "supported_base_fact_ids": [item["base_facts"][0]["id"]],
            "competitive_claim": "围绕 120 条失败案例建立三类质量评测维度。",
            "stretch_direction": {
                "expression_gap": "没有说明评测如何驱动决策。",
                "why_it_matters": "岗位重视质量评测与迭代闭环。",
                "expansion_direction": "回想一次评测结论改变方案的具体取舍。",
            },
        }
        model.output = {
            "competitive_claims": [
                duplicate,
                {
                    **duplicate,
                    "competitive_claim": "基于 120 条失败案例定义三类质量评测维度。",
                },
            ]
        }
        invalid_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )

        model.output = [
            {"competitive_claims": [duplicate]},
            {"verdict": "approved", "violations": []},
        ]
        retried_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert analyzed_response.status_code == 200
    assert invalid_response.status_code == 200
    invalid = invalid_response.json()
    assert invalid["claim_studio"]["status"] == "failed"
    assert invalid["claim_studio"]["last_error"]["code"] == "invalid_output"
    assert invalid["competitive_claims"] == []
    assert invalid["prompt_runs"][-1]["status"] == "failed"

    assert retried_response.status_code == 200
    retried = retried_response.json()
    assert retried["claim_studio"] == {"status": "completed", "last_error": None}
    assert len(retried["competitive_claims"]) == 1
    assert [run["status"] for run in retried["prompt_runs"][-3:]] == [
        "failed",
        "completed",
        "completed",
    ]


async def test_claim_reanalysis_persists_updated_source_before_a_provider_failure(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    analysis_model = FakeApplicationModel(
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
    app.dependency_overrides[get_application_model] = lambda: analysis_model
    analyzed_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=headers,
        json={"type": "analyze_target"},
    )
    assert analyzed_response.status_code == 200
    analyzed = analyzed_response.json()
    item = analyzed["experience_entries"][0]["experience_items"][0]
    signal = analyzed["role_signals"][0]
    analysis_model.output = [
        {
            "competitive_claims": [
            {
                "experience_item_id": item["id"],
                "primary_role_signal_id": signal["id"],
                "source_focus": "评测样本与质量维度设计",
                "opportunity_value": "体现用质量评测驱动模型迭代的完整闭环。",
                "supported_base_fact_ids": [item["base_facts"][0]["id"]],
                "competitive_claim": "围绕 120 条失败案例建立三类质量评测维度。",
                "stretch_direction": {
                    "expression_gap": "没有说明评测如何驱动决策。",
                    "why_it_matters": "岗位重视质量评测与迭代闭环。",
                    "expansion_direction": "回想一次评测结论改变方案的具体取舍。",
                },
            }
            ]
        },
        {"verdict": "approved", "violations": []},
    ]
    initial_claim_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=headers,
        json={"type": "generate_claims"},
    )
    assert initial_claim_response.status_code == 200
    initial_claims = initial_claim_response.json()["competitive_claims"]
    moved_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=headers,
        json={
            "type": "move_experience_item",
            "experience_item_id": item["id"],
            "destination_entry_id": None,
        },
    )
    assert moved_response.status_code == 200
    moved = moved_response.json()
    assert [notice["claim_id"] for notice in moved["source_change_notices"]] == [
        initial_claims[0]["id"]
    ]

    blocking_model = BlockingApplicationModel(
        ModelProviderUnavailableError("fixture unavailable")
    )
    app.dependency_overrides[get_application_model] = lambda: blocking_model
    try:
        generation_task = asyncio.create_task(
            client.post(
                f"/api/applications/{created['application_id']}/commands",
                headers=headers,
                json={
                    "type": "reanalyze_claim",
                    "claim_id": initial_claims[0]["id"],
                },
            )
        )
        await asyncio.wait_for(blocking_model.started.wait(), timeout=2)

        running_response = await client.get(
            f"/api/applications/{created['application_id']}", headers=headers
        )
        running = running_response.json()
        assert running_response.status_code == 200
        assert running["claim_studio"] == {"status": "running", "last_error": None}
        assert running["prompt_runs"][-1]["prompt_family"] == "claim_studio"
        assert running["prompt_runs"][-1]["status"] == "running"
        run_id = running["prompt_runs"][-1]["id"]
        assert len(running["source_snapshots"]) == 3
        assert {
            source["experience_item_id"]
            for source in running["source_snapshots"]
            if source["prompt_run_id"] == run_id
        } == {item["id"]}
        assert running["competitive_claims"] == initial_claims
        assert running["source_change_notices"] == moved["source_change_notices"]

        blocking_model.release.set()
        failed_response = await asyncio.wait_for(generation_task, timeout=2)
    finally:
        blocking_model.release.set()
        app.dependency_overrides.pop(get_application_model, None)

    assert failed_response.status_code == 200
    failed = failed_response.json()
    assert failed["claim_studio"]["status"] == "failed"
    assert failed["claim_studio"]["last_error"]["code"] == "provider_unavailable"
    assert failed["competitive_claims"] == initial_claims
    assert failed["source_change_notices"] == moved["source_change_notices"]
    assert failed["source_snapshots"] == running["source_snapshots"]
    assert failed["prompt_runs"][-1]["status"] == "failed"


async def test_claim_studio_rejects_a_claim_with_an_unknown_base_fact(
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
                }
            ]
        }
    )
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        analyzed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        analyzed = analyzed_response.json()
        item = analyzed["experience_entries"][0]["experience_items"][0]
        signal = analyzed["role_signals"][0]
        model.output = {
            "competitive_claims": [
                {
                    "experience_item_id": item["id"],
                    "primary_role_signal_id": signal["id"],
                    "source_focus": "模型尝试引用不存在的材料",
                    "opportunity_value": "测试来源引用边界。",
                    "supported_base_fact_ids": ["fabricated-fact-id"],
                    "competitive_claim": "声称使用了来源中不存在的事实。",
                    "stretch_direction": {
                        "expression_gap": "测试用缺口。",
                        "why_it_matters": "测试用原因。",
                        "expansion_direction": "测试用方向。",
                    },
                }
            ]
        }
        response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert analyzed_response.status_code == 200
    assert response.status_code == 200
    snapshot = response.json()
    assert snapshot["claim_studio"]["status"] == "failed"
    assert snapshot["claim_studio"]["last_error"]["code"] == "invalid_output"
    assert snapshot["competitive_claims"] == []


async def test_claim_studio_independent_review_rejects_semantic_duplicates_and_fact_upgrades(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    preference_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=headers,
        json={
            "type": "update_writing_preference_profile",
            "sentence_length": "detailed",
            "information_density": "dense",
            "technical_detail": "explicit",
            "result_placement": "lead",
        },
    )
    expected_preference = preference_response.json()["writing_preference_profile"]
    model = FakeApplicationModel(
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
        analyzed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        analyzed = analyzed_response.json()
        item = analyzed["experience_entries"][0]["experience_items"][0]
        signal = analyzed["role_signals"][0]
        base_claim = {
            "experience_item_id": item["id"],
            "primary_role_signal_id": signal["id"],
            "supported_base_fact_ids": [item["base_facts"][0]["id"]],
            "stretch_direction": {
                "expression_gap": "没有说明评测如何驱动决策。",
                "why_it_matters": "岗位重视质量评测与迭代闭环。",
                "expansion_direction": "回想一次评测结论改变方案的具体取舍。",
            },
        }
        model.output = [
            {
                "competitive_claims": [
                    {
                        **base_claim,
                        "source_focus": "评测维度设计",
                        "opportunity_value": "体现评测体系设计能力。",
                        "competitive_claim": "围绕 120 条失败案例建立三类质量评测维度。",
                    },
                    {
                        **base_claim,
                        "source_focus": "失败样本归纳",
                        "opportunity_value": "体现评测体系设计能力。",
                        "competitive_claim": "从 120 条高频失败案例中归纳出三类质量评测标准。",
                    },
                ]
            },
            {
                "verdict": "rejected",
                "violations": [
                    {
                        "code": "semantic_duplicate",
                        "claim_indexes": [0, 1],
                        "explanation": "两条主张表达相同的评测体系价值，只改变了措辞和来源重点名称。",
                    }
                ],
            },
        ]
        duplicate_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )

        model.output = [
            {
                "competitive_claims": [
                    {
                        **base_claim,
                        "source_focus": "质量评测体系",
                        "opportunity_value": "体现企业级 AI 战略与商业结果。",
                        "competitive_claim": "独立主导全公司 AI 质量战略，令业务收入翻倍。",
                    }
                ]
            },
            {
                "verdict": "rejected",
                "violations": [
                    {
                        "code": "unsupported_material_fact",
                        "claim_indexes": [0],
                        "explanation": "来源不支持全公司所有权、质量战略范围或收入翻倍结果。",
                    }
                ],
            },
        ]
        upgrade_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert analyzed_response.status_code == 200
    assert preference_response.status_code == 200
    for response in (duplicate_response, upgrade_response):
        assert response.status_code == 200
        snapshot = response.json()
        assert snapshot["claim_studio"]["status"] == "failed"
        assert snapshot["claim_studio"]["last_error"]["code"] == "invalid_output"
        assert snapshot["competitive_claims"] == []
        assert [run["prompt_version"] for run in snapshot["prompt_runs"][-2:]] == [
            "claim-studio-v2",
            "claim-studio-review-v1",
        ]
        assert [run["status"] for run in snapshot["prompt_runs"][-2:]] == [
            "completed",
            "completed",
        ]
    assert json.loads(model.requests[1]["user_prompt"])[
        "writing_preference_profile"
    ] == expected_preference
    assert json.loads(model.requests[3]["user_prompt"])[
        "writing_preference_profile"
    ] == expected_preference


async def test_source_edit_preserves_claim_and_emits_a_non_blocking_notice_without_model_call(
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
                }
            ]
        }
    )
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        analyzed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        analyzed = analyzed_response.json()
        item = analyzed["experience_entries"][0]["experience_items"][0]
        signal = analyzed["role_signals"][0]
        model.output = [
            {
                "competitive_claims": [
                    {
                        "experience_item_id": item["id"],
                        "primary_role_signal_id": signal["id"],
                        "source_focus": "质量评测体系",
                        "opportunity_value": "体现质量评测方法设计能力。",
                        "supported_base_fact_ids": [item["base_facts"][0]["id"]],
                        "competitive_claim": "围绕 120 条失败案例建立三类质量评测维度。",
                        "stretch_direction": {
                            "expression_gap": "没有说明评测如何驱动决策。",
                            "why_it_matters": "岗位重视质量评测与迭代闭环。",
                            "expansion_direction": "回想一次评测结论改变方案的具体取舍。",
                        },
                    }
                ]
            },
            {"verdict": "approved", "violations": []},
        ]
        generated_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
        generated = generated_response.json()
        calls_before_source_edit = model.calls

        moved_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "move_experience_item",
                "experience_item_id": item["id"],
                "destination_entry_id": None,
            },
        )
        model.output = ModelProviderUnavailableError("provider unavailable")
        regeneration_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
        claim_id = generated["competitive_claims"][0]["id"]
        saved_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "save_targeted_resume_claims",
                "claim_ids": [claim_id],
            },
        )
        text_export_response = await client.get(
            f"/api/applications/{created['application_id']}/targeted-resume.txt",
            headers=headers,
        )
        markdown_export_response = await client.get(
            f"/api/applications/{created['application_id']}/targeted-resume.md",
            headers=headers,
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert analyzed_response.status_code == 200
    assert generated_response.status_code == 200
    assert moved_response.status_code == 200
    moved = moved_response.json()
    assert moved["competitive_claims"] == generated["competitive_claims"]
    assert model.calls == calls_before_source_edit
    assert regeneration_response.status_code == 422
    assert "重新分析" in regeneration_response.json()["detail"]
    assert saved_response.status_code == 200, saved_response.text
    assert saved_response.json()["source_change_notices"] == moved[
        "source_change_notices"
    ]
    assert text_export_response.status_code == 200
    assert markdown_export_response.status_code == 200
    original_claim_text = generated["competitive_claims"][0][
        "selected_resume_claim"
    ]
    assert original_claim_text in text_export_response.text
    assert original_claim_text in markdown_export_response.text
    assert model.calls == calls_before_source_edit
    assert moved["source_change_notices"] == [
        {
            "claim_id": generated["competitive_claims"][0]["id"],
            "source_snapshot_id": generated["competitive_claims"][0][
                "source_snapshot_id"
            ],
            "experience_item_id": item["id"],
            "changed_dimensions": ["entry_context"],
            "message": "当前经历材料已变化；这条主张仍保留生成时的来源，只有你明确重新分析时才会使用新材料。",
        }
    ]


async def test_explicit_claim_reanalysis_uses_current_source_and_keeps_the_original_claim_provenance(
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
                }
            ]
        }
    )
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        analyzed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        analyzed = analyzed_response.json()
        item = analyzed["experience_entries"][0]["experience_items"][0]
        signal = analyzed["role_signals"][0]
        model.output = [
            {
                "competitive_claims": [
                    {
                        "experience_item_id": item["id"],
                        "primary_role_signal_id": signal["id"],
                        "source_focus": "质量评测体系",
                        "opportunity_value": "体现质量评测方法设计能力。",
                        "supported_base_fact_ids": [item["base_facts"][0]["id"]],
                        "competitive_claim": "围绕 120 条失败案例建立三类质量评测维度。",
                        "stretch_direction": {
                            "expression_gap": "没有说明评测如何驱动决策。",
                            "why_it_matters": "岗位重视质量评测与迭代闭环。",
                            "expansion_direction": "回想一次评测结论改变方案的具体取舍。",
                        },
                    }
                ]
            },
            {"verdict": "approved", "violations": []},
        ]
        generated_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
        generated = generated_response.json()
        original_claim = generated["competitive_claims"][0]
        edited_text = "从 120 条失败案例中定义三类评测维度，并用于两轮提示词迭代。"
        edited_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "edit_resume_claim",
                "claim_id": original_claim["id"],
                "resume_claim": edited_text,
            },
        )
        edited_claim = edited_response.json()["competitive_claims"][0]
        moved_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "move_experience_item",
                "experience_item_id": item["id"],
                "destination_entry_id": None,
            },
        )
        calls_before_reanalysis = model.calls
        requests_before_reanalysis = len(model.requests)
        model.output = [
            {
                "competitive_claims": [
                    {
                        "experience_item_id": item["id"],
                        "primary_role_signal_id": signal["id"],
                        "source_focus": "评测驱动迭代",
                        "opportunity_value": "体现从评测设计到产品迭代的闭环。",
                        "supported_base_fact_ids": [item["base_facts"][0]["id"]],
                        "competitive_claim": "基于 120 条失败案例建立三类评测维度，驱动两轮提示词迭代。",
                        "stretch_direction": {
                            "expression_gap": "尚未说明每轮迭代的判断标准。",
                            "why_it_matters": "岗位要求以质量评测推动稳定交付。",
                            "expansion_direction": "补充一次由评测结果触发的具体产品取舍。",
                        },
                    }
                ]
            },
            {"verdict": "approved", "violations": []},
        ]
        reanalyzed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "reanalyze_claim", "claim_id": original_claim["id"]},
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert analyzed_response.status_code == 200
    assert generated_response.status_code == 200
    assert edited_response.status_code == 200
    assert moved_response.status_code == 200
    assert reanalyzed_response.status_code == 200, reanalyzed_response.text
    reanalyzed = reanalyzed_response.json()
    assert reanalyzed["competitive_claims"][0] == edited_claim
    assert reanalyzed["competitive_claims"][0]["selected_resume_claim"] == edited_text
    assert len(reanalyzed["competitive_claims"]) == 2
    new_claim = reanalyzed["competitive_claims"][1]
    assert new_claim["source_snapshot_id"] != original_claim["source_snapshot_id"]
    new_source = next(
        source
        for source in reanalyzed["source_snapshots"]
        if source["id"] == new_claim["source_snapshot_id"]
    )
    assert new_source["experience_item_id"] == item["id"]
    assert new_source["entry_context"] is None
    assert new_source["base_facts"] == item["base_facts"]
    assert new_source["prompt_run_id"] is not None
    assert model.calls == calls_before_reanalysis + 2
    prompt_payload = json.loads(
        model.requests[requests_before_reanalysis]["user_prompt"]
    )
    assert prompt_payload["experience_sources"] == [
        {
            "experience_item_id": item["id"],
            "item_title": item["title"],
            "entry_context": None,
            "base_facts": item["base_facts"],
        }
    ]
    assert [notice["claim_id"] for notice in reanalyzed["source_change_notices"]] == [
        original_claim["id"]
    ]


async def test_claim_studio_requires_role_signals(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    model = FakeApplicationModel({"competitive_claims": []})
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert response.status_code == 422
    assert "Target Analysis" in response.json()["detail"]
    assert model.calls == 0


async def test_editing_a_claim_persists_the_selected_resume_claim_without_saving_or_model_work(
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
                }
            ]
        }
    )
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        analyzed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        analyzed = analyzed_response.json()
        item = analyzed["experience_entries"][0]["experience_items"][0]
        signal = analyzed["role_signals"][0]
        original_claim = "围绕 120 条失败案例建立三类质量评测维度。"
        model.output = [
            {
                "competitive_claims": [
                    {
                        "experience_item_id": item["id"],
                        "primary_role_signal_id": signal["id"],
                        "source_focus": "质量评测体系",
                        "opportunity_value": "体现质量评测方法设计能力。",
                        "supported_base_fact_ids": [item["base_facts"][0]["id"]],
                        "competitive_claim": original_claim,
                        "stretch_direction": {
                            "expression_gap": "没有说明评测如何驱动决策。",
                            "why_it_matters": "岗位重视质量评测与迭代闭环。",
                            "expansion_direction": "回想一次评测结论改变方案的具体取舍。",
                        },
                    }
                ]
            },
            {"verdict": "approved", "violations": []},
        ]
        generated_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
        generated = generated_response.json()
        claim = generated["competitive_claims"][0]
        calls_before_edit = model.calls

        edited_text = "从 120 条高频失败案例中定义准确性、完整性和可执行性三类评测维度。"
        edited_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "edit_resume_claim",
                "claim_id": claim["id"],
                "resume_claim": edited_text,
            },
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert analyzed_response.status_code == 200
    assert generated_response.status_code == 200
    assert edited_response.status_code == 200, edited_response.text
    edited = edited_response.json()
    edited_claim = edited["competitive_claims"][0]
    assert edited_claim["competitive_claim"] == original_claim
    assert edited_claim["selected_resume_claim"] == edited_text
    assert edited_claim["selected_resume_claim_is_edited"] is True
    assert edited["targeted_resume_version"]["resume_claims"] == []
    assert edited["behavior_events"] == []
    assert model.calls == calls_before_edit

    reopened_response = await client.get(
        f"/api/applications/{created['application_id']}", headers=headers
    )
    assert reopened_response.status_code == 200
    assert reopened_response.json() == edited

    library_response = await client.get("/api/experience-library", headers=headers)
    assert library_response.status_code == 200
    assert library_response.json() == {
        "experience_entries": [],
        "standalone_experience_items": [],
    }


async def test_issue_nine_claim_snapshots_open_with_the_generated_claim_selected(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    legacy_snapshot = {
        **created,
        "competitive_claims": [
            {
                "id": "legacy-claim",
                "source_snapshot_id": "legacy-source",
                "experience_item_id": created["experience_entries"][0]["experience_items"][0]["id"],
                "source_focus": "质量评测体系",
                "opportunity_value": "体现质量评测方法设计能力。",
                "supported_base_fact_ids": [],
                "primary_role_signal_id": "legacy-signal",
                "primary_role_signal": {
                    "id": "legacy-signal",
                    "signal": "质量评测设计",
                    "source_type": "explicit",
                    "jd_excerpt": "设计质量评测方案",
                    "rationale": None,
                },
                "competitive_claim": "建立三类质量评测维度。",
                "stretch_direction": {
                    "expression_gap": "没有说明如何驱动决策。",
                    "why_it_matters": "岗位重视迭代闭环。",
                    "expansion_direction": "回想一次具体取舍。",
                },
            }
        ],
    }

    reopened = ApplicationSnapshot.model_validate(legacy_snapshot)

    assert reopened.competitive_claims[0].selected_resume_claim == "建立三类质量评测维度。"
    assert reopened.competitive_claims[0].selected_resume_claim_is_edited is False
    assert reopened.competitive_claims[0].selected_resume_claim_updated_at is None


async def test_explicit_save_preserves_claim_provenance_and_emits_the_saved_claim_event(
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
                }
            ]
        }
    )
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        analyzed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        analyzed = analyzed_response.json()
        item = analyzed["experience_entries"][0]["experience_items"][0]
        signal = analyzed["role_signals"][0]
        model.output = [
            {
                "competitive_claims": [
                    {
                        "experience_item_id": item["id"],
                        "primary_role_signal_id": signal["id"],
                        "source_focus": "质量评测体系",
                        "opportunity_value": "体现质量评测方法设计能力。",
                        "supported_base_fact_ids": [item["base_facts"][0]["id"]],
                        "competitive_claim": "围绕 120 条失败案例建立三类质量评测维度。",
                        "stretch_direction": {
                            "expression_gap": "没有说明评测如何驱动决策。",
                            "why_it_matters": "岗位重视质量评测与迭代闭环。",
                            "expansion_direction": "回想一次评测结论改变方案的具体取舍。",
                        },
                    }
                ]
            },
            {"verdict": "approved", "violations": []},
        ]
        generated_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
        generated = generated_response.json()
        claim = generated["competitive_claims"][0]
        edited_text = "从 120 条高频失败案例中定义三类评测维度，并据此推进两轮提示词迭代。"
        edited_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "edit_resume_claim",
                "claim_id": claim["id"],
                "resume_claim": edited_text,
            },
        )
        calls_before_save = model.calls

        saved_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "save_targeted_resume_claims",
                "claim_ids": [claim["id"]],
            },
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert analyzed_response.status_code == 200
    assert generated_response.status_code == 200
    assert edited_response.status_code == 200
    assert saved_response.status_code == 200, saved_response.text
    saved = saved_response.json()
    resume_claims = saved["targeted_resume_version"]["resume_claims"]
    assert len(resume_claims) == 1
    saved_claim = resume_claims[0]
    assert saved_claim["source_claim_id"] == claim["id"]
    assert saved_claim["resume_claim"] == edited_text
    assert saved_claim["experience_item_id"] == claim["experience_item_id"]
    assert saved_claim["source_snapshot_id"] == claim["source_snapshot_id"]
    assert saved_claim["primary_role_signal"] == claim["primary_role_signal"]
    source = next(
        source
        for source in generated["source_snapshots"]
        if source["id"] == claim["source_snapshot_id"]
    )
    assert saved_claim["prompt_run_id"] == source["prompt_run_id"]
    assert saved_claim["selected_resume_claim_is_edited"] is True
    assert "stretch_direction" not in saved_claim
    assert saved["behavior_events"] == [
        {
            "id": saved["behavior_events"][0]["id"],
            "event_type": "claim_saved",
            "claim_ids": [claim["id"]],
            "created_at": saved["behavior_events"][0]["created_at"],
        }
    ]
    assert model.calls == calls_before_save


async def test_only_an_explicitly_saved_edit_updates_the_visible_writing_preference(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    assert created["writing_preference_profile"] == {
        "profile_version": "writing-preference-v1",
        "enabled": True,
        "source": "default",
        "sentence_length": "balanced",
        "information_density": "balanced",
        "technical_detail": "balanced",
        "result_placement": "balanced",
        "learned_from_saved_edits": 0,
        "updated_at": None,
    }

    model = FakeApplicationModel(
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
        analyzed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        analyzed = analyzed_response.json()
        item = analyzed["experience_entries"][0]["experience_items"][0]
        signal = analyzed["role_signals"][0]
        generated_text = "围绕 120 条高频失败案例建立准确性、完整性和可执行性三类质量评测维度。"
        model.output = [
            {
                "competitive_claims": [
                    {
                        "experience_item_id": item["id"],
                        "primary_role_signal_id": signal["id"],
                        "source_focus": "质量评测体系",
                        "opportunity_value": "体现质量评测方法设计能力。",
                        "supported_base_fact_ids": [item["base_facts"][0]["id"]],
                        "competitive_claim": generated_text,
                        "stretch_direction": {
                            "expression_gap": "没有说明评测如何驱动决策。",
                            "why_it_matters": "岗位重视质量评测与迭代闭环。",
                            "expansion_direction": "回想一次评测结论改变方案的具体取舍。",
                        },
                    }
                ]
            },
            {"verdict": "approved", "violations": []},
        ]
        generated_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
        claim = generated_response.json()["competitive_claims"][0]
        unedited_save_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "save_targeted_resume_claims",
                "claim_ids": [claim["id"]],
            },
        )
        neutral_edited_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "edit_resume_claim",
                "claim_id": claim["id"],
                "resume_claim": (
                    "作为 PM 依据 120 条高频失败案例搭建准确性、完整性和可执行性三类质量评测维度。"
                ),
            },
        )
        neutral_saved_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "save_targeted_resume_claims",
                "claim_ids": [claim["id"]],
            },
        )
        edited_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "edit_resume_claim",
                "claim_id": claim["id"],
                "resume_claim": (
                    "将严重错误案例从 18 条降至 7 条；基于 Prompt 评测定位高频失败模式，"
                    "并协同算法完成两轮迭代，形成可复用的质量评测闭环。"
                ),
            },
        )
        calls_before_save = model.calls
        saved_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "save_targeted_resume_claims",
                "claim_ids": [claim["id"]],
            },
        )
        repeated_save_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "save_targeted_resume_claims",
                "claim_ids": [claim["id"]],
            },
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert analyzed_response.status_code == 200
    assert generated_response.status_code == 200
    assert unedited_save_response.status_code == 200
    assert unedited_save_response.json()["writing_preference_profile"]["source"] == "default"
    assert (
        unedited_save_response.json()["writing_preference_profile"][
            "learned_from_saved_edits"
        ]
        == 0
    )
    assert neutral_edited_response.status_code == 200
    assert neutral_saved_response.status_code == 200
    assert neutral_saved_response.json()["writing_preference_profile"]["source"] == "default"
    assert (
        neutral_saved_response.json()["writing_preference_profile"][
            "learned_from_saved_edits"
        ]
        == 0
    )
    assert edited_response.status_code == 200
    assert edited_response.json()["writing_preference_profile"]["source"] == "default"
    assert edited_response.json()["writing_preference_profile"]["learned_from_saved_edits"] == 0
    assert saved_response.status_code == 200, saved_response.text
    learned = saved_response.json()["writing_preference_profile"]
    assert learned["source"] == "learned"
    assert learned["sentence_length"] == "detailed"
    assert learned["information_density"] == "dense"
    assert learned["technical_detail"] == "explicit"
    assert learned["result_placement"] == "lead"
    assert learned["learned_from_saved_edits"] == 1
    assert learned["updated_at"] is not None
    assert repeated_save_response.status_code == 200
    assert (
        repeated_save_response.json()["writing_preference_profile"]
        ["learned_from_saved_edits"]
        == 1
    )
    assert model.calls == calls_before_save

    later_application = await _create_application(client, headers)
    assert later_application["writing_preference_profile"] == learned
    before_profile_change = repeated_save_response.json()
    manually_changed_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=headers,
        json={
            "type": "update_writing_preference_profile",
            "sentence_length": "concise",
            "information_density": "focused",
            "technical_detail": "essential",
            "result_placement": "close",
        },
    )
    assert manually_changed_response.status_code == 200
    assert (
        manually_changed_response.json()["targeted_resume_version"]
        == before_profile_change["targeted_resume_version"]
    )
    assert (
        manually_changed_response.json()["prompt_runs"]
        == before_profile_change["prompt_runs"]
    )


async def test_owner_can_edit_disable_and_clear_the_writing_preference(
    client: AsyncClient, auth_headers
):
    owner_headers = await auth_headers(client)
    other_headers = await auth_headers(client)
    created = await _create_application(client, owner_headers)

    updated_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=owner_headers,
        json={
            "type": "update_writing_preference_profile",
            "sentence_length": "detailed",
            "information_density": "dense",
            "technical_detail": "explicit",
            "result_placement": "lead",
        },
    )
    forbidden_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=other_headers,
        json={
            "type": "set_writing_preference_profile_enabled",
            "enabled": False,
        },
    )
    disabled_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=owner_headers,
        json={
            "type": "set_writing_preference_profile_enabled",
            "enabled": False,
        },
    )
    other_application = await _create_application(client, other_headers)
    cleared_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=owner_headers,
        json={"type": "clear_writing_preference_profile"},
    )

    assert updated_response.status_code == 200, updated_response.text
    updated = updated_response.json()["writing_preference_profile"]
    assert updated == {
        "profile_version": "writing-preference-v1",
        "enabled": True,
        "source": "manual",
        "sentence_length": "detailed",
        "information_density": "dense",
        "technical_detail": "explicit",
        "result_placement": "lead",
        "learned_from_saved_edits": 0,
        "updated_at": updated["updated_at"],
    }
    assert updated["updated_at"] is not None
    assert forbidden_response.status_code == 404
    disabled = disabled_response.json()["writing_preference_profile"]
    assert disabled["enabled"] is False
    assert disabled["source"] == "manual"
    assert disabled["sentence_length"] == "detailed"
    assert other_application["writing_preference_profile"]["source"] == "default"
    assert other_application["writing_preference_profile"]["enabled"] is True

    assert cleared_response.status_code == 200, cleared_response.text
    assert cleared_response.json()["writing_preference_profile"] == {
        "profile_version": "writing-preference-v1",
        "enabled": True,
        "source": "default",
        "sentence_length": "balanced",
        "information_density": "balanced",
        "technical_detail": "balanced",
        "result_placement": "balanced",
        "learned_from_saved_edits": 0,
        "updated_at": None,
    }


async def test_claim_generation_applies_and_records_the_active_preference_snapshot(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    preference_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=headers,
        json={
            "type": "update_writing_preference_profile",
            "sentence_length": "concise",
            "information_density": "dense",
            "technical_detail": "explicit",
            "result_placement": "lead",
        },
    )
    expected_profile = preference_response.json()["writing_preference_profile"]
    model = FakeApplicationModel(
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
        analyzed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        analyzed = analyzed_response.json()
        item = analyzed["experience_entries"][0]["experience_items"][0]
        signal = analyzed["role_signals"][0]
        model.output = [
            {
                "competitive_claims": [
                    {
                        "experience_item_id": item["id"],
                        "primary_role_signal_id": signal["id"],
                        "source_focus": "质量评测体系",
                        "opportunity_value": "体现质量评测方法设计能力。",
                        "supported_base_fact_ids": [item["base_facts"][0]["id"]],
                        "competitive_claim": "建立三类质量评测维度。",
                        "stretch_direction": {
                            "expression_gap": "没有说明评测如何驱动决策。",
                            "why_it_matters": "岗位重视质量评测与迭代闭环。",
                            "expansion_direction": "回想一次评测结论改变方案的具体取舍。",
                        },
                    }
                ]
            },
            {"verdict": "approved", "violations": []},
        ]
        generated_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
        changed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "update_writing_preference_profile",
                "sentence_length": "detailed",
                "information_density": "focused",
                "technical_detail": "essential",
                "result_placement": "close",
            },
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert preference_response.status_code == 200
    assert analyzed_response.status_code == 200
    assert generated_response.status_code == 200, generated_response.text
    generated = generated_response.json()
    generation_run = next(
        run
        for run in generated["prompt_runs"]
        if run["prompt_family"] == "claim_studio"
        and run["prompt_version"] == "claim-studio-v2"
    )
    assert generation_run["writing_preference_profile_snapshot"] == expected_profile
    generation_payload = json.loads(model.requests[1]["user_prompt"])
    assert generation_payload["writing_preference_profile"] == expected_profile
    assert "偏好只能改变表达风格" in model.requests[1]["system_prompt"]

    assert changed_response.status_code == 200
    historical_run = next(
        run
        for run in changed_response.json()["prompt_runs"]
        if run["id"] == generation_run["id"]
    )
    assert historical_run["writing_preference_profile_snapshot"] == expected_profile


async def test_disabled_preference_uses_the_default_and_does_not_learn_on_save(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    disabled_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=headers,
        json={
            "type": "set_writing_preference_profile_enabled",
            "enabled": False,
        },
    )
    model = FakeApplicationModel(
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
        analyzed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        analyzed = analyzed_response.json()
        item = analyzed["experience_entries"][0]["experience_items"][0]
        signal = analyzed["role_signals"][0]
        model.output = [
            {
                "competitive_claims": [
                    {
                        "experience_item_id": item["id"],
                        "primary_role_signal_id": signal["id"],
                        "source_focus": "质量评测体系",
                        "opportunity_value": "体现质量评测方法设计能力。",
                        "supported_base_fact_ids": [item["base_facts"][0]["id"]],
                        "competitive_claim": "围绕失败案例建立三类质量评测维度。",
                        "stretch_direction": {
                            "expression_gap": "没有说明评测如何驱动决策。",
                            "why_it_matters": "岗位重视质量评测与迭代闭环。",
                            "expansion_direction": "回想一次评测结论改变方案的具体取舍。",
                        },
                    }
                ]
            },
            {"verdict": "approved", "violations": []},
        ]
        generated_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
        generated = generated_response.json()
        claim = generated["competitive_claims"][0]
        edited_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "edit_resume_claim",
                "claim_id": claim["id"],
                "resume_claim": "建立三类评测维度。",
            },
        )
        calls_before_save = model.calls
        saved_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=headers,
            json={
                "type": "save_targeted_resume_claims",
                "claim_ids": [claim["id"]],
            },
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert disabled_response.status_code == 200
    assert analyzed_response.status_code == 200
    assert generated_response.status_code == 200
    generation_run = next(
        run
        for run in generated["prompt_runs"]
        if run["prompt_version"] == "claim-studio-v2"
    )
    default_snapshot = {
        "profile_version": "writing-preference-v1",
        "enabled": False,
        "source": "default",
        "sentence_length": "balanced",
        "information_density": "balanced",
        "technical_detail": "balanced",
        "result_placement": "balanced",
        "learned_from_saved_edits": 0,
        "updated_at": None,
    }
    assert generation_run["writing_preference_profile_snapshot"] == default_snapshot
    assert json.loads(model.requests[1]["user_prompt"])["writing_preference_profile"] == default_snapshot
    assert edited_response.status_code == 200
    assert saved_response.status_code == 200
    current = saved_response.json()["writing_preference_profile"]
    assert current["enabled"] is False
    assert current["source"] == "default"
    assert current["learned_from_saved_edits"] == 0
    assert model.calls == calls_before_save


async def test_targeted_resume_text_and_markdown_export_only_saved_claims_for_the_owner(
    client: AsyncClient, auth_headers
):
    owner_headers = await auth_headers(client)
    other_headers = await auth_headers(client)
    created = await _create_application(client, owner_headers)
    model = FakeApplicationModel(
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
        analyzed_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=owner_headers,
            json={"type": "analyze_target"},
        )
        analyzed = analyzed_response.json()
        item = analyzed["experience_entries"][0]["experience_items"][0]
        signal = analyzed["role_signals"][0]
        saved_text = "从 120 条失败案例中定义三类评测维度，并协同算法与运营推进两轮提示词迭代。"
        unsaved_text = "独立设计面向具体 JD 的求职准备工作流。"
        stretch_text = "回想评测结论改变提示词方案的具体取舍。"
        model.output = [
            {
                "competitive_claims": [
                    {
                        "experience_item_id": item["id"],
                        "primary_role_signal_id": signal["id"],
                        "source_focus": "质量评测体系",
                        "opportunity_value": "体现质量评测方法设计能力。",
                        "supported_base_fact_ids": [item["base_facts"][0]["id"]],
                        "competitive_claim": saved_text,
                        "stretch_direction": {
                            "expression_gap": "没有说明评测如何驱动决策。",
                            "why_it_matters": "岗位重视质量评测与迭代闭环。",
                            "expansion_direction": stretch_text,
                        },
                    },
                    {
                        "experience_item_id": analyzed["standalone_experience_items"][0]["id"],
                        "primary_role_signal_id": signal["id"],
                        "source_focus": "具体 JD 工作流",
                        "opportunity_value": "体现岗位理解与工作流设计能力。",
                        "supported_base_fact_ids": [
                            analyzed["standalone_experience_items"][0]["base_facts"][0]["id"]
                        ],
                        "competitive_claim": unsaved_text,
                        "stretch_direction": {
                            "expression_gap": "没有说明工作流如何验证质量。",
                            "why_it_matters": "岗位重视评测方法。",
                            "expansion_direction": "梳理一次评测驱动工作流调整的实例。",
                        },
                    },
                ]
            },
            {"verdict": "approved", "violations": []},
        ]
        generated_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=owner_headers,
            json={"type": "generate_claims"},
        )
        generated = generated_response.json()
        saved_claim_id = generated["competitive_claims"][0]["id"]
        forbidden_save_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=other_headers,
            json={
                "type": "save_targeted_resume_claims",
                "claim_ids": [saved_claim_id],
            },
        )
        saved_response = await client.post(
            f"/api/applications/{created['application_id']}/commands",
            headers=owner_headers,
            json={
                "type": "save_targeted_resume_claims",
                "claim_ids": [saved_claim_id],
            },
        )
        calls_before_export = model.calls

        text_response = await client.get(
            f"/api/applications/{created['application_id']}/targeted-resume.txt",
            headers=owner_headers,
        )
        markdown_response = await client.get(
            f"/api/applications/{created['application_id']}/targeted-resume.md",
            headers=owner_headers,
        )
        forbidden_response = await client.get(
            f"/api/applications/{created['application_id']}/targeted-resume.md",
            headers=other_headers,
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert analyzed_response.status_code == 200
    assert generated_response.status_code == 200
    assert forbidden_save_response.status_code == 404
    assert saved_response.status_code == 200
    assert text_response.status_code == 200, text_response.text
    assert text_response.headers["content-type"].startswith("text/plain")
    assert saved_text in text_response.text
    assert unsaved_text not in text_response.text
    assert stretch_text not in text_response.text

    assert markdown_response.status_code == 200, markdown_response.text
    assert markdown_response.headers["content-type"].startswith("text/markdown")
    assert markdown_response.headers["content-disposition"].startswith("attachment;")
    assert "# AI 产品经理 · 目标简历" in markdown_response.text
    assert f"- {saved_text}" in markdown_response.text
    assert unsaved_text not in markdown_response.text
    assert stretch_text not in markdown_response.text
    assert forbidden_response.status_code == 404
    assert model.calls == calls_before_export


async def test_candidate_explicitly_saves_selected_application_experience_to_the_library(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    created = await _create_application(client, headers)
    employment_item = created["experience_entries"][0]["experience_items"][0]
    standalone_item = created["standalone_experience_items"][0]

    empty_library_response = await client.get(
        "/api/experience-library", headers=headers
    )
    saved_response = await client.post(
        f"/api/applications/{created['application_id']}/commands",
        headers=headers,
        json={
            "type": "save_experience_to_library",
            "experience_item_ids": [employment_item["id"], standalone_item["id"]],
        },
    )
    library_response = await client.get("/api/experience-library", headers=headers)

    assert empty_library_response.status_code == 200
    assert empty_library_response.json() == {
        "experience_entries": [],
        "standalone_experience_items": [],
    }
    assert saved_response.status_code == 200, saved_response.text
    saved = saved_response.json()
    assert len(saved["experience_library_links"]) == 2
    assert {
        link["application_experience_item_id"]
        for link in saved["experience_library_links"]
    } == {employment_item["id"], standalone_item["id"]}
    assert {
        link["relationship"] for link in saved["experience_library_links"]
    } == {"saved_from_application"}

    assert library_response.status_code == 200, library_response.text
    library = library_response.json()
    assert len(library["experience_entries"]) == 1
    saved_entry = library["experience_entries"][0]
    assert saved_entry["organization"] == "知音科技"
    assert saved_entry["role"] == "AI 产品实习生"
    assert saved_entry["date_range"] == "2025.01-2025.06"
    assert [item["title"] for item in saved_entry["experience_items"]] == [
        employment_item["title"]
    ]
    assert [
        fact["text"] for fact in saved_entry["experience_items"][0]["base_facts"]
    ] == [fact["text"] for fact in employment_item["base_facts"]]

    assert len(library["standalone_experience_items"]) == 1
    saved_standalone = library["standalone_experience_items"][0]
    assert saved_standalone["entry_id"] is None
    assert saved_standalone["title"] == standalone_item["title"]
    assert [fact["text"] for fact in saved_standalone["base_facts"]] == [
        fact["text"] for fact in standalone_item["base_facts"]
    ]

    reopened_response = await client.get(
        f"/api/applications/{created['application_id']}", headers=headers
    )
    assert reopened_response.status_code == 200
    assert reopened_response.json() == saved


async def test_candidate_reuses_owned_library_items_in_a_second_application_snapshot(
    client: AsyncClient, auth_headers
):
    owner_headers = await auth_headers(client)
    other_headers = await auth_headers(client)
    first = await _create_application(client, owner_headers)
    first_items = [
        first["experience_entries"][0]["experience_items"][0],
        first["standalone_experience_items"][0],
    ]
    save_response = await client.post(
        f"/api/applications/{first['application_id']}/commands",
        headers=owner_headers,
        json={
            "type": "save_experience_to_library",
            "experience_item_ids": [item["id"] for item in first_items],
        },
    )
    assert save_response.status_code == 200, save_response.text
    library = (
        await client.get("/api/experience-library", headers=owner_headers)
    ).json()
    employment_library_item = library["experience_entries"][0]["experience_items"][0]
    standalone_library_item = library["standalone_experience_items"][0]
    selected_library_ids = [
        employment_library_item["id"],
        standalone_library_item["id"],
    ]

    second_response = await client.post(
        "/api/applications/commands",
        headers=owner_headers,
        json={
            "type": "start_application",
            "target_role": "大模型产品经理",
            "jd_text": CONCRETE_JD,
            "library_experience_item_ids": selected_library_ids,
        },
    )
    forbidden_response = await client.post(
        "/api/applications/commands",
        headers=other_headers,
        json={
            "type": "start_application",
            "target_role": "大模型产品经理",
            "jd_text": CONCRETE_JD,
            "library_experience_item_ids": selected_library_ids,
        },
    )

    assert second_response.status_code == 200, second_response.text
    second = second_response.json()
    assert second["resume_source"]["text"] == ""
    assert len(second["experience_entries"]) == 1
    second_entry = second["experience_entries"][0]
    assert second_entry["organization"] == "知音科技"
    assert second_entry["role"] == "AI 产品实习生"
    assert len(second_entry["experience_items"]) == 1
    second_employment_item = second_entry["experience_items"][0]
    assert second_employment_item["title"] == employment_library_item["title"]
    assert second_employment_item["source_scope"] == "experience_library"
    assert [fact["text"] for fact in second_employment_item["base_facts"]] == [
        fact["text"] for fact in employment_library_item["base_facts"]
    ]
    assert len(second["standalone_experience_items"]) == 1
    assert second["standalone_experience_items"][0]["source_scope"] == (
        "experience_library"
    )

    assert len(second["experience_library_links"]) == 2
    assert {
        link["library_experience_item_id"]
        for link in second["experience_library_links"]
    } == set(selected_library_ids)
    assert {
        link["relationship"] for link in second["experience_library_links"]
    } == {"selected_for_application"}
    source_by_id = {source["id"]: source for source in second["source_snapshots"]}
    for link in second["experience_library_links"]:
        source = source_by_id[link["source_snapshot_id"]]
        assert source["prompt_run_id"] is None
        assert source["source_scope"] == "experience_library"
        assert source["library_experience_item_id"] == link[
            "library_experience_item_id"
        ]

    assert forbidden_response.status_code == 422
    other_list = await client.get("/api/applications", headers=other_headers)
    assert other_list.status_code == 200
    assert other_list.json()["items"] == []

    reopened = await client.get(
        f"/api/applications/{second['application_id']}", headers=owner_headers
    )
    assert reopened.status_code == 200
    assert reopened.json() == second


async def test_library_edits_change_current_content_without_rewriting_an_application_snapshot(
    client: AsyncClient, auth_headers
):
    owner_headers = await auth_headers(client)
    other_headers = await auth_headers(client)
    first = await _create_application(client, owner_headers)
    first_item = first["experience_entries"][0]["experience_items"][0]
    saved_response = await client.post(
        f"/api/applications/{first['application_id']}/commands",
        headers=owner_headers,
        json={
            "type": "save_experience_to_library",
            "experience_item_ids": [first_item["id"]],
        },
    )
    assert saved_response.status_code == 200
    original_library = (
        await client.get("/api/experience-library", headers=owner_headers)
    ).json()
    library_entry = original_library["experience_entries"][0]
    library_item = library_entry["experience_items"][0]

    second_response = await client.post(
        "/api/applications/commands",
        headers=owner_headers,
        json={
            "type": "start_application",
            "target_role": "大模型产品经理",
            "jd_text": CONCRETE_JD,
            "library_experience_item_ids": [library_item["id"]],
        },
    )
    assert second_response.status_code == 200
    second_before_edit = second_response.json()
    captured_before_edit = second_before_edit["source_snapshots"][0]
    changed_title = "大模型客服质量评测与迭代"
    changed_fact = "从 120 条失败案例中归纳准确性、完整性与可执行性问题。"

    forbidden_edit_response = await client.post(
        "/api/experience-library/commands",
        headers=other_headers,
        json={
            "type": "update_experience_library_item",
            "experience_item_id": library_item["id"],
            "title": changed_title,
            "entry_context": {
                "organization": library_entry["organization"],
                "role": library_entry["role"],
                "date_range": library_entry["date_range"],
            },
            "base_facts": [
                {
                    "id": fact["id"],
                    "text": changed_fact if index == 0 else fact["text"],
                }
                for index, fact in enumerate(library_item["base_facts"])
            ],
        },
    )
    edited_library_response = await client.post(
        "/api/experience-library/commands",
        headers=owner_headers,
        json={
            "type": "update_experience_library_item",
            "experience_item_id": library_item["id"],
            "title": changed_title,
            "entry_context": {
                "organization": library_entry["organization"],
                "role": library_entry["role"],
                "date_range": library_entry["date_range"],
            },
            "base_facts": [
                {
                    "id": fact["id"],
                    "text": changed_fact if index == 0 else fact["text"],
                }
                for index, fact in enumerate(library_item["base_facts"])
            ],
        },
    )

    assert forbidden_edit_response.status_code == 404
    assert edited_library_response.status_code == 200, edited_library_response.text
    edited_library = edited_library_response.json()
    edited_item = edited_library["experience_entries"][0]["experience_items"][0]
    assert edited_item["title"] == changed_title
    assert edited_item["base_facts"][0]["text"] == changed_fact
    assert edited_item["id"] == library_item["id"]

    second_after_edit_response = await client.get(
        f"/api/applications/{second_before_edit['application_id']}",
        headers=owner_headers,
    )
    assert second_after_edit_response.status_code == 200
    second_after_edit = second_after_edit_response.json()
    assert second_after_edit == second_before_edit
    assert second_after_edit["source_snapshots"][0] == captured_before_edit
    assert second_after_edit["experience_entries"][0]["experience_items"][0][
        "title"
    ] == library_item["title"]

    other_library_response = await client.get(
        "/api/experience-library", headers=other_headers
    )
    assert other_library_response.status_code == 200
    assert other_library_response.json() == {
        "experience_entries": [],
        "standalone_experience_items": [],
    }


async def test_library_source_edit_emits_a_notice_and_explicit_reanalysis_uses_current_content(
    client: AsyncClient, auth_headers
):
    headers = await auth_headers(client)
    first = await _create_application(client, headers)
    first_item = first["experience_entries"][0]["experience_items"][0]
    saved_response = await client.post(
        f"/api/applications/{first['application_id']}/commands",
        headers=headers,
        json={
            "type": "save_experience_to_library",
            "experience_item_ids": [first_item["id"]],
        },
    )
    assert saved_response.status_code == 200
    library = (await client.get("/api/experience-library", headers=headers)).json()
    library_entry = library["experience_entries"][0]
    library_item = library_entry["experience_items"][0]
    second_response = await client.post(
        "/api/applications/commands",
        headers=headers,
        json={
            "type": "start_application",
            "target_role": "大模型产品经理",
            "jd_text": CONCRETE_JD,
            "library_experience_item_ids": [library_item["id"]],
        },
    )
    assert second_response.status_code == 200
    second = second_response.json()

    model = FakeApplicationModel(
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
    changed_title = "大模型客服质量评测与迭代"
    changed_fact = "从 120 条失败案例中归纳准确性、完整性与可执行性问题。"
    app.dependency_overrides[get_application_model] = lambda: model
    try:
        analyzed_response = await client.post(
            f"/api/applications/{second['application_id']}/commands",
            headers=headers,
            json={"type": "analyze_target"},
        )
        analyzed = analyzed_response.json()
        application_item = analyzed["experience_entries"][0]["experience_items"][0]
        signal = analyzed["role_signals"][0]
        model.output = [
            {
                "competitive_claims": [
                    {
                        "experience_item_id": application_item["id"],
                        "primary_role_signal_id": signal["id"],
                        "source_focus": "质量评测体系",
                        "opportunity_value": "体现质量评测方法设计能力。",
                        "supported_base_fact_ids": [
                            application_item["base_facts"][0]["id"]
                        ],
                        "competitive_claim": "围绕 120 条失败案例建立三类质量评测维度。",
                        "stretch_direction": {
                            "expression_gap": "没有说明评测如何驱动决策。",
                            "why_it_matters": "岗位重视质量评测与迭代闭环。",
                            "expansion_direction": "回想一次评测结论改变方案的具体取舍。",
                        },
                    }
                ]
            },
            {"verdict": "approved", "violations": []},
        ]
        generated_response = await client.post(
            f"/api/applications/{second['application_id']}/commands",
            headers=headers,
            json={"type": "generate_claims"},
        )
        generated = generated_response.json()
        original_claim = generated["competitive_claims"][0]
        original_sources = generated["source_snapshots"]
        calls_before_library_edit = model.calls

        edited_library_response = await client.post(
            "/api/experience-library/commands",
            headers=headers,
            json={
                "type": "update_experience_library_item",
                "experience_item_id": library_item["id"],
                "title": changed_title,
                "entry_context": {
                    "organization": library_entry["organization"],
                    "role": library_entry["role"],
                    "date_range": library_entry["date_range"],
                },
                "base_facts": [
                    {
                        "id": fact["id"],
                        "text": changed_fact if index == 0 else fact["text"],
                    }
                    for index, fact in enumerate(library_item["base_facts"])
                ],
            },
        )
        reopened_response = await client.get(
            f"/api/applications/{second['application_id']}", headers=headers
        )
        reopened = reopened_response.json()
        requests_before_reanalysis = len(model.requests)
        model.output = [
            {
                "competitive_claims": [
                    {
                        "experience_item_id": application_item["id"],
                        "primary_role_signal_id": signal["id"],
                        "source_focus": "更新后的评测问题归纳",
                        "opportunity_value": "体现从失败案例中提炼评测问题的能力。",
                        "supported_base_fact_ids": [
                            application_item["base_facts"][0]["id"]
                        ],
                        "competitive_claim": "从 120 条失败案例中归纳三类关键评测问题。",
                        "stretch_direction": {
                            "expression_gap": "尚未说明问题归纳如何影响迭代。",
                            "why_it_matters": "岗位要求用质量评测推动产品迭代。",
                            "expansion_direction": "补充一次评测问题改变方案的具体取舍。",
                        },
                    }
                ]
            },
            {"verdict": "approved", "violations": []},
        ]
        reanalyzed_response = await client.post(
            f"/api/applications/{second['application_id']}/commands",
            headers=headers,
            json={"type": "reanalyze_claim", "claim_id": original_claim["id"]},
        )
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert analyzed_response.status_code == 200
    assert generated_response.status_code == 200
    assert edited_library_response.status_code == 200
    assert reopened_response.status_code == 200
    assert reopened["competitive_claims"] == generated["competitive_claims"]
    assert reopened["source_snapshots"] == original_sources
    assert reopened["experience_entries"] == generated["experience_entries"]
    assert reopened["source_change_notices"] == [
        {
            "claim_id": original_claim["id"],
            "source_snapshot_id": original_claim["source_snapshot_id"],
            "experience_item_id": application_item["id"],
            "changed_dimensions": ["item_title", "base_facts"],
            "message": "当前经历材料已变化；这条主张仍保留生成时的来源，只有你明确重新分析时才会使用新材料。",
        }
    ]
    assert model.calls == calls_before_library_edit + 2
    assert reanalyzed_response.status_code == 200, reanalyzed_response.text
    reanalyzed = reanalyzed_response.json()
    assert reanalyzed["competitive_claims"][0] == original_claim
    assert len(reanalyzed["competitive_claims"]) == 2
    new_claim = reanalyzed["competitive_claims"][1]
    new_source = next(
        source
        for source in reanalyzed["source_snapshots"]
        if source["id"] == new_claim["source_snapshot_id"]
    )
    assert new_source["item_title"] == changed_title
    assert new_source["base_facts"][0]["text"] == changed_fact
    assert new_source["library_experience_item_id"] == library_item["id"]
    reanalysis_payload = json.loads(
        model.requests[requests_before_reanalysis]["user_prompt"]
    )
    assert reanalysis_payload["experience_sources"][0]["item_title"] == changed_title
    assert reanalysis_payload["experience_sources"][0]["base_facts"][0][
        "text"
    ] == changed_fact
