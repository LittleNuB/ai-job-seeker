import streamlit as st
from utils.formatters import inject_global_style, _icon, C, _render


def main():
    st.set_page_config(
        page_title="AI Job Copilot",
        page_icon=None,
        layout="wide",
    )

    inject_global_style()

    # ---- Hero Section ----
    hero_html = f"""
    <div style="
        background: linear-gradient(135deg, {C['g950']} 0%, {C['brand_900']} 100%);
        color: white; padding: 56px 48px 44px 48px;
        margin: 0 -16px; border-radius: 0 0 16px 16px;
        font-family: -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
    ">
        <div style="max-width:640px;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                {_icon('sparkles', 24, '#60A5FA')}
                <span style="font-size:0.75rem; font-weight:600; color:#60A5FA; letter-spacing:0.05em; text-transform:uppercase;">AI Job Copilot</span>
            </div>
            <h1 style="font-size:2rem; font-weight:700; margin:0 0 8px 0; letter-spacing:-0.03em; line-height:1.2; color:white;">
                AI 驱动的求职决策工具
            </h1>
            <p style="font-size:0.9375rem; color:#CBD5E1; margin:0 0 24px 0; line-height:1.6;">
                从岗位探索到JD解析再到简历匹配，<br/>帮助你做出更聪明的求职决策。
            </p>
        </div>
    </div>
    """
    _render(hero_html, 200)

    st.markdown("<div style='height:28px;'></div>", unsafe_allow_html=True)

    # ---- Bento Grid (等宽两列) ----
    col_left, col_right = st.columns([1, 1])

    with col_left:
        # 岗位探索
        _bento_card(
            icon="compass",
            title="岗位探索",
            desc="了解 AI 行业主流岗位的定位、能力要求、职业路径和薪资水平",
            tags=["5大方向", "16+岗位", "行业数据"],
        )
        if st.button("探索岗位 →", key="btn_explore", use_container_width=True):
            st.switch_page("pages/1_AI岗位探索.py")

        st.markdown("<div style='height:12px;'></div>", unsafe_allow_html=True)

        # 简历匹配
        _bento_card(
            icon="target",
            title="简历匹配",
            desc="智能匹配简历与目标岗位，明确优势与差距",
            tags=["四维评分", "提升计划", "面试策略"],
        )
        if st.button("开始匹配 →", key="btn_match", use_container_width=True):
            st.switch_page("pages/3_简历匹配.py")

    with col_right:
        # JD解析器
        _bento_card(
            icon="clipboard-list",
            title="JD 解析器",
            desc="深度解析岗位描述，洞察隐藏需求与面试考点",
            tags=["三层解析", "隐藏需求", "面试聚焦"],
        )
        if st.button("解析 JD →", key="btn_jd", use_container_width=True):
            st.switch_page("pages/2_JD解析器.py")

        st.markdown("<div style='height:12px;'></div>", unsafe_allow_html=True)

        # 流程说明块
        _process_card()

    # ---- Footer ----
    st.markdown("<div style='height:24px;'></div>", unsafe_allow_html=True)
    footer_html = f"""
    <div style="text-align:center; padding:16px; font-size:0.6875rem; color:{C['g400']};
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;">
        Powered by GLM · Built with Streamlit
    </div>
    """
    _render(footer_html, 50)


def _bento_card(icon: str, title: str, desc: str, tags: list[str], compact: bool = False):
    """Bento Grid 单元卡片 — 使用 components.html 渲染"""
    icon_svg = _icon(icon, 20, C["brand_700"])
    tags_html = "".join(
        f'<span style="display:inline-block; padding:1px 6px; border-radius:3px; '
        f'font-size:0.625rem; font-weight:500; background:{C["brand_50"]}; '
        f'color:{C["brand_700"]}; margin-right:4px;">{t}</span>'
        for t in tags
    )
    padding = "16px 20px" if compact else "20px 24px"
    html = f"""
    <div style="
        background:{C['white']}; border-radius:12px; padding:{padding};
        border:1px solid {C['g200']}; box-shadow:0 1px 2px rgba(0,0,0,0.04);
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
    ">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            {icon_svg}
            <span style="font-size:0.9375rem; font-weight:600; color:{C['g900']};">{title}</span>
        </div>
        <div style="font-size:0.75rem; color:{C['g500']}; line-height:1.6; margin-bottom:10px;">{desc}</div>
        <div>{tags_html}</div>
    </div>
    """
    _render(html, 120)


def _process_card():
    """流程说明卡片 — 使用 components.html 渲染"""
    steps = [
        {"icon": "compass", "label": "探索岗位", "desc": "了解行业全貌"},
        {"icon": "clipboard-list", "label": "解析 JD", "desc": "看透真实需求"},
        {"icon": "target", "label": "匹配简历", "desc": "找到优势差距"},
    ]
    items = ""
    for i, s in enumerate(steps):
        icon_svg = _icon(s["icon"], 16, C["brand_600"])
        items += f"""
        <div style="display:flex; align-items:center; gap:8px; padding:6px 0;">
            <div style="width:28px; height:28px; border-radius:6px; background:{C['brand_50']};
                display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                {icon_svg}
            </div>
            <div>
                <div style="font-size:0.75rem; font-weight:600; color:{C['g900']};">{s['label']}</div>
                <div style="font-size:0.625rem; color:{C['g400']};">{s['desc']}</div>
            </div>
        </div>
        """
        if i < len(steps) - 1:
            items += f'<div style="margin-left:13px; width:1.5px; height:6px; background:{C["g200"]};"></div>'

    html = f"""
    <div style="
        background:{C['g50']}; border-radius:12px; padding:16px 20px;
        border:1px solid {C['g200']};
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
    ">
        <div style="font-size:0.6875rem; font-weight:600; color:{C['g400']}; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.05em;">
            工作流程
        </div>
        {items}
    </div>
    """
    _render(html, 200)


main()
