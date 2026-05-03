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
    with patched_env(APP_ENV="production", DEBUG="true", JWT_SECRET="x" * 40):
        with pytest.raises(ValidationError):
            Settings(_env_file=None)


def test_production_accepts_strong_jwt_secret():
    with patched_env(APP_ENV="production", DEBUG="false", JWT_SECRET="x" * 40):
        settings = Settings(_env_file=None)

    assert settings.is_production
    assert settings.jwt_secret == "x" * 40
