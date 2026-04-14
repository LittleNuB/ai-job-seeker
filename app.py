import streamlit as st
from utils.formatters import inject_global_style


def main():
    st.set_page_config(
        page_title="AI求职助手",
        page_icon="🚀",
        layout="wide",
    )

    inject_global_style()

    # Hero 渐变区
    st.markdown("""
    <div class="aic-hero">
        <h1>🚀 AI求职助手</h1>
        <p>让AI帮你找到最适合的AI岗位</p>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("<div style='height:24px;'></div>", unsafe_allow_html=True)

    # 三大功能卡片
    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("""
        <div class="aic-feature-card">
            <div class="aic-feature-icon">🔍</div>
            <div class="aic-feature-title">AI岗位探索</div>
            <div class="aic-feature-desc">破解行业信息差<br/>快速了解岗位定位 · 能力要求 · 职业路径</div>
        </div>
        """, unsafe_allow_html=True)
        if st.button("开始探索 →", key="btn_explore", use_container_width=True):
            st.switch_page("pages/1_AI岗位探索.py")

    with col2:
        st.markdown("""
        <div class="aic-feature-card">
            <div class="aic-feature-icon">📋</div>
            <div class="aic-feature-title">JD解析器</div>
            <div class="aic-feature-desc">一键拆解岗位JD<br/>表面要求 · 隐藏需求 · 面试考点</div>
        </div>
        """, unsafe_allow_html=True)
        if st.button("开始解析 →", key="btn_jd", use_container_width=True):
            st.switch_page("pages/2_JD解析器.py")

    with col3:
        st.markdown("""
        <div class="aic-feature-card">
            <div class="aic-feature-icon">🎯</div>
            <div class="aic-feature-title">简历匹配</div>
            <div class="aic-feature-desc">智能匹配目标岗位<br/>核心优势 · 能力差距 · 提升建议</div>
        </div>
        """, unsafe_allow_html=True)
        if st.button("开始匹配 →", key="btn_match", use_container_width=True):
            st.switch_page("pages/3_简历匹配.py")

    # 步骤指示器
    st.markdown("<div style='height:16px;'></div>", unsafe_allow_html=True)
    st.markdown("""
    <div class="aic-steps">
        <div class="aic-step">
            <div class="aic-step-num">1</div>
            <div class="aic-step-text">浏览岗位</div>
            <div class="aic-step-desc">了解行业全貌</div>
        </div>
        <div class="aic-step-arrow">→</div>
        <div class="aic-step">
            <div class="aic-step-num">2</div>
            <div class="aic-step-text">解析JD</div>
            <div class="aic-step-desc">看透真实需求</div>
        </div>
        <div class="aic-step-arrow">→</div>
        <div class="aic-step">
            <div class="aic-step-num">3</div>
            <div class="aic-step-text">匹配简历</div>
            <div class="aic-step-desc">找到优势差距</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Footer
    st.markdown("""
    <div class="aic-footer">
        本工具基于AI分析，建议结合自身判断使用 · Powered by GLM · Built with Streamlit
    </div>
    """, unsafe_allow_html=True)


main()
