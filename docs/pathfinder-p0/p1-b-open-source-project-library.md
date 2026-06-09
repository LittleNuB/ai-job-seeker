# 寻径星图 P1-B 开源项目库与路径匹配规则方案

任务 ID：DATA-003
子对话名称：数据方案C
日期：2026-06-09

## 1. 总体结论

P1-B 不应从“自动推荐更多开源项目”开始，而应先建立一个可人工审核、可追溯、可下线的开源项目参考库。项目库的作用是支撑“真实用户背景 -> 路径推荐 -> 对口审核开源项目 -> 生成试航包”的数据底座，但它不提供能力认证、岗位胜任证明、offer 概率、企业筛选、简历包装或多项目黑箱推荐。

P1-B 的最小可行目标是：

1. 把 P1-A 的固定 OpenDocuments 试航包升级为“人工审核项目库中的一个 approved 项目记录”。
2. 建立 RolePath taxonomy、ProjectTag、CapabilityTag、RiskTag 和 ProjectMatchRule，使路径和项目匹配可以解释为规则命中，而不是分数排序。
3. 从现有 JD 样本中抽取任务、工具、交付物和风险信号，用作样本趋势参考，不把样本说成市场全量。
4. 为每个项目保留 License、README、来源、核验日期、不可声称内容、allowedContexts 和 review triggers。
5. 只生成人工审核后的 TrialTaskTemplate；P1-B 第一轮不做真实 RAG、不实时抓仓库、不做多项目智能推荐。

## 2. P1-B 项目库原则

| 原则 | 要求 |
|---|---|
| 人工审核 | 每个进入可用库的项目必须由数据维护者人工打开公开页面、README 和 License 文件核验。LLM 可辅助摘要，但不能替代人工核验。 |
| License 核验 | 必须记录 `licenseSpdxId`、`licenseFileUrl`、`licenseVerificationStatus`、`licenseVerifiedBy`、`licenseVerifiedAt`。无法确认时不得进入 `approved_for_trial_package`。 |
| reference_only | 项目默认角色为 `reference_only`。它只用于理解公开项目能力、场景、任务结构和风险边界，不表示用户参与原仓库。 |
| 不可声称内容 | 必须维护 `notClaimed` 和 `forbiddenClaims`，阻断“我开发了该项目”“我复现完整系统”“我具备企业交付能力”等表达。 |
| 核验日期 | `lastManualCheckAt` 是必填字段。P1-B.1 建议核验日期过 60 天或 README / License 变化时标记 `needs_review`。 |
| 不使用热度评分 | stars、forks、commit、watchers 只能作为非规范背景，不得作为能力分、推荐分、排序分或路径依据。 |
| 可解释匹配 | 匹配结果只能展示“规则命中 / 不命中 / 需人工复核”，不得输出综合分、胜任分、排行榜。 |
| 可下线 | License 变化、项目转私有、README 定位变化、项目状态不确定时，关联 TrialTaskTemplate 应进入 `needs_review` 或 `retired`。 |

OpenDocuments 当前事实来自本地 fixture：

- 项目 URL：`https://github.com/joungminsung/OpenDocuments`
- License：MIT
- License 核验状态：`verified`
- 核验日期：2026-06-07
- 使用角色：`reference_only`
- 运行时边界：P1-A / P1-B 第一轮不做真实 RAG、不抓取仓库、不接入 OpenDocuments 运行时。

## 3. RolePath Taxonomy 建议

P1-B 的 RolePath 应以“转型试航路径”而不是单一岗位为单位。每条路径必须带样本依据、用户背景信号要求、适配项目类型、风险边界和可生成试航包类型。

