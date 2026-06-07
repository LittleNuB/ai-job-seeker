# 寻径星图 P1 产品化 PRD

任务 ID：P1-PRD-001

子对话名称：产品规划A

版本：P1 Productization PRD v1

日期：2026-06-07

## 1. 总体结论

寻径星图 P1 的产品化方向不是把 P0 Demo 扩展成开放岗位推荐器，而是把“固定小 C 参赛 Demo”升级为真实用户可完成的一次岗位试航工作台。

P1 的核心产品定义：

> 面向传统工科、非 AI / 非 CS 背景的转岗用户，基于用户背景、人工策划的样例 JD 和固定公开参考项目，完成一次可追溯的岗位试航，输出航迹记录、作品集起点、面试解释材料和反包装检查结果。

P1 必须保留四个差异化：

- 岗位试航：不直接告诉用户“适合什么岗位”，而是让用户围绕一个低风险任务完成试航。
- 证据链：每个路径结论都能追溯到样例 JD、用户背景、公开参考项目和风险证据。
- 反包装：明确来源、贡献边界和不可声称内容，阻止把公开项目包装成个人成果。
- 作品集起点：输出可继续打磨的作品集草稿，而不是简历包装或能力认证。

P1-A 建议做成“真实用户最小可用版”：保留单一人工策划 TrialPackage，开放用户背景输入、6 问作答、保存、反包装检查和 Markdown 导出。

P1-B 建议补齐“可持续使用版”：历史记录、继续编辑、版本追溯、导出管理、规则维护、正式 auth 接入和更完整 QA 回归。

P2 才进入平台化：多 TrialPackage 管理、内容审核工作台、模板发布流、规则配置后台和使用数据面板。P2 也不能变成自动推荐、评分、认证或简历包装系统。

产品负责人决策更新（2026-06-07）：

- P1-A 全由真实用户输入，不保留小 C 示意、默认身份、一键填充或默认作答。
- P1-A 第一轮暂不把 LLM 作为主链路依赖，先做真实输入、保存、导出、反包装。
- P1-A 继续复用 `analysis_records`，不新增 migration；P1-B 再做专用表 PRD。
- P1-A 默认匿名化 / 弱化 JD 公司名展示，只说样例 JD 与样本趋势参考。
- OpenDocuments License 和来源核验做成数据 fixture，由数据任务维护核验日期和边界说明。

## 2. 产品定位与目标用户

### 产品定位

寻径星图是一个“AI 转岗试航工作台”。它帮助用户把模糊的转岗意愿拆成：

- 一个候选路径判断。
- 一个可执行的试航任务。
- 一组可追溯的证据。
- 一份可继续打磨的作品集起点。
- 一套面试解释和边界表达材料。

它不是：

- 能力认证工具。
- offer 概率预测工具。
- 企业筛选候选人工具。
- 简历包装工具。
- 多开源项目智能推荐器。
- 真实 RAG 检索系统。
- 复杂评分系统。

### 目标用户

P1 的首批目标用户：

- 传统工科、运营、实施、咨询、方案、产品助理等非 AI / 非 CS 背景用户。
- 想转向 AI 应用产品、行业 AI 解决方案、AI 工具落地相关岗位。
- 有行业资料理解、文档整理、调研、沟通或基础数据处理经验。
- 缺少完整 AI 项目经历，不适合直接包装为算法工程或大模型研发候选人。
- 需要一份能解释“我如何理解 AI 场景、如何定义 MVP、如何做指标和风险边界”的材料。

### 用户关键问题

- 我现在的背景应该先试航哪个 AI 相关方向？
- 我能不能拿一个公开项目作为学习和试航参考，但不把它包装成个人成果？
- 我如何把一次试航产出成作品集起点？
- 我如何在面试中解释 AI 使用、项目归属和自己的真实贡献？
- 我如何避免写出能力认证、录用承诺或项目包装表达？

## 3. 从 Demo 到产品的边界变化

### P0 Demo 边界

P0 是固定参赛 Demo：

- 固定用户：小 C。
- 固定路径：行业 AI 应用产品助理、行业 AI 解决方案助理、算法工程 / 大模型研发。
- 固定公开参考项目：OpenDocuments。
- 固定任务：工程企业知识库 AI 助手试航。
- 固定 6 问。
- 固定结果模块和 Markdown 导出。
- P1-A 当前已对象化 TrailRecord、TrialAnswer、AntiPackagingCheck 和 MarkdownSnapshot。

