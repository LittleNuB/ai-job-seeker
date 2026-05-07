from __future__ import annotations

from types import SimpleNamespace

from app.config import get_settings
from app.services import glm_client as glm_client_module
from app.services.glm_client import GLMClient


def test_glm_client_passes_timeout_and_retry_settings(monkeypatch):
    captured = {}

    class FakeAsyncOpenAI:
        def __init__(self, **kwargs):
            captured.update(kwargs)

    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("JWT_SECRET", "test-secret-for-glm-client")
    for key in [
        "LLM_PROVIDER",
        "LLM_API_KEY",
        "LLM_BASE_URL",
        "LLM_CHAT_MODEL",
        "LLM_TEMPERATURE",
        "LLM_MAX_TOKENS",
        "LLM_TIMEOUT_SECONDS",
        "LLM_MAX_RETRIES",
        "LLM_EMBEDDING_MODEL",
    ]:
        monkeypatch.delenv(key, raising=False)
    monkeypatch.setenv("GLM_API_KEY", "test-key")
    monkeypatch.setenv("GLM_BASE_URL", "https://llm.example.test/v1/")
    monkeypatch.setenv("GLM_MODEL", "glm-test")
    monkeypatch.setenv("GLM_TEMPERATURE", "0.3")
    monkeypatch.setenv("GLM_MAX_TOKENS", "2048")
    monkeypatch.setenv("GLM_TIMEOUT_SECONDS", "42")
    monkeypatch.setenv("GLM_MAX_RETRIES", "2")
    monkeypatch.setenv("GLM_EMBEDDING_MODEL", "embedding-test")
    monkeypatch.setattr(glm_client_module, "AsyncOpenAI", FakeAsyncOpenAI)
    get_settings.cache_clear()

    try:
        client = GLMClient()
    finally:
        get_settings.cache_clear()

    assert captured["api_key"] == "test-key"
    assert captured["base_url"] == "https://llm.example.test/v1/"
    assert captured["timeout"] == 42
    assert captured["max_retries"] == 2
    assert client.model == "glm-test"
    assert client.temperature == 0.3
    assert client.max_tokens == 2048
    assert client.embedding_model == "embedding-test"


def test_glm_client_prefers_generic_llm_settings(monkeypatch):
    captured = {}

    class FakeAsyncOpenAI:
        def __init__(self, **kwargs):
            captured.update(kwargs)

    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("JWT_SECRET", "test-secret-for-generic-client")
    monkeypatch.setenv("LLM_PROVIDER", "deepseek")
    monkeypatch.setenv("LLM_API_KEY", "generic-key")
    monkeypatch.setenv("LLM_BASE_URL", "https://generic.example.test/v1/")
    monkeypatch.setenv("LLM_CHAT_MODEL", "generic-chat")
    monkeypatch.setenv("LLM_TEMPERATURE", "0.2")
    monkeypatch.setenv("LLM_MAX_TOKENS", "1024")
    monkeypatch.setenv("LLM_TIMEOUT_SECONDS", "55")
    monkeypatch.setenv("LLM_MAX_RETRIES", "3")
    monkeypatch.setenv("LLM_EMBEDDING_MODEL", "")
    monkeypatch.setenv("GLM_API_KEY", "legacy-key")
    monkeypatch.setenv("GLM_BASE_URL", "https://legacy.example.test/v1/")
    monkeypatch.setenv("GLM_MODEL", "legacy-chat")
    monkeypatch.setattr(glm_client_module, "AsyncOpenAI", FakeAsyncOpenAI)
    get_settings.cache_clear()

    try:
        client = GLMClient()
    finally:
        get_settings.cache_clear()

    assert captured["api_key"] == "generic-key"
    assert captured["base_url"] == "https://generic.example.test/v1/"
    assert captured["timeout"] == 55
    assert captured["max_retries"] == 3
    assert client.provider == "deepseek"
    assert client.model == "generic-chat"
    assert client.temperature == 0.2
    assert client.max_tokens == 1024
    assert client.embedding_model == ""


async def test_embed_uses_configured_embedding_model():
    captured = {}

    class FakeEmbeddings:
        async def create(self, **kwargs):
            captured.update(kwargs)
            return SimpleNamespace(data=[SimpleNamespace(embedding=[0.1, 0.2])])

    client = object.__new__(GLMClient)
    client.client = SimpleNamespace(embeddings=FakeEmbeddings())
    client.embedding_model = "custom-embedding"

    result = await client.embed(["resume text"])

    assert captured == {"model": "custom-embedding", "input": ["resume text"]}
    assert result == [[0.1, 0.2]]
