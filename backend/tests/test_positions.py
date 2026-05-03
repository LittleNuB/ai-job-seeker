from __future__ import annotations

from app.services import embedding_service


async def test_position_search_uses_keyword_fallback_without_glm_key(client):
    embedding_service._service = None

    response = await client.get("/api/positions/search", params={"query": "LLM", "top_k": 3})

    assert response.status_code == 200, response.text
    results = response.json()
    assert results
    assert results[0]["id"] == "test-llm-engineer"