### P1 产品边界变化

P1 从“看小 C 的 Demo”变成“用户完成自己的试航记录”：

- 小 C 仅保留在 P0 历史文档和参赛复盘语境中，不进入 P1-A 产品流程或默认数据。
- 用户可以填写自己的背景、约束、目标和已有证据。
- 样例 JD 仍由产品策划提供，不开放自由 JD 推荐器。
- P1-A 仍只提供一个官方固定 TrialPackage，不做多包推荐。
- OpenDocuments 仍是第一期固定公开参考项目，不做实时仓库抓取或真实 RAG。
- 6 问从“小 C 固定作答”变为“用户作答”，不提供小 C 默认答案。
- 输出从参赛展示材料变为用户自己的 TrailRecord、PortfolioDraft 和导出快照。
- 反包装机制从 Demo 校验变为导出前的产品强约束。

### 不变化的 Scope Guard

P1 仍不得出现：

- 能力认证、岗位胜任认证、通过标签。
- offer 概率、录用概率、上岸概率。
- 企业筛选、企业推荐、精准内推。
- 简历生成、简历优化、简历包装、自动投递。
- 多开源项目智能推荐。
- 真实 RAG 检索、实时仓库抓取、黑箱项目分析。
- 匹配分、胜任分、综合分、排行榜。
- 暗示用户参与 OpenDocuments 官方贡献。

## 4. P1 用户流程

### 主流程

1. 用户进入 `/pathfinder`，看到产品边界、输入输出预览和反包装声明。
2. 用户选择“开始试航”，进入背景输入页。
3. 用户填写 `UserProfileInput`，包括教育 / 行业背景、经验、AI 工具使用、目标方向和限制条件。
4. 系统展示固定样例 JD 和三条路径，不做开放推荐。
5. 系统基于人工策划规则展示三条 `PathRecommendation`，默认推荐“行业 AI 应用产品助理：优先试航”。
6. 用户进入固定 `TrialPackage`，查看 OpenDocuments 来源、License、原项目能力和归属边界。
7. 用户完成固定 6 问 `TrialAnswer`。
8. 系统生成 `TrailRecord`、`PortfolioDraft`、面试追问准备和 `AntiPackagingCheck`。
9. 如果 6 问不完整、第 6 问 AI 使用说明为空或反包装检查阻断，则只能保存草稿，不能完整导出。
10. 检查通过后，用户复制或下载 Markdown，并保存 `PathfinderHistoryItem`。

### 返修流程

- 用户从结果页返回试航页修改作答。
- 修改后旧 MarkdownSnapshot 失效，状态重新计算。
- 用户重新运行反包装检查。
- 通过后生成新的导出快照。

### 历史流程

- P1-A：用户可从当前记录恢复最近一次试航。
- P1-B：用户可进入历史记录页，查看、搜索、继续编辑、复制、删除或重新导出历史 TrailRecord。

### 异常流程

- 后端不可用：允许本地草稿继续，但明确显示“尚未保存到云端”。
- 反包装阻断：显示命中规则、风险原因和建议改写。
- 缺少必需 Markdown 章节：阻断完整导出，展示缺失章节。
- legacy 记录：按 P1-A 兼容规则归一为 TrailRecord，不伪造为检查通过。

## 5. 页面结构与信息架构

### P1-A 页面结构

- `/pathfinder`
  - 产品边界。
  - 输入 / 输出预览。
  - 反包装声明。
  - 开始试航 CTA。
- `/pathfinder/background`
- 用户背景输入，不预置小 C 默认身份。
  - 职业约束输入。
  - 字段填写提示和空状态说明。
  - 样例 JD 说明。
- `/pathfinder/recommendation`
  - 三条路径并列展示。
  - 主路径优先试航。
  - 证据链矩阵。
  - 风险边界。
- `/pathfinder/trial`
  - OpenDocuments 来源面板。
  - MIT License 和公开能力。
  - 固定 6 问。
  - 每问影响模块。
  - 草稿保存状态。
