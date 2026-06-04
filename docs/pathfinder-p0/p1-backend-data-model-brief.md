# 寻径星图 P1 后端 / 数据模型预研方案

版本：P1 Backend Data Model Brief / Scope Guard

更新时间：2026-06-04

适用对象：后端、前端、QA、产品

关联基线：

- `docs/pathfinder-p0/scope-lock-prd.md`
- `docs/pathfinder-p0/content-assets.md`
- `docs/pathfinder-p0/ux-flow.md`
- `docs/pathfinder-p0/technical-review.md`
- `docs/pathfinder-p0/qa-demo-plan.md`
- `docs/pathfinder-p0/handoff-status.md`
- `docs/pathfinder-p0/p1-product-roadmap.md`
- `docs/pathfinder-p0/p0-polish-copy-final.md`
- `docs/pathfinder-p0/p1-ui-design-brief.md`
- `docs/pathfinder-p0/p0-polish-frontend-implementation.md`
- `docs/pathfinder-p0/p0-polish-qa-report.md`

## 1. 文档目的与边界

本文档用于固化“寻径星图 P1 后端 / 数据模型预研方案”，目标是把 P0 的一次性 Demo 保存能力，规划为 P1 可复用、可回看、可导出、可回归测试的后端对象模型。

本文档是 P1 预研，不修改 P0 Scope Lock，不修改 P0 后端实现，不新增数据库 migration，不要求当前代码立即落地。

P1 后端规划只允许围绕以下能力展开：

- 人工策划试航包的只读加载。
- 用户单次试航记录的保存、读取、删除和导出追溯。
- 反包装检查结果的记录与导出阻断。
- 作品集草稿和面试追问准备的结构化保存。
- QA 可回归的版本、规则和快照记录。

P1 后端不得扩展为：

- 岗位推荐器。
- 项目推荐器。
- 企业筛选器。
- 简历生成器。
- 真实 RAG 检索系统。
- 能力认证或岗位胜任评估系统。
- 求职结果概率预测系统。

## 2. 当前 P0 后端基线

当前 P0 后端已采用最小无迁移方案，复用 `analysis_records`。

字段映射：

| `analysis_records` 字段 | P0 Pathfinder 用法 |
|---|---|
| `id` | Pathfinder record id |
| `user_id` | 记录所属用户 |
| `type` | 固定为 `pathfinder` |
| `input_text` | Pathfinder 输入 JSON 字符串 |
| `input_file_url` | 固定为 `null` |
| `result` | `trialAnswers`、`report`、`markdownSnapshot` 的 JSON 字符串 |
| `match_score` | 固定为 `null` |
| `created_at` | 创建时间 |

P0 已实现接口：

```text
POST   /api/pathfinder/records
GET    /api/pathfinder/records/{record_id}
PATCH  /api/pathfinder/records/{record_id}/trial-answers
PUT    /api/pathfinder/records/{record_id}/result
DELETE /api/pathfinder/records/{record_id}
```

P0 后端边界：

- 通过 `user_id + id + type = "pathfinder"` 隔离记录。
- 固定 6 问 ID 有强校验。
- `selectedPathId` 固定为 `industry-ai-product-assistant`。
- `match_score = null`，不使用评分字段。
- 后端不生成 Markdown。
- 后端不做推荐、不做 RAG、不做评分、不返回概率。

## 3. P1 数据对象总览

| 对象 | 职责 | 边界 |
|---|---|---|
| `TrialPackage` | 封装一个人工策划试航包，提供固定候选人画像、路径卡、样例 JD、来源项目、试航任务、固定问题和导出资产结构 | 不是推荐器；普通用户不能修改路径、项目、任务集合或固定 6 问 |
| `TrailRecord` | 保存用户一次试航过程，用于回看、导出和追溯 | 不使用 `match_score`；不表达岗位适配分、胜任分或概率 |
| `AntiPackagingCheck` | 记录反包装规则命中、风险原因、改写建议和导出阻断策略 | 只检查风险表达和导出阻断，不输出能力分 |
| `PortfolioDraft` | 保存作品集草稿结构 | 不是简历生成器；内容只能来自 `TrialPackage` 和 `TrailRecord` |
| `InterviewPrep` | 保存面试追问准备 | 只解释试航过程和边界，不做算法研发能力考核或岗位胜任认证 |

推荐优先级：

