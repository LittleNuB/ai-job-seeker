import streamlit as st
from services.position_service import PositionService
from utils.formatters import format_salary_range, format_career_path

position_svc = PositionService()


def show():
    st.title("🧭 AI岗位探索")
    st.markdown("快速了解主流AI岗位的定位、能力要求、职业路径和薪资水平")

    categories = position_svc.get_all_categories()
    if not categories:
        st.warning("岗位数据加载失败，请检查 data/ai_positions.json")
        return

    # 顶部分类标签页
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

            # 岗位详情
            st.markdown("---")
            st.subheader(pos["name"])
            st.markdown(f"*{pos['name_en']} · {pos['level']}*")
            st.markdown(pos["summary"])

            # 详情标签页
            detail_tabs = st.tabs(["🎯 岗位定位", "📋 能力要求", "📈 职业路径", "💰 薪资与趋势"])

            with detail_tabs[0]:
                st.markdown("#### 岗位定位")
                st.markdown(pos["positioning"])

                if pos.get("common_interview_topics"):
                    st.markdown("#### 常见面试主题")
                    for i, topic in enumerate(pos["common_interview_topics"], 1):
                        st.markdown(f"{i}. {topic}")

                if pos.get("related_positions"):
                    st.markdown("#### 相关岗位")
                    related_names = []
                    for rid in pos["related_positions"]:
                        rp = position_svc.get_position_by_id(rid)
                        if rp:
                            related_names.append(rp["name"])
                    st.markdown(" · ".join(related_names) if related_names else "暂无")

            with detail_tabs[1]:
                cap = pos["capability_requirements"]

                st.markdown("#### ✅ 必备能力")
                for skill in cap.get("must_have", []):
                    st.markdown(f"- {skill}")

                st.markdown("#### 💡 加分项")
                for skill in cap.get("nice_to_have", []):
                    st.markdown(f"- {skill}")

                st.markdown("#### 🔧 核心工具")
                tools = cap.get("tools", [])
                st.markdown(" · ".join(f"`{t}`" for t in tools))

            with detail_tabs[2]:
                st.markdown("#### 职业发展路径")
                st.markdown(format_career_path(pos["career_path"]))

            with detail_tabs[3]:
                st.markdown("#### 薪资范围")
                sr = pos["salary_range"]
                for level_key, level_salary in sr.items():
                    level_label = {"junior": "初级", "mid": "中级", "senior": "高级"}.get(level_key, level_key)
                    st.markdown(f"**{level_label}**：{format_salary_range(level_salary)}")

                st.markdown("---")
                st.markdown("#### 行业趋势")
                st.markdown(pos.get("industry_trends", "暂无趋势分析"))

            # 操作按钮
            st.markdown("---")
            col1, col2 = st.columns(2)
            with col1:
                if st.button(f"📋 用此岗位分析JD", key=f"jd_btn_{pos['id']}"):
                    st.session_state["selected_position_id"] = pos["id"]
                    st.switch_page("pages/2_JD解析器.py")
            with col2:
                if st.button(f"🎯 用此岗位匹配简历", key=f"match_btn_{pos['id']}"):
                    st.session_state["selected_position_id"] = pos["id"]
                    st.switch_page("pages/3_简历匹配.py")


show()
