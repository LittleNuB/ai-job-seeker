from __future__ import annotations

import os
from contextlib import contextmanager

import pytest
from pydantic import ValidationError

from app.config import Settings


@contextmanager
def patched_env(**values):
    previous = {key: os.environ.get(key) for key in values}
    for key, value in values.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value
    try:
        yield
    finally:
        for key, value in previous.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value


def test_development_generates_runtime_jwt_secret_when_missing():
    with patched_env(APP_ENV="development", DEBUG="false", JWT_SECRET=""):
        settings = Settings(_env_file=None)

    assert len(settings.jwt_secret) >= 32
    assert settings.jwt_secret != "change-me-in-production"


@pytest.mark.parametrize("secret", ["", "short", "change-me-in-production"])
def test_production_rejects_weak_jwt_secret(secret):
    with patched_env(APP_ENV="production", DEBUG="false", JWT_SECRET=secret):
        with pytest.raises(ValidationError):
            Settings(_env_file=None)


def test_production_rejects_debug_true():
    with patched_env(
        APP_ENV="production",
        DEBUG="true",
        JWT_SECRET="x" * 40,
        CORS_ALLOW_ORIGINS="https://app.example.com",
    ):
        with pytest.raises(ValidationError):
            Settings(_env_file=None)


def test_production_rejects_missing_cors_allow_origins():
    with patched_env(APP_ENV="production", DEBUG="false", JWT_SECRET="x" * 40, CORS_ALLOW_ORIGINS=""):
        with pytest.raises(ValidationError):
            Settings(_env_file=None)


@pytest.mark.parametrize("origins", ["*", "https://app.example.com,*", "http://app.example.com", "ftp://app.example.com"])
def test_production_rejects_unsafe_cors_origins(origins):
    with patched_env(APP_ENV="production", DEBUG="false", JWT_SECRET="x" * 40, CORS_ALLOW_ORIGINS=origins):
        with pytest.raises(ValidationError):
            Settings(_env_file=None)


def test_production_accepts_strong_jwt_secret():
    with patched_env(
        APP_ENV="production",
        DEBUG="false",
        JWT_SECRET="x" * 40,
        CORS_ALLOW_ORIGINS="https://app.example.com, https://www.example.com",
    ):
        settings = Settings(_env_file=None)

    assert settings.is_production
    assert settings.jwt_secret == "x" * 40
    assert settings.cors_origins == ["https://app.example.com", "https://www.example.com"]


def test_model_settings_fall_back_to_legacy_glm_values():
    with patched_env(
        APP_ENV="development",
        DEBUG="false",
        JWT_SECRET="test-secret-for-model-fallback",
        LLM_API_KEY="",
        LLM_CHAT_MODEL="",
        LLM_BASE_URL="",
        LLM_EMBEDDING_MODEL="",
        GLM_API_KEY="legacy-key",
        GLM_BASE_URL="https://legacy.example.test/v1/",
        GLM_MODEL="legacy-chat",
        GLM_TEMPERATURE="0.4",
        GLM_MAX_TOKENS="1234",
        GLM_TIMEOUT_SECONDS="33",
        GLM_MAX_RETRIES="2",
        GLM_EMBEDDING_MODEL="legacy-embedding",
    ):
        settings = Settings(_env_file=None)

    assert settings.model_provider == "glm"
    assert settings.model_api_key == "legacy-key"
    assert settings.model_base_url == "https://legacy.example.test/v1/"
    assert settings.model_chat_model == "legacy-chat"
    assert settings.model_temperature == 0.4
    assert settings.model_max_tokens == 1234
    assert settings.model_timeout_seconds == 33
    assert settings.model_max_retries == 2
    assert settings.model_embedding_model == "legacy-embedding"


