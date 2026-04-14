"""UI组件和格式化工具 — 蓝色科技专业版"""

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


# ---------- 设计规范 ----------

_FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif"
_BASE = f"font-family:{_FONT}; box-sizing:border-box;"

# 配色
C = {
    "brand_900": "#1E3A5F", "brand_800": "#1E4D8C", "brand_700": "#2563EB",
    "brand_600": "#3B82F6", "brand_500": "#60A5FA", "brand_100": "#DBEAFE",
    "brand_50": "#EFF6FF",
    "success": "#10B981", "success_light": "#D1FAE5",
    "warning": "#F59E0B", "warning_light": "#FEF3C7",
    "danger": "#EF4444", "danger_light": "#FEE2E2",
    "info": "#06B6D4",
    "g950": "#0F172A", "g900": "#1E293B", "g700": "#334155",
    "g500": "#64748B", "g400": "#94A3B8", "g300": "#CBD5E1",
    "g200": "#E2E8F0", "g100": "#F1F5F9", "g50": "#F8FAFC",
    "white": "#FFFFFF",
}

# 边框映射
BORDER_MAP = {
    "blue": C["brand_700"], "success": C["success"], "green": C["success"],
    "warning": C["warning"], "orange": C["warning"],
    "danger": C["danger"], "red": C["danger"],
    "info": C["info"],
}


# ---------- Lucide 图标 ----------

_ICONS = {
    "compass": ('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M12 8v4l3 3'),
    "clipboard-list": ('M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2'),
    "target": ('M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z', 'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z', 'M12 12h.01'),
    "search": ('M11 17.25a6.25 6.25 0 1 1 0-12.5 6.25 6.25 0 0 1 0 12.5Z', 'M16 16l4.5 4.5'),
    "trending-up": ('M22 7l-8.5 8.5-5-5L2 17'),
    "lightbulb": ('M9 18h6', 'M10 22h4', 'M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14'),
    "alert-triangle": ('m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z', 'M12 9v4', 'M12 17h.01'),
    "check-circle": ('M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M9 11l3 3L22 4'),
    "zap": ('M13 2L3 14h9l-1 8 10-12h-9l1-8z'),
    "calendar": ('M8 2v4', 'M16 2v4', 'M3 10h18', 'M1 6h22'),
    "pin": ('M12 17v5', 'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 .49-.86l2-1.13A1 1 0 0 0 18 4.14V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1v1.14a1 1 0 0 0 .51.87l2 1.13A1 1 0 0 1 9 7v3.76z'),
    "mic": ('M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z', 'M19 10v2a7 7 0 0 1-14 0v-2', 'M12 19v3'),
    "bar-chart-2": ('M18 20V10', 'M12 20V4', 'M6 20v-6'),
    "file-edit": ('M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'),
    "brain": ('M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z', 'M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z'),
    "rocket": ('M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z', 'M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z', 'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0', 'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'),
    "arrow-right": ('M5 12h14', 'M12 5l7 7-7 7'),
    "chevron-right": ('M9 18l6-6-6-6'),
    "banknote": ('M6 16.326A4.993 4.993 0 0 1 8 12V4h8v8a4.993 4.993 0 0 1 2 4.326', 'M2 20h20', 'M4 20v-1a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1'),
    "message-square": ('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'),
    "shield": ('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'),
    "layers": ('M12 2L2 7l10 5 10-5-10-5Z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5'),
    "sparkles": ('M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z'),
}

def _icon(name: str, size: int = 20, color: str = "currentColor") -> str:
    """生成Lucide内联SVG图标"""
    paths = _ICONS.get(name, _ICONS.get("sparkles", ()))
    paths_str = "".join(f'<path d="{d}"/>' for d in paths)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="2" '
        f'stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;">'
        f'{paths_str}</svg>'
    )


# ---------- 通用渲染 ----------

def _render(html: str, height: int):
    """用 components.html 可靠渲染"""
    components.html(
        f'<div style="{_BASE}">{html}</div>',
        height=height,
    )


# ---------- 页面标题 ----------

