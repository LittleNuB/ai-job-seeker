from __future__ import annotations

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.middleware.https import HTTPSOnlyMiddleware


async def test_https_only_middleware_rejects_plain_http():
    app = FastAPI()
    app.add_middleware(HTTPSOnlyMiddleware)

    @app.get("/health")
    async def health():
        return {"ok": True}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.get("/health")

    assert response.status_code == 400


async def test_https_only_middleware_allows_forwarded_https():
    app = FastAPI()
    app.add_middleware(HTTPSOnlyMiddleware)

    @app.get("/health")
    async def health():
        return {"ok": True}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        response = await client.get("/health", headers={"X-Forwarded-Proto": "https"})

    assert response.status_code == 200
    assert response.json() == {"ok": True}
