import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .database import get_db
from .logging_config import configure_logging
from .middleware.https import HTTPSOnlyMiddleware
from .middleware.rate_limit import RateLimitMiddleware
from .models.position import Category, Position

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Build embedding index in background so health check passes immediately
    async def _build_index():
        await asyncio.sleep(3)
        settings = get_settings()
        if settings.model_api_key:
            from .database import async_session
            from .services.embedding_service import get_embedding_service
            try:
                async with async_session() as db:
                    await get_embedding_service().build_index(db)
            except Exception as e:
                logging.getLogger(__name__).warning(f"Embedding index build skipped: {e}")

    asyncio.create_task(_build_index())
    yield


app = FastAPI(
    title="AI Job Copilot API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(RateLimitMiddleware, daily_limit=20)

settings = get_settings()
if settings.is_production:
    app.add_middleware(HTTPSOnlyMiddleware)

local_dev_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins if settings.is_production else local_dev_origins,
    allow_origin_regex=None if settings.is_production else r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .api import auth, positions, jd, match, chat, files, export, records

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(positions.router, prefix="/api/positions", tags=["positions"])
app.include_router(jd.router, prefix="/api/jd", tags=["jd"])
app.include_router(match.router, prefix="/api/match", tags=["match"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(records.router, prefix="/api/records", tags=["records"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.get("/api/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    checks: dict[str, object] = {}

    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = {"status": "ok"}
    except Exception as exc:
        checks["database"] = {"status": "error", "detail": exc.__class__.__name__}
        return JSONResponse(status_code=503, content={"status": "error", "checks": checks})

    category_count = int((await db.execute(select(func.count()).select_from(Category))).scalar_one() or 0)
    position_count = int((await db.execute(select(func.count()).select_from(Position))).scalar_one() or 0)
    positions_ready = category_count > 0 and position_count > 0
    checks["position_data"] = {
        "status": "ok" if positions_ready else "empty",
        "categories": category_count,
        "positions": position_count,
    }

    settings = get_settings()
    checks["config"] = {
        "status": "ok",
        "app_env": settings.app_env,
        "debug": settings.debug,
        "model_provider": settings.model_provider,
        "chat_model_configured": bool(settings.model_chat_model),
        "model_api_key_configured": bool(settings.model_api_key),
        "embedding_model_configured": bool(settings.model_embedding_model),
    }

    status = "ok" if positions_ready else "degraded"
    return JSONResponse(
        status_code=200 if status == "ok" else 503,
        content={"status": status, "checks": checks},
    )