1. P1-A：继续复用 `analysis_records`，用 JSON 字符串承载 P1 对象。
2. P1-B：对象稳定后新增专用表模型，并通过 migration 和数据迁移桥接历史记录。

## 4. P1 Schema 草案

### 4.1 TrialPackage

用途：封装一个人工策划试航包，不是推荐器。

P0 Demo 可以封装为一个固定 `TrialPackage`：

- `trial_package_id = "p0-xiaoc-opendocuments"`
- `version = "1.0.0"`
- `candidate_profile` 固定为小 C：传统工科硕士，3 个月内求职，目标为行业 AI 应用产品助理 / 行业 AI 解决方案助理。
- `path_cards` 固定为三条路径：行业 AI 应用产品助理、行业 AI 解决方案助理、算法工程 / 大模型研发。
- `source_project` 固定为 OpenDocuments、GitHub 来源、MIT License 和原项目公开能力。
- `trial_task` 固定为工程企业知识库 AI 助手试航。
- `fixed_questions` 固定为 P0 6 问及固定 question id。

普通用户不能修改路径、项目、任务集合或固定 6 问，原因：

- Pathfinder P1 仍是“试航包加载 + 试航记录保存”，不是推荐配置器。
- 路径、项目、问题和导出资产是经过产品与 QA 审核的内容资产，修改后会破坏回归测试。
- 固定 6 问是追溯链和反包装检查的结构基础，用户只能作答，不能改题。
- 若后续需要多个试航包，应由运营 / 内容管理员发布已审核版本，而不是由普通用户临时拼装。

版本记录建议：

- `trial_package_id` 标识试航包逻辑身份。
- `version` 标识内容版本，建议使用语义化版本或日期版本。
- `TrailRecord` 必须保存 `trial_package_id + trial_package_version`。
- QA 快照测试应固定读取某个版本，断言路径状态、来源、License、固定问题和输出资产结构不漂移。

字段草案：

| 字段 | 类型建议 | 必填 | 说明 |
|---|---|---:|---|
| `trial_package_id` | string | 是 | 试航包唯一 ID，例如 `p0-xiaoc-opendocuments` |
| `version` | string | 是 | 内容版本，例如 `1.0.0` |
| `candidate_profile` | object | 是 | 小 C 或后续已审核候选人画像模板 |
| `path_cards` | array<object> | 是 | 固定路径卡集合，不包含分数或排序算法结果 |
| `sample_jd_notes` | object | 是 | 样例 JD 说明、三条 JD 卡和边界说明 |
| `source_project` | object | 是 | OpenDocuments 来源、License、原项目公开能力 |
| `trial_task` | object | 是 | 试航任务名称、范围、输出要求和边界 |
| `fixed_questions` | array<object> | 是 | 固定问题集合，包含 question id、问题文案、影响结果模块 |
| `output_assets` | array<object> | 是 | 航迹表、作品集草稿、指标表、风险清单、面试追问、Markdown 等输出资产定义 |
| `forbidden_claims` | array<object> | 是 | 不可声称内容和示例 |
| `disclaimer` | string | 是 | 免责声明 |
| `status` | enum | 是 | `draft`、`published`、`archived`；普通用户只能读取 `published` |
| `created_at` | datetime | 是 | 创建时间 |
| `updated_at` | datetime | 是 | 更新时间 |

P0 固定 question id：

```text
project_understanding
role_connection
scenario_gap
application_solution
portfolio_extension
ai_usage_explanation
```

### 4.2 TrailRecord

用途：保存用户一次试航过程，用于回看、导出和追溯。

状态机：

```text
draft
  -> completed
  -> exported

completed
  -> export_failed
  -> exported

export_failed
  -> exported
```

状态说明：

| 状态 | 含义 | 进入条件 |
|---|---|---|
| `draft` | 已创建但 6 问或结果未完整 | 创建记录、保存部分作答 |
| `completed` | 6 问、结果资产和反包装检查达到完整条件 | 保存完整 answers 和 generated_outputs |
| `exported` | 已成功保存或生成可导出快照 | 完整 Markdown 导出成功，或前端传入完整 `markdown_snapshot` |
| `export_failed` | 导出失败或反包装检查阻断完整导出 | 缺项、规则命中阻断、导出过程失败 |

兼容当前 `analysis_records` 最小方案：

