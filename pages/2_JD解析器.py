import streamlit as st
from services.glm_client import get_glm_client
from services.jd_service import analyze_jd
from utils.validators import validate_jd_text
from utils.rate_limiter import check_rate_limit, increment_usage, show_usage_hint
from utils.formatters import (
    inject_global_style, card, tag_row, section_title, metric_card, tag,
    page_header,
)


def show():
    inject_global_style()

    page_header("JD分析工作台", "深度解析岗位描述，洞察隐藏需求与面试考点", "clipboard-list")

    show_usage_hint()

    # 左右分栏：输入 | 结果
    col_input, col_result = st.columns([5, 7])

    with col_input:
        st.markdown("**输入岗位JD**")
        jd_text = st.text_area(
            "粘贴JD文本",
            height=320,
            placeholder="请将AI岗位的JD全文粘贴到这里...",
            key="jd_input",
            label_visibility="collapsed",
        )

        # 如果从岗位探索跳转过来
        if st.session_state.get("selected_position_id"):
            from services.position_service import PositionService
            pos_svc = PositionService()
            pos = pos_svc.get_position_by_id(st.session_state["selected_position_id"])
            if pos:
                st.info(f"已选择参考岗位：**{pos['name']}**，解析将参考该岗位的行业认知")

        if st.button("开始深度解析", type="primary", use_container_width=True):
            valid, msg = validate_jd_text(jd_text)
            if not valid:
                st.error(msg)
                return

            allowed, remaining = check_rate_limit()
            if not allowed:
                st.warning("今日分析次数已用完，请明天再试。")
                return

            try:
                glm_client = get_glm_client()
            except ValueError as e:
                st.error(str(e))
                st.markdown("请在 .env 或 Streamlit Cloud Secrets 中配置 GLM_API_KEY")
                return

            with st.spinner("正在深度解析JD..."):
                try:
                    result = analyze_jd(glm_client, jd_text)
                    increment_usage()
                    st.session_state["jd_analysis_result"] = result
                    st.session_state["jd_text"] = jd_text
                except RuntimeError as e:
                    st.error(str(e))
                    return

    with col_result:
        result = st.session_state.get("jd_analysis_result")
        if result:
            render_analysis_result(result)
        else:
            st.markdown(
                '<div style="text-align:center; padding:80px 20px; color:#94A3B8; font-size:0.8125rem;">'
                '粘贴左侧JD文本，点击"开始深度解析"<br/>分析结果将在这里展示</div>',
                unsafe_allow_html=True,
            )

    # 底部跳转
    result = st.session_state.get("jd_analysis_result")
    if result:
        st.markdown("---")
        if st.button("用此JD匹配我的简历 →", type="primary", use_container_width=True):
            st.switch_page("pages/3_简历匹配.py")


def render_analysis_result(result: dict):
    """渲染JD解析结果"""

    # 岗位概览
    overview = result.get("position_overview", {})
    section_title("岗位概览")
    col1, col2, col3 = st.columns(3)
    with col1:
        metric_card(overview.get("inferred_role", "-"), "推断角色")
    with col2:
        metric_card(overview.get("seniority_level", "-"), "推断职级")
    with col3:
        metric_card(overview.get("company_type_hint", "-"), "推断公司类型")

    # 表面要求
    surface = result.get("surface_requirements", {})
    section_title("表面要求")

    col1, col2 = st.columns(2)
    with col1:
        card(
            "".join(tag(s, "blue") for s in surface.get("hard_skills", []))
            or "<span style='color:#94A3B8;'>无</span>",
            title="硬技能",
        )
    with col2:
        card(
            "".join(tag(s, "green") for s in surface.get("soft_skills", []))
            or "<span style='color:#94A3B8;'>无</span>",
            title="软技能",
        )

    col1, col2 = st.columns(2)
    with col1:
        card(f"<b>经验：</b>{surface.get('experience', '-')}", color="blue")
    with col2:
        card(f"<b>学历：</b>{surface.get('education', '-')}", color="blue")

    # 隐藏需求
    hidden = result.get("hidden_needs", {})
    section_title("隐藏需求", color="orange")
    st.info("以下分析基于AI行业招聘经验和JD文本推断，帮助你看到JD背后的真实需求")

    card(
        hidden.get("team_context", "-"),
        title="团队真实挑战",
        color="orange",
    )

    priorities = hidden.get("real_priorities", [])
    if priorities:
        card(
            "".join(f'<div style="margin:4px 0;"><b>{i}.</b> {p}</div>' for i, p in enumerate(priorities, 1)),
            title="团队最看重的3个能力（按优先级）",
            color="orange",
        )

    col1, col2 = st.columns(2)
    with col1:
        signals = hidden.get("culture_signals", [])
        if signals:
            card(
                "".join(tag(s, "gray") for s in signals),
                title="文化信号",
            )
    with col2:
        why = hidden.get("why_this_role", "-")
        card(f"{why}", title="招人原因推断", color="blue")

    # 面试聚焦
    interview = result.get("interview_focus", {})
    section_title("面试聚焦", color="green")

    topics = interview.get("likely_topics", [])
    if topics:
        topics_html = ""
        for t in topics:
            topic_name = t.get("topic", "")
            depth = t.get("depth", "")
            prep = t.get("preparation", "")
            depth_color = {"精通": "red", "掌握": "orange", "了解": "green"}.get(depth, "blue")
            topics_html += f"""
            <div style="margin:6px 0; padding:8px 12px; background:{_bg_faint()}; border-radius:6px; border:1px solid {_border()};">
                {tag(depth, depth_color)}
                <b>{topic_name}</b><br/>
                <span style="font-size:0.75rem; color:#64748B; margin-left:2px;">→ {prep}</span>
            </div>
            """
        card(topics_html, title="重点面试主题")

    col1, col2 = st.columns(2)
    with col1:
        red_flags = interview.get("red_flags", [])
        if red_flags:
            card(
                "".join(f'<div style="margin:3px 0;">{tag("!", "red")} {flag}</div>' for flag in red_flags),
                title="潜在坑点",
                color="danger",
            )
    with col2:
        angles = interview.get("standout_angles", [])
        if angles:
            card(
                "".join(f'<div style="margin:3px 0;">{tag("i", "info")} {angle}</div>' for angle in angles),
                title="脱颖而出切入点",
                color="success",
            )


def _bg_faint():
    return "#F8FAFC"

def _border():
    return "#E2E8F0"


show()
