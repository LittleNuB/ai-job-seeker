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


@pytest.mark.parametrize(
    ("key", "value"),
    [
        ("GLM_TEMPERATURE", "2.1"),
        ("GLM_MAX_TOKENS", "0"),
        ("GLM_TIMEOUT_SECONDS", "0"),
        ("GLM_MAX_RETRIES", "6"),
        ("GLM_MODEL", ""),
        ("GLM_EMBEDDING_MODEL", ""),
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
