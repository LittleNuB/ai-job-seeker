from __future__ import annotations

import os
import shutil
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
TEST_DIR = PROJECT_ROOT / ".pytest-temp"
TEST_DB = TEST_DIR / "test.db"

if TEST_DIR.exists():
    shutil.rmtree(TEST_DIR)
TEST_DIR.mkdir(parents=True, exist_ok=True)

os.environ.update(
    {
        "APP_ENV": "test",
        "DEBUG": "false",
        "DATABASE_URL": f"sqlite+aiosqlite:///{TEST_DB.as_posix()}",
        "GLM_API_KEY": "",
        "JWT_SECRET": "test-secret-for-pytest-only-please-rotate",
    }
)

alembic_config = Config(str(BACKEND_ROOT / "alembic.ini"))
alembic_config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
alembic_config.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL"])
command.upgrade(alembic_config, "head")

from app.database import async_session  # noqa: E402
from app.main import app  # noqa: E402
from app.models.position import Category, Position  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
async def seed_positions() -> None:
    async with async_session() as session:
        session.add(
            Category(
                id="test-category",
                name="Test Category",
                description="Positions used by automated tests",
                icon="T",
                sort_order=0,
            )
        )
        session.add(
            Position(
                id="test-llm-engineer",
                category_id="test-category",
                name="LLM Engineer",
                name_en="LLM Engineer",
                level="mid",
                summary="Builds LLM applications and retrieval systems",
                positioning="Backend AI engineering role",
            )
        )
        await session.commit()


@pytest.fixture
async def client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as test_client:
        yield test_client


async def register_user(client: AsyncClient, *, email: str | None = None, password: str = "TestPass123!") -> dict:
    email = email or f"test-{uuid4().hex}@example.com"
    response = await client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": "Pytest User"},
    )
    assert response.status_code == 200, response.text
    return response.json()


@pytest.fixture
def auth_headers():
    async def _auth_headers(client: AsyncClient, *, email: str | None = None) -> dict[str, str]:
        auth = await register_user(client, email=email)
        return {"Authorization": f"Bearer {auth['access_token']}"}

    return _auth_headers