def page_header(title: str, subtitle: str, icon: str = "sparkles"):
    """页面标题+副标题（替代 st.title + emoji）"""
    icon_svg = _icon(icon, 22, C["brand_700"])
    html = f"""
    <div style="{_BASE} margin-bottom:20px;">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:4px;">
            <span>{icon_svg}</span>
            <span style="font-size:1.375rem; font-weight:600; color:{C['g950']}; letter-spacing:-0.02em;">{title}</span>
        </div>
        <div style="font-size:0.8125rem; color:{C['g500']}; margin-left:32px;">{subtitle}</div>
    </div>
    """
    _render(html, 58)


# ---------- 卡片组件 ----------

def card(content: str, title: str = None, color: str = None, height: int = None):
    """卡片容器"""
    border_style = ""
    if color:
        bc = BORDER_MAP.get(color, C["brand_700"])
        border_style = f"border-left:3px solid {bc};"

    title_html = f'<div style="font-weight:600; font-size:0.8125rem; margin-bottom:8px; color:{C["g900"]};">{title}</div>' if title else ""
    html = (
        f'<div style="{_BASE} background:{C["white"]}; border-radius:8px; padding:16px 20px; '
        f'box-shadow:0 1px 2px rgba(0,0,0,0.05); border:1px solid {C["g200"]}; {border_style}">'
        f'{title_html}{content}</div>'
    )
    if height is None:
        lines = html.count('<br') + html.count('<div') + html.count('<p')
        height = max(70, min(50 + (24 if title else 0) + lines * 20, 600))
    _render(html, height)


# ---------- 标签组件 ----------

_TAG_STYLES = {
    "blue": f"background:{C['brand_100']}; color:{C['brand_800']};",
    "green": f"background:{C['success_light']}; color:{C['success']};",
    "orange": f"background:{C['warning_light']}; color:{C['warning']};",
    "red": f"background:{C['danger_light']}; color:{C['danger']};",
    "gray": f"background:{C['g100']}; color:{C['g700']};",
    "info": f"background:#E0F7FA; color:{C['info']};",
}

def tag(text: str, color: str = "blue") -> str:
    """生成彩色标签HTML"""
    style = _TAG_STYLES.get(color, _TAG_STYLES["blue"])
    return f'<span style="display:inline-block; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:500; margin:2px 4px 2px 0; line-height:1.5; {style}">{text}</span>'


