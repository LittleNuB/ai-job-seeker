from __future__ import annotations

from httpx import AsyncClient


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
