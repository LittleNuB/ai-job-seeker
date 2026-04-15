import streamlit as st
from services.glm_client import get_glm_client
from services.position_service import PositionService
from services.resume_service import match_resume
from utils.validators import validate_resume_text
from utils.rate_limiter import check_rate_limit, increment_usage, show_usage_hint
from utils.formatters import (
    inject_global_style, card, section_title, tag, tag_row,
    render_match_score, render_score_bar, gap_item, plan_card,
    page_header, step_indicator,
)

position_svc = PositionService()


def show():
    inject_global_style()

    page_header("匹配分析中心", "智能匹配简历与目标岗位，明确核心优势与能力差距", "target")

    show_usage_hint()

    # 步骤指示器
    has_result = st.session_state.get("match_result") is not None
    current_step = 2 if has_result else 0
    step_indicator([
        {"label": "输入简历", "desc": "粘贴简历内容"},
        {"label": "选择岗位", "desc": "目标岗位"},
        {"label": "查看结果", "desc": "匹配分析"},
    ], current=current_step)

    # Step 1 + Step 2 合并为两列输入区
    col_resume, col_position = st.columns([7, 5])

    with col_resume:
        st.markdown("**输入简历**")
        resume_placeholder = st.session_state.get("resume_text", "")
        resume_text = st.text_area(
            "粘贴简历内容",
            height=500,
            placeholder="请粘贴你的简历内容...\n\n建议包含：教育背景、工作经历、项目经验、技术技能",
            value=resume_placeholder,
            key="resume_input",
            label_visibility="collapsed",
        )
        if resume_text:
            st.session_state["resume_text"] = resume_text

    with col_position:
        st.markdown("**选择目标岗位**")

        all_positions = position_svc.get_all_positions_flat()
        position_options = {}
        for pos in all_positions:
            position_options[f"{pos['name']} - {pos['category_name']}"] = pos

        jd_result = st.session_state.get("jd_analysis_result")
        use_jd = False
        if jd_result:
            use_jd = st.checkbox("使用上次JD解析结果作为目标岗位", value=False)

        selected_pos = None
        if not use_jd:
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
                index=default_idx,
                label_visibility="collapsed",
            )
            selected_pos = position_options[selected_label]

    # 构建岗位描述文本
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
        st.info(f"已使用JD解析结果：**{overview.get('inferred_role', '未知岗位')}**")
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
    if st.button("开始匹配分析", type="primary", use_container_width=True):
        valid, msg = validate_resume_text(resume_text)
        if not valid:
            st.error(msg)
            return

        if not position_details:
            st.error("请选择目标岗位或使用JD解析结果")
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

        with st.spinner("正在进行匹配分析，请稍候..."):
            try:
                result = match_resume(glm_client, resume_text, position_details)
                increment_usage()
                st.session_state["match_result"] = result
                st.rerun()
            except RuntimeError as e:
                st.error(str(e))
                return

    # 展示结果
    result = st.session_state.get("match_result")
    if result:
        st.markdown("<div style='height:8px;'></div>", unsafe_allow_html=True)
        render_match_result(result)


def render_match_result(result: dict):
    """渲染匹配结果"""

    # 匹配分数圆环
    score = result.get("match_score", 0)
    render_match_score(score)

    # 四维得分
    breakdown = result.get("score_breakdown", {})
    section_title("维度得分")
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
        section_title("核心优势", color="green")
        for adv in advantages:
            detail_parts = []
            if adv.get("evidence"):
                detail_parts.append(f"佐证：{adv['evidence']}")
            if adv.get("why_matters"):
                detail_parts.append(f"为什么重要：{adv['why_matters']}")
            gap_item(
                title=adv.get("advantage", ""),
                detail=" | ".join(detail_parts) if detail_parts else "",
                severity="低",
            )

    # 能力差距
    gaps = result.get("capability_gaps", [])
    if gaps:
        section_title("能力差距", color="red")
        for gap_item_data in gaps:
            severity = gap_item_data.get("severity", "中")
            detail_parts = []
            if gap_item_data.get("impact"):
                detail_parts.append(f"影响：{gap_item_data['impact']}")
            if gap_item_data.get("mitigation"):
                detail_parts.append(f"弥补：{gap_item_data['mitigation']}")
            gap_item(
                title=gap_item_data.get("gap", ""),
                detail=" | ".join(detail_parts) if detail_parts else "",
                severity=severity,
            )

    # 提升计划
    plan = result.get("improvement_plan", {})
    if plan:
        section_title("提升计划", color="orange")
        col1, col2, col3 = st.columns(3)
        with col1:
            plan_card("即刻（1-2周）", plan.get("immediate", []), "immediate")
        with col2:
            plan_card("短期（1-3月）", plan.get("short_term", []), "short")
        with col3:
            plan_card("中期（3-6月）", plan.get("medium_term", []), "medium")

    # 面试策略
    strategy = result.get("interview_strategy", {})
    if strategy:
        section_title("面试策略", color="blue")

        col1, col2 = st.columns(2)
        with col1:
            highlights = strategy.get("highlight_topics", [])
            if highlights:
                card(
                    "".join(f'<div style="margin:3px 0;">{tag("i", "info")} {item}</div>' for item in highlights),
                    title="主动引导话题",
                    color="blue",
                )

            prepare = strategy.get("prepare_for", [])
            if prepare:
                card(
                    "".join(f'<div style="margin:3px 0;">{tag("!", "orange")} {item}</div>' for item in prepare),
                    title="重点准备方向",
                    color="warning",
                )

        with col2:
            angle = strategy.get("narrative_angle", "")
            if angle:
                card(
                    f"<div style='line-height:1.7;'>{angle}</div>",
                    title="叙述角度建议",
                    color="success",
                )


show()