| pathId | 中文名 | 目标用户背景 | 主要 JD 信号 | 适配项目类型 | 边界 |
|---|---|---|---|---|---|
| `industry-ai-product-assistant` | 行业 AI 应用产品助理 | 有行业资料、流程、运营、方案、研究或项目协作经验，技术深度一般 | 需求拆解、PRD、用户故事、问答样例、验收指标、Demo 测试 | 文档问答、知识库、智能客服、内部助手 | 不证明产品经理胜任，不包装 AI 项目经历。 |
| `industry-ai-solution-assistant` | 行业 AI 解决方案助理 | 有客户沟通、售前支持、交付协调、咨询或行业调研经验 | 客户访谈、场景调研、PoC、Demo 脚本、方案材料、交付清单 | RAG 方案参照、流程自动化、知识库、行业助手 | 不承诺客户交付效果、周期、成本或售前成交。 |
| `ai-data-evaluation-assistant` | AI 数据评测助理 | 有标注、质检、内容审核、数据整理、测试或表格分析经验 | 数据清洗、标注规范、评测集、质检、错误分析、指标统计 | 数据标注、评测管理、LLM eval、质检看板 | 不声称算法评测专家，不输出模型质量结论替代专业评估。 |
| `ai-application-ops-implementation-assistant` | AI 应用运营 / 实施助理 | 有运营、实施、客服、培训、SOP、知识库维护或用户支持经验 | SOP、上线配置、用户反馈、知识库维护、权限流程、工单协同 | 工单客服、知识管理、工作流自动化、应用配置台 | 不声称完成企业实施交付，不替代安全、合规、运维复核。 |
| `algorithm-llm-engineer` | 算法工程 / 大模型研发 | 有扎实编程、机器学习、模型训练或工程代码证据 | 模型训练、微调、向量检索、评估、代码工程 | 仅作为长期缺口参照 | P1-B 默认不把非 CS 用户导向短期主试航路径，不输出否定性能力判断。 |

## 4. OpenSourceProjectRecord Schema 草案

```ts
type OpenSourceProjectRecord = {
  projectId: string
  name: string
  sourceUrl: string
  host: 'github' | 'gitlab' | 'other_public_source'
  repositoryVisibility: 'public' | 'unknown'
  homepageUrl?: string
  description: string
  license: string
  licenseSpdxId?: string
  licenseFileUrl?: string
  licenseVerificationStatus: 'verified' | 'pending' | 'failed' | 'not_applicable'
  licenseVerifiedBy?: string
  licenseVerifiedAt?: string
  lastManualCheckAt?: string
  manualCheckMethod: Array<'repo_page' | 'license_file' | 'readme' | 'release_page' | 'docs_page'>
  referenceRole: 'reference_only'
  status: 'candidate' | 'approved_for_trial_package' | 'needs_review' | 'retired'
  rolePathIds: string[]
  projectTags: ProjectTag[]
  capabilityTags: CapabilityTag[]
  riskTags: RiskTag[]
  publicCapabilities: string[]
  referenceUseInPathfinder: string[]
  notClaimed: string[]
  forbiddenClaims: string[]
  allowedContexts: string[]
  reviewTriggers: string[]
  sourceSnapshot: {
    checkedBranch?: string
    readmeSummary?: string
    licenseSummary?: string
    nonCanonicalMetadata?: {
      starsObserved?: number
      forksObserved?: number
      latestCommitObservedAt?: string
      note: 'background_only_not_used_for_scoring'
    }
  }
  reviewerNotes?: string[]
}
```

P1-B.1 可先用 JSON fixture 管理该 schema。只有当产品负责人确认需要历史记录检索、审核队列和下线流时，再进入专用表 PRD。

## 5. ProjectTag / CapabilityTag / RiskTag 体系

### ProjectTag

用于描述项目类型和适配路径，不表示项目优劣。

- `document_qa`
- `knowledge_base`
- `customer_support_assistant`
- `workflow_automation`
- `data_annotation`
- `model_evaluation`
- `dashboard_analytics`
- `prompt_ops`
- `internal_tooling`
- `implementation_playbook`

### CapabilityTag

用于连接试航任务中的可观察能力，不表示用户已具备该能力。

- `requirement_breakdown`
- `scenario_mapping`
- `mvp_scope_design`
- `qa_pair_design`
- `retrieval_boundary_design`
- `citation_and_source_display`
- `evaluation_metric_design`
- `error_analysis`
- `feedback_loop_design`
- `user_training_material`
- `handoff_checklist`
- `risk_boundary_documentation`

### RiskTag

用于触发反包装、人工复核和导出限制。

- `license_pending`
- `readme_pending`
- `attribution_risk`
- `full_system_replication_risk`
- `professional_review_substitution_risk`
- `real_runtime_claim_risk`
- `multi_project_recommendation_risk`
- `scoring_or_ranking_risk`
- `resume_packaging_risk`
- `sample_overgeneralization_risk`
- `sensitive_data_risk`

