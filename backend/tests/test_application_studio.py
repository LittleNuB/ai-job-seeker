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
        self.calls += 1
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
        "claim-studio-v1",
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


async def test_claim_studio_persists_sources_before_a_provider_failure(
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

    blocking_model = BlockingApplicationModel(
        ModelProviderUnavailableError("fixture unavailable")
    )
    app.dependency_overrides[get_application_model] = lambda: blocking_model
    try:
        generation_task = asyncio.create_task(
            client.post(
                f"/api/applications/{created['application_id']}/commands",
                headers=headers,
                json={"type": "generate_claims"},
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
        assert len(running["source_snapshots"]) == 4
        assert {
            source["experience_item_id"]
            for source in running["source_snapshots"]
            if source["prompt_run_id"] == run_id
        } == {
            item["id"],
            analyzed["standalone_experience_items"][0]["id"],
        }
        assert running["competitive_claims"] == initial_claims

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
    for response in (duplicate_response, upgrade_response):
        assert response.status_code == 200
        snapshot = response.json()
        assert snapshot["claim_studio"]["status"] == "failed"
        assert snapshot["claim_studio"]["last_error"]["code"] == "invalid_output"
        assert snapshot["competitive_claims"] == []
        assert [run["prompt_version"] for run in snapshot["prompt_runs"][-2:]] == [
            "claim-studio-v1",
            "claim-studio-review-v1",
        ]
        assert [run["status"] for run in snapshot["prompt_runs"][-2:]] == [
            "completed",
            "completed",
        ]


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
    finally:
        app.dependency_overrides.pop(get_application_model, None)

    assert analyzed_response.status_code == 200
    assert generated_response.status_code == 200
    assert moved_response.status_code == 200
    moved = moved_response.json()
    assert moved["competitive_claims"] == generated["competitive_claims"]
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
