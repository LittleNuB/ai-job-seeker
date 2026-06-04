# 寻径星图 P1-A JSON 数据契约与验收标准

版本：P1-A / JSON Contract v1

更新时间：2026-06-04

适用对象：前端、后端、QA、产品

关联基线：

- `docs/pathfinder-p0/scope-lock-prd.md`
- `docs/pathfinder-p0/content-assets.md`
- `docs/pathfinder-p0/ux-flow.md`
- `docs/pathfinder-p0/technical-review.md`
- `docs/pathfinder-p0/qa-demo-plan.md`
- `docs/pathfinder-p0/handoff-status.md`
- `docs/pathfinder-p0/p1-product-roadmap.md`
- `docs/pathfinder-p0/p1-ui-design-brief.md`
- `docs/pathfinder-p0/p1-backend-data-model-brief.md`
- `docs/pathfinder-p0/p1-planning-audit.md`
- `docs/pathfinder-p0/p0-polish-frontend-implementation.md`
- `docs/pathfinder-p0/p0-polish-qa-report.md`

## 1. 文档目的

本文档固化 P1-A 阶段的 JSON 数据契约、状态流转和验收标准，作为前端、后端、QA 的共同交付基准。

P1-A 的目标不是扩展推荐能力，而是把 P0 已通过的固定试航链路整理为可保存、可读取、可检查、可导出追溯的结构化记录。

P1-A 继续采用最小后端路线：

- 继续复用 `analysis_records`。
- 不新增专用表。
- 不新增 Alembic migration。
- 后端不生成 Markdown。
- 后端只保存结构化 JSON 与前端传入的 `markdownSnapshot`。

## 2. P1-A 对象边界

P1-A 只对象化以下内容：

| 对象 | 职责 | P1-A 边界 |
|---|---|---|
| `TrialPackage` | 人工策划的固定试航包，封装 P0 小 C / OpenDocuments 试航配置 | 只读；只保留最小版本字段；不做完整发布流 |
| `TrailRecord` | 用户一次试航过程的主记录 | 保存答案、状态、检查结果、草稿、追问和 Markdown 快照 |
| `TrialAnswer` | 固定 6 问中的单题作答 | 允许逐题保存触发，但后端仍保存整包 answers JSON |
| `AntiPackagingCheck` | 反包装检查结果 | 阻断完整 Markdown 导出；阻断后仍允许保存草稿 |
| `PortfolioDraft` | 作品集草稿 | 不是简历生成器；只能来自 `TrialPackage` 和 `TrailRecord` |
| `InterviewPrep` | 面试追问准备 | 只解释试航过程、证据和边界，不做岗位胜任认证 |
| `MarkdownSnapshot` | 前端单一模板源生成的 Markdown 快照 | 后端只保存，不重新生成，不维护第二套模板 |

对象关系：

```text
TrialPackage
  -> TrailRecord
      -> TrialAnswer[]
      -> AntiPackagingCheck
      -> PortfolioDraft?
      -> InterviewPrep?
      -> MarkdownSnapshot?
```

P1-A 明确不做：

- 多 TrialPackage 推荐
- TrialPackage 发布流
- 专用数据表
- Alembic migration
- 后端 Markdown 生成
- 后端推荐评分
- 真实 RAG 检索
- 能力认证
- offer 概率预测
- 企业筛选候选人
- 简历包装

同时继续禁止：

- 多开源项目智能推荐
- 自由 JD 推荐器
- 企业推荐或精准内推
- 自动投递
- 复杂评分系统
- 匹配分、胜任分、综合分或排行榜
- OpenDocuments 官方贡献暗示
- 小 C 参与 OpenDocuments 原仓库开发的暗示

## 3. TypeScript 风格 Schema

以下类型是 P1-A JSON contract 的可执行参考。字段命名采用前端友好的 camelCase；落到 `analysis_records.input_text` 和 `analysis_records.result` 时仍以 JSON 字符串保存。

