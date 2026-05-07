from pathlib import Path
import secrets

from pydantic import model_validator
from pydantic_settings import BaseSettings
from functools import lru_cache

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
WEAK_JWT_SECRETS = {"", "change-me-in-production", "your-secret-here", "dev-secret"}


class Settings(BaseSettings):
    # GLM API
    glm_api_key: str = ""
    glm_model: str = "glm-4.6V"
    glm_base_url: str = "https://open.bigmodel.cn/api/paas/v4/"
    glm_temperature: float = 0.7
    glm_max_tokens: int = 4096
    glm_timeout_seconds: float = 60.0
    glm_max_retries: int = 1
    glm_embedding_model: str = "embedding-3"

    # Database (SQLite for dev, PostgreSQL for production)
    _db_path = PROJECT_ROOT / "data" / "ai_job_copilot.db"
    database_url: str = f"sqlite+aiosqlite:///{_db_path}"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 72

    # App
    app_name: str = "AI Job Copilot"
    app_env: str = "development"
    debug: bool = False
    cors_allow_origins: str = ""

    model_config = {
        "env_file": [str(PROJECT_ROOT / ".env"), str(Path(__file__).resolve().parent.parent / ".env"), ".env"],
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() in {"prod", "production"}

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]

    @model_validator(mode="after")
    def validate_security_settings(self) -> "Settings":
        env = self.app_env.strip().lower()
        secret = self.jwt_secret.strip()

        if not 0 <= self.glm_temperature <= 2:
            raise ValueError("GLM_TEMPERATURE must be between 0 and 2.")
        if not 1 <= self.glm_max_tokens <= 32768:
            raise ValueError("GLM_MAX_TOKENS must be between 1 and 32768.")
        if not 1 <= self.glm_timeout_seconds <= 300:
            raise ValueError("GLM_TIMEOUT_SECONDS must be between 1 and 300.")
        if not 0 <= self.glm_max_retries <= 5:
            raise ValueError("GLM_MAX_RETRIES must be between 0 and 5.")
        if not self.glm_model.strip():
            raise ValueError("GLM_MODEL must not be empty.")
        if not self.glm_embedding_model.strip():
            raise ValueError("GLM_EMBEDDING_MODEL must not be empty.")

        if self.is_production:
            if self.debug:
                raise ValueError("DEBUG must be false when APP_ENV=production.")
            if secret in WEAK_JWT_SECRETS or len(secret) < 32:
                raise ValueError("JWT_SECRET must be set to a strong value of at least 32 characters in production.")
            origins = self.cors_origins
            if not origins:
                raise ValueError("CORS_ALLOW_ORIGINS must list the production frontend origin(s).")
            if "*" in origins:
                raise ValueError("CORS_ALLOW_ORIGINS must not contain wildcard origins in production.")
            if any(not origin.lower().startswith("https://") for origin in origins):
                raise ValueError("CORS_ALLOW_ORIGINS must use HTTPS origins in production.")
            return self

        if secret in WEAK_JWT_SECRETS:
            object.__setattr__(self, "jwt_secret", secrets.token_urlsafe(32))

        if env not in {"development", "dev", "test", "testing", "staging", "stage"}:
            raise ValueError("APP_ENV must be one of development, test, staging, or production.")

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