- `type = "pathfinder"` 不变。
- `input_text` 保存 `trial_package_id`、`trial_package_version`、`selected_path` 和候选人 / 试航包快照摘要。
- `result` 保存 `answers`、`trace_summary`、`generated_outputs`、`markdown_snapshot`、`anti_packaging_result`、`status`。
- `match_score` 继续为 `null`。

P1 如果新建表，应先桥接再迁移：

- 第一阶段：新增 P1 专用表后，仍保留 P0 `analysis_records` 历史读取逻辑。
- 第二阶段：后台任务把 `type = "pathfinder"` 的旧记录迁移或复制到 `trail_records`。
- 第三阶段：历史记录接口统一从 P1 专用表读取，必要时保留 `analysis_record_id` 反查旧记录。
- 第四阶段：只在确认用户数据导出和删除机制已覆盖新表后，才停止依赖旧 JSON 字符串。

权限隔离：

- 所有读取、更新、删除必须校验 `user_id + record_id`。
- 若仍走 `analysis_records`，必须同时校验 `type = "pathfinder"`。
- 若使用专用表，必须校验 `trial_package_id` 只指向已发布或用户可访问的试航包。

不使用 `match_score` 的原因：

- Pathfinder P1 是路径试航记录，不是岗位匹配评分。
- 使用 `match_score` 会诱导成匹配分、胜任分或概率表达。
- P0 / P1 都要求不返回评分或概率。
- QA 回归需要锁定结构和边界，不需要数值评分。

字段草案：

| 字段 | 类型建议 | 必填 | 说明 |
|---|---|---:|---|
| `record_id` | string / uuid | 是 | 单次试航记录 ID |
| `user_id` | string / uuid | 是 | 所属用户 |
| `trial_package_id` | string | 是 | 使用的试航包 ID |
| `trial_package_version` | string | 是 | 使用的试航包版本 |
| `selected_path` | object | 是 | 本次试航主路径，P0 固定为行业 AI 应用产品助理 |
| `answers` | object | 是 | 固定 question id 到用户作答的映射 |
| `trace_summary` | object | 否 | 样例 JD、小 C 背景、来源项目、作答到输出的追溯摘要 |
| `generated_outputs` | object | 否 | 航迹表、作品集草稿、指标表、风险清单、面试追问等结构化输出 |
| `markdown_snapshot` | string | 否 | 前端或单一模板源生成后的 Markdown 快照 |
| `anti_packaging_result` | object | 否 | 反包装检查摘要和阻断状态 |
| `status` | enum | 是 | `draft`、`completed`、`exported`、`export_failed` |
| `created_at` | datetime | 是 | 创建时间 |
| `updated_at` | datetime | 是 | 更新时间 |

### 4.3 AntiPackagingCheck

用途：反包装检查，只检查风险表达和导出阻断，不输出能力分。

规则覆盖范围：

| 规则类别 | 示例风险 | 默认策略 |
|---|---|---|
| 能力认证 | 把试航写成能力背书或岗位认证 | 阻断完整 Markdown 导出 |
| offer 概率 / 录用概率 | 表达求职结果概率、上岸概率或保证结果 | 阻断完整 Markdown 导出 |
| 企业筛选 / 企业推荐 | 暗示企业可筛选候选人或系统推荐企业 | 阻断完整 Markdown 导出 |
| 简历包装 | 把草稿写成一键简历包装或自动优化简历 | 阻断完整 Markdown 导出 |
| 多项目智能推荐 | 暗示系统自动推荐多个开源项目 | 阻断完整 Markdown 导出 |
| 真实 RAG 检索 | 暗示本功能执行实时仓库抓取或真实 RAG | 阻断完整 Markdown 导出 |
| 复杂评分 | 出现匹配分、胜任分、排行榜、综合分 | 阻断完整 Markdown 导出 |
| OpenDocuments 官方贡献暗示 | 暗示小 C 参与官方开发或有官方贡献记录 | 阻断完整 Markdown 导出 |
| AI 替代专业复核 | 暗示 AI 可替代合同、规范、施工方案等专业复核 | 阻断完整 Markdown 导出 |

提示 vs 阻断：

