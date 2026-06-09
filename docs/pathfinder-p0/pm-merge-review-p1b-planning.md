# 寻径星图 P1-B 规划合并审查

日期：2026-06-09  
主 Agent：产品经理 / 主 Agent  
审查对象：

- `P1B-TECH-001`：`docs/pathfinder-p0/p1-b-technical-architecture.md`
- `DATA-003`：`docs/pathfinder-p0/p1-b-open-source-project-library.md`

## 1. 总体结论

两份 P1-B 规划文档可以进入 P1-B.1 开发拆分。它们在核心路线、边界和数据治理上没有阻断级冲突。

P1-B.1 的执行口径确定为：

> 基于真实用户背景，用规则优先的方式生成可解释路径建议；只从人工审核开源项目库选择参考项目；基于路径、项目和用户背景生成试航包；继续复用 `analysis_records` 保存推荐运行、试航包快照和 TrailRecord。

P1-B.1 不做 LLM 主链路、不做实时 GitHub 搜索、不做真实 RAG、不新增 migration、不展示分数 / 概率 / 认证 / 胜任判断。

## 2. 已合并材料

已 cherry-pick 到主集成分支：

- `6ef9a41 docs: add pathfinder p1b technical architecture`
- `67c9919 docs: add pathfinder p1b project library plan`

两个提交均为单文件文档提交，未修改前端、后端、数据库、依赖或部署配置。

## 3. 一致性检查

### P1-B.1 / P1-B.2 / P2 边界

两份文档一致：

- P1-B.1 使用 JSON fixture + `analysis_records`。
- P1-B.2 再做专用表、迁移和审核工作台 PRD。
- P2 才考虑多试航包运营、后台、平台化联动。

### 推荐机制

两份文档一致：

- 规则优先、证据链优先。
- 内部可以有规则权重，但不对外展示分数、百分比、排名。
- 结论语义使用“优先试航 / 可探索 / 暂缓主攻 / 信息不足”，不使用“胜任 / 适合录用”。

### 项目库

两份文档一致：

- 只使用人工审核 `OpenSourceProjectRecord`。
- `OpenDocuments` 是 P1-B.1 唯一 approved 项目。
- 其他项目先作为“候选类型 + 待核验”，不得生成完整 TrialPackage。
- stars / forks / commits 不作为推荐依据。

### LLM 边界

两份文档一致：

- P1-B.1 不让 LLM 决定路径或项目。
- LLM 最多作为后续摘要、润色、标注辅助，且必须人工复核。

主 Agent 决策：P1-B.1 先完全不接 LLM 功能；LLM 辅助延后到 P1-C 或 P1-B.2 再评估。

## 4. 主 Agent 产品决策

为便于进入开发拆分，主 Agent 采用以下 P1-B.1 决策：

1. 只有 `approved_for_trial_package` 且 License 已核验的项目可以生成完整 TrialPackage。
2. P1-B.1 用户可见 approved 项目暂时只有 OpenDocuments。
3. 其他候选项目只进入数据维护文档或内部 fixture，不进入用户可选链路。
4. 第一轮 RolePath 使用 4 条转型试航路径：
   - 行业 AI 应用产品助理
   - 行业 AI 解决方案助理
   - AI 数据评测助理
   - AI 应用运营 / 实施助理
5. 算法工程 / 大模型研发继续作为“暂缓主攻”风险路径，不生成试航包。
6. 样例 JD 公司名继续匿名化 / 弱化展示，只说“样例 JD / 当前样本趋势参考”。
7. P1-B.1 不做 LLM 润色按钮，避免参赛和产品化阶段被误解为泛用生成器。

## 5. 下一步开发拆分

建议进入 4 条并行任务。

### DATA-004：P1-B.1 数据 fixture

目标：

- 新增 RolePath taxonomy fixture。
- 新增 ProjectMatchRule fixture。
- 将 OpenDocuments 映射为 P1-B `OpenSourceProjectRecord`。
- 新增 OpenDocuments 的产品助理版与解决方案助理版 TrialTaskTemplate。
- 保留候选项目类型为待核验，不进入 approved。

### BE-003：P1-B.1 规则推荐 API

目标：

- 新增 `POST /api/pathfinder/recommendations`。
- 新增 `GET /api/pathfinder/projects`。
- 新增 `POST /api/pathfinder/trial-packages/generate`。
- 继续复用 `analysis_records`，不新增 migration。
- 保持 `/records` 兼容 P1-A。

### FE-003：P1-B.1 前端产品流

目标：

- 背景页提交后触发推荐 API。
- 推荐页展示用户信号、路径建议、项目候选和证据链。
- 用户选择路径 / 项目后生成 TrialPackage。
- 试航 / 结果 / Markdown 继续复用 P1-A 链路。

### QA-003：P1-B.1 执行型 QA

目标：

- 增加 recommendation / projects / generate API 测试。
- 增加前端真实用户背景到生成试航包 E2E。
- 增加 Scope Guard 静态检查。
- 验证待核验项目不能生成完整 TrialPackage。

## 6. 仍需注意的风险

- 现有 OpenDocuments 是唯一 approved 项目，P1-B.1 的“真实项目匹配”能力会比较克制，但这是合理的安全起点。
- 用户可能期待多个真实开源项目可选，页面文案必须解释“第一轮只展示已核验参考项目”。
- 规则推荐容易被误解为评分系统，UI 不得出现分数、进度百分比、排行榜视觉。
- 后端新增 API 时要继续优先 JWT auth，非生产才允许 `X-User-Id` fallback。
- P1-B.1 继续复用 `analysis_records`，历史检索和审计能力有限；专用表放 P1-B.2。

## 7. 验收口径

P1-B.1 可进入开发的验收口径：

- 用户输入真实背景后，系统能给出 3 到 4 条路径建议。
- 每条路径建议都有用户背景证据、JD 样本趋势证据、项目证据或风险证据。
- 至少 OpenDocuments 可生成完整 TrialPackage。
- 待核验项目不会生成完整 TrialPackage。
- 完成试航后仍可保存、反包装检查、导出 Markdown。
- 所有输出不包含能力认证、offer 概率、企业筛选、简历包装或开源贡献暗示。
