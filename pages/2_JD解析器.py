import streamlit as st
from services.glm_client import get_glm_client
from services.jd_service import analyze_jd
from utils.validators import validate_jd_text
from utils.rate_limiter import check_rate_limit, increment_usage, show_usage_hint


def show():
    st.title("📋 JD解析器")
    st.markdown("一键深度解析AI岗位JD，看透表面要求、隐藏需求和面试考点")

    # 显示剩余次数
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
        # 校验输入
        valid, msg = validate_jd_text(jd_text)
        if not valid:
            st.error(msg)
            return

        # 频率限制检查
        allowed, remaining = check_rate_limit()
        if not allowed:
            st.warning("今日分析次数已用完，请明天再试。每个会话每天最多使用20次。")
            return

        # 调用API
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
        st.markdown("---")
        render_analysis_result(result)

        # 跳转按钮
        st.markdown("---")
        if st.button("🎯 用此JD匹配我的简历", type="primary", use_container_width=True):
            st.switch_page("pages/3_简历匹配.py")


def render_analysis_result(result: dict):
    """渲染JD解析结果"""

    # 岗位概览
    overview = result.get("position_overview", {})
    st.markdown("### 📌 岗位概览")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("推断角色", overview.get("inferred_role", "-"))
    with col2:
        st.metric("推断职级", overview.get("seniority_level", "-"))
    with col3:
        st.metric("推断公司类型", overview.get("company_type_hint", "-"))

    # 表面要求
    surface = result.get("surface_requirements", {})
    st.markdown("### 📝 表面要求")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**硬技能**")
        for skill in surface.get("hard_skills", []):
            st.markdown(f"- {skill}")
    with col2:
        st.markdown("**软技能**")
        for skill in surface.get("soft_skills", []):
            st.markdown(f"- {skill}")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown(f"**经验要求**：{surface.get('experience', '-')}")
    with col2:
        st.markdown(f"**学历要求**：{surface.get('education', '-')}")

    # 隐藏需求（核心价值）
    hidden = result.get("hidden_needs", {})
    st.markdown("### 🔎 隐藏需求")
    st.info("💡 以下分析基于AI行业招聘经验和JD文本推断，帮助你看到JD背后的真实需求")

    st.markdown("**团队真实挑战**")
    st.markdown(hidden.get("team_context", "-"))

    st.markdown("**团队最看重的3个能力（按优先级）**")
    for i, priority in enumerate(hidden.get("real_priorities", []), 1):
        st.markdown(f"{i}. **{priority}**")

    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**文化信号**")
        for signal in hidden.get("culture_signals", []):
            st.markdown(f"- {signal}")
    with col2:
        st.markdown(f"**招人原因推断**\n{hidden.get('why_this_role', '-')}")

    # 面试聚焦
    interview = result.get("interview_focus", {})
    st.markdown("### 🎯 面试聚焦")

    topics = interview.get("likely_topics", [])
    if topics:
        st.markdown("**重点面试主题**")
        for t in topics:
            topic_name = t.get("topic", "")
            depth = t.get("depth", "")
            prep = t.get("preparation", "")
            depth_icon = {"精通": "🔴", "掌握": "🟡", "了解": "🟢"}.get(depth, "⚪")
            st.markdown(f"{depth_icon} **{topic_name}**（{depth}）")
            if prep:
                st.markdown(f"　→ 准备建议：{prep}")

    col1, col2 = st.columns(2)
    with col1:
        red_flags = interview.get("red_flags", [])
        if red_flags:
            st.markdown("**⚠️ 潜在坑点**")
            for flag in red_flags:
                st.markdown(f"- {flag}")
    with col2:
        angles = interview.get("standout_angles", [])
        if angles:
            st.markdown("**💡 脱颖而出的切入点**")
            for angle in angles:
                st.markdown(f"- {angle}")


show()
