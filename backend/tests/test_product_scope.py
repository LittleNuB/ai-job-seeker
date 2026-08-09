from __future__ import annotations


async def test_targeted_application_routes_remain_exposed(client):
    schema = (await client.get("/openapi.json")).json()

    assert "/api/positions/categories" in schema["paths"]
    assert "/api/positions" in schema["paths"]
    assert "/api/jd/analyze" in schema["paths"]
    assert "/api/match/analyze" in schema["paths"]
