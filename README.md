# AI Job Copilot

AI 驱动的求职决策工具 — 从岗位探索到 JD 解析再到简历匹配，帮助你做出更聪明的求职决策。

## 功能概览

### 岗位探索

了解 AI 行业主流岗位的定位、能力要求、职业路径和薪资水平。

- 5 大方向（算法 / 工程 / 产品 / 数据 / 应用）、16+ 岗位的结构化数据
- 每个岗位包含：岗位定位、能力要求（must_have / nice_to_have / tools）、职业路径、薪资范围、行业趋势
- 选中岗位可直接跳转到 JD 解析或简历匹配

### JD 深度解析

用大模型从 JD 文本中提取三层信息——表面要求、隐藏需求、面试聚焦。

- **表面要求**：硬技能、软技能、经验、学历
- **隐藏需求**：团队真实挑战、最看重的能力（优先级排序）、文化信号、招人原因推断
- **面试聚焦**：重点主题 + 考察深度、潜在坑点、脱颖而出切入点

### 简历匹配

将求职者简历与目标岗位进行四维匹配分析。

- **四维评分**：硬技能匹配 / 经验匹配 / 文化契合 / 成长潜力
- **核心优势**：含简历佐证 + 为什么对该岗位重要
- **能力差距**：严重程度 + 影响 + 弥补措施
- **三阶段提升计划**：即刻（1-2 周）/ 短期（1-3 月）/ 中期（3-6 月）
- **面试策略**：主动引导话题 / 重点准备方向 / 叙述角度建议

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Streamlit（多页应用） |
| 大模型 | GLM-4.6V（智谱 AI，OpenAI 兼容协议） |
| 部署 | Streamlit Cloud |
| 数据 | 本地 JSON（结构化岗位数据） |
| 语言 | Python 3.11 |

## 项目结构

```
ai-job-seeker/
├── app.py                        # 首页（Hero + Bento Grid）
├── pages/
│   ├── 1_AI岗位探索.py            # 岗位研究分析台
│   ├── 2_JD解析器.py              # JD 分析工作台
│   └── 3_简历匹配.py              # 匹配分析中心
├── services/
│   ├── glm_client.py             # GLM API 客户端（OpenAI SDK 兼容）
│   ├── jd_service.py             # JD 解析 Prompt 工程
│   ├── resume_service.py         # 简历匹配 Prompt 工程
│   └── position_service.py       # 岗位数据服务
├── utils/
│   ├── config.py                 # 双源配置（st.secrets / os.environ）
│   ├── formatters.py             # UI 组件库（12 个可复用组件）
│   ├── rate_limiter.py           # 会话级频率限制
│   └── validators.py             # 输入校验
├── data/
│   └── ai_positions.json         # AI 行业岗位数据库
├── static/
│   └── style.css                 # 全局样式（深色侧边栏 + 蓝色科技风）
└── .streamlit/
    └── config.toml               # Streamlit 主题配置
```

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/LittleNuB/ai-job-seeker.git
cd ai-job-seeker
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

依赖仅 3 个：`streamlit`、`openai`、`python-dotenv`

### 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入你的智谱 AI API Key：

```
GLM_API_KEY=your_api_key_here
GLM_MODEL=glm-4.6V
GLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
```

API Key 获取：[智谱 AI 开放平台](https://open.bigmodel.cn/)

### 4. 启动应用

```bash
streamlit run app.py
```

## 部署到 Streamlit Cloud

1. Fork 本仓库
2. 在 [Streamlit Cloud](https://share.streamlit.app/) 创建新应用，连接你的 GitHub 仓库
3. 在 Secrets 中配置 `GLM_API_KEY`（Settings → Secrets）：

```toml
GLM_API_KEY = "your_api_key_here"
```

## 关键技术决策

| 决策 | 理由 |
|------|------|
| GLM 而非 GPT | 面向中国 AI 求职场景，中文 JD 理解更好；OpenAI 兼容协议可复用 SDK；成本更低 |
| Streamlit 多页架构 | MVP 阶段核心是 Prompt 工程和业务逻辑；零运维部署到 Streamlit Cloud |
| components.html() 渲染 | st.markdown(unsafe_allow_html) 在 Cloud 上会转义 HTML；iframe 渲染完整可靠 |
| 三级 JSON 解析回退 | 大模型输出不稳定（代码块包裹/额外文字），回退机制确保 99% 响应可解析 |
| 双源配置 | st.secrets（云端优先）→ os.environ（本地回退），一套代码双环境运行 |

## License

MIT
