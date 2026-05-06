from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .logging_config import configure_logging
from .middleware.https import HTTPSOnlyMiddleware
from .middleware.rate_limit import RateLimitMiddleware

configure_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    # Build embedding index on startup (lazy, won't block if no API key)
    if settings.glm_api_key:
        from .database import async_session
        from .services.embedding_service import get_embedding_service
        try:
            async with async_session() as db:
                await get_embedding_service().build_index(db)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Embedding index build skipped: {e}")
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