- `/pathfinder/result`
  - 追溯链。
  - 完成 / 缺项 / 阻断状态。
  - 航迹表摘要。
  - 作品集草稿。
  - 指标表、流程草图、风险清单。
  - 合规表达建议。
  - 面试追问准备。
  - Markdown 预览、复制、下载。

### P1-B 新增页面

- `/pathfinder/history`
  - 历史 TrailRecord 列表。
  - 状态筛选：draft、answers_incomplete、anti_packaging_blocked、ready_to_export、exported。
  - 关键字段：标题、试航包、路径、状态、更新时间、导出状态。
- `/pathfinder/history/[recordId]`
  - 历史记录只读 / 继续编辑入口。
  - 导出快照版本和反包装检查摘要。
- `/pathfinder/settings`
  - 仅保留用户侧偏好和导出设置。
  - 不提供推荐规则、评分规则或企业筛选设置。

### P2 后台页面

P2 可以规划但不得进入 P1：

- TrialPackage 内容管理。
- 试航包审核 / 发布 / 下线。
- 反包装规则维护。
- 回归测试控制台。
- 使用数据面板。

## 6. 核心对象与 TypeScript 风格 schema

以下 schema 是 P1 产品化概念契约。P1-A 实现时应兼容现有 `p1-a.v1` 契约；P1-B 若迁移到专用表，应保持字段语义稳定。

