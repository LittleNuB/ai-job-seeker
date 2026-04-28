import json
import re
import asyncio

from openai import AsyncOpenAI, APIError, APIConnectionError, RateLimitError

from ..config import get_settings


class GLMClient:
    """异步 GLM API 封装，兼容 OpenAI 接口"""

    def __init__(self):
        settings = get_settings()
        if not settings.glm_api_key:
            raise ValueError("未找到 GLM_API_KEY，请在 .env 文件中配置")
        self.client = AsyncOpenAI(
            api_key=settings.glm_api_key,
            base_url=settings.glm_base_url,
        )
        self.model = settings.glm_model
        self.temperature = settings.glm_temperature
        self.max_tokens = settings.glm_max_tokens

    async def chat(self, system_prompt: str, user_prompt: str, temperature: float = None) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature if temperature is not None else self.temperature,
                max_tokens=self.max_tokens,
            )
            return response.choices[0].message.content
        except RateLimitError:
            raise RuntimeError("请求过于频繁，请稍后再试")
        except APIConnectionError:
            raise RuntimeError("网络连接异常，请检查网络后重试")
        except APIError as e:
            raise RuntimeError(f"API调用失败：{getattr(e, 'message', str(e))}")

    async def chat_json(self, system_prompt: str, user_prompt: str, temperature: float = None) -> dict:
        raw = await self.chat(system_prompt, user_prompt, temperature)
        return parse_json_response(raw)

    async def chat_with_retry(self, system_prompt: str, user_prompt: str,
                              temperature: float = None, max_retries: int = 2) -> dict:
        last_error = None
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    retry_prompt = user_prompt + "\n\n【重要】请严格只输出JSON，不要包含任何其他文字或markdown格式。"
                    result = await self.chat_json(system_prompt, retry_prompt, temperature)
                else:
                    result = await self.chat_json(system_prompt, user_prompt, temperature)
                return result
            except (json.JSONDecodeError, ValueError) as e:
                last_error = e
                if attempt < max_retries:
                    await asyncio.sleep(1)
        raise RuntimeError(f"AI返回了非预期格式，请重试。错误：{last_error}")

    async def chat_with_tools(self, messages: list[dict], tools: list[dict] = None,
                              temperature: float = None) -> dict:
        """带 function calling 的聊天"""
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature if temperature is not None else self.temperature,
            "max_tokens": self.max_tokens,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"
        response = await self.client.chat.completions.create(**kwargs)
        return response.choices[0]

    async def stream_chat(self, messages: list[dict], tools: list[dict] = None,
                          temperature: float = None):
        """流式聊天，逐块 yield"""
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature if temperature is not None else self.temperature,
            "max_tokens": self.max_tokens,
            "stream": True,
        }
        if tools:
            kwargs["tools"] = tools
            kwargs["tool_choice"] = "auto"
        stream = await self.client.chat.completions.create(**kwargs)
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta:
                yield chunk.choices[0]


def parse_json_response(text: str) -> dict:
    """三级fallback解析JSON响应"""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    code_block_pattern = r"```(?:json)?\s*\n?(.*?)\n?\s*```"
    matches = re.findall(code_block_pattern, text, re.DOTALL)
    for match in matches:
        try:
            return json.loads(match.strip())
        except json.JSONDecodeError:
            continue

    brace_pattern = r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}"
    matches = re.findall(brace_pattern, text, re.DOTALL)
    for match in matches:
        try:
            return json.loads(match)
        except json.JSONDecodeError:
            continue

    raise ValueError("无法从AI响应中解析出JSON")


_glm_client: GLMClient | None = None


def get_glm_client() -> GLMClient:
    global _glm_client
    if _glm_client is None:
        _glm_client = GLMClient()
    return _glm_client
