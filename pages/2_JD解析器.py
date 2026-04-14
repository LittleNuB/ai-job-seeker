import streamlit as st
from services.glm_client import get_glm_client
from services.jd_service import analyze_jd
from utils.validators import validate_jd_text
from utils.rate_limiter import check_rate_limit, increment_usage, show_usage_hint
from utils.formatters import (
    inject_global_style, card, tag_row, section_title, metric_card, tag,
)


def show():
    inject_global_style()

    st.title("📋 JD解析器")
    st.markdown("一键深度解析AI岗位JD，看透表面要求、隐藏需求和面试考点")

    show_usage_hint()

    # 输入区
    jd_text = st.text_area(
        "粘贴岗位JD",
        height=300,
        placeholder="请将AI岗位的JD全文粘贴到这里...\n\n示例：\n岗位职责：\n1. 负责NLP相关算法的研发与优化...\n\n任职要求：\n1. 计算机相关专业硕士及以上学历...",
        key="jd_input"
    )

    # 如果从岗位探索跳转过来，显示提示
    if st.session_state.get("selected_position_id"):
        from services.position_service import PositionService
        pos_svc = PositionService()
        pos = pos_svc.get_position_by_id(st.session_state["selected_position_id"])
        if pos:
            st.info(f"💡 已选择参考岗位：**{pos['name']}**，解析结果将参考该岗位的行业认知")

    # 解析按钮
    if st.button("🔍 开始深度解析", type="primary", use_container_width=True):
        valid, msg = validate_jd_text(jd_text)
        if not valid:
            st.error(msg)
            return

        allowed, remaining = check_rate_limit()
        if not allowed:
            st.warning("今日分析次数已用完，请明天再试。每个会话每天最多使用20次。")
            return

        try:
            glm_client = get_glm_client()
        except ValueError as e:
            st.error(str(e))
            st.markdown("请按以下步骤配置API Key：\n1. 复制 `.env` 中的 `GLM_API_KEY` 填入你的密钥\n2. 或在 Streamlit Cloud Secrets 中配置")
            return

        with st.spinner("正在深度解析JD，请稍候..."):
            try:
                result = analyze_jd(glm_client, jd_text)
                increment_usage()
                st.session_state["jd_analysis_result"] = result
                st.session_state["jd_text"] = jd_text
            except RuntimeError as e:
                st.error(str(e))
                return

    # 展示结果
    result = st.session_state.get("jd_analysis_result")
    if result:
        st.markdown("<div style='height:12px;'></div>", unsafe_allow_html=True)
        render_analysis_result(result)

        st.markdown("---")
        if st.button("🎯 用此JD匹配我的简历", type="primary", use_container_width=True):
            st.switch_page("pages/3_简历匹配.py")


def render_analysis_result(result: dict):
    """渲染JD解析结果"""

    # 岗位概览 - 三指标卡片
    overview = result.get("position_overview", {})
    section_title("📌 岗位概览")
    col1, col2, col3 = st.columns(3)
    with col1:
        metric_card(overview.get("inferred_role", "-"), "推断角色")
    with col2:
        metric_card(overview.get("seniority_level", "-"), "推断职级")
    with col3:
        metric_card(overview.get("company_type_hint", "-"), "推断公司类型")

    # 表面要求
    surface = result.get("surface_requirements", {})
    section_title("📝 表面要求")

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

    # 隐藏需求（核心价值）
    hidden = result.get("hidden_needs", {})
    section_title("🔎 隐藏需求", color="orange")
    st.info("💡 以下分析基于AI行业招聘经验和JD文本推断，帮助你看到JD背后的真实需求")

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
    section_title("🎯 面试聚焦", color="green")

    topics = interview.get("likely_topics", [])
    if topics:
        topics_html = ""
        for t in topics:
            topic_name = t.get("topic", "")
            depth = t.get("depth", "")
            prep = t.get("preparation", "")
            depth_color = {"精通": "red", "掌握": "orange", "了解": "green"}.get(depth, "blue")
            topics_html += f"""
            <div style="margin:8px 0; padding:8px 12px; background:#F8FAFC; border-radius:8px; border:1px solid #E2E8F0;">
                {tag(depth, depth_color)}
                <b>{topic_name}</b><br/>
                <span style="font-size:0.82rem; color:#64748B; margin-left:2px;">→ {prep}</span>
            </div>
            """
        card(topics_html, title="重点面试主题")

    col1, col2 = st.columns(2)
    with col1:
        red_flags = interview.get("red_flags", [])
        if red_flags:
            card(
                "".join(f'<div style="margin:3px 0;">⚠️ {flag}</div>' for flag in red_flags),
                title="潜在坑点",
                color="danger",
            )
    with col2:
        angles = interview.get("standout_angles", [])
        if angles:
            card(
                "".join(f'<div style="margin:3px 0;">💡 {angle}</div>' for angle in angles),
                title="脱颖而出切入点",
                color="success",
            )


show()