```ts
export type PathfinderSchemaVersion = 'p1-product.v1'

export type PathId =
  | 'industry-ai-product-assistant'
  | 'industry-ai-solution-assistant'
  | 'algorithm-llm-engineer'

export type TrialQuestionId =
  | 'project_understanding'
  | 'role_connection'
  | 'scenario_gap'
  | 'application_solution'
  | 'portfolio_extension'
  | 'ai_usage_explanation'

export type PathfinderRecordStatus =
  | 'draft'
  | 'answers_incomplete'
  | 'anti_packaging_blocked'
  | 'ready_to_export'
  | 'exported'
  | 'archived'

export type CareerConstraint = {
  id: string
  type:
    | 'time_window'
    | 'location'
    | 'industry_preference'
    | 'role_boundary'
    | 'technical_gap'
    | 'evidence_gap'
  label: string
  description: string
  severity: 'info' | 'important' | 'blocking'
}

export type UserProfileInput = {
  id?: string
  displayName?: string
  educationBackground: string
  industryBackground: string[]
  projectExperience: string[]
  documentAndResearchExperience: string[]
  technicalBasics: string[]
  aiToolUsage: string[]
  targetDirections: string[]
  careerConstraints: CareerConstraint[]
  availableTimeWindow?: string
  createdAt?: string
  updatedAt?: string
}

export type EvidenceNode = {
  id: string
  sourceType:
    | 'sample_jd'
    | 'user_profile'
    | 'source_project'
    | 'trial_answer'
    | 'risk_boundary'
    | 'anti_packaging_rule'
  title: string
  summary: string
  sourceRef?: string
  supports: string[]
  riskNotes?: string[]
}

export type PathRecommendation = {
  id: PathId
  title: string
  verdict: 'priority_trial' | 'explore' | 'not_recommended_short_term'
  statusLabel: '优先试航' | '适合探索' | '短期不建议'
  summary: string
  evidenceNodes: EvidenceNode[]
  nextTrial: {
    trialPackageId: string
    title: string
    rationale: string
  }
  forbiddenInterpretations: string[]
}

export type TrialPackage = {
  id: string
  version: string
  title: string
  status: 'active' | 'retired'
  targetUserSegment: string
  sourceProject: {
    name: 'OpenDocuments'
    url: string
    license: 'MIT'
    role: 'reference_only'
    originalCapabilities: string[]
  }
  sampleJdNotice: string
  pathRecommendations: PathRecommendation[]
  task: {
    id: string
    title: string
    scenario: string
    outputAssets: string[]
  }
  fixedQuestions: Array<{
    id: TrialQuestionId
    title: string
    prompt: string
    required: boolean
    impactModuleIds: string[]
  }>
  forbiddenClaims: string[]
  disclaimer: string
}

export type TrialAnswer = {
  id: TrialQuestionId
  answer: string
  status: 'empty' | 'draft' | 'complete'
  questionSnapshot: string
  impactModuleIds: string[]
  llmPolishState?: 'not_used' | 'drafted' | 'accepted_after_edit'
  updatedAt?: string
}

export type AntiPackagingFinding = {
  ruleId: string
  riskLevel: 'info' | 'warning' | 'blocking'
  matchedText: string
  riskReason: string
  suggestedRewrite?: string
  blockingPolicy: 'none' | 'warn_only' | 'block_full_markdown_export'
  context: 'positive_claim' | 'negated_context' | 'allowed_context'
}

export type AntiPackagingCheck = {
  id?: string
  rulesVersion: string
  status: 'not_run' | 'passed' | 'warning' | 'blocked'
  exportAllowed: boolean
  checkedAt?: string
  findings: AntiPackagingFinding[]
  requiredSections: Record<
    | 'candidate_background'
    | 'path_conclusion'
    | 'sample_jd_note'
    | 'opendocuments_source_license'
    | 'opendocuments_original_capabilities'
    | 'user_trial_contribution'
    | 'forbidden_claims'
    | 'six_question_answers'
    | 'disclaimer',
    boolean
  >
  blockingCount: number
  warningCount: number
}

export type PortfolioDraft = {
  id?: string
  title: string
  targetPathId: PathId
  problemContext: string
  userScenario: string
  solutionOutline: string
  mvpScope: string[]
  metrics: Array<{
    dimension: string
    metric: string
    acceptanceLens: string
  }>
  risks: Array<{
    risk: string
    manifestation: string
    mitigation: string
  }>
  sourceProjectReference: {
    name: 'OpenDocuments'
    url: string
    license: 'MIT'
    role: 'reference_only'
    originalCapabilities: string[]
  }
  userTrialContribution: string[]
  notClaimed: string[]
  disclaimer: string
  updatedAt?: string
}

export type TrailRecord = {
  schemaVersion: PathfinderSchemaVersion
  recordId?: string
  ownerUserId?: string
  title: string
  trialPackageId: string
  trialPackageVersion: string
  status: PathfinderRecordStatus
  userProfileSnapshot: UserProfileInput
  selectedPathId: PathId
  pathRecommendationSnapshot: PathRecommendation
  evidenceNodes: EvidenceNode[]
  trialAnswers: TrialAnswer[]
  antiPackagingCheck: AntiPackagingCheck
  portfolioDraft?: PortfolioDraft
  interviewPrep?: {
    items: Array<{
      question: string
      answerPoints: string[]
      evidenceNodeIds: string[]
      boundaryReminder: string
      forbiddenClaims: string[]
    }>
    updatedAt?: string
  }
  markdownSnapshot?: {
    templateSource: 'frontend'
    templateVersion: string
    exportScope: 'draft' | 'full'
    content: string
    contentHash?: string
    createdAt: string
  }
  createdAt?: string
  updatedAt?: string
}

export type PathfinderHistoryItem = {
  recordId: string
  title: string
  trialPackageId: string
  trialPackageVersion: string
  selectedPathTitle: string
  status: PathfinderRecordStatus
  exportScope?: 'draft' | 'full'
  antiPackagingStatus: AntiPackagingCheck['status']
  updatedAt: string
  createdAt: string
}
```

## 7. LLM 接入边界

P1 可以接入 LLM，但必须克制。LLM 只能作为“写作、整理、追问辅助”，不能作为“认证、预测、筛选、推荐评分或真实检索”。

### 允许的 LLM 能力

- 用户背景摘要：把 `UserProfileInput` 摘成用户可确认的背景摘要。
- 6 问作答润色：基于用户原文做结构化、降噪和边界表达，不替用户虚构经历。
- 面试追问生成：围绕 TrialPackage、TrialAnswer、PortfolioDraft 和边界提醒生成追问。
- 作品集草稿结构化：把用户 6 问作答整理成作品集一页纸草稿。
- 反包装表达检查：识别正向越界表达并给出保守改写建议。

### 禁止的 LLM 能力

- 能力认证或岗位胜任认证。
- offer 概率、录用概率、上岸概率预测。
- 企业筛选候选人或企业匹配。
- 简历包装、简历自动优化、自动投递。
- 多开源项目黑箱推荐。
- 真实 RAG 检索、实时仓库抓取、自动分析公开项目。
- 复杂评分系统、匹配分、胜任分、综合分或排行榜。
- 暗示小 C 或真实用户参与 OpenDocuments 官方贡献。