def tag_row(items: list[str], color: str = "blue"):
    """渲染一组标签"""
    tags_html = "".join(tag(item, color) for item in items)
    rows = max(1, (len(items) + 3) // 4)
    _render(f'<div style="{_BASE} margin:4px 0;">{tags_html}</div>', 16 + rows * 28)


# ---------- 带色条标题 ----------

def section_title(text: str, color: str = "blue"):
    """带左侧色条的标题"""
    bc = BORDER_MAP.get(color, C["brand_700"])
    html = (
        f'<div style="{_BASE} font-size:0.8125rem; font-weight:600; color:{C["g900"]}; '
        f'padding-left:12px; margin:16px 0 8px 0; border-left:3px solid {bc}; line-height:1.5;">{text}</div>'
    )
    _render(html, 38)


# ---------- 匹配分数圆环 ----------

def render_match_score(score: int):
    """SVG圆环分数图"""
    if score >= 90:
        label, color = "高度匹配", C["success"]
    elif score >= 75:
        label, color = "较好匹配", C["brand_700"]
    elif score >= 60:
        label, color = "基本匹配", C["warning"]
    elif score >= 45:
        label, color = "部分匹配", "#EA580C"
    else:
        label, color = "匹配度低", C["danger"]

    radius = 60
    circumference = 2 * 3.14159 * radius
    dash_offset = circumference * (1 - score / 100)

    html = f"""
    <div style="text-align:center; padding:16px 0 4px 0; font-family:{_FONT};">
        <svg width="150" height="150" viewBox="0 0 150 150">
            <circle cx="75" cy="75" r="{radius}" fill="none" stroke="{C['g200']}" stroke-width="8"/>
            <circle cx="75" cy="75" r="{radius}" fill="none" stroke="{color}" stroke-width="8"
                stroke-dasharray="{circumference}" stroke-dashoffset="{dash_offset}"
                stroke-linecap="round" transform="rotate(-90 75 75)"
                style="transition: stroke-dashoffset 0.8s ease;"/>
            <text x="75" y="70" text-anchor="middle" font-size="32" font-weight="700"
                fill="{color}" font-family="{_FONT}" font-variant-numeric="tabular-nums">{score}</text>
            <text x="75" y="90" text-anchor="middle" font-size="12" fill="{C['g500']}"
                font-family="{_FONT}">分</text>
        </svg>
        <div style="font-size:0.8125rem; font-weight:600; color:{color}; margin-top:4px;">{label}</div>
    </div>
    """
    components.html(html, height=200)


# ---------- 渐变进度条 ----------

def render_score_bar(label: str, score: int, color: str = None):
    """带标签的进度条"""
    if color is None:
        if score >= 80: color = "green"
        elif score >= 60: color = "blue"
        elif score >= 40: color = "orange"
        else: color = "red"

    bar_colors = {
        "green": C["success"], "blue": C["brand_700"],
        "orange": C["warning"], "red": C["danger"],
    }
    bar_color = bar_colors.get(color, C["brand_700"])

    html = f"""
    <div style="{_BASE} margin:6px 0;">
        <div style="font-size:0.75rem; color:{C['g500']}; margin-bottom:3px; display:flex; justify-content:space-between;">
            <span>{label}</span>
            <span style="font-weight:600; font-variant-numeric:tabular-nums;">{score}%</span>
        </div>
        <div style="height:6px; background:{C['g200']}; border-radius:3px; overflow:hidden;">
            <div style="height:100%; border-radius:3px; width:{score}%; background:{bar_color}; transition:width 0.6s ease;"></div>
        </div>
    </div>
    """
    _render(html, 44)


# ---------- 时间线 ----------

def render_timeline(steps: list[dict]):
    """职业路径时间线"""
    items_html = ""
    for step in steps:
        items_html += f"""
        <div style="display:flex; align-items:flex-start; margin:0 0 6px 0;">
            <div style="display:flex; flex-direction:column; align-items:center; margin-right:10px; min-width:14px;">
                <div style="width:8px; height:8px; border-radius:50%; background:{C['brand_700']}; flex-shrink:0;"></div>
                <div style="width:1.5px; flex:1; background:{C['brand_100']}; min-height:12px;"></div>
            </div>
            <div>
                <span style="font-weight:600; color:{C['brand_800']}; font-size:0.8125rem;">{step['label']}</span><br/>
                <span style="color:{C['g500']}; font-size:0.75rem;">{step['text']}</span>
            </div>
        </div>
        """
    _render(f'<div style="{_BASE} padding:6px 0;">{items_html}</div>', len(steps) * 52 + 16)


# ---------- 指标卡片 ----------

def metric_card(value: str, label: str):
    """指标小卡片"""
    html = f"""
    <div style="{_BASE} background:{C['white']}; border-radius:8px; padding:12px; text-align:center;
        box-shadow:0 1px 2px rgba(0,0,0,0.05); border:1px solid {C['g200']};">
        <div style="font-size:0.9375rem; font-weight:700; color:{C['g900']}; font-variant-numeric:tabular-nums;">{value}</div>
        <div style="font-size:0.6875rem; color:{C['g500']}; margin-top:2px;">{label}</div>
    </div>
    """
    _render(html, 72)


# ---------- 薪资卡片 ----------

def salary_card(level: str, salary: dict):
    """薪资展示卡片"""
    html = f"""
    <div style="{_BASE} background:{C['white']}; border-radius:8px; padding:12px; text-align:center;
        box-shadow:0 1px 2px rgba(0,0,0,0.05); border:1px solid {C['g200']};">
        <div style="font-size:0.6875rem; color:{C['g500']}; font-weight:600;">{level}</div>
        <div style="font-size:1.0625rem; font-weight:700; color:{C['brand_700']}; margin:4px 0;
            font-variant-numeric:tabular-nums;">{salary['min']}-{salary['max']}{salary['unit']}</div>
        <div style="font-size:0.625rem; color:{C['g400']};">{salary['city_tier']}</div>
    </div>
    """
    _render(html, 80)


# ---------- 差距/优势列表项 ----------

def gap_item(title: str, detail: str, severity: str = "low"):
    """差距/优势展示项"""
    sev_colors = {"高": C["danger"], "中": C["warning"], "低": C["success"]}
    dot_color = sev_colors.get(severity, C["success"])
    detail_html = f'<div style="font-size:0.75rem; color:{C["g500"]}; margin-top:3px;">{detail}</div>' if detail else ""
    html = f"""
    <div style="{_BASE} padding:10px 14px; margin:4px 0; border-radius:6px; background:{C['white']};
        border:1px solid {C['g200']}; display:flex; gap:10px; align-items:flex-start;">
        <div style="width:6px; height:6px; border-radius:50%; background:{dot_color}; margin-top:6px; flex-shrink:0;"></div>
        <div style="flex:1; min-width:0;">
            <div style="font-weight:600; font-size:0.8125rem; color:{C['g900']};">{title}</div>
            {detail_html}
        </div>
    </div>
    """
    h = 58 if detail else 40
    _render(html, h)


# ---------- 提升计划卡片 ----------

def plan_card(title: str, items: list[str], card_type: str = "immediate"):
    """提升计划卡片"""
    top_colors = {"immediate": C["danger"], "short": C["warning"], "medium": C["success"]}
    top_color = top_colors.get(card_type, C["brand_700"])
    items_html = "".join(
        f'<div style="font-size:0.75rem; color:{C["g500"]}; padding:2px 0; padding-left:12px; position:relative;">'
        f'<span style="position:absolute; left:0; top:7px; width:4px; height:4px; border-radius:50%; background:{C["g400"]};"></span>'
        f'{item}</div>'
        for item in items
    )
    html = f"""
    <div style="{_BASE} background:{C['white']}; border-radius:8px; padding:14px 16px;
        box-shadow:0 1px 2px rgba(0,0,0,0.05); border:1px solid {C['g200']}; border-top:2px solid {top_color};">
        <div style="font-weight:600; font-size:0.8125rem; margin-bottom:6px; color:{C['g900']};">{title}</div>
        {items_html}
    </div>
    """
    height = 40 + max(len(items), 1) * 22
    _render(html, height)


# ---------- 步骤指示器 ----------

def step_indicator(steps: list[dict], current: int = 0):
    """横向步骤指示器, steps=[{label, desc}], current=当前步骤索引(0-based)"""
    items_html = ""
    for i, step in enumerate(steps):
        is_current = i == current
        is_done = i < current
        num_style = (
            f"background:{C['brand_700']}; color:{C['white']};" if is_current
            else f"background:{C['success']}; color:{C['white']};" if is_done
            else f"background:{C['g100']}; color:{C['g400']};"
        )
        label_color = C["brand_700"] if is_current else C["g900"] if is_done else C["g400"]
        desc_color = C["g500"] if is_current else C["g400"]
        items_html += f"""
        <div style="display:flex; flex-direction:column; align-items:center; width:100px;">
            <div style="width:28px; height:28px; border-radius:50%; {num_style}
                display:flex; align-items:center; justify-content:center;
                font-weight:600; font-size:0.75rem;">{"✓" if is_done else i + 1}</div>
            <div style="font-size:0.75rem; font-weight:600; color:{label_color}; margin-top:4px;">{step['label']}</div>
            <div style="font-size:0.625rem; color:{desc_color};">{step.get('desc','')}</div>
        </div>
        """
        if i < len(steps) - 1:
            line_color = C["success"] if is_done else C["g200"]
            items_html += f'<div style="flex:1; height:1.5px; background:{line_color}; margin-top:14px;"></div>'

    _render(f'<div style="{_BASE} display:flex; align-items:flex-start; padding:8px 0;">{items_html}</div>', 72)


# ---------- 格式化工具 ----------

def format_salary_range(salary: dict) -> str:
    return f"{salary['min']}-{salary['max']}{salary['unit']}（{salary['city_tier']}）"

def format_career_path(path: dict) -> str:
    steps = [path["junior"], path["mid"], path["senior"], path["leadership"]]
    return " → ".join(steps)
