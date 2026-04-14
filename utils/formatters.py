"""UI组件和格式化工具"""

from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components


# ---------- 全局样式加载 ----------

_css_cache = None

def _load_css() -> str:
    global _css_cache
    if _css_cache is None:
        css_path = Path(__file__).parent.parent / "static" / "style.css"
        try:
            with open(css_path, "r", encoding="utf-8") as f:
                _css_cache = f.read()
        except FileNotFoundError:
            _css_cache = ""
    return _css_cache


def inject_global_style():
    """注入全局CSS，每个页面顶部调用一次"""
    css = _load_css()
    if css:
        st.markdown(f"<style>{css}</style>", unsafe_allow_html=True)


# ---------- 卡片组件 ----------

def card(content: str, title: str = None, color: str = None):
    """卡片容器"""
    border_style = ""
    if color == "blue":
        border_style = "border-left:4px solid #2563EB;"
    elif color in ("success", "green"):
        border_style = "border-left:4px solid #059669;"
    elif color in ("warning", "orange"):
        border_style = "border-left:4px solid #D97706;"
    elif color in ("danger", "red"):
        border_style = "border-left:4px solid #DC2626;"

    title_html = f'<div style="font-weight:700; font-size:0.95rem; margin-bottom:8px; color:#1E293B;">{title}</div>' if title else ""
    st.markdown(
        f'<div style="background:#FFFFFF; border-radius:12px; padding:20px 24px; margin-bottom:16px; '
        f'box-shadow:0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.06); border:1px solid #E2E8F0; '
        f'{border_style}">{title_html}{content}</div>',
        unsafe_allow_html=True,
    )


# ---------- 标签组件 ----------

def tag(text: str, color: str = "blue") -> str:
    """生成彩色标签HTML"""
    styles = {
        "blue": "background:#DBEAFE; color:#1D4ED8;",
        "green": "background:#D1FAE5; color:#059669;",
        "orange": "background:#FEF3C7; color:#D97706;",
        "red": "background:#FEE2E2; color:#DC2626;",
        "gray": "background:#F3F4F6; color:#374151;",
    }
    style = styles.get(color, styles["blue"])
    return f'<span style="display:inline-block; padding:3px 10px; border-radius:6px; font-size:0.82rem; font-weight:500; margin:3px 4px 3px 0; line-height:1.6; {style}">{text}</span>'


def tag_row(items: list[str], color: str = "blue"):
    """渲染一组标签"""
    tags_html = "".join(tag(item, color) for item in items)
    st.markdown(f'<div style="margin:4px 0;">{tags_html}</div>', unsafe_allow_html=True)


# ---------- 带色条标题 ----------

def section_title(text: str, color: str = "blue"):
    """带左侧色条的标题"""
    border_colors = {
        "blue": "#2563EB",
        "green": "#059669",
        "orange": "#D97706",
        "red": "#DC2626",
    }
    border_color = border_colors.get(color, "#2563EB")
    st.markdown(
        f'<div style="font-size:1.15rem; font-weight:700; color:#1E293B; padding-left:14px; '
        f'margin:20px 0 12px 0; border-left:4px solid {border_color}; line-height:1.5;">{text}</div>',
        unsafe_allow_html=True,
    )


# ---------- 匹配分数圆环 ----------

def render_match_score(score: int):
    """SVG圆环分数图"""
    if score >= 90:
        label, color = "高度匹配", "#059669"
    elif score >= 75:
        label, color = "较好匹配", "#2563EB"
    elif score >= 60:
        label, color = "基本匹配", "#D97706"
    elif score >= 45:
        label, color = "部分匹配", "#EA580C"
    else:
        label, color = "匹配度低", "#DC2626"

    radius = 70
    circumference = 2 * 3.14159 * radius
    dash_offset = circumference * (1 - score / 100)

    html = f"""
    <div style="text-align:center; padding:16px 0 4px 0;">
        <svg width="170" height="170" viewBox="0 0 170 170" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.1));">
            <circle cx="85" cy="85" r="{radius}" fill="none" stroke="#E2E8F0" stroke-width="12"/>
            <circle cx="85" cy="85" r="{radius}" fill="none" stroke="{color}" stroke-width="12"
                stroke-dasharray="{circumference}" stroke-dashoffset="{dash_offset}"
                stroke-linecap="round" transform="rotate(-90 85 85)"
                style="transition: stroke-dashoffset 0.8s ease;"/>
            <text x="85" y="78" text-anchor="middle" font-size="36" font-weight="800" fill="{color}">{score}</text>
            <text x="85" y="100" text-anchor="middle" font-size="14" fill="#64748B">分</text>
        </svg>
        <div style="font-size:1rem; font-weight:600; color:{color}; margin-top:4px;">{label}</div>
    </div>
    """
    components.html(html, height=220)


# ---------- 渐变进度条 ----------

