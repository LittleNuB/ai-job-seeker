"""输出格式化工具"""

import streamlit as st


def render_match_score(score: int):
    """渲染匹配度分数"""
    if score >= 90:
        label, color = "高度匹配", "#27AE60"
    elif score >= 75:
        label, color = "较好匹配", "#2ECC71"
    elif score >= 60:
        label, color = "基本匹配", "#F39C12"
    elif score >= 45:
        label, color = "部分匹配", "#E67E22"
    else:
        label, color = "匹配度低", "#E74C3C"

    st.markdown(
        f'<div style="text-align:center; padding:20px;">'
        f'<span style="font-size:48px; font-weight:bold; color:{color};">{score}</span>'
        f'<span style="font-size:20px; color:{color}; margin-left:8px;">分</span><br>'
        f'<span style="font-size:18px; color:{color};">{label}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )


def render_score_bar(label: str, score: int):
    """渲染维度得分条"""
    st.markdown(f"**{label}**")
    st.progress(score / 100)


def format_salary_range(salary: dict) -> str:
    """格式化薪资范围"""
    return f"{salary['min']}-{salary['max']}{salary['unit']}（{salary['city_tier']}）"


def format_career_path(path: dict) -> str:
    """格式化职业路径"""
    steps = [path["junior"], path["mid"], path["senior"], path["leadership"]]
    return " → ".join(steps)