### LLM 输出约束

- LLM 输出必须标记为草稿。
- 用户必须能编辑和确认。
- LLM 输出进入导出前必须经过 `AntiPackagingCheck`。
- LLM 不得直接改变 `PathRecommendation.verdict`。
- LLM 不得生成新的 TrialPackage 或新路径。
- LLM 不得把 OpenDocuments 原项目能力改写成用户贡献。

## 8. 历史记录、编辑和导出机制

### 历史记录

P1-A：

- 保存当前用户最近一次 TrailRecord。
- 支持刷新恢复。
- 支持后端失败时本地草稿 fallback。

P1-B：

- 新增历史列表 `PathfinderHistoryItem[]`。
- 支持按状态、更新时间、导出状态筛选。
- 支持继续编辑 draft 或 blocked 记录。
- 支持复制已导出记录生成新草稿。
- 支持删除记录。
- 支持 legacy 记录归一展示。

### 编辑机制

- 用户背景、职业约束、6 问作答、作品集草稿可编辑。
- TrialPackage、样例 JD、OpenDocuments 来源、License、固定问题和路径状态对普通用户只读。
- 用户修改作答或作品集草稿后，旧 full MarkdownSnapshot 不再代表最新版本。
- 修改后必须重新计算状态和反包装检查。

### 导出机制

- Markdown 单一模板源继续归属前端。
- 后端只保存前端传入的 MarkdownSnapshot，不维护第二套模板。
- 完整导出必须满足：
  - 固定 6 问全部完成。
  - `ai_usage_explanation` 非空。
  - `AntiPackagingCheck.exportAllowed = true`。
  - 必需章节全部存在。
- 阻断状态只允许保存 draft snapshot。
- P1-B 可增加导出历史，但不增加简历格式导出。

## 9. 反包装机制产品化

反包装机制是寻径星图的核心产品能力，不是 QA 附属功能。

### 反包装检查对象

检查范围：

- 用户背景摘要。
- 6 问作答。
- 作品集草稿。
- 面试追问准备。
- Markdown 预览内容。

### 阻断规则

以下正向表达必须阻断完整导出：

- 声称能力认证、岗位胜任认证或通过评估。
- 表达 offer 概率、录用概率或求职结果承诺。
- 声称系统可筛选候选人或推荐企业。
- 声称系统可生成、优化或包装简历。
- 声称当前版本进行了真实 RAG 检索或实时仓库分析。
- 声称多开源项目智能推荐。
- 出现匹配分、胜任分、综合分或排行榜。
- 暗示用户开发了 OpenDocuments 或参与官方贡献。
- 暗示 AI 可替代合同、规范、施工方案等专业复核。

### 允许语境

- “不做能力认证”这种否定语境不应阻断。
- “不可声称参与 OpenDocuments 官方贡献”这种边界说明不应阻断。
- 否定语境命中应记录为 `allowed_context` 或 `negated_context`，供 QA 复核。

### 产品呈现

- 结果页首屏展示反包装检查摘要。
- 阻断时展示命中表达、风险原因、建议改写和影响导出范围。
- 不使用分数或等级表达反包装结果。
- 用“完整可导出 / 缺项 / 阻断”表达状态。

## 10. P1-A / P1-B / P2 边界

### P1-A：真实用户最小可用版

进入 P1-A：

- 用户背景输入 `UserProfileInput`。
- 职业约束 `CareerConstraint`。
- 固定 TrialPackage 只读加载。
- 三条固定路径和证据链展示。
- 固定 6 问用户作答。
- 用户作答草稿保存。
- TrailRecord 保存、读取、删除。
- PortfolioDraft 生成和编辑。
- 面试追问准备。
- AntiPackagingCheck。
- Markdown 预览、复制、下载。
- 本地 fallback。

不进入 P1-A：

- 多 TrialPackage 选择。
- 自由 JD 粘贴推荐。
- 专用表迁移。
- 正式内容审核后台。
- 复杂历史筛选。
- LLM 改变路径结论。

### P1-B：可持续使用版