## 6. ProjectMatchRule 规则草案

P1-B 匹配规则采用“硬门槛 + 解释性命中 + 人工复核”的形式，不做综合分。

```ts
type ProjectMatchRule = {
  ruleId: string
  version: string
  targetRolePathId: string
  projectEligibility: {
    licenseVerificationStatus: 'verified'
    referenceRole: 'reference_only'
    requiredProjectTags: ProjectTag[]
    requiredCapabilityTags: CapabilityTag[]
    blockedRiskTags: RiskTag[]
  }
  userSignalRequirements: Array<{
    signalType:
      | 'domain_experience'
      | 'tool_experience'
      | 'communication_experience'
      | 'document_or_content_experience'
      | 'data_or_evaluation_experience'
      | 'implementation_or_ops_experience'
    evidenceMode: 'self_reported' | 'user_attached' | 'trial_answer'
    required: boolean
  }>
  jdSignalRequirements: Array<{
    signalType: 'task' | 'tool' | 'deliverable' | 'risk_boundary'
    normalizedLabel: string
    sourceScope: 'sample_trend_reference_only'
  }>
  result:
    | 'eligible_for_trial_template'
    | 'needs_manual_review'
    | 'not_eligible_for_current_path'
  explanationTemplate: string
  forbiddenInterpretations: string[]
}
```

最小规则建议：

| ruleId | 目标路径 | 硬门槛 | 命中解释 |
|---|---|---|---|
| `rule-product-doc-qa-reference` | 行业 AI 应用产品助理 | License 已核验；项目含 `document_qa` 或 `knowledge_base`；含需求拆解、问答样例、引用展示相关能力标签 | 适合生成产品试航任务，要求用户输出场景、MVP、指标和风险，不证明岗位胜任。 |
| `rule-solution-poc-reference` | 行业 AI 解决方案助理 | License 已核验；项目含知识库、工作流或客户支持场景；含 PoC、Demo 脚本、交付清单能力标签 | 适合生成方案助理试航任务，要求用户输出客户场景、PoC 范围和边界。 |
| `rule-data-eval-reference` | AI 数据评测助理 | License 已核验；项目含数据标注、评测或错误分析场景；不得含未核验模型性能承诺 | 适合生成评测任务模板，要求用户输出标注规范、质检口径和错误分析表。 |
| `rule-ops-implementation-reference` | AI 应用运营 / 实施助理 | License 已核验；项目含运营配置、知识库维护、工单或工作流；含 SOP、反馈闭环能力标签 | 适合生成运营实施试航任务，要求用户输出上线 checklist、用户培训材料和反馈处理流程。 |

## 7. TrialTaskTemplate 草案

```ts
type TrialTaskTemplate = {
  templateId: string
  version: string
  title: string
  targetRolePathIds: string[]
  sourceProjectIds: string[]
  status: 'draft' | 'approved' | 'needs_review' | 'retired'
  taskScope: string
  assumedUserInputs: Array<
    | 'background'
    | 'target_path'
    | 'domain_context'
    | 'available_time'
    | 'tool_familiarity'
  >
  fixedQuestions: Array<{
    questionId: string
    title: string
    prompt: string
    required: boolean
    expectedOutputType:
      | 'project_understanding'
      | 'role_connection'
      | 'scenario_gap'
      | 'mvp_plan'
      | 'evaluation_plan'
      | 'ops_plan'
      | 'portfolio_boundary'
      | 'ai_usage_explanation'
  }>
  outputAssets: string[]
  requiredMarkdownSections: string[]
  forbiddenClaims: string[]
  disclaimer: string
  evidenceMappingSetId: string
}
```

模板示例：

- `template-product-document-qa-mvp`：面向行业 AI 应用产品助理，输出用户问题清单、MVP 范围、流程草图、指标表、风险清单和作品集一页纸。
- `template-solution-poc-brief`：面向行业 AI 解决方案助理，输出客户场景假设、PoC 范围、Demo 脚本、交付边界和沟通材料。
- `template-data-eval-checklist`：面向 AI 数据评测助理，输出标注口径、评测样例、错误分类、质检表和风险说明。
- `template-ops-implementation-runbook`：面向 AI 应用运营 / 实施助理，输出上线 checklist、知识库维护 SOP、用户反馈流程和培训话术。