| 命中类型 | 处理 |
|---|---|
| 明确正向声称能力认证、概率、企业推荐、简历包装、官方贡献 | 阻断完整 Markdown 导出 |
| Markdown 缺少来源、License、免责声明、不可声称内容 | 阻断完整 Markdown 导出 |
| 文案存在轻微过度承诺，但未形成正向禁用能力 | 提示修改，可保存草稿 |
| 禁用词出现在否定语境、免责声明、不可声称内容中 | 不阻断，但记录为 `negated_context` 或 `allowed_context`，供 QA 复核 |

否定语境处理：

- 规则不能只做字面禁词零出现。
- 应结合上下文窗口判断是否包含“不是”“不做”“不得”“不可声称”“不代表”“免责声明”等否定或边界词。
- 例如“不可声称 offer 概率”应识别为安全边界说明，不应阻断。
- 若同一段同时出现否定语境和正向承诺，应按高风险处理。
- QA 需维护正例和反例语料，避免规则误伤免责声明。

保存检查结果：

- 每次检查生成一组 `AntiPackagingCheck` 记录或一个检查批次。
- 记录命中的 `rule_id`、风险等级、原文片段、原因、建议改写和阻断策略。
- `TrailRecord.anti_packaging_result` 保存摘要，便于历史记录展示。
- 详细命中记录用于 QA 回归和规则调试。

字段草案：

| 字段 | 类型建议 | 必填 | 说明 |
|---|---|---:|---|
| `check_id` | string / uuid | 是 | 单条命中或检查批次 ID |
| `record_id` | string / uuid | 是 | 关联 `TrailRecord` |
| `rule_id` | string | 是 | 规则 ID，例如 `offer_probability_claim` |
| `risk_level` | enum | 是 | `info`、`warning`、`blocking` |
| `matched_text` | string | 是 | 命中文本片段 |
| `risk_reason` | string | 是 | 风险原因 |
| `suggested_rewrite` | string | 否 | 建议改写 |
| `blocking_policy` | enum | 是 | `none`、`warn_only`、`block_full_markdown_export` |
| `created_at` | datetime | 是 | 检查时间 |

### 4.4 PortfolioDraft

用途：作品集草稿，不是简历生成器。

内容来源约束：

- 草稿内容只能来自 `TrialPackage` 和 `TrailRecord`。
- 不引入新项目、新岗位、新企业。
- 不生成正式简历条目。
- 不把 OpenDocuments 原项目能力写成小 C 个人产出。
- 不移除来源、License、不可声称内容和免责声明。

编辑触发检查：

- 用户保存草稿后触发 `AntiPackagingCheck`。
- 高风险命中时，草稿可保存为待修改状态，但不能进入完整 Markdown 导出。
- 修改后重新检查，检查结果写入 `TrailRecord.anti_packaging_result`。

字段草案：

| 字段 | 类型建议 | 必填 | 说明 |
|---|---|---:|---|
| `draft_id` | string / uuid | 是 | 草稿 ID |
| `record_id` | string / uuid | 是 | 关联 `TrailRecord` |
| `title` | string | 是 | 作品集草稿标题 |
| `target_path` | string / object | 是 | 目标试航路径 |
| `problem_context` | string | 是 | 问题背景 |
| `user_scenario` | string | 是 | 用户场景 |
| `solution_outline` | string | 是 | 方案概要 |
| `opendocuments_reference` | object | 是 | OpenDocuments 来源、License、原项目能力引用 |
| `xiaoc_trial_contribution` | array<string> | 是 | 小 C 本次试航贡献 |
| `not_claimed` | array<string> | 是 | 不可声称内容 |
| `disclaimer` | string | 是 | 免责声明 |
| `updated_at` | datetime | 是 | 更新时间 |

### 4.5 InterviewPrep

用途：面试追问准备，用于解释试航过程和边界，不做岗位胜任认证。

范围约束：

- 追问只围绕试航任务、OpenDocuments、样例 JD、用户场景、方案拆解、边界表达。
- 不扩展到算法研发能力考核。
- 不生成“已胜任”“已通过”“具备认证”等表达。
- 不把公开项目拆解说成个人研发成果。

导出方式：

- 可并入 Markdown 的独立区块。
- 也可作为单独结构化导出对象。
- 无论并入还是独立导出，都必须经过 `AntiPackagingCheck`。

字段草案：