```ts
export type TrialQuestionId =
  | 'project_understanding'
  | 'role_connection'
  | 'scenario_gap'
  | 'application_solution'
  | 'portfolio_extension'
  | 'ai_usage_explanation'

export const REQUIRED_TRIAL_QUESTION_IDS: readonly TrialQuestionId[] = [
  'project_understanding',
  'role_connection',
  'scenario_gap',
  'application_solution',
  'portfolio_extension',
  'ai_usage_explanation',
] as const

export type PathfinderRecordStatus =
  | 'draft'
  | 'answers_incomplete'
  | 'anti_packaging_blocked'
  | 'ready_to_export'
  | 'exported'

export type TrialAnswerStatus = 'empty' | 'draft' | 'complete'

export type TrialPackage = {
  id: string
  version: string
  title: string
  targetUser: string
  sourceProject: {
    name: string
    url: string
    license: string
    role: 'reference_only'
  }
  task: {
    id: string
    title: string
  }
  questionIds: TrialQuestionId[]
}

export type TrialAnswer = {
  id: TrialQuestionId
  answer: string
  status: TrialAnswerStatus
  questionSnapshot?: string
  impactModuleIds?: string[]
  updatedAt?: string
}

export type AntiPackagingRiskLevel = 'info' | 'warning' | 'blocking'

export type AntiPackagingBlockingPolicy =
  | 'none'
  | 'warn_only'
  | 'block_full_markdown_export'

export type AntiPackagingFinding = {
  ruleId: string
  riskLevel: AntiPackagingRiskLevel
  matchedText: string
  riskReason: string
  suggestedRewrite?: string
  blockingPolicy: AntiPackagingBlockingPolicy
  context: 'positive_claim' | 'negated_context' | 'allowed_context'
}

export type RequiredMarkdownSection =
  | 'candidate_background'
  | 'path_conclusion'
  | 'sample_jd_note'
  | 'opendocuments_source_license'
  | 'opendocuments_original_capabilities'
  | 'xiaoc_trial_contribution'
  | 'forbidden_claims'
  | 'six_question_answers'
  | 'disclaimer'

export type AntiPackagingCheck = {
  rulesVersion: string
  status: 'not_run' | 'passed' | 'warning' | 'blocked'
  exportAllowed: boolean
  checkedAt?: string
  findings: AntiPackagingFinding[]
  requiredMarkdownSections: Record<RequiredMarkdownSection, boolean>
  blockingCount: number
  warningCount: number
}

export type PortfolioDraft = {
  title: string
  targetPathId: string
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
  opendocumentsReference: {
    name: 'OpenDocuments'
    url: string
    license: string
    role: 'reference_only'
    originalCapabilities: string[]
  }
  xiaocTrialContribution: string[]
  notClaimed: string[]
  disclaimer: string
  updatedAt?: string
}

export type InterviewPrep = {
  items: Array<{
    question: string
    answerPoints: string[]
    evidenceSources: Array<{
      sourceType:
        | 'trial_package'
        | 'trial_answer'
        | 'portfolio_draft'
        | 'opendocuments_reference'
      sourceId: string
      note: string
    }>
    boundaryReminder: string
    forbiddenClaims: string[]
  }>
  updatedAt?: string
}

export type MarkdownSnapshot = {
  templateSource: 'frontend'
  templateVersion: string
  exportScope: 'draft' | 'full'
  content: string
  contentHash?: string
  createdAt: string
}

export type TrailRecord = {
  schemaVersion: 'p1-a.v1'
  recordId?: string
  trialPackageId: string
  trialPackageVersion: string
  status: PathfinderRecordStatus
  userProfileSnapshot: unknown
  selectedPathId: string
  trialAnswers: TrialAnswer[]
  antiPackagingCheck: AntiPackagingCheck
  portfolioDraft?: PortfolioDraft
  interviewPrep?: InterviewPrep
  markdownSnapshot?: MarkdownSnapshot
  createdAt?: string
  updatedAt?: string
}
```

### 3.1 固定 P1-A TrialPackage

P1-A 当前只承载 P0 Demo 封装后的固定试航包。