## 8. EvidenceMapping 草案

```ts
type EvidenceMapping = {
  mappingId: string
  mappingSetId: string
  sourceType:
    | 'jd_requirement_signal'
    | 'user_profile_signal'
    | 'open_source_project'
    | 'project_match_rule'
    | 'trial_task_template'
    | 'trial_answer'
    | 'anti_packaging_finding'
  sourceId: string
  sourceScope:
    | 'sample_trend_reference_only'
    | 'runtime_user_authorized_input'
    | 'public_project_reference_only'
    | 'manual_reviewed_rule'
    | 'trial_output'
    | 'risk_boundary'
  targetType:
    | 'role_path'
    | 'project_record'
    | 'trial_question'
    | 'portfolio_section'
    | 'interview_prep_item'
    | 'markdown_section'
    | 'risk_boundary'
  targetId: string
  relation:
    | 'supports_trial_design'
    | 'explains_path'
    | 'requires_review'
    | 'blocks_claim'
    | 'must_be_disclaimed'
  evidenceText: string
  reviewerStatus: 'not_required' | 'pending' | 'approved' | 'rejected'
  createdAt: string
}
```

P1-B 用户可见的每个结论必须至少能追溯到：

1. 一条 JD 样本趋势信号或路径定义。
2. 一条用户授权输入信号。
3. 一个人工核验的开源项目记录。
4. 一条反包装边界或免责声明。

## 9. 最小项目库候选清单

P1-B 第一周建议只维护 5 到 8 个项目类型。除 OpenDocuments 外，本方案不伪造真实仓库或 License；未核验项一律写成“候选类型 + 待核验”。

| projectId / candidateType | 名称 | 状态 | License 状态 | 适配路径 | 说明 |
|---|---|---|---|---|---|
| `opendocuments` | OpenDocuments | `approved_for_trial_package` | MIT，已于 2026-06-07 人工核验 | 行业 AI 应用产品助理、行业 AI 解决方案助理 | 继续作为 P1-B 第一轮基准项目，reference_only。 |
| `candidate-document-qa-kb` | 文档问答 / 知识库项目类型 | `candidate` | 待核验 | 产品助理、解决方案助理、运营实施助理 | 用于寻找与知识库问答、引用展示、反馈闭环相关的公开项目。 |
| `candidate-customer-support-assistant` | 智能客服 / 工单助手项目类型 | `candidate` | 待核验 | 产品助理、运营实施助理 | 用于客服 SOP、问答样例、工单流转、用户反馈试航。 |
| `candidate-data-annotation-eval` | 数据标注 / 评测管理项目类型 | `candidate` | 待核验 | AI 数据评测助理 | 用于标注规范、质检口径、错误分析和评测集设计。 |
| `candidate-llm-eval-playground` | LLM 评测 / Prompt 评测项目类型 | `candidate` | 待核验 | AI 数据评测助理、产品助理 | 用于输出评测指标和错误分析，不声称模型质量结论。 |
| `candidate-workflow-automation` | 工作流自动化 / 低代码编排项目类型 | `candidate` | 待核验 | 解决方案助理、运营实施助理 | 用于流程拆解、配置清单、上线 checklist 和交付边界。 |
| `candidate-knowledge-ops-dashboard` | 知识库运营 / 看板项目类型 | `candidate` | 待核验 | 运营实施助理、数据评测助理 | 用于维护 SOP、反馈分类、指标表和风险跟踪。 |

候选项进入 approved 前必须补齐真实公开 URL、License、README 摘要、核验人、核验日期、notClaimed、allowedContexts 和 reviewTriggers。

## 10. 数据获取与核验流程

允许流程：

