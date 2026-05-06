from __future__ import annotations

from uuid import uuid4


async def test_login_rate_limit_blocks_repeated_attempts(client):
    email = f"limited-{uuid4().hex}@example.com"
    password = "TestPass123!"
    register = await client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": "Limited User", "accepted_terms": True},
    )
    assert register.status_code == 200, register.text

    for _ in range(5):
        response = await client.post("/api/auth/login", json={"email": email, "password": "WrongPass123!"})
        assert response.status_code == 401
        assert response.headers["X-Auth-RateLimit-Limit"] == "5"

    limited = await client.post("/api/auth/login", json={"email": email, "password": "WrongPass123!"})
    assert limited.status_code == 429
    assert limited.json()["remaining"] == 0


async def test_upload_rejects_unsupported_extension(client, auth_headers):
    headers = await auth_headers(client)
    response = await client.post(
        "/api/files/upload",
        headers=headers,
        files={"file": ("resume.txt", b"plain text", "text/plain")},
    )
    assert response.status_code == 415


async def test_upload_rejects_mismatched_content_type(client, auth_headers):
    headers = await auth_headers(client)
    response = await client.post(
        "/api/files/upload",
        headers=headers,
        files={"file": ("resume.pdf", b"%PDF fake", "text/plain")},
    )
    assert response.status_code == 415


async def test_upload_rejects_empty_and_oversized_files(client, auth_headers):
    headers = await auth_headers(client)
    empty = await client.post(
        "/api/files/upload",
        headers=headers,
        files={"file": ("resume.pdf", b"", "application/pdf")},
    )
    assert empty.status_code == 400

    oversized = await client.post(
        "/api/files/upload",
        headers=headers,
        files={"file": ("resume.pdf", b"x" * (10 * 1024 * 1024 + 1), "application/pdf")},
    )
    assert oversized.status_code == 413