```ts
export const P1A_TRIAL_PACKAGE: TrialPackage = {
  id: 'p0-xiaoc-opendocuments',
  version: '1.0.0',
  title: '小 C 的 OpenDocuments 工程企业知识库 AI 助手试航',
  targetUser: '小 C',
  sourceProject: {
    name: 'OpenDocuments',
    url: 'https://github.com/joungminsung/OpenDocuments',
    license: 'MIT',
    role: 'reference_only',
  },
  task: {
    id: 'engineering-enterprise-knowledge-base-ai-assistant',
    title: '工程企业知识库 AI 助手试航',
  },
  questionIds: [
    'project_understanding',
    'role_connection',
    'scenario_gap',
    'application_solution',
    'portfolio_extension',
    'ai_usage_explanation',
  ],
}
```

P1-A 最小版本策略：

- `id` 标识试航包身份。
- `version` 标识内容版本。
- `TrailRecord` 必须保存 `trialPackageId + trialPackageVersion`。
- P1-A 不包含 `draft / published / archived` 发布流。
- 完整发布、审核、下线和多包管理放到 P2。

### 3.2 固定 6 问完整性规则

P1-A 的完整作答必须满足：

- `trialAnswers` 包含且只包含 6 个固定 `TrialQuestionId`。
- 每个问题最多出现一次。
- 每个 `answer.trim().length > 0`。
- `ai_usage_explanation` 必填，缺失时必须阻断完整 Markdown 导出。
- 前端允许逐题触发保存，但每次请求必须提交当前整包 `trialAnswers` JSON，后端执行整包替换保存。

P0 legacy 记录若使用 `Record<TrialQuestionId, string>` 形式，P1-A 读取层必须转换为 `TrialAnswer[]`。

## 4. analysis_records 存储契约

P1-A 继续复用 `analysis_records`，不新增表，不新增 migration。

| `analysis_records` 字段 | P1-A 用法 |
|---|---|
| `id` | 对应 `TrailRecord.recordId` |
| `user_id` | 记录所属用户 |
| `type` | 固定为 `pathfinder` |
| `input_text` | P1-A 输入 envelope 的 JSON 字符串 |
| `input_file_url` | 固定为 `null` |
| `result` | P1-A 结果 envelope 的 JSON 字符串 |
| `match_score` | 固定为 `null` |
| `created_at` | 对应 `TrailRecord.createdAt` |

输入 envelope：

```ts
export type AnalysisRecordInputTextP1A = {
  schemaVersion: 'p1-a.v1'
  trialPackageId: string
  trialPackageVersion: string
  selectedPathId: string
  userProfileSnapshot: unknown
  trialPackageSnapshot?: TrialPackage
}
```

结果 envelope：

```ts
export type AnalysisRecordResultP1A = {
  schemaVersion: 'p1-a.v1'
  status: PathfinderRecordStatus
  trialAnswers: TrialAnswer[]
  antiPackagingCheck: AntiPackagingCheck
  portfolioDraft?: PortfolioDraft
  interviewPrep?: InterviewPrep
  markdownSnapshot?: MarkdownSnapshot
  updatedAt?: string
}
```

读取时，后端将 `input_text` 和 `result` 合并为 `TrailRecord` 返回给前端。

写入约束：

- `analysis_records.type` 必须为 `pathfinder`。
- `analysis_records.input_file_url` 必须为 `null`。
- `analysis_records.match_score` 必须为 `null`。
- `input_text` 和 `result` 必须是可解析 JSON。
- 后端不得把任何评分、概率、认证、企业推荐或简历包装字段写入 JSON。

## 5. P0 legacy 兼容

P1-A 必须全兼容 P0 legacy 记录。兼容期结束标准不在 P1-A 定义，等 P1-B 专用表上线并完成迁移、导出、删除和回归测试后再定。

P1-A 读取 legacy 记录时：

- `type = "pathfinder"` 的旧记录必须可读取。
- 若 `input_text` 或 `result` 缺少 `schemaVersion: 'p1-a.v1'`，按 P0 legacy 解析。
- P0 `trialAnswers: Record<TrialQuestionId, string>` 必须转换为 `TrialAnswer[]`。
- P0 `markdownSnapshot: string | null` 必须转换为 `MarkdownSnapshot | undefined`。
- 缺少 `AntiPackagingCheck` 时，返回最小检查对象，不得伪造为已通过完整检查。

