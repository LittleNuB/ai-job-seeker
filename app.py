import streamlit as st


def main():
    # 页面配置
    st.set_page_config(
        page_title="AI求职助手",
        page_icon="🚀",
        layout="wide",
    )

    # 首页标题
    st.markdown("""
    <div style="text-align: center; padding: 40px 0 20px 0;">
        <h1 style="font-size: 2.8rem; margin-bottom: 0.5rem;">🚀 AI求职助手</h1>
        <p style="font-size: 1.2rem; color: #666;">让AI帮你找到最适合的AI岗位</p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("---")

    # 三大功能卡片
    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("""
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 3rem;">🔍</div>
            <h3>AI岗位探索</h3>
            <p style="color: #666;">破解行业信息差<br>快速了解岗位定位·能力要求·职业路径</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("开始探索 →", key="btn_explore", use_container_width=True):
            st.switch_page("pages/1_AI岗位探索.py")

    with col2:
        st.markdown("""
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 3rem;">📋</div>
            <h3>JD解析器</h3>
            <p style="color: #666;">一键拆解岗位JD<br>表面要求·隐藏需求·面试考点</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("开始解析 →", key="btn_jd", use_container_width=True):
            st.switch_page("pages/2_JD解析器.py")

    with col3:
        st.markdown("""
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 3rem;">🎯</div>
            <h3>简历匹配</h3>
            <p style="color: #666;">智能匹配岗位<br>核心优势·能力差距·提升建议</p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("开始匹配 →", key="btn_match", use_container_width=True):
            st.switch_page("pages/3_简历匹配.py")

    st.markdown("---")

    # 使用流程
    st.markdown("### 📖 使用流程")
    steps = [
        ("1", "浏览AI岗位", "了解行业全貌，找到感兴趣的方向"),
        ("2", "解析目标JD", "看透岗位真实需求，明确面试重点"),
        ("3", "匹配简历", "找到优势与差距，获取提升建议"),
    ]
    cols = st.columns(3)
    for col, (num, title, desc) in zip(cols, steps):
        with col:
            st.markdown(f"""
            <div style="padding: 15px; text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: #4A90D9;">{num}</div>
                <h4>{title}</h4>
                <p style="color: #666;">{desc}</p>
            </div>
            """, unsafe_allow_html=True)

    st.markdown("---")

    # 底部免责
    st.markdown("""
    <div style="text-align: center; color: #999; font-size: 0.85rem; padding: 10px;">
        ⚠️ 本工具基于AI分析，建议结合自身判断使用<br>
        Powered by GLM · Built with Streamlit
    </div>
    """, unsafe_allow_html=True)


main()
