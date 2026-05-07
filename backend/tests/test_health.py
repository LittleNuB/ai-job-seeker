from __future__ import annotations


async def test_health_check_is_lightweight(client):
    response = await client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_readiness_check_reports_database_positions_and_config(client):
    response = await client.get("/api/health/ready")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["checks"]["database"]["status"] == "ok"
    assert payload["checks"]["position_data"]["status"] == "ok"
    assert payload["checks"]["position_data"]["categories"] >= 1
    assert payload["checks"]["position_data"]["positions"] >= 1
    assert payload["checks"]["config"]["app_env"] == "test"
    assert payload["checks"]["config"]["chat_model_configured"] is True
    assert payload["checks"]["config"]["model_api_key_configured"] is False