def render_score_bar(label: str, score: int, color: str = None):
    """带标签和百分比的渐变进度条"""
    if color is None:
        if score >= 80:
            color = "green"
        elif score >= 60:
            color = "blue"
        elif score >= 40:
            color = "orange"
        else:
            color = "red"

    gradients = {
        "green": "linear-gradient(90deg, #34D399, #059669)",
        "blue": "linear-gradient(90deg, #3B82F6, #2563EB)",
        "orange": "linear-gradient(90deg, #FBBF24, #D97706)",
        "red": "linear-gradient(90deg, #F87171, #DC2626)",
    }
    gradient = gradients.get(color, gradients["blue"])

    st.markdown(f"""
    <div style="margin:8px 0;">
        <div style="font-size:0.88rem; color:#64748B; margin-bottom:4px; display:flex; justify-content:space-between;">
            <span>{label}</span>
            <span style="font-weight:600;">{score}%</span>
        </div>
        <div style="height:10px; background:#E2E8F0; border-radius:5px; overflow:hidden;">
            <div style="height:100%; border-radius:5px; width:{score}%; background:{gradient}; transition:width 0.6s ease;"></div>
        </div>
    </div>
    """, unsafe_allow_html=True)


# ---------- 时间线 ----------

def render_timeline(steps: list[dict]):
    """职业路径时间线，steps格式: [{label, text}, ...]"""
    items_html = ""
    for step in steps:
        items_html += f"""
        <div style="position:relative; padding:8px 0 8px 28px; font-size:0.9rem; color:#1E293B;">
            <div style="position:absolute; left:0; top:14px; width:12px; height:12px; border-radius:50%; background:#2563EB; border:2px solid #FFFFFF; box-shadow:0 0 0 2px #DBEAFE;"></div>
            <span style="font-weight:600; color:#1D4ED8;">{step['label']}</span><br/>
            <span style="color:#64748B; font-size:0.85rem;">{step['text']}</span>
        </div>
        """
    st.markdown(f"""
    <div style="position:relative; padding:8px 0 8px 20px;">
        <div style="position:absolute; left:5px; top:4px; bottom:4px; width:2px; background:#DBEAFE;"></div>
        {items_html}
    </div>
    """, unsafe_allow_html=True)


# ---------- 指标卡片 ----------

def metric_card(value: str, label: str):
    """指标小卡片"""
    st.markdown(f"""
    <div style="background:#FFFFFF; border-radius:12px; padding:16px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.06); border:1px solid #E2E8F0;">
        <div style="font-size:1.1rem; font-weight:700; color:#1E293B; margin-top:4px;">{value}</div>
        <div style="font-size:0.78rem; color:#64748B; margin-top:2px;">{label}</div>
    </div>
    """, unsafe_allow_html=True)


# ---------- 薪资卡片 ----------

def salary_card(level: str, salary: dict):
    """薪资展示卡片"""
    st.markdown(f"""
    <div style="background:#FFFFFF; border-radius:12px; padding:14px; text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.06); border:1px solid #E2E8F0;">
        <div style="font-size:0.8rem; color:#64748B; font-weight:600;">{level}</div>
        <div style="font-size:1.2rem; font-weight:700; color:#2563EB; margin:4px 0;">{salary['min']}-{salary['max']}{salary['unit']}</div>
        <div style="font-size:0.72rem; color:#6B7280;">{salary['city_tier']}</div>
    </div>
    """, unsafe_allow_html=True)


# ---------- 差距/优势列表项 ----------

def gap_item(title: str, detail: str, severity: str = "low"):
    """差距/优势展示项"""
    severity_colors = {
        "高": "#DC2626",
        "中": "#D97706",
        "低": "#059669",
    }
    border_color = severity_colors.get(severity, "#059669")
    st.markdown(f"""
    <div style="padding:10px 14px; margin:6px 0; border-radius:8px; background:#FFFFFF; border:1px solid #E2E8F0; box-shadow:0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.06); border-left:4px solid {border_color};">
        <div style="font-weight:600; font-size:0.92rem; color:#1E293B;">{title}</div>
        <div style="font-size:0.82rem; color:#64748B; margin-top:2px;">{detail}</div>
    </div>
    """, unsafe_allow_html=True)


# ---------- 提升计划卡片 ----------

def plan_card(title: str, items: list[str], card_type: str = "immediate"):
    """提升计划卡片"""
    top_colors = {
        "immediate": "#DC2626",
        "short": "#D97706",
        "medium": "#059669",
    }
    top_color = top_colors.get(card_type, "#2563EB")
    items_html = "".join(f'<div style="font-size:0.84rem; color:#64748B; padding:2px 0;">- {item}</div>' for item in items)
    st.markdown(f"""
    <div style="background:#FFFFFF; border-radius:12px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.06); border:1px solid #E2E8F0; border-top:3px solid {top_color};">
        <div style="font-weight:700; font-size:0.92rem; margin-bottom:8px; color:#1E293B;">{title}</div>
        {items_html}
    </div>
    """, unsafe_allow_html=True)


# ---------- 格式化工具 ----------

def format_salary_range(salary: dict) -> str:
    """格式化薪资范围"""
    return f"{salary['min']}-{salary['max']}{salary['unit']}（{salary['city_tier']}）"


def format_career_path(path: dict) -> str:
    """格式化职业路径"""
    steps = [path["junior"], path["mid"], path["senior"], path["leadership"]]
    return " → ".join(steps)
