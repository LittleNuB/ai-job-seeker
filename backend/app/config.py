from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    # GLM API
    glm_api_key: str = ""
    glm_model: str = "glm-4.6V"
    glm_base_url: str = "https://open.bigmodel.cn/api/paas/v4/"
    glm_temperature: float = 0.7
    glm_max_tokens: int = 4096

    # Database (SQLite for dev, PostgreSQL for production)
    _db_path = PROJECT_ROOT / "data" / "ai_job_copilot.db"
    database_url: str = f"sqlite+aiosqlite:///{_db_path}"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 72

    # App
    app_name: str = "AI Job Copilot"
    debug: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
