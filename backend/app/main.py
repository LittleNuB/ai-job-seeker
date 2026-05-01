from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    yield


app = FastAPI(
    title="AI Job Copilot API",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .api import auth, positions, jd, match, chat

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(positions.router, prefix="/api/positions", tags=["positions"])
app.include_router(jd.router, prefix="/api/jd", tags=["jd"])
app.include_router(match.router, prefix="/api/match", tags=["match"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