legacy 状态推导建议：

| legacy 内容 | P1-A 返回状态 |
|---|---|
| 没有任何作答 | `draft` |
| 有部分作答但 6 问不完整 | `answers_incomplete` |
| 6 问完整，但无完整 Markdown 快照 | `ready_to_export` |
| 6 问完整，且存在完整 Markdown 快照 | `exported` |
| 命中可识别阻断风险 | `anti_packaging_blocked` |

legacy 兼容验收：

- 旧 P0 记录能通过 `GET /api/pathfinder/records/{record_id}` 返回。
- 返回结构归一为 `TrailRecord`。
- 旧记录的 `match_score` 仍不参与响应。
- 旧记录不要求回填数据库，除非后续 P1-B migration 明确执行。

## 6. 状态流转

P1-A 使用以下状态：

| 状态 | 含义 | 可保存草稿 | 可保存完整 Markdown 快照 | 可完整导出 |
|---|---|---:|---:|---:|
| `draft` | 记录已创建，尚未形成有效作答包 | 是 | 否 | 否 |
| `answers_incomplete` | 已有作答，但固定 6 问不完整或第 6 问为空 | 是 | 否 | 否 |
| `anti_packaging_blocked` | 6 问可完整，但反包装检查命中阻断项 | 是 | 否，只可保存 `exportScope = "draft"` | 否 |
| `ready_to_export` | 6 问完整，反包装检查无阻断，结果资产可导出 | 是 | 是 | 是 |
| `exported` | 已保存前端完整 Markdown 快照，并完成一次完整导出动作 | 是 | 是 | 是 |

允许状态流：

```text
draft
  -> answers_incomplete
  -> anti_packaging_blocked
  -> ready_to_export
  -> exported

draft
  -> ready_to_export

answers_incomplete
  -> ready_to_export

ready_to_export
  -> anti_packaging_blocked

exported
  -> answers_incomplete
  -> anti_packaging_blocked
  -> ready_to_export
```

状态计算规则：

1. 新建记录默认 `draft`。
2. 保存整包 `trialAnswers` 后，若 6 问不完整，状态为 `answers_incomplete`。
3. 6 问完整但 `antiPackagingCheck.status = "blocked"` 或 `exportAllowed = false`，状态为 `anti_packaging_blocked`。
4. 6 问完整且反包装检查无阻断，未完成完整导出前为 `ready_to_export`。
5. 前端传入 `MarkdownSnapshot.exportScope = "full"` 且状态满足完整导出条件后，可进入 `exported`。
6. `exported` 后只要答案、作品集草稿、面试准备或反包装检查结果发生变化，必须重新计算状态；旧 `markdownSnapshot` 不得继续代表最新完整导出。

阻断规则：

- `anti_packaging_blocked` 允许保存草稿。
- `anti_packaging_blocked` 禁止完整 Markdown 导出。
- 阻断状态下如需保存 Markdown，只能保存 `MarkdownSnapshot.exportScope = "draft"`。
- 后端不得接受阻断状态下的 `exportScope = "full"`。

## 7. API 契约

P1-A 可继续使用 P0 已实现的记录 API；即便前端内部称为 `TrailRecord`，URL 不强制改为 `/trail-records`。

认证临时约定：P1-A 后端继续使用请求头 `X-User-Id` 作为临时用户依赖，并以 `user_id + id + type = "pathfinder"` 做记录隔离。该方案只用于当前联调与 Demo 阶段，后续进入正式用户体系时必须替换为正式 auth 依赖。

### 7.1 创建记录

```text
POST /api/pathfinder/records
```

请求体：

```ts
type CreatePathfinderRecordRequestP1A = {
  schemaVersion: 'p1-a.v1'
  trialPackageId: string
  trialPackageVersion: string
  selectedPathId: string
  userProfileSnapshot: unknown
}
```

响应体：

```ts
type PathfinderRecordResponseP1A = TrailRecord
```

验收：

