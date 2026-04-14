"""基于会话的请求频率限制"""

from datetime import date
import streamlit as st

MAX_DAILY_CALLS = 20  # 每个会话每天最多调用次数


def check_rate_limit() -> tuple[bool, int]:
    """检查是否超过频率限制，返回 (是否允许, 剩余次数)"""
    today = str(date.today())
    key = "rate_limit"

    if key not in st.session_state:
        st.session_state[key] = {"date": today, "count": 0}

    state = st.session_state[key]

    # 日期变更则重置
    if state["date"] != today:
        state["date"] = today
        state["count"] = 0

    remaining = MAX_DAILY_CALLS - state["count"]
    if remaining <= 0:
        return False, 0

    return True, remaining


def increment_usage():
    """API调用成功后计数+1"""
    today = str(date.today())
    key = "rate_limit"

    if key not in st.session_state:
        st.session_state[key] = {"date": today, "count": 0}

    state = st.session_state[key]
    if state["date"] != today:
        state["date"] = today
        state["count"] = 0

    state["count"] += 1


def show_usage_hint():
    """在侧边栏显示今日剩余调用次数"""
    _, remaining = check_rate_limit()
    st.sidebar.markdown(f"今日剩余分析次数：**{remaining}/{MAX_DAILY_CALLS}**")
