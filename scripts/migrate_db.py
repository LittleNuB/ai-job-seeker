from __future__ import annotations

import asyncio
from pathlib import Path
import sys

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"

if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.config import get_settings  # noqa: E402

APP_TABLES = {
    "analysis_records",
    "categories",
    "chat_conversations",
    "chat_messages",
    "positions",
    "users",
}


def get_alembic_config() -> Config:
    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))
    config.set_main_option("sqlalchemy.url", get_settings().database_url)
    return config


def sqlite_database_exists(url: str) -> bool:
    if not url.startswith("sqlite"):
        return False
    marker = ":///"
    if marker not in url:
        return False
    return Path(url.split(marker, 1)[1]).exists()


async def inspect_existing_tables(url: str) -> set[str]:
    engine = create_async_engine(url, poolclass=NullPool)
    try:
        async with engine.connect() as connection:
            return await connection.run_sync(lambda sync_conn: set(inspect(sync_conn).get_table_names()))
    finally:
        await engine.dispose()


async def should_stamp_existing_sqlite(url: str) -> bool:
    if not sqlite_database_exists(url):
        return False

    tables = await inspect_existing_tables(url)
    return "alembic_version" not in tables and APP_TABLES.issubset(tables)


def main() -> None:
    config = get_alembic_config()
    url = get_settings().database_url

    if asyncio.run(should_stamp_existing_sqlite(url)):
        print("Existing SQLite schema detected; stamping Alembic baseline.")
        command.stamp(config, "head")
        return

    command.upgrade(config, "head")


if __name__ == "__main__":
    main()