| 字段 | 类型建议 | 必填 | 说明 |
|---|---|---:|---|
| `prep_id` | string / uuid | 是 | 面试准备项 ID |
| `record_id` | string / uuid | 是 | 关联 `TrailRecord` |
| `question` | string | 是 | 面试追问 |
| `answer_points` | array<string> | 是 | 回答要点 |
| `evidence_source` | array<object> | 是 | 来源于 TrialPackage 或 TrailRecord 的证据 |
| `boundary_reminder` | string | 是 | 边界提醒 |
| `forbidden_claims` | array<string> | 是 | 本题不可声称内容 |
| `updated_at` | datetime | 是 | 更新时间 |

## 5. P1 API 草案

以下 API 仅为 P1 规划，不要求当前 P0 后端立即实现。

| API | 用途 | P0 思路复用 / P1 新模型依赖 |
|---|---|---|
| `GET /api/pathfinder/trial-packages/{id}` | 读取已发布试航包最新版本 | P1 新模型；P0 可用静态 JSON 先桥接 |
| `GET /api/pathfinder/trial-packages/{id}/version/{version}` | 读取指定版本试航包 | P1 新模型；用于回归测试和历史记录追溯 |
| `POST /api/pathfinder/trail-records` | 创建一次试航记录 | 复用 P0 创建记录思路；P1-A 可写入 `analysis_records` |
| `GET /api/pathfinder/trail-records/{record_id}` | 读取试航记录 | 复用 P0 `user_id + id + type` 隔离思路 |
| `PATCH /api/pathfinder/trail-records/{record_id}/answers` | 保存作答 | 复用 P0 固定 question id 校验；P1 可支持草稿分步保存 |
| `PUT /api/pathfinder/trail-records/{record_id}/result` | 保存结构化结果、状态和 Markdown 快照 | 复用 P0 result JSON 保存思路 |
| `POST /api/pathfinder/trail-records/{record_id}/anti-packaging-check` | 执行反包装检查并保存结果 | P1 新模型；P1-A 可把摘要写入 `result` |
| `GET /api/pathfinder/trail-records/{record_id}/portfolio-draft` | 读取作品集草稿 | P1 新模型；P1-A 可从 `generated_outputs.portfolioDraft` 读取 |
| `PUT /api/pathfinder/trail-records/{record_id}/portfolio-draft` | 保存作品集草稿并触发检查 | P1 新模型；依赖 AntiPackagingCheck |
| `GET /api/pathfinder/trail-records/{record_id}/interview-prep` | 读取面试追问准备 | P1 新模型；P1-A 可从 `generated_outputs.interviewPrep` 读取 |
| `DELETE /api/pathfinder/trail-records/{record_id}` | 删除试航记录 | 复用 P0 删除记录思路；必须覆盖 P1 子对象 |

请求 / 响应原则：

- 不返回 `match_score`。
- 不返回胜任分、概率、企业推荐或简历包装建议。
- 所有写接口必须保留 `trial_package_id` 和 `trial_package_version`。
- 所有用户记录接口必须校验当前用户权限。
- `AntiPackagingCheck` 只返回规则命中和阻断状态，不返回能力评价。

## 6. 与 P0 analysis_records 的兼容方案

### 6.1 P1-A：继续复用 analysis_records

方案：

- 继续使用 `analysis_records.type = "pathfinder"`。
- `input_text` 保存 P1 输入对象 JSON 字符串。
- `result` 保存 P1 结果对象 JSON 字符串。
- `match_score = null`。
- 不新增 migration。

建议 JSON 结构：

```json
{
  "input_text": {
    "schemaVersion": "p1-a.1",
    "trialPackageId": "p0-xiaoc-opendocuments",
    "trialPackageVersion": "1.0.0",
    "selectedPath": {
      "pathId": "industry-ai-product-assistant",
      "label": "行业 AI 应用产品助理"
    },
    "candidateProfileSnapshot": {}
  },
  "result": {
    "status": "completed",
    "answers": {},
    "traceSummary": {},
    "generatedOutputs": {
      "portfolioDraft": {},
      "interviewPrep": []
    },
    "markdownSnapshot": "",
    "antiPackagingResult": {
      "blockingCount": 0,
      "warningCount": 0,
      "lastCheckedAt": "2026-06-04T00:00:00Z"
    }
  }
}
```

优点：

- 最小改造，延续 P0 保存能力。
- 不新增 migration，适合 P1 Slice 1 / Slice 2 快速验证。
- 现有历史记录、删除和用户数据导出机制可继续复用。
- 便于先稳定对象 schema 和 QA 回归用例。

缺点：