进入 P1-B：

- 正式 auth 替换 `X-User-Id`。
- 历史记录页和详情页。
- 继续编辑、复制为新草稿、删除。
- 导出快照历史。
- 更完整的记录生命周期。
- P1-B 专用表或迁移方案，前提是 DATA-001 和 PM merge review 通过。
- AntiPackagingCheck 规则版本管理。
- 后端规则校验与前端规则一致性回归。
- 用户侧基础设置。

不进入 P1-B：

- 多试航包推荐。
- 多开源项目智能推荐。
- 真实 RAG。
- 企业端能力。
- 简历包装导出。
- 评分系统。

### P2：平台化

进入 P2：

- 多 TrialPackage 管理。
- 试航包模板库。
- 内容审核工作台。
- 规则配置后台。
- TrialPackage 发布 / 下线流。
- 回归测试控制台。
- 使用数据分析面板。
- 外部内容引用规范管理。

P2 仍禁止：

- 自动岗位推荐排序。
- 企业筛选候选人。
- 求职结果预测。
- 能力认证。
- 简历包装。
- 黑箱开源项目推荐。

## 11. 前端任务拆解

### P1-A 前端任务

- 新增用户背景输入页状态，支持字段填写提示，但不提供小 C 示例填充。
- 将 `CandidateProfile` 扩展为 `UserProfileInput` 展示层。
- 保持固定 TrialPackage 加载，不开放多包选择。
- 推荐页把 `PathRecommendation` 和 `EvidenceNode` 显式结构化。
- 试航页展示固定 6 问、影响模块和作答状态。
- 结果页展示 TrailRecord、PortfolioDraft、InterviewPrep、AntiPackagingCheck。
- 完整导出前运行反包装检查。
- Markdown 预览和下载继续使用前端单一模板源。
- 后端失败时保留本地草稿，并明确同步状态。

### P1-B 前端任务

- 新增历史记录列表页。
- 新增历史记录详情页。
- 支持继续编辑、复制为新草稿、删除。
- 展示导出快照状态和版本。
- 展示规则版本、检查时间和阻断详情。
- 完善移动端历史列表和结果页响应式。

### 前端不得做

- 新路径选择器。
- 企业筛选入口。
- 多项目推荐入口。
- 分数、概率、认证展示组件。
- 简历生成器或简历优化入口。
- 真实 RAG 检索入口。

## 12. 后端任务拆解

### P1-A 后端任务

- 在现有 Pathfinder API 上兼容 `UserProfileInput`。
- 保存 TrailRecord 时保留 trialPackageId、version、selectedPath、userProfileSnapshot。
- 校验固定 6 问 ID、重复 ID 和必填状态。
- 保存 PortfolioDraft、InterviewPrep、AntiPackagingCheck 和 MarkdownSnapshot。
- 后端继续不生成 Markdown。
- 后端拒绝阻断状态下的 full MarkdownSnapshot。
- 后端响应不得包含评分、概率、认证、企业推荐、简历包装字段。
- 继续支持 P0 legacy 读取和归一。

### P1-B 后端任务

- 接入正式 auth，替换 Demo `X-User-Id` 依赖。
- 提供历史列表 API。
- 提供继续编辑、复制、删除和导出快照查询。
- 评估是否从 `analysis_records` 迁移到专用表。
- 若迁移，提供 migration、回填、回滚和 legacy 读取策略。
- 管理 AntiPackagingCheck 规则版本。
- 为 QA 提供稳定测试 fixtures。

### 后端不得做

- 推荐评分 API。
- offer 概率 API。
- 企业筛选 API。
- 简历包装 API。
- 真实 RAG 检索 API。
- 后端 Markdown 第二模板源。

## 13. 数据任务拆解

### P1-A 数据任务

- 固化第一期 TrialPackage：`p1a-opendocuments-engineering-kb@1.0.0`。
- 明确样例 JD 来源说明和不可代表真实岗位判断。
- 维护 OpenDocuments 来源 URL、MIT License 和公开能力列表。
- 维护固定 6 问、影响模块和必需导出章节。
- 维护反包装规则集初版。
- 不提供小 C 示例数据作为 P1-A 默认身份；参赛回放如需小 C，应作为独立演示脚本而非产品数据。

