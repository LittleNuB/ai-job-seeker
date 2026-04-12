import os
from dotenv import load_dotenv
import streamlit as st

load_dotenv()


def get_config() -> dict:
    """获取配置，优先使用 st.secrets（Streamlit Cloud），回退到 os.environ（本地dotenv）"""
    def _get(key: str, default: str = "") -> str:
        # st.secrets 优先（云端部署时使用）
        try:
            if key in st.secrets:
                return str(st.secrets[key])
        except Exception:
            pass
        # 回退到环境变量
        return os.getenv(key, default)

    return {
        "api_key": _get("GLM_API_KEY", ""),
        "model": _get("GLM_MODEL", "glm-4-plus"),
        "base_url": _get("GLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4/"),
        "temperature": float(_get("GLM_TEMPERATURE", "0.7")),
        "max_tokens": int(_get("GLM_MAX_TOKENS", "4096")),
    }