- JSON 字符串不适合复杂查询。
- `TrialPackage`、`AntiPackagingCheck`、`PortfolioDraft`、`InterviewPrep` 的生命周期不够清晰。
- 规则命中详情如果很多，会让 `result` 过大。
- 后续运营管理多个试航包时，JSON 字符串维护成本会上升。

适用阶段：

- P1 Slice 1：TrialPackage 只读模型。
- P1 Slice 2：TrailRecord 持久化。
- P1 Slice 3 的早期：AntiPackagingCheck 摘要记录。

### 6.2 P1-B：新增专用表模型

方案：

新增专用表建议：

- `trial_packages`
- `trail_records`
- `anti_packaging_checks`
- `portfolio_drafts`
- `interview_prep_items`

迁移计划：

1. 新增 Alembic migration，创建专用表和索引。
2. 保留 P0 `analysis_records` 读取接口，作为 legacy bridge。
3. 编写一次性迁移或后台桥接任务，把 `type = "pathfinder"` 的记录解析为 `trail_records`。
4. `trail_records` 保存 `legacy_analysis_record_id`，便于追溯旧数据。
5. 用户数据导出和删除机制补齐新表。
6. QA 回归确认旧 P0 记录和新 P1 记录都可读取、导出和删除。

优点：

- 对象边界清晰。
- 支持 `trial_package_id + version` 查询和回归测试。
- 支持 AntiPackagingCheck 明细保存与规则调试。
- 支持 PortfolioDraft 和 InterviewPrep 独立编辑。
- 更适合 P2 内容审核、试航包发布和回归测试控制台。

缺点：

- 需要 migration 和数据迁移。
- 需要改造历史记录、删除、用户数据导出。
- 需要兼容旧 JSON 字符串。
- P1 初期如果对象还不稳定，表结构可能反复调整。

推荐顺序：

1. 先采用 P1-A，稳定 P1 对象、API 契约和 QA 用例。
2. 当出现多个 TrialPackage、规则命中明细、草稿独立编辑、历史筛选等明确需求时，再进入 P1-B。
3. P1-B 迁移前必须完成数据导出 / 删除影响评估。

## 7. 权限与数据隔离

权限原则：

- `TrialPackage`：普通用户只能读取 `status = "published"` 的试航包。
- `TrailRecord`：必须校验 `user_id + record_id`。
- P1-A：同时校验 `analysis_records.type = "pathfinder"`。
- P1-B：校验 `trail_records.user_id = current_user.id`，并校验关联 `trial_package_id` 可访问。
- `AntiPackagingCheck`、`PortfolioDraft`、`InterviewPrep` 均通过 `record_id` 反查 `TrailRecord.user_id`，不能只凭子对象 ID 访问。

隔离策略：

| 场景 | 校验 |
|---|---|
| 读取试航包 | `trial_package.status = "published"` 或管理员权限 |
| 创建试航记录 | `trial_package_id + version` 存在且可访问 |
| 读取试航记录 | `record.user_id = current_user.id` |
| 更新作答 / 结果 | `record.user_id = current_user.id` 且记录未被删除 |
| 反包装检查 | `record.user_id = current_user.id` |
| 删除记录 | 删除本人记录，并级联或同步删除 P1 子对象 |
| 用户数据导出 | 只导出当前用户的 TrailRecord 和关联子对象 |

P1 不设计企业侧查看候选人记录的权限模型。

## 8. Markdown 归属

P0 决策保持不变：

- P0 前端生成 Markdown。
- 后端只保存结构化结果和可选 `markdownSnapshot`。
- 后端不维护另一套 Markdown 模板。

P1 建议：

- 继续保持单一模板源，不能前后端双写。
- 如果 Markdown 仍由前端生成，后端保存 `markdown_snapshot`、`template_version`、`trial_package_version`。
- 如果 P1 后续要求服务端导出 Markdown，应把模板源统一迁移到一个共享模块或单一服务，前端只调用该模板源预览和下载，不能保留两套模板。
- `markdown_snapshot` 是历史快照，用于回看、用户数据导出和 QA 复现，不代表后端重新生成 Markdown。

导出阻断：

- 完整 Markdown 导出必须先通过固定问题完整性检查和 `AntiPackagingCheck`。
- 被阻断时可保存草稿或缺项快照，但不能标记为完整导出。

## 9. 反包装检查策略

规则来源：

