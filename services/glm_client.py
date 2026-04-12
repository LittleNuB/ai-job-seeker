import json
import re
import time
import streamlit as st
from openai import OpenAI, APIError, APIConnectionError, RateLimitError
from utils.config import get_config


class GLMClient:
    """GLM API 封装，使用 OpenAI 兼容接口"""

    def __init__(self):
        config = get_config()
        if not config["api_key"]:
            raise ValueError(
                "未找到 GLM_API_KEY，请在 .env 文件或 Streamlit Cloud Secrets 中配置"
            )
        self.client = OpenAI(
            api_key=config["api_key"],
            base_url=config["base_url"],
        )
        self.model = config["model"]
        self.temperature = config["temperature"]
        self.max_tokens = config["max_tokens"]

    def chat(self, system_prompt: str, user_prompt: str, temperature: float = None) -> str:
        """同步聊天完成"""
        try:
            response = self.client.chat.completions.create(
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

    def chat_json(self, system_prompt: str, user_prompt: str, temperature: float = None) -> dict:
        """调用API并解析JSON响应，含三级fallback"""
        raw = self.chat(system_prompt, user_prompt, temperature)
        return parse_json_response(raw)

    def chat_with_retry(self, system_prompt: str, user_prompt: str,
                        temperature: float = None, max_retries: int = 2) -> dict:
        """带重试的JSON调用，解析失败时用更严格的prompt重试"""
        last_error = None
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    # 重试时追加更严格的指令
                    retry_prompt = user_prompt + "\n\n【重要】请严格只输出JSON，不要包含任何其他文字或markdown格式。"
                    result = self.chat_json(system_prompt, retry_prompt, temperature)
                else:
                    result = self.chat_json(system_prompt, user_prompt, temperature)
                return result
            except (json.JSONDecodeError, ValueError) as e:
                last_error = e
                if attempt < max_retries:
                    time.sleep(1)
        raise RuntimeError(f"AI返回了非预期格式，请重试。错误：{last_error}")


def parse_json_response(text: str) -> dict:
    """三级fallback解析JSON响应"""
    # Level 1: 直接解析
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Level 2: 提取markdown代码块中的JSON
    code_block_pattern = r"```(?:json)?\s*\n?(.*?)\n?\s*```"
    matches = re.findall(code_block_pattern, text, re.DOTALL)
    for match in matches:
        try:
            return json.loads(match.strip())
        except json.JSONDecodeError:
            continue

    # Level 3: 正则提取最外层花括号内容
    brace_pattern = r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}"
    matches = re.findall(brace_pattern, text, re.DOTALL)
    for match in matches:
        try:
            return json.loads(match)
        except json.JSONDecodeError:
            continue

    raise ValueError("无法从AI响应中解析出JSON")


@st.cache_resource
def get_glm_client() -> GLMClient:
    """获取缓存的GLMClient实例"""
    return GLMClient()