- 创建后状态为 `draft`。
- `type = "pathfinder"`。
- `input_file_url = null`。
- `match_score = null`。
- P1-A 当前固定包下，`selectedPathId` 必须为 `industry-ai-product-assistant`。

### 7.2 读取记录

```text
GET /api/pathfinder/records/{record_id}
```

响应体：

```ts
type PathfinderRecordResponseP1A = TrailRecord
```

验收：

- 只允许读取本人 `user_id + id + type = "pathfinder"` 的记录。
- 跨用户访问返回 404 或 403。
- P0 legacy 记录必须归一为 `TrailRecord`。
- 响应不得包含评分、概率、企业推荐、简历包装建议或能力认证字段。

### 7.3 保存作答

```text
PATCH /api/pathfinder/records/{record_id}/trial-answers
```

P1-A 允许前端逐题触发保存，但请求体仍提交当前整包 `trialAnswers` JSON。后端按整包替换保存，不做单题字段级 patch。

请求体：

```ts
type UpdateTrialAnswersRequestP1A = {
  schemaVersion: 'p1-a.v1'
  changedQuestionId?: TrialQuestionId
  trialAnswers: TrialAnswer[]
}
```

响应体：

```ts
type UpdateTrialAnswersResponseP1A = {
  recordId: string
  status: PathfinderRecordStatus
  trialAnswers: TrialAnswer[]
  updatedAt: string
}
```

验收：

- 只接受 6 个固定 question id。
- 未作答问题应以 `status = "empty"` 或空字符串保留在整包中。
- 未完成 6 问时状态为 `answers_incomplete`。
- 保存作答不会生成 Markdown。
- 保存作答不会返回推荐评分。

### 7.4 保存结果、检查和 Markdown 快照

```text
PUT /api/pathfinder/records/{record_id}/result
```

请求体：

```ts
type SavePathfinderResultRequestP1A = {
  schemaVersion: 'p1-a.v1'
  status: PathfinderRecordStatus
  antiPackagingCheck: AntiPackagingCheck
  portfolioDraft?: PortfolioDraft
  interviewPrep?: InterviewPrep
  markdownSnapshot?: MarkdownSnapshot
}
```

响应体：

```ts
type SavePathfinderResultResponseP1A = {
  recordId: string
  status: PathfinderRecordStatus
  markdownSnapshotSaved: boolean
  updatedAt: string
}
```

验收：

- 后端保存前端传入的 `markdownSnapshot`，不重新生成 Markdown。
- `MarkdownSnapshot.templateSource` 必须为 `frontend`。
- `antiPackagingCheck.exportAllowed = false` 时，拒绝 `markdownSnapshot.exportScope = "full"`。
- 6 问不完整时，拒绝完整 Markdown 快照。
- 保存草稿、阻断结果和 draft snapshot 是允许的。

### 7.5 删除记录

```text
DELETE /api/pathfinder/records/{record_id}
```

验收：

- 只能删除本人 `user_id + id + type = "pathfinder"` 的记录。
- 不影响其他 `analysis_records.type` 的历史记录。
- P1-A 无专用子表，因此删除范围仍限于当前 `analysis_records` 行。

### 7.6 P1-A 不新增的 API

P1-A 不新增：

- `GET /api/pathfinder/records/{id}/export/markdown`
- `POST /api/pathfinder/recommend`
- `POST /api/pathfinder/rag-search`
- 企业筛选或企业推荐 API
- 简历生成或简历优化 API
- 能力认证、offer 概率或评分 API

## 8. Markdown 单一模板源

P1-A 继续采用 P0 决策：

- Markdown 单一模板源归属前端。
- 前端负责即时预览、复制、下载。
- 后端只保存 `markdownSnapshot`。
- 后端不维护另一套 Markdown 模板。
- 后端不根据 JSON 重新生成 Markdown。

`MarkdownSnapshot` 验收：

- `templateSource = "frontend"`。
- 必须记录 `templateVersion`。
- 完整导出时 `exportScope = "full"`。
- 草稿或阻断状态下只允许 `exportScope = "draft"`。
- 完整快照必须包含 Markdown 九项：
  - 候选人背景
  - 路径结论
  - 样例 JD 说明
  - OpenDocuments 来源与 License
  - OpenDocuments 原项目能力
  - 小 C 试航贡献
  - 不可声称内容
  - 固定 6 问作答
  - 免责声明