- `scope-lock-prd.md` 的 P0 明确不做清单。
- `content-assets.md` 的反包装表达检查表。
- `qa-demo-plan.md` 的反包装检查清单。
- `p0-polish-copy-final.md` 的不可声称内容和免责声明。
- `handoff-status.md` 的统一禁用表达。

命中等级：

| 等级 | 含义 | 处理 |
|---|---|---|
| `info` | 命中否定语境或边界说明 | 记录，不阻断 |
| `warning` | 表达偏强但可通过改写修正 | 提示修改，可保存草稿 |
| `blocking` | 明确越界或缺少必要边界 | 阻断完整 Markdown 导出 |

阻断策略：

- 明确正向表达能力认证、概率、企业推荐、简历包装、多项目智能推荐、真实 RAG、复杂评分、官方贡献暗示时阻断。
- Markdown 缺少 OpenDocuments 来源、License、不可声称内容或免责声明时阻断。
- 第 6 问 AI 使用说明为空时阻断完整 Markdown 导出。
- AI 替代专业复核类表达阻断，尤其涉及合同、规范、施工方案等高风险场景。

否定语境处理：

- 使用上下文窗口判断风险表达是否处于“不可声称 / 不做 / 不代表 / 免责声明”中。
- 否定语境命中写入检查结果，标记为 `allowed_context`，用于 QA 复核。
- 若同一段落既包含否定边界又包含正向承诺，应按 `blocking` 处理。

QA 回归方式：

- 建立规则 fixture：每条规则至少有 1 个阻断样例、1 个提示样例、1 个否定语境允许样例。
- 固定 P0 Demo Markdown 快照，确认不会被误阻断。
- 固定高风险 Markdown 样本，确认会阻断完整导出。
- 每次修改规则后，回归 `TrialPackage` 版本、TrailRecord 输出和 Markdown 快照。

## 10. P1 不做清单

P1 后端不得实现或暗示以下能力：

- 不做能力认证。
- 不做岗位胜任认证。
- 不做 offer 概率预测。
- 不做录用概率、上岸概率或求职结果承诺。
- 不做企业筛选。
- 不做企业推荐或精准内推。
- 不做简历包装。
- 不做简历自动优化。
- 不做自动投递。
- 不做多开源项目智能推荐。
- 不做真实 RAG 检索。
- 不做 OpenDocuments 仓库实时抓取和自动分析。
- 不做复杂评分系统。
- 不做匹配分、胜任分、综合分或排行榜。
- 不做算法工程速成。
- 不做大模型研发训练路径。
- 不暗示小 C 参与 OpenDocuments 官方贡献。
- 不暗示 OpenDocuments 原项目能力属于小 C 个人产出。
- 不暗示完成试航等于具备岗位录用优势。
- 不为企业提供候选人筛选能力。

## 11. 实施顺序建议

### P1 Slice 1：TrialPackage 只读模型

目标：

- 把 P0 Demo 封装为固定 `TrialPackage`。
- 支持按 `trial_package_id + version` 读取。
- 普通用户只读，不可修改路径、项目、任务集合或固定 6 问。

建议实现：

- 先用静态 JSON 或 `analysis_records` 之外的只读配置文件承载。
- QA 做 TrialPackage 快照测试。
- 不做管理后台。

### P1 Slice 2：TrailRecord 持久化

目标：

- 保存用户一次试航记录。
- 记录 `trial_package_id + trial_package_version`。
- 支持 `draft`、`completed`、`exported`、`export_failed` 状态。

建议实现：

- 优先用 P1-A 继续复用 `analysis_records`。
- 保留 P0 `user_id + id + type = "pathfinder"` 权限策略。
- 不使用 `match_score`。

### P1 Slice 3：AntiPackagingCheck

目标：

- 对草稿、结果和 Markdown 快照做反包装检查。
- 保存规则命中结果，支持 QA 回归。
- 阻断完整 Markdown 导出。

建议实现：

- 先实现规则集和检查结果摘要。
- 再考虑明细表或专用表。
- 否定语境必须纳入测试。

### P1 Slice 4：PortfolioDraft / InterviewPrep

目标：

- 保存作品集草稿和面试追问准备。
- 编辑后触发 `AntiPackagingCheck`。
- 支持并入 Markdown 或独立结构化导出。

建议实现：