1. 人工提出候选类型和候选仓库 URL。
2. 数据维护者打开 GitHub 或其他公开页面，记录仓库 URL、README 核验日期、License 文件 URL、License 类型和项目公开能力。
3. 对 License 和 README 分别做人工核验。LLM 只能辅助生成摘要和标签建议，摘要必须标记 `llm_assisted` 并由人工复核。
4. 生成 `OpenSourceProjectRecord` 草案，默认 `status = candidate`、`referenceRole = reference_only`。
5. 第二人或产品负责人抽检核心字段，确认不可声称内容和试航边界。
6. 只有 `licenseVerificationStatus = verified` 且 `notClaimed`、`allowedContexts`、`reviewTriggers` 完整时，才能进入 `approved_for_trial_package`。
7. 项目发生 License 缺失、README 定位变化、仓库转私有、维护状态不清晰时，状态改为 `needs_review`，关联试航包暂停新增导出。

禁止流程：

- 未经授权的大规模抓取。
- 绕过平台登录、反爬、robots 或服务条款。
- 用 stars、forks、commit 活跃度作为推荐依据。
- 用 LLM 自动决定项目适配、License 结论或用户胜任结论。
- 把开源项目能力写成用户个人项目经验。

## 11. JD 信号如何接入项目匹配

本地 `scraper/cleaned/cleaned_jds.json` 当前有 2537 条清洗 JD 样本，覆盖 9 家公司样本。抽样字段包含 `title`、`company`、`salary`、`city`、`experience`、`education`、`jd_text`、`url`、`department`、`scraped_at`、`salary_parsed`、`level`。

本次只做轻量趋势检查，关键词出现次数如下，均只能作为样本趋势参考：

| 信号 | 样本命中数 |
|---|---:|
| 产品 | 1002 |
| 数据 | 1274 |
| 运营 | 371 |
| 解决方案 | 266 |
| 评测 | 267 |
| 交付 | 204 |
| AI应用 | 178 |
| Prompt | 171 |
| 标注 | 98 |
| 实施 | 74 |
| 知识库 | 51 |
| 智能客服 | 48 |
| 售前 | 4 |
| RAG | 312 |

接入方式：

1. 从 JD 样本中抽取 `task`、`tool`、`deliverable`、`domain_context`、`risk_boundary` 五类信号。
2. 每条信号保留 `sourceScope = sample_trend_reference_only`，不展示为市场全量或具体公司要求。
3. RolePath 使用这些信号解释“为什么这个试航方向值得尝试”，不解释为适合投递、胜任或录用。
4. ProjectMatchRule 只检查项目标签是否能承载该路径的试航任务，如“知识库项目可承载问答样例和引用展示任务”。
5. 当 JD 信号与用户背景冲突时，输出 `needs_manual_review` 或“建议补充背景信息”，不做负面能力判断。

## 12. 反包装数据规则

P1-B 需要把反包装规则升级到项目库和试航模板两个层级。

```ts
type AntiPackagingBoundary = {
  objectId: string
  objectType: 'open_source_project' | 'trial_task_template' | 'role_path'
  notClaimed: string[]
  forbiddenClaims: string[]
  allowedContexts: string[]
  blockingPolicy: 'block_full_markdown_export' | 'requires_manual_review'
}
```

必填规则：

- `notClaimed`：不声明用户参与原仓库开发；不声明官方贡献；不声明复现完整系统；不声明企业生产交付；不声明项目能力属于用户本人。
- `forbiddenClaims`：能力认证、岗位胜任、offer 概率、企业筛选、精准内推、简历包装、真实 RAG、实时仓库抓取、多项目智能推荐、评分排行、专业复核替代。
- `allowedContexts`：不做能力认证、不代表录用判断、仅作公开参考、不是实时检索、OpenDocuments 仅作 reference_only、AI 不替代合同 / 规范 / 施工方案复核。

命中策略：

1. 正向承诺命中 forbidden 时阻断完整 Markdown 导出。
2. 否定语境命中 forbidden 时不阻断，但记录为 `allowed_context` 供 QA 抽检。
3. 同一段同时包含否定说明和正向承诺时按阻断处理。
4. 项目库中 `license_pending` 或 `readme_pending` 的项目不得生成面向用户的试航包。

## 13. 质量指标

这些指标只用于内部数据质量，不面向用户展示为分数。