## 9. AntiPackagingCheck 契约

P1-A 的 `AntiPackagingCheck` 可以由前端规则、后端规则或双方联调产生，但保存后的语义必须一致。

阻断项包括：

- 正向声称能力认证、岗位胜任认证。
- 正向表达 offer 概率、录用概率、上岸概率或保证就业。
- 暗示企业可筛选候选人或系统推荐企业。
- 暗示简历包装、简历自动优化或自动投递。
- 暗示多开源项目智能推荐。
- 暗示当前功能执行真实 RAG 检索、实时仓库抓取或自动分析。
- 出现匹配分、胜任分、综合分、排行榜。
- 暗示小 C 参与 OpenDocuments 官方开发、官方贡献或 issue。
- 暗示 AI 可替代合同、规范、施工方案等专业复核。

允许语境：

- 禁用词出现在“不做”“不可声称”“不代表”“免责声明”等否定语境中，不应自动阻断。
- 否定语境命中应记录为 `allowed_context` 或 `negated_context`，供 QA 复核。
- 同一段既有否定说明又有正向承诺时，按阻断处理。

保存规则：

- `blockingCount > 0` 时，`status = "blocked"` 且 `exportAllowed = false`。
- `warningCount > 0` 且无阻断时，`status = "warning"`。
- 无阻断无警告时，`status = "passed"`。
- 未执行检查时，`status = "not_run"`，不得进入 `exported`。

## 10. 前端验收标准

前端 P1-A 必须满足：

- 固定加载 `p0-xiaoc-opendocuments@1.0.0` TrialPackage。
- 页面仍只出现小 C、三条路径、OpenDocuments、工程企业知识库 AI 助手试航。
- 固定 6 问 ID 与文案不漂移。
- 逐题编辑时可触发保存，但发送给后端的是整包 `trialAnswers` JSON。
- 6 问不完整时状态显示为 `answers_incomplete`，不得完整 Markdown 导出。
- 第 6 问 `ai_usage_explanation` 为空时必须阻断完整 Markdown 导出。
- AntiPackagingCheck 阻断时允许保存草稿，但不得允许完整 Markdown 导出。
- Markdown 仍由前端单一模板源生成。
- 前端传给后端的 `markdownSnapshot.templateSource` 必须为 `frontend`。
- UI、Mock 数据和 Markdown 不出现正向越界表达。

前端不得新增：

- 新路径选择器
- 多 TrialPackage 推荐入口
- 企业筛选入口
- 简历包装入口
- 分数、概率、认证展示
- 真实 RAG 检索入口

## 11. 后端验收标准

后端 P1-A 必须满足：

- 继续复用 `analysis_records`。
- 不新增 `pathfinder_records`、`trail_records` 或其他专用表。
- 不新增 Alembic migration。
- `type = "pathfinder"`。
- `input_file_url = null`。
- `match_score = null`。
- `input_text` 保存 P1-A 输入 envelope JSON 字符串。
- `result` 保存 P1-A 结果 envelope JSON 字符串。
- 所有读取、更新、删除校验 `user_id + id + type = "pathfinder"`。
- 固定 6 问 ID 强校验。
- 支持整包 answers JSON 保存，允许 answers 不完整。
- 反包装阻断后允许保存草稿。
- 反包装阻断后拒绝完整 Markdown 快照。
- 后端不生成 Markdown。
- 后端不做推荐评分。
- 后端不做 RAG。
- 后端不返回 offer 概率、能力认证、企业推荐、简历包装建议或评分字段。
- P0 legacy 记录可读取、可归一为 P1-A `TrailRecord`。

后端响应不得包含以下字段或同义字段：

- `matchScore`
- `match_score`
- `abilityScore`
- `competencyScore`
- `offerProbability`
- `hireProbability`
- `recommendationScore`
- `resumeOptimization`
- `resumePackaging`
- `companyRecommendation`
- `certification`