- 内容只能来自 `TrialPackage` 和 `TrailRecord`。
- 不新增岗位、项目、企业。
- 不生成正式简历。

### P1 Slice 5：历史记录与导出回归

目标：

- Pathfinder 历史记录可回看。
- 用户数据导出包含 TrailRecord、Markdown 快照、反包装检查摘要、作品集草稿和面试追问准备。
- 用户删除机制覆盖 P1 子对象。

建议实现：

- P1-A 阶段验证 `analysis_records` 导出兼容。
- P1-B 前补齐专用表删除和导出测试。
- 做旧 P0 记录读取回归。

## 12. QA / 测试建议

后端测试用例清单：

### TrialPackage

- `test_get_trial_package_latest_success`
- `test_get_trial_package_version_success`
- `test_trial_package_contains_p0_xiaoc_opendocuments_assets`
- `test_trial_package_fixed_questions_use_required_ids`
- `test_trial_package_rejects_user_mutation`
- `test_trial_package_snapshot_stable_for_version`

### TrailRecord

- `test_create_trail_record_success`
- `test_create_trail_record_stores_trial_package_id_and_version`
- `test_create_trail_record_uses_type_pathfinder_when_p1a`
- `test_update_answers_accepts_fixed_question_ids`
- `test_update_answers_rejects_unknown_question_id`
- `test_save_result_preserves_markdown_snapshot`
- `test_trail_record_status_draft_to_completed`
- `test_trail_record_status_completed_to_exported`
- `test_trail_record_status_completed_to_export_failed`
- `test_get_trail_record_rejects_other_user`
- `test_get_trail_record_rejects_non_pathfinder_type_when_p1a`
- `test_delete_trail_record_deletes_or_hides_owned_record_only`
- `test_trail_record_never_uses_match_score`

### AntiPackagingCheck

- `test_anti_packaging_blocks_ability_certification_claim`
- `test_anti_packaging_blocks_offer_probability_claim`
- `test_anti_packaging_blocks_company_recommendation_claim`
- `test_anti_packaging_blocks_resume_packaging_claim`
- `test_anti_packaging_blocks_multi_project_smart_recommendation_claim`
- `test_anti_packaging_blocks_real_rag_claim`
- `test_anti_packaging_blocks_complex_score_claim`
- `test_anti_packaging_blocks_opendocuments_official_contribution_claim`
- `test_anti_packaging_blocks_ai_replaces_professional_review_claim`
- `test_anti_packaging_allows_negated_forbidden_claim_context`
- `test_anti_packaging_saves_rule_hits_for_qa_regression`

### PortfolioDraft

- `test_get_portfolio_draft_from_trail_record`
- `test_update_portfolio_draft_success`
- `test_portfolio_draft_cannot_introduce_new_project`
- `test_portfolio_draft_cannot_introduce_new_company`
- `test_portfolio_draft_cannot_remove_source_and_disclaimer`
- `test_portfolio_draft_update_triggers_anti_packaging_check`

### InterviewPrep

- `test_get_interview_prep_success`
- `test_interview_prep_uses_trial_record_evidence_sources`
- `test_interview_prep_rejects_algorithm_research_certification_scope`
- `test_interview_prep_can_be_included_in_markdown_snapshot`
- `test_interview_prep_export_requires_anti_packaging_check`

### 导出 / 删除 / 兼容

- `test_user_data_export_includes_p1_trail_records`
- `test_user_data_export_includes_markdown_snapshot`
- `test_user_data_export_includes_anti_packaging_summary`
- `test_user_delete_removes_trail_records_and_child_objects`
- `test_legacy_p0_analysis_record_can_be_read_as_p1_trail_record`
- `test_p1b_bridge_keeps_legacy_analysis_record_id`
- `test_no_pathfinder_api_returns_score_probability_or_certification`

## 13. 待产品确认问题

以下问题不阻塞 P1-A 预研，但进入实现前建议产品确认：

1. P1-A 阶段是否允许 `PATCH /answers` 支持逐题草稿保存，还是继续要求 6 问全量提交。
2. `TrialPackage.status` 是否需要管理员发布流；若需要，是否进入 P1 还是 P2。
3. `AntiPackagingCheck` 阻断后是否允许保存草稿但禁止完整导出。
4. Markdown 单一模板源在 P1 是否继续放前端，还是后续迁移到共享模块。
5. P1 是否需要保留 P0 记录读取兼容期的结束标准。
