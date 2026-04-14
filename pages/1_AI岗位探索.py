import streamlit as st
from services.position_service import PositionService
from utils.formatters import (
    inject_global_style, card, tag_row, section_title,
    render_timeline, salary_card, page_header,
)

position_svc = PositionService()


def show():
    inject_global_style()

    page_header("岗位研究分析台", "了解AI行业主流岗位的定位、能力要求与发展路径", "compass")

    categories = position_svc.get_all_categories()
    if not categories:
        st.warning("岗位数据加载失败，请检查 data/ai_positions.json")
        return

    # 分类 Tabs
    tab_names = [f"{cat['icon']} {cat['name']}" for cat in categories]
    tabs = st.tabs(tab_names)

    for idx, (tab, cat) in enumerate(zip(tabs, categories)):
        with tab:
            st.markdown(f"*{cat['description']}*")

            positions = cat["positions"]
            if not positions:
                st.info("该分类暂无岗位数据")
                continue

            # 岗位选择
            pos_options = {f"{p['name']} ({p['name_en']}) - {p['level']}": p for p in positions}
            selected_label = st.selectbox(
                "选择岗位",
                options=list(pos_options.keys()),
                key=f"pos_select_{cat['id']}"
            )
            pos = pos_options[selected_label]

            # 岗位概要卡片
            st.markdown("<div style='height:4px;'></div>", unsafe_allow_html=True)
            card(
                f"<span style='color:{_gray500()}; font-size:0.75rem;'>{pos['name_en']} · {pos['level']}</span><br/>"
                f"{pos['summary']}",
                title=pos["name"],
            )

            # 详情 Tabs（去emoji）
            detail_tabs = st.tabs(["岗位定位", "能力要求", "职业路径", "薪资与趋势"])

            with detail_tabs[0]:
                section_title("岗位定位")
                st.markdown(pos["positioning"])

                if pos.get("common_interview_topics"):
                    section_title("常见面试主题")
                    for i, topic in enumerate(pos["common_interview_topics"], 1):
                        st.markdown(f"{i}. {topic}")

                if pos.get("related_positions"):
                    section_title("相关岗位")
                    related_names = []
                    for rid in pos["related_positions"]:
                        rp = position_svc.get_position_by_id(rid)
                        if rp:
                            related_names.append(rp["name"])
                    if related_names:
                        tag_row(related_names, "blue")
                    else:
                        st.markdown("暂无")

            with detail_tabs[1]:
                cap = pos["capability_requirements"]

                section_title("必备能力", color="red")
                tag_row(cap.get("must_have", []), "red")

                section_title("加分项", color="orange")
                tag_row(cap.get("nice_to_have", []), "orange")

                section_title("核心工具", color="blue")
                tag_row(cap.get("tools", []), "blue")

            with detail_tabs[2]:
                section_title("职业发展路径")
                path = pos["career_path"]
                render_timeline([
                    {"label": "初级", "text": path["junior"]},
                    {"label": "中级", "text": path["mid"]},
                    {"label": "高级", "text": path["senior"]},
                    {"label": "管理", "text": path["leadership"]},
                ])

            with detail_tabs[3]:
                section_title("薪资范围")
                sr = pos["salary_range"]
                sal_col1, sal_col2, sal_col3 = st.columns(3)
                with sal_col1:
                    salary_card("初级", sr["junior"])
                with sal_col2:
                    salary_card("中级", sr["mid"])
                with sal_col3:
                    salary_card("高级", sr["senior"])

                section_title("行业趋势", color="green")
                card(pos.get("industry_trends", "暂无趋势分析"))

            # 操作按钮
            st.markdown("<div style='height:8px;'></div>", unsafe_allow_html=True)
            col1, col2 = st.columns(2)
            with col1:
                if st.button("用此岗位分析JD →", key=f"jd_btn_{pos['id']}", use_container_width=True):
                    st.session_state["selected_position_id"] = pos["id"]
                    st.switch_page("pages/2_JD解析器.py")
            with col2:
                if st.button("用此岗位匹配简历 →", key=f"match_btn_{pos['id']}", use_container_width=True):
                    st.session_state["selected_position_id"] = pos["id"]
                    st.switch_page("pages/3_简历匹配.py")


def _gray500():
    return "#64748B"


show()