def test_llm_settings_override_legacy_glm_values():
    with patched_env(
        APP_ENV="development",
        DEBUG="false",
        JWT_SECRET="test-secret-for-model-override",
        LLM_PROVIDER="deepseek",
        LLM_API_KEY="generic-key",
        LLM_BASE_URL="https://generic.example.test/v1/",
        LLM_CHAT_MODEL="generic-chat",
        LLM_TEMPERATURE="0.2",
        LLM_MAX_TOKENS="2048",
        LLM_TIMEOUT_SECONDS="44",
        LLM_MAX_RETRIES="3",
        LLM_EMBEDDING_MODEL="generic-embedding",
        GLM_API_KEY="legacy-key",
        GLM_BASE_URL="https://legacy.example.test/v1/",
        GLM_MODEL="legacy-chat",
        GLM_TEMPERATURE="0.9",
        GLM_MAX_TOKENS="4096",
        GLM_TIMEOUT_SECONDS="60",
        GLM_MAX_RETRIES="1",
        GLM_EMBEDDING_MODEL="legacy-embedding",
    ):
        settings = Settings(_env_file=None)

    assert settings.model_provider == "deepseek"
    assert settings.model_api_key == "generic-key"
    assert settings.model_base_url == "https://generic.example.test/v1/"
    assert settings.model_chat_model == "generic-chat"
    assert settings.model_temperature == 0.2
    assert settings.model_max_tokens == 2048
    assert settings.model_timeout_seconds == 44
    assert settings.model_max_retries == 3
    assert settings.model_embedding_model == "generic-embedding"


@pytest.mark.parametrize(
    ("key", "value"),
    [
        ("GLM_TEMPERATURE", "2.1"),
        ("GLM_MAX_TOKENS", "0"),
        ("GLM_TIMEOUT_SECONDS", "0"),
        ("GLM_MAX_RETRIES", "6"),
        ("GLM_MODEL", ""),
    ],
)
def test_rejects_unsafe_model_settings(key, value):
    env = {
        "APP_ENV": "development",
        "DEBUG": "false",
        "JWT_SECRET": "test-secret-for-model-settings",
        "GLM_TEMPERATURE": "0.7",
        "GLM_MAX_TOKENS": "4096",
        "GLM_TIMEOUT_SECONDS": "60",
        "GLM_MAX_RETRIES": "1",
        "GLM_MODEL": "glm-test",
        "GLM_EMBEDDING_MODEL": "embedding-test",
        key: value,
    }

    with patched_env(**env):
        with pytest.raises(ValidationError):
            Settings(_env_file=None)


@pytest.mark.parametrize(
    ("key", "value"),
    [
        ("LLM_TEMPERATURE", "2.1"),
        ("LLM_MAX_TOKENS", "0"),
        ("LLM_TIMEOUT_SECONDS", "0"),
        ("LLM_MAX_RETRIES", "6"),
        ("LLM_CHAT_MODEL", ""),
        ("LLM_BASE_URL", ""),
    ],
)
def test_rejects_unsafe_generic_model_settings(key, value):
    env = {
        "APP_ENV": "development",
        "DEBUG": "false",
        "JWT_SECRET": "test-secret-for-generic-model-settings",
        "LLM_API_KEY": "generic-key",
        "LLM_BASE_URL": "https://generic.example.test/v1/",
        "LLM_CHAT_MODEL": "generic-chat",
        "LLM_TEMPERATURE": "0.7",
        "LLM_MAX_TOKENS": "4096",
        "LLM_TIMEOUT_SECONDS": "60",
        "LLM_MAX_RETRIES": "1",
        "LLM_EMBEDDING_MODEL": "generic-embedding",
        key: value,
    }

    with patched_env(**env):
        with pytest.raises(ValidationError):
            Settings(_env_file=None)


def test_generic_model_settings_can_disable_embeddings():
    with patched_env(
        APP_ENV="development",
        DEBUG="false",
        JWT_SECRET="test-secret-for-no-embedding",
        LLM_API_KEY="generic-key",
        LLM_BASE_URL="https://generic.example.test/v1/",
        LLM_CHAT_MODEL="generic-chat",
        LLM_EMBEDDING_MODEL="",
    ):
        settings = Settings(_env_file=None)

    assert settings.uses_generic_llm_config
    assert settings.model_embedding_model == ""
