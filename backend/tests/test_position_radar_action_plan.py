from __future__ import annotations

import json

from sqlalchemy import select

from app.database import async_session
from app.models.analysis import AnalysisRecord
from app.models.position import Position


async def test_position_radar_requires_auth(client):
    response = await client.post(
        "/api/position-radar",
        json={"resume_text": "Python backend LLM RAG project with vector search and API deployment"},
    )

    assert response.status_code == 401


async def test_position_radar_returns_taxonomy_positions_and_saves_record(client, auth_headers):
    headers = await auth_headers(client)

    response = await client.post(
        "/api/position-radar",
        headers=headers,
        json={
            "resume_text": (
                "Python backend engineer with LLM application experience, RAG retrieval, vector search, "
                "FastAPI services, Docker deployment, SQL, and AI product collaboration."
            ),
            "preferences": {"preferred_tracks": ["engineering", "applied"]},
        },
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["record_id"]
    result = data["result"]
    assert len(result["recommended_positions"]) >= 1
    recommended_ids = {item["position_id"] for item in result["recommended_positions"]}
    async with async_session() as session:
        db_ids = set((await session.execute(select(Position.id))).scalars().all())
    assert recommended_ids <= db_ids
    assert "test-llm-engineer" in recommended_ids

    async with async_session() as session:
        record = await session.get(AnalysisRecord, data["record_id"])

    assert record is not None
    assert record.type == "position_radar"


async def test_action_plan_uses_owned_source_record(client, auth_headers):
    owner_headers = await auth_headers(client)
    other_headers = await auth_headers(client)

    radar = await client.post(
        "/api/position-radar",
        headers=owner_headers,
        json={
            "resume_text": (
                "Python backend engineer with LLM application experience, RAG retrieval, vector search, "
                "FastAPI services, Docker deployment, SQL, and AI product collaboration."
            )
        },
    )
    assert radar.status_code == 200, radar.text
    source_id = radar.json()["record_id"]

    other_response = await client.post(
        "/api/action-plan",
        headers=other_headers,
        json={"source_type": "position_radar", "source_record_id": source_id},
    )
    assert other_response.status_code == 404

    response = await client.post(
        "/api/action-plan",
        headers=owner_headers,
        json={"source_type": "position_radar", "source_record_id": source_id},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["record_id"]
    assert len(data["result"]["tasks"]) == 7
    assert data["result"]["markdown"].startswith("# 7")

    async with async_session() as session:
        result = await session.execute(select(AnalysisRecord).where(AnalysisRecord.id == data["record_id"]))
        record = result.scalar_one()

    assert record.type == "action_plan"
    assert json.loads(record.result)["source_record_id"] == source_id