说明：数据库字段 `analysis_records.match_score` 可存在，但 P1-A Pathfinder 记录必须保存为 `null`，且 API 不把它作为 Pathfinder 业务字段返回。

## 12. QA 验收标准

QA 需覆盖以下用例。

### 12.1 Schema 与保存

- 创建 P1-A 记录后，`analysis_records.type = "pathfinder"`。
- 创建 P1-A 记录后，`input_file_url = null`。
- 创建 P1-A 记录后，`match_score = null`。
- `input_text` 可解析为 `AnalysisRecordInputTextP1A`。
- `result` 可解析为 `AnalysisRecordResultP1A`。
- `trialPackageId = "p0-xiaoc-opendocuments"`。
- `trialPackageVersion` 存在。
- `selectedPathId = "industry-ai-product-assistant"`。

### 12.2 固定 6 问

- 只接受 6 个固定 question id。
- 拒绝未知 question id。
- 拒绝重复 question id。
- 允许部分问题为空并保存为草稿。
- 任意问题为空时状态为 `answers_incomplete`。
- 第 6 问为空时不能进入完整导出。

### 12.3 状态流转

- 新建记录为 `draft`。
- 保存部分 answers 后为 `answers_incomplete`。
- 6 问完整且检查通过后为 `ready_to_export`。
- 检查阻断后为 `anti_packaging_blocked`。
- 阻断后可保存草稿。
- 阻断后拒绝 `exportScope = "full"`。
- 保存完整 `MarkdownSnapshot` 后为 `exported`。
- `exported` 后修改答案会重新计算状态。

### 12.4 Markdown 与模板源

- 后端没有 Markdown 生成接口。
- 后端不改写前端传入的 `markdownSnapshot.content`。
- `templateSource` 不是 `frontend` 时拒绝保存。
- 完整 Markdown 快照包含九项内容。
- 缺九项任一项时不得标记为完整导出。

### 12.5 AntiPackagingCheck

- 能力认证正向表达会阻断。
- offer 概率正向表达会阻断。
- 企业推荐 / 企业筛选正向表达会阻断。
- 简历包装正向表达会阻断。
- 多项目智能推荐正向表达会阻断。
- 真实 RAG 正向表达会阻断。
- 复杂评分正向表达会阻断。
- OpenDocuments 官方贡献暗示会阻断。
- AI 替代专业复核表达会阻断。
- 禁用词在否定语境中不误阻断，但记录为 `allowed_context` 或 `negated_context`。

### 12.6 P0 legacy 兼容

- P0 legacy record 可读取。
- P0 `Record<TrialQuestionId, string>` 可转换为 `TrialAnswer[]`。
- P0 `markdownSnapshot` 可转换为 `MarkdownSnapshot`。
- 旧记录缺少反包装检查时，不得伪造为完整通过。
- 旧记录读取、导出、删除权限仍按本人记录隔离。

### 12.7 Scope Guard

P1-A 页面、Mock 数据、API 响应、Markdown 快照均不得出现正向暗示：

- 能力认证
- offer 概率
- 企业筛选候选人
- 企业推荐
- 简历包装
- 多 TrialPackage 推荐
- 多开源项目智能推荐
- 真实 RAG 检索
- 后端推荐评分
- OpenDocuments 官方贡献

## 13. P1-A 交付完成标准

P1-A 可判定完成的条件：

- `p1-a-json-contract.md` 已作为前后端与 QA 的共同契约使用。
- 前端按 `TrialPackage -> TrailRecord -> TrialAnswer[]` 保存当前试航。
- 后端仍复用 `analysis_records`，无新增 migration。
- 逐题草稿保存可用，且后端保存的是整包 answers JSON。
- 反包装阻断后可保存草稿，但不能完整 Markdown 导出。
- Markdown 单一模板源仍在前端，后端只保存 `markdownSnapshot`。
- TrialPackage 只有最小版本字段，不包含完整发布流。
- P0 legacy 记录可读取、可归一、可删除。
- API 不返回评分、概率、认证、企业推荐、简历包装或 RAG 结果。
- QA 覆盖 Schema、状态流、阻断、Markdown 九项、legacy 兼容和 Scope Guard。