| 指标 | 定义 | P1-B.1 最低要求 |
|---|---|---|
| `licenseVerifiedRate` | 已核验 License 项目数 / approved 项目数 | approved 项目必须 100%。 |
| `sourceTraceability` | 用户可见结论具备 EvidenceMapping 的比例 | 关键结论 100%。 |
| `tagConsistency` | 人工抽检后标签一致的项目数 / 抽检项目数 | 首轮目标不低于 90%，冲突进入复核。 |
| `sampleDisclaimerCoverage` | 使用 JD 样本趋势处是否带样本免责声明 | 用户可见内容 100%。 |
| `antiPackagingCoverage` | TrialTaskTemplate 是否绑定 notClaimed、forbiddenClaims、allowedContexts | approved 模板 100%。 |
| `reviewStalenessRate` | 超过核验周期且未复核项目数 / approved 项目数 | P1-B.1 目标 0。 |
| `needsReviewClosureTime` | needs_review 项目完成复核或下线的时间 | 第一轮建议 5 个工作日内。 |

## 14. P1-B.1 / P1-B.2 / P2 数据边界

### P1-B.1

- 只做人工审核项目库 JSON fixture 和规则文档。
- OpenDocuments 作为唯一 approved 项目。
- 其他项目只维护候选类型，未核验不进入用户可见试航包。
- 不做专用数据库表、不做迁移、不做运行时代码、不做真实 RAG。
- 不做多项目推荐 UI，只允许内部人工选择一个 approved 项目生成一个固定 TrialTaskTemplate。

### P1-B.2

- 可新增少量 verified 项目记录，仍以人工审核为前提。
- 可设计专用表 PRD，例如 `open_source_projects`、`role_paths`、`trial_task_templates`、`evidence_mappings`、`annotation_tasks`。
- 可做审核队列、项目下线策略、模板版本管理和历史快照。
- 如引入 LLM，只能辅助标签建议和草稿解释，必须保留人工审核状态。

### P2

- 可建设内容审核工作台、多试航包管理和发布流。
- 可做用户历史记录筛选、模板版本对比、质量报告面板。
- 仍不做黑箱推荐、能力认证、offer 概率、企业筛选、简历包装。
- 如产品负责人未来要求排序，只能做人工可解释的筛选条件，不使用综合分或热度分。

## 15. 1 周内可执行数据任务

1. 将 OpenDocuments 的现有 fixture 映射到 P1-B `OpenSourceProjectRecord` schema 草案，补 `projectTags`、`capabilityTags`、`riskTags`。
2. 建立 `RolePath` 最小 taxonomy JSON：四条主路径加算法工程长期缺口参照。
3. 建立 `ProjectTag / CapabilityTag / RiskTag` 枚举 JSON，并写 10 条正反例。
4. 为 OpenDocuments 写 2 个 TrialTaskTemplate：产品助理版和解决方案助理版。
5. 从 `cleaned_jds.json` 抽样 30 条，人工标注 task / tool / deliverable / risk_boundary，不做市场结论。
6. 为候选类型建立 `candidate` 记录，只写类型、适配路径和待核验字段，不填虚假 URL / License。
7. 建立 License 核验 checklist：GitHub 页面、LICENSE 文件、README 定位、核验人、核验日期、reviewTriggers。
8. 把 P1-A 反包装规则升级为项目库通用 `AntiPackagingBoundary` 草案。

## 16. 需要产品负责人确认的问题

1. P1-B.1 是否确认只让 OpenDocuments 作为唯一 approved 项目，其他项目先不进入用户可见链路？
2. 项目库第一轮是否接受纯 JSON fixture，还是需要先写专用表 PRD？
3. License 核验负责人、复核周期和 `needs_review` 下线权限由谁负责？
4. RolePath 是否以本方案四条非算法主路径为第一轮主 taxonomy？
5. 候选项目进入 approved 是否需要双人复核，还是数据维护者加产品负责人抽检即可？
6. JD 样本信号在前端是否展示具体命中关键词，还是只展示“样本趋势参考”摘要？
7. P1-B.2 是否允许 LLM 辅助生成项目摘要和标签建议？如果允许，是否必须显示 `llm_assisted + human_reviewed`？
8. 是否允许用户手动选择 approved 项目，还是仍由系统按路径固定一个试航包？
9. 当用户背景不足以支持某路径时，页面应提示“补充材料后再试航”还是给出更保守的替代试航？