### P1-B 数据任务

- 设计 TrailRecord 历史数据生命周期。
- 定义导出快照保留策略。
- 定义规则版本兼容策略。
- 建立 Scope Guard 文案词表。
- 建立 forbidden / allowed context 测试语料。
- 评估专用表字段、索引、迁移和清理方案。

### P2 数据任务

- 多 TrialPackage 内容规范。
- 外部来源、License、版本和引用规范。
- 内容审核状态。
- 规则配置和回归测试集。
- 使用过程指标：完成率、保存率、导出率、阻断率。

数据任务不得包含：

- 求职成功率。
- 录用预测标签。
- 企业筛选结论。
- 候选人评分。
- 简历包装效果指标。

## 14. QA 验收标准

### Scope Guard

- 页面、Mock 数据、API 响应和 Markdown 不出现能力认证、offer 概率、企业筛选、简历包装、多项目推荐、真实 RAG、复杂评分。
- OpenDocuments 永远是公开参考项目，不是用户贡献。
- 样例 JD 永远是样例，不代表具体公司岗位或录用判断。

### 用户流程

- 新用户可填写背景并完成一次试航。
- 不提供小 C 示例填充、默认身份或默认作答。
- 6 问缺一不可完整导出。
- 第 6 问 AI 使用说明为空必须阻断完整导出。
- 修改作答后状态重新计算。
- 后端不可用时本地草稿可继续。

### 历史和导出

- P1-A 可恢复当前记录。
- P1-B 历史列表字段正确。
- full MarkdownSnapshot 必须包含必需章节。
- 阻断状态不得保存 full snapshot。
- 导出内容与预览一致。

### 反包装

- 正向“我开发了 OpenDocuments”阻断。
- 正向能力认证表达阻断。
- 正向 offer 概率表达阻断。
- 正向简历包装表达阻断。
- 禁用词出现在否定语境不误阻断。
- 阻断详情包含规则、风险原因和建议改写。

### API

- 记录按本人隔离。
- 固定 6 问 ID 强校验。
- API 不返回评分、概率、认证、企业推荐或简历包装字段。
- P0 legacy 记录可读取，不伪造为完整检查通过。

## 15. 1 周内优先级

建议 1 周内只做 P1-A 产品化闭环，不启动 P2。

优先级顺序：

1. PM merge review：合并本 PRD 与 DATA-001，确认 P1-A / P1-B / P2 边界。
2. 用户背景输入最小化：支持真实用户输入，提供字段填写提示，不保留小 C 默认示例。
3. TrailRecord 契约微调：纳入 `UserProfileInput`、`CareerConstraint` 和证据节点。
4. 结果页反包装摘要前置：让用户在导出前看到检查结论。
5. Markdown 必需章节校验：确保真实用户导出仍有来源、License、贡献边界和免责声明。
6. 后端保存兼容：保持复用 `analysis_records`，不新增 migration，先验证产品化字段能保存。
7. QA Scope Guard：补充真实用户输入、LLM 润色草稿和反包装阻断用例。

本周不建议做：

- 多 TrialPackage。
- 历史记录复杂筛选。
- 专用表迁移。
- LLM 改变路径结论。
- 任何推荐、评分、认证或简历能力。

## 16. 暂缓事项

以下事项暂缓到 P1-B 或 P2，并且必须经过 PM merge review：

- 正式 auth 和账户设置：P1-B。
- 历史记录完整列表、详情、复制为新草稿：P1-B。
- 专用表、migration 和数据回填：P1-B，依赖 DATA-001。
- AntiPackagingCheck 后台规则维护：P2。
- 多 TrialPackage 管理：P2。
- 试航包审核和发布流：P2。
- 使用数据面板：P2，只允许过程数据。
- 作品集展示空间：P2，不得做成简历包装系统。
- 面试准备库：P2，不得做成岗位胜任认证话术库。
- API / SDK：P2，只能暴露试航包加载、记录保存、导出和反包装检查能力。

长期禁止事项：

- 能力认证。
- offer 概率预测。
- 企业筛选候选人。
- 简历包装。
- 多开源项目黑箱推荐。
- 真实 RAG 检索。
- 复杂评分系统。
- 暗示用户参与 OpenDocuments 官方贡献。
