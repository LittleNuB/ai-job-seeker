from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from .config import get_settings


class Base(DeclarativeBase):
    pass


def _get_engine():
    settings = get_settings()
    url = settings.database_url
    # SQLite: use aiosqlite driver
    if url.startswith("sqlite"):
        # Ensure parent directory exists
        if ":///" in url:
            db_path = Path(url.split(":///")[1])
            db_path.parent.mkdir(parents=True, exist_ok=True)
        return create_async_engine(url, echo=settings.debug, connect_args={"check_same_thread": False})
    return create_async_engine(url, echo=settings.debug)


engine = _get_engine()
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
