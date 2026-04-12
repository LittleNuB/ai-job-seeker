import streamlit as st
from services.glm_client import get_glm_client
from services.position_service import PositionService
from services.resume_service import match_resume
from utils.validators import validate_resume_text
from utils.formatters import render_match_score, render_score_bar
from utils.rate_limiter import check_rate_limit, increment_usage, show_usage_hint

position_svc = PositionService()


def show():
    st.title("🎯 简历匹配")
    st.markdown("智能匹配简历与目标岗位，明确核心优势与能力缺口")

    # 显示剩余次数
    show_usage_hint()

    # Step 1: 输入简历
    st.markdown("### Step 1：输入你的简历")
    resume_placeholder = st.session_state.get("resume_text", "")
    resume_text = st.text_area(
        "粘贴简历内容",
        height=300,
        placeholder="请粘贴你的简历内容...\n\n建议包含：\n- 教育背景\n- 工作经历\n- 项目经验\n- 技术技能\n- 论文/专利（如有）",
        value=resume_placeholder,
        key="resume_input"
    )
    if resume_text:
        st.session_state["resume_text"] = resume_text

    # Step 2: 选择目标岗位
    st.markdown("### Step 2：选择目标岗位")

    all_positions = position_svc.get_all_positions_flat()

    # 构建选项列表
    position_options = {}
    for pos in all_positions:
        position_options[f"{pos['name']} - {pos['category_name']}"] = pos

    # 如果有JD解析结果，添加特殊选项
    jd_result = st.session_state.get("jd_analysis_result")
    use_jd = False
    if jd_result:
        use_jd = st.checkbox("📋 使用上次JD解析结果作为目标岗位", value=False)

    selected_pos = None
    if not use_jd:
        # 预选：从岗位探索跳转过来的
        default_idx = 0
        pre_selected = st.session_state.get("selected_position_id")
        if pre_selected:
            for i, (label, pos) in enumerate(position_options.items()):
                if pos["id"] == pre_selected:
                    default_idx = i
                    break

        selected_label = st.selectbox(
            "选择目标岗位",
            options=list(position_options.keys()),
            index=default_idx
        )
        selected_pos = position_options[selected_label]

    # 构建岗位描述文本（发给模型）
    position_details = ""
    if use_jd and jd_result:
        overview = jd_result.get("position_overview", {})
        surface = jd_result.get("surface_requirements", {})
        position_details = f"""岗位角色：{overview.get('inferred_role', '')}
职级：{overview.get('seniority_level', '')}
公司类型：{overview.get('company_type_hint', '')}
硬技能要求：{', '.join(surface.get('hard_skills', []))}
软技能要求：{', '.join(surface.get('soft_skills', []))}
经验要求：{surface.get('experience', '')}
学历要求：{surface.get('education', '')}"""
        if jd_result.get("hidden_needs", {}).get("real_priorities"):
            position_details += f"\n团队最看重：{', '.join(jd_result['hidden_needs']['real_priorities'])}"
        st.info(f"📊 已使用JD解析结果：**{overview.get('inferred_role', '未知岗位')}**")
    elif selected_pos:
        cap = selected_pos["capability_requirements"]
        position_details = f"""岗位名称：{selected_pos['name']} ({selected_pos['name_en']})
岗位定位：{selected_pos['positioning']}
必备能力：{', '.join(cap.get('must_have', []))}
加分项：{', '.join(cap.get('nice_to_have', []))}
核心工具：{', '.join(cap.get('tools', []))}
职级：{selected_pos['level']}
行业趋势：{selected_pos.get('industry_trends', '')}"""

    # 匹配分析按钮
    st.markdown("---")
    if st.button("🎯 开始匹配分析", type="primary", use_container_width=True):
        # 校验
        valid, msg = validate_resume_text(resume_text)
        if not valid:
            st.error(msg)
            return

        if not position_details:
            st.error("请选择目标岗位或使用JD解析结果")
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

        with st.spinner("正在进行匹配分析，请稍候..."):
            try:
                result = match_resume(glm_client, resume_text, position_details)
                increment_usage()
                st.session_state["match_result"] = result
            except RuntimeError as e:
                st.error(str(e))
                return

    # 展示结果
    result = st.session_state.get("match_result")
    if result:
        st.markdown("---")
        render_match_result(result)


def render_match_result(result: dict):
    """渲染匹配结果"""

    # 匹配分数
    score = result.get("match_score", 0)
    render_match_score(score)

    # 四维得分
    breakdown = result.get("score_breakdown", {})
    st.markdown("### 📊 维度得分")
    col1, col2 = st.columns(2)
    with col1:
        render_score_bar("硬技能匹配", breakdown.get("hard_skills_match", 0))
        render_score_bar("经验匹配", breakdown.get("experience_match", 0))
    with col2:
        render_score_bar("文化契合", breakdown.get("culture_fit", 0))
        render_score_bar("成长潜力", breakdown.get("growth_potential", 0))

    # 核心优势
    advantages = result.get("core_advantages", [])
    if advantages:
        st.markdown("### ✅ 核心优势")
        for adv in advantages:
            st.markdown(f"**{adv.get('advantage', '')}**")
            if adv.get("evidence"):
                st.markdown(f"　佐证：{adv['evidence']}")
            if adv.get("why_matters"):
                st.markdown(f"　为什么重要：{adv['why_matters']}")

    # 能力差距
    gaps = result.get("capability_gaps", [])
    if gaps:
        st.markdown("### ⚠️ 能力差距")
        for gap in gaps:
            severity = gap.get("severity", "中")
            icon = {"高": "🔴", "中": "🟡", "低": "🟢"}.get(severity, "⚪")
            st.markdown(f"{icon} **{gap.get('gap', '')}**（{severity}优先级）")
            if gap.get("impact"):
                st.markdown(f"　影响：{gap['impact']}")
            if gap.get("mitigation"):
                st.markdown(f"　弥补措施：{gap['mitigation']}")

    # 提升计划
    plan = result.get("improvement_plan", {})
    if plan:
        st.markdown("### 📈 提升计划")
        col1, col2, col3 = st.columns(3)

        with col1:
            st.markdown("**⚡ 即刻（1-2周）**")
            for item in plan.get("immediate", []):
                st.markdown(f"- {item}")

        with col2:
            st.markdown("**📅 短期（1-3月）**")
            for item in plan.get("short_term", []):
                st.markdown(f"- {item}")

        with col3:
            st.markdown("**🎯 中期（3-6月）**")
            for item in plan.get("medium_term", []):
                st.markdown(f"- {item}")

    # 面试策略
    strategy = result.get("interview_strategy", {})
    if strategy:
        st.markdown("### 🎤 面试策略")

        col1, col2 = st.columns(2)
        with col1:
            highlights = strategy.get("highlight_topics", [])
            if highlights:
                st.markdown("**主动引导话题**")
                for item in highlights:
                    st.markdown(f"- {item}")

            prepare = strategy.get("prepare_for", [])
            if prepare:
                st.markdown("**重点准备方向**")
                for item in prepare:
                    st.markdown(f"- {item}")

        with col2:
            angle = strategy.get("narrative_angle", "")
            if angle:
                st.markdown("**叙述角度建议**")
                st.markdown(angle)


show()
