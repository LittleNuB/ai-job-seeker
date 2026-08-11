from __future__ import annotations

from typing import Protocol

from ..config import get_settings
from .glm_client import get_glm_client, parse_json_response


class ApplicationModelError(RuntimeError):
    code = "provider_unavailable"


class ModelProviderUnavailableError(ApplicationModelError):
    code = "provider_unavailable"


class ModelTimeoutError(ApplicationModelError):
    code = "timeout"


class ModelInvalidOutputError(ApplicationModelError):
    code = "invalid_output"


class ApplicationModelPort(Protocol):
    provider_name: str
    model_name: str

    async def generate_json(self, *, system_prompt: str, user_prompt: str) -> object:
        """Return decoded JSON for one deterministic workflow node."""


class OpenAICompatibleApplicationModel:
    """Production adapter for the configured OpenAI-compatible provider."""

    def __init__(self) -> None:
        settings = get_settings()
        self.provider_name = settings.model_provider
        self.model_name = settings.model_chat_model

    async def generate_json(self, *, system_prompt: str, user_prompt: str) -> object:
        try:
            client = get_glm_client()
        except ValueError as exc:
            raise ModelProviderUnavailableError(str(exc)) from exc

        try:
            raw = await client.chat(system_prompt, user_prompt, temperature=0.1)
        except RuntimeError as exc:
            if "超时" in str(exc):
                raise ModelTimeoutError(str(exc)) from exc
            raise ModelProviderUnavailableError(str(exc)) from exc

        if not isinstance(raw, str):
            raise ModelInvalidOutputError("模型没有返回可解析的文本")
        try:
            return parse_json_response(raw)
        except ValueError as exc:
            raise ModelInvalidOutputError(str(exc)) from exc


def get_application_model() -> ApplicationModelPort:
    return OpenAICompatibleApplicationModel()
