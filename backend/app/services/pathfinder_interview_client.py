from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any

from openai import APIConnectionError, APIError, APITimeoutError, AsyncOpenAI, RateLimitError


DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEFAULT_DEEPSEEK_MODEL = "deepseek-v4-flash"


class InterviewModelJSONError(RuntimeError):
    """Raised when the model response is not valid JSON."""


@dataclass(frozen=True)
class InterviewModelResult:
    status: str
    payload: dict[str, Any]
    provider: str = "deepseek"
    model: str = DEFAULT_DEEPSEEK_MODEL
    error: str | None = None


class DeepSeekInterviewClient:
    """Small OpenAI-compatible client for Pathfinder pre-flight interviews."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        timeout_seconds: float = 30.0,
        max_retries: int = 1,
    ) -> None:
        self.api_key = (api_key or os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("LLM_API_KEY") or "").strip()
        self.base_url = (base_url or os.environ.get("DEEPSEEK_BASE_URL") or DEFAULT_DEEPSEEK_BASE_URL).strip()
        self.model = (model or os.environ.get("DEEPSEEK_CHAT_MODEL") or os.environ.get("LLM_CHAT_MODEL") or DEFAULT_DEEPSEEK_MODEL).strip()
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries
        self._client: AsyncOpenAI | None = None

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def next_question(self, messages: list[dict[str, str]]) -> InterviewModelResult:
        if not self.is_configured:
            return InterviewModelResult(
                status="no_key",
                payload={
                    "message": "我会先用手动访谈模式继续。请补充一个你亲自参与过的项目：你负责什么、面向谁、处理了哪些资料或流程？",
                    "shouldContinue": True,
                    "focus": "project_experience",
                },
                model=self.model,
                error="DEEPSEEK_API_KEY is not configured",
            )

        system_prompt = (
            "You are the Pathfinder pre-flight interview assistant. "
            "Ask one concise follow-up question to elicit real user experience. "
            "Do not recommend jobs, projects, employers, scores, probabilities, certification, or resume packaging. "
            "Return strict json with keys: message, shouldContinue, focus."
        )
        try:
            payload = await self._chat_json(system_prompt, messages)
        except InterviewModelJSONError:
            raise
        except Exception as exc:
            return InterviewModelResult(status="error", payload={}, model=self.model, error=_safe_error(exc))
        return InterviewModelResult(status="ok", payload=payload, model=self.model)

    async def extract_signals(self, messages: list[dict[str, str]]) -> InterviewModelResult:
        if not self.is_configured:
            return InterviewModelResult(
                status="no_key",
                payload={"signals": [], "summary": "No model key configured; user can continue manual signal entry."},
                model=self.model,
                error="DEEPSEEK_API_KEY is not configured",
            )

        system_prompt = (
            "You extract candidate user profile signals from Pathfinder interview messages. "
            "Return strict json with a signals array. Each signal must include: category, label, evidenceText, "
            "sourceMessageIds, confidence. Do not include scores, percentages, offer probability, certification, "
            "employer shortlist, resume packaging, or project ownership claims."
        )
        try:
            payload = await self._chat_json(system_prompt, messages)
        except InterviewModelJSONError:
            raise
        except Exception as exc:
            return InterviewModelResult(status="error", payload={"signals": []}, model=self.model, error=_safe_error(exc))
        return InterviewModelResult(status="ok", payload=payload, model=self.model)

    async def _chat_json(self, system_prompt: str, messages: list[dict[str, str]]) -> dict[str, Any]:
        client = self._get_client()
        response = await client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": f"{system_prompt}\nThe response must be valid json."},
                *messages,
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=1200,
            stream=False,
        )
        content = response.choices[0].message.content or ""
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            raise InterviewModelJSONError("DeepSeek returned invalid JSON") from exc
        if not isinstance(parsed, dict):
            raise InterviewModelJSONError("DeepSeek JSON response must be an object")
        return parsed

    def _get_client(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=self.timeout_seconds,
                max_retries=self.max_retries,
            )
        return self._client


def _safe_error(exc: Exception) -> str:
    if isinstance(exc, RateLimitError):
        return "rate_limited"
    if isinstance(exc, APITimeoutError):
        return "timeout"
    if isinstance(exc, APIConnectionError):
        return "connection_error"
    if isinstance(exc, APIError):
        return "api_error"
    return exc.__class__.__name__
