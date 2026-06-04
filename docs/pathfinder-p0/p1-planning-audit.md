# 寻径星图 P1 规划文档一致性审计报告

更新时间：2026-06-04

适用对象：产品、UX/UI、前端、后端、QA

关联文档：

- `README.md`
- `scope-lock-prd.md`
- `content-assets.md`
- `ux-flow.md`
- `technical-review.md`
- `qa-demo-plan.md`
- `handoff-status.md`
- `p1-product-roadmap.md`
- `p0-polish-copy-final.md`
- `p1-ui-design-brief.md`
- `p0-polish-frontend-implementation.md`
- `p0-polish-qa-report.md`
- `p1-backend-data-model-brief.md`

## 1. 审计目标与结论

本次审计目标是检查 Pathfinder P0 / P1 已固化文档之间的范围、术语、模块边界、实施顺序和待确认事项是否一致。

本次审计不改代码，不修改 `scope-lock-prd.md`，不扩大 P0 Scope。

总体结论：

- 未发现阻断级文档冲突。
- P0 Scope 在 P1 产品、UI、后端、QA 文档中保持一致，没有被 P1/P2 规划反向扩大。
- 三条路径状态保持一致。
- Markdown 导出九项已在 P1 产品、P0 polish、前端实现和 QA 报告中收敛；未发现“固定五段”残留。
- OpenDocuments 归属边界保持一致。
- P1-A / P1-B 后端路线与当前后端收口意见一致：先复用 `analysis_records`，对象稳定后再迁移专用表。
- 仍有若干进入 P1 实现前需要产品确认的问题，详见第 9 节。

## 2. P0 Scope 一致性审计

结论：通过。

已确认所有 P1 / P0 polish 文档均未反向扩大 P0 Scope。P0 仍锁定：

- 唯一 Demo 用户：小 C。
- 唯一公开参考项目：OpenDocuments。
- 唯一任务：工程企业知识库 AI 助手试航。
- 唯一导出格式：Markdown。
- 三条路径：
  - 行业 AI 应用产品助理。
  - 行业 AI 解决方案助理。
  - 算法工程 / 大模型研发。

一致性证据：

- `scope-lock-prd.md` 明确 P0 Scope Lock。
- `p1-product-roadmap.md` 明确“不修改 P0 Scope Lock，不新增 P0 范围，不暗示 P0 已包含 P1/P2 能力”。
- `p0-polish-copy-final.md` 明确 P0 仍锁定唯一用户、三条路径、唯一项目、唯一任务、唯一导出格式。
- `p1-ui-design-brief.md` 明确 P1 UI 只改善可读性、专业感、信息层级、展示冲击力和反包装识别度，不新增业务能力。
- `p1-backend-data-model-brief.md` 明确 P1 后端预研不修改 P0 Scope Lock，不修改 P0 后端实现，不新增 migration，不要求当前代码立即落地。

审计判断：

- P1 文档中的 TrialPackage、TrailRecord、AntiPackagingCheck、PortfolioDraft、InterviewPrep 均被描述为 P1 产品化对象，不是 P0 必做项。
- P2 文档中的多 TrialPackage 管理、内容审核工作台、回归测试控制台等能力均被放在 P2 平台化方向，没有进入 P0。

## 3. 三条路径状态一致性

结论：通过。

所有关键文档的状态口径一致：

| 路径 | 固定状态 |
|---|---|
| 行业 AI 应用产品助理 | 优先试航 |
| 行业 AI 解决方案助理 | 适合探索 |
| 算法工程 / 大模型研发 | 短期不建议 |

已检查文档：

- `scope-lock-prd.md`
- `content-assets.md`
- `ux-flow.md`
- `qa-demo-plan.md`
- `p1-product-roadmap.md`
- `p0-polish-copy-final.md`
- `p1-ui-design-brief.md`
- `p0-polish-frontend-implementation.md`
- `p0-polish-qa-report.md`
- `p1-backend-data-model-brief.md`

非阻断说明：

- `ux-flow.md` 背景页样例 JD 卡中使用“与小 C 当前背景连接最强 / 可探索 / 短期门槛较高”等解释性文案，后续推荐页仍使用锁定状态，不构成冲突。

## 4. Markdown 九项一致性

结论：通过，存在一个非阻断命名收敛建议。

P1 / P0 polish 当前统一九项为：

1. 候选人背景
2. 路径结论
3. 样例 JD 说明
4. OpenDocuments 来源与 License
5. OpenDocuments 原项目能力
6. 小 C 试航贡献
7. 不可声称内容
8. 固定 6 问作答
9. 免责声明

已确认：

- `p1-product-roadmap.md` 使用九项完整清单。
- `p0-polish-copy-final.md` 使用九项完整清单。
- `p0-polish-frontend-implementation.md` 记录 Markdown 九项已实现。
- `p0-polish-qa-report.md` 验收 Markdown 九项完整通过。
- `p1-backend-data-model-brief.md` 要求 Markdown 保留来源、License、不可声称内容、免责声明，并保持单一模板源。
- 未发现“固定五段”残留。

非阻断命名差异：

| 文档 | 现有说法 | 建议收敛 |
|---|---|---|
| `technical-review.md`、`content-assets.md`、`qa-demo-plan.md` 部分段落 | 开源来源与 License / 来源与 License | P1 后续统一为 “OpenDocuments 来源与 License” |
| `technical-review.md`、`content-assets.md` 部分段落 | 固定 6 问及小 C 作答 | P1 后续统一为 “固定 6 问作答”，细节内再包含小 C 回答、证据来源、边界提示 |

是否阻断 P1：不阻断。当前含义一致，P1 实现可按九项 canonical wording 固化。

推荐修正方案：

- P1 实现和新文档统一使用“OpenDocuments 来源与 License”和“固定 6 问作答”。
- 不必回改 P0 基线文档，避免扰动已通过归档；可在 P1 文档中声明 canonical wording。

## 5. OpenDocuments 归属边界一致性

结论：通过。

统一口径：

- OpenDocuments 是公开参考项目 / 原项目能力来源。
- OpenDocuments 原项目能力来自原作者 / 维护者，不属于小 C。
- 小 C 不参与 OpenDocuments 官方贡献。
- 小 C 本次贡献仅限：
  - 场景拆解。
  - 2 周 MVP 方案。
  - 指标。
  - 风险。
  - 演示材料。
  - 作品集表达草稿。

已检查：

- `content-assets.md` 明确本试航基于公开项目信息做产品拆解与场景设计，不表述为本人参与该仓库开发。
- `ux-flow.md` 明确 OpenDocuments 原项目能力与小 C 试航贡献边界。
- `p0-polish-copy-final.md` 明确“小 C 的贡献只包括...”。
- `p1-ui-design-brief.md` 要求来源面板、License、原项目能力与小 C 作答视觉强分区。
- `p1-backend-data-model-brief.md` 要求 PortfolioDraft 不把 OpenDocuments 原项目能力写成小 C 个人产出。
- `p0-polish-qa-report.md` 已验证页面和 Markdown 未暗示小 C 参与官方贡献。

非阻断说明：

- `handoff-status.md` 仍保留任务 2 v1.2 收尾要求，提示把“OpenDocuments 原项目贡献”统一改为“OpenDocuments 原项目能力”。当前正文未发现正向使用“原项目贡献”作为产品口径，该条可视为历史收尾提醒，不阻断 P1。

## 6. P1 模块边界一致性

结论：通过。

### UI 基础体验升级

一致口径：

- 只改善可读性、专业感、信息层级、展示冲击力、反包装识别度和 3 分钟演示效率。
- 不新增岗位推荐、企业筛选、简历包装、评分、概率或真实 RAG 能力。

P1-0 建议覆盖：

- 推荐页主路径视觉权重。
- 试航页 OpenDocuments 来源 / 小 C 作答强分区。
- 结果页追溯链、反包装摘要和 Markdown 区可快速定位。

### TrialPackage

一致口径：

- TrialPackage 是人工策划试航包，不是推荐器。
- P0 Demo 可封装为固定 TrialPackage。
- 普通用户不能修改路径、项目、任务集合或固定 6 问。
- 后续多个试航包应为已审核配置，不是多开源项目智能推荐。

### TrailRecord

一致口径：

- TrailRecord 保存用户一次试航过程，用于回看、导出和追溯。
- 必须记录 `trial_package_id + trial_package_version`。
- 不使用 `match_score`，不表达岗位适配分、胜任分或概率。
- P1-A 可复用 `analysis_records` 承载 JSON。

### AntiPackagingCheck

一致口径：

- AntiPackagingCheck 是反包装检查，不是评分系统。
- 覆盖能力认证、概率、企业筛选、简历包装、多项目智能推荐、真实 RAG、复杂评分、OpenDocuments 官方贡献暗示等规则。
- 高风险命中阻断完整 Markdown 导出。
- 否定语境中的禁用词不应误阻断，但需可被 QA 复核。

### PortfolioDraft

一致口径：

- PortfolioDraft 是作品集草稿，不是简历生成器。
- 内容只能来自 TrialPackage 和 TrailRecord。
- 不引入新项目、新岗位、新企业。
- 不移除来源、License、不可声称内容和免责声明。
- 编辑后触发 AntiPackagingCheck。

### InterviewPrep

一致口径：

- InterviewPrep 用于解释试航过程、证据和边界。
- 不做算法研发能力考核或岗位胜任认证。
- 不把公开项目拆解说成个人研发成果。
- 导出前必须经过 AntiPackagingCheck。

### QA 与回归测试

一致口径：

- Scope Guard 是 P1-0。
- TrialPackage 快照、TrailRecord 保存、AntiPackagingCheck、Markdown 快照、OpenDocuments 归属边界测试均需进入 P1 回归体系。
- QA 不只检查禁用词字面命中，也要检查否定语境和正向越界暗示。

## 7. P1-A / P1-B 后端路线一致性

结论：通过。

统一路线：

1. P1-A：先复用 `analysis_records`，用 JSON 字符串承载 P1 对象。
2. P1-B：当多个 TrialPackage、规则命中明细、草稿独立编辑、历史筛选等需求稳定后，再新增专用表和 migration。

P1-A 口径：

- `analysis_records.type = "pathfinder"`。
- `input_text` 保存 P1 输入对象 JSON。
- `result` 保存 P1 结果对象 JSON。
- `match_score = null`。
- 不新增 migration。
- 继续复用 P0 用户隔离、历史、删除、导出能力。

P1-B 触发条件：

- 多个 TrialPackage 需要查询、版本管理或运营发布。
- AntiPackagingCheck 规则命中明细需要独立保存和调试。
- PortfolioDraft / InterviewPrep 需要独立生命周期或编辑历史。
- 历史筛选、导出、删除机制开始受 JSON 字符串限制。

Markdown 模板源：

- P0 决策保持：前端生成 Markdown，后端保存结构化结果和可选 snapshot。
- P1 继续保持单一模板源，不能前后端双写。
- 如果 P1 后续要求服务端导出 Markdown，必须把模板源统一迁移到共享模块或单一服务，前端只调用该模板源预览和下载。

禁止能力：

- P1 后端仍不得生成评分、概率、企业推荐、简历建议或真实 RAG 结果。
- API 不返回 `match_score`、胜任分、概率、企业推荐或简历包装建议。

## 8. 禁止能力一致性

结论：通过。

以下能力在所有阶段持续禁止：

- 能力认证。
- offer 概率预测。
- 录用概率、上岸概率或求职结果承诺。
- 企业筛选。
- 企业推荐 / 精准内推。
- 简历包装 / 简历自动优化。
- 自动投递。
- 多开源项目智能推荐。
- 真实 RAG 检索。
- OpenDocuments 仓库实时抓取和自动分析。
- 复杂评分系统、匹配分、胜任分、综合分或排行榜。
- 算法工程速成 / 大模型研发训练路径。
- 暗示小 C 参与 OpenDocuments 官方贡献。
- 暗示 OpenDocuments 原项目能力属于小 C 个人产出。
- 暗示完成试航等于岗位胜任或录用优势。

非阻断说明：

- 部分文档在“不可声称内容”“免责声明”“不做清单”中出现禁用词，这是安全边界说明，不是正向能力暗示。
- `p0-polish-qa-report.md` 已记录该策略：当前按语义安全判定通过；若未来要求“禁用词零出现”，需要同步修改最终文案和安全规则。

## 9. 待产品确认问题

### 9.1 必须确认后才能进入 P1 实现

| 优先级 | 问题 | 当前建议 |
|---|---|---|
| P0 | P1-A 阶段是否允许逐题草稿保存 | 建议允许逐题保存，但完整 Markdown 导出仍要求 6 问全部完成，尤其第 6 问 AI 使用说明必填 |
| P0 | AntiPackagingCheck 阻断后是否允许保存草稿 | 建议允许保存 `draft` 或 `export_failed` 状态，但禁止标记为完整导出 |
| P0 | Markdown 单一模板源 P1 阶段归属 | 建议 P1-A 继续前端单一模板源 + 后端 snapshot；若迁移服务端模板，必须一次性迁移为共享模板源，不允许双写 |
| P0 | TrialPackage 最小版本策略 | 建议 P1-0 必须记录 `trial_package_id + version`；完整管理员发布流可延后 |
| P0 | P0 legacy 记录兼容期结束标准 | 建议 P1-A 保持兼容；P1-B 结束兼容前必须完成旧记录读取、导出、删除和用户数据导出回归 |

### 9.2 可在 P1 实现中边做边确认

| 优先级 | 问题 | 当前建议 |
|---|---|---|
| P1 | P1 是否优先做推荐页主路径视觉权重 | 建议进入 P1-0，因为直接影响 3 分钟演示和主路径理解 |
| P1 | P1 是否优先做试航页来源 / 作答强分区 | 建议进入 P1-0，因为直接影响 OpenDocuments 归属边界 |
| P1 | 390px 试航页轻微横向溢出是否作为 P1 UI 必修 | 建议进入 P1-0 修复，属于 QA 已发现的响应式回归点 |
| P1 | 移动端表格卡片化是否进入 P1-0 | 建议拆分：结果页关键表格可读性进入 P1-0；全量表格卡片化可进 P1-1 |
| P1 | AntiPackagingCheck 否定语境规则如何落 fixture | 建议 P1-0 建立最小正反例语料，P1-1 扩展规则集 |
| P1 | TrailRecord 状态机是否采用 `draft -> completed -> exported/export_failed` | 建议按后端 brief 执行，P1 实现中细化状态切换条件 |

### 9.3 可留到 P2

| 优先级 | 问题 | 当前建议 |
|---|---|---|
| P2 | TrialPackage 是否需要完整管理员发布流 | P1-0 只需已发布固定包读取；草稿、审核、发布、下线流可放 P2 或 P1 后段 |
| P2 | 多 TrialPackage 管理 | 放 P2，且必须是已审核试航包选择，不是智能推荐 |
| P2 | AntiPackagingCheck 内容审核工作台 | 放 P2，P1 先实现规则与记录 |
| P2 | 回归测试控制台 | 放 P2，P1 先用测试用例和快照 |
| P2 | API / SDK 对外能力 | 放 P2，且只暴露试航包加载、试航记录保存、导出和反包装检查 |

## 10. 最终 P1 实施顺序建议

### P1-0 必做

产品：

- 固化 P1-A 为第一阶段后端路线。
- 固化 TrialPackage 最小版本策略：必须记录 `trial_package_id + version`。
- 确认逐题草稿保存、阻断后草稿保存、Markdown 单一模板源三项决策。

UI：

- 推荐页主路径视觉权重提升。
- 试航页 OpenDocuments 来源 / 小 C 作答强分区。
- 结果页追溯链、Markdown 区、不可声称内容、反包装摘要靠前。
- 修复 390px 试航页轻微横向溢出。

前端：

- TrialPackage 只读加载，先可用静态 JSON / 固定配置。
- TrailRecord 前端状态与 P1-A JSON 契约对齐。
- Markdown 仍使用单一模板源，保存 `markdownSnapshot`。
- 导出前保留 6 问完整性检查和第 6 问阻断。

后端：

- 复用 `analysis_records` 承载 P1-A JSON。
- 新增或调整 P1 trail-record API 契约时，不新增 migration。
- 保存 `trial_package_id`、`trial_package_version`、`answers`、`generatedOutputs`、`markdownSnapshot`、`antiPackagingResult`、`status`。
- 继续保证 `match_score = null`，不返回评分 / 概率 / 企业推荐 / 简历建议。

QA：

- Scope Guard 测试。
- TrialPackage 快照测试。
- TrailRecord 保存 / 读取 / 删除 / 权限测试。
- Markdown 九项快照测试。
- OpenDocuments 归属边界测试。
- 390px 响应式回归测试。

### P1-1 次优先

产品：

- TrailRecord 历史回看范围。
- AntiPackagingCheck 规则集扩展。
- PortfolioDraft 和 InterviewPrep 编辑范围。

UI：

- Markdown 预览体验升级。
- 空态 / 加载态 / 错误态升级。
- 结果区分区展示进一步精炼。
- 关键表格移动端卡片化。

前端：

- 作品集草稿编辑。
- 面试追问准备展示。
- AntiPackagingCheck 导出前提示和阻断结果展示。
- TrailRecord 与 Markdown 快照关联展示。

后端：

- AntiPackagingCheck 摘要记录。
- PortfolioDraft / InterviewPrep 写入 `generatedOutputs`。
- 用户数据导出加入 P1-A Pathfinder 对象。

QA：

- AntiPackagingCheck 正向阻断、提示、否定语境 fixture。
- PortfolioDraft 不引入新项目 / 新岗位 / 新企业测试。
- InterviewPrep 不做岗位胜任认证测试。
- Markdown 快照漂移测试。

### P1-2 后续增强

产品：

- 是否进入 P1-B 专用表评估。
- P1-A JSON 维护成本评估。

UI：

- 视觉规范最小集。
- 全量移动端表格卡片化。
- 反包装检查摘要组件成熟化。

前端：

- 历史记录体验增强。
- 导出失败 / export_failed 状态体验。
- 更完整的响应式修复。

后端：

- 为 P1-B 准备 schema 设计和迁移影响评估。
- 评估 AntiPackagingCheck 明细是否需要专用表。
- 评估 PortfolioDraft / InterviewPrep 是否需要独立生命周期。

QA：

- 用户数据导出 / 删除全链路回归。
- P0 legacy analysis record 兼容测试。
- P1-B bridge 预研测试计划。

### P2 延后

- 多 TrialPackage 管理。
- 试航包模板库。
- 管理员发布流完整化。
- 内容审核工作台。
- 作品集展示空间。
- 面试准备库。
- 回归测试控制台。
- 使用数据分析面板。
- 外部内容引用规范后台。
- API / SDK 对外能力。

## 11. 非阻断冲突与修正建议

| 编号 | 文件 | 冲突 / 差异 | 推荐修正 | 是否阻断 P1 |
|---|---|---|---|---|
| AUD-01 | `technical-review.md`、`content-assets.md`、`qa-demo-plan.md` vs P1 新文档 | “开源来源与 License”和“OpenDocuments 来源与 License”并存 | P1 新实现统一使用“OpenDocuments 来源与 License”；旧 P0 归档不强制回改 | 否 |
| AUD-02 | `technical-review.md`、`content-assets.md` vs P1 新文档 | “固定 6 问及小 C 作答”和“固定 6 问作答”并存 | P1 canonical wording 使用“固定 6 问作答”，细节中保留“小 C 回答 / 证据来源 / 边界提示” | 否 |
| AUD-03 | `p1-product-roadmap.md` vs `p1-backend-data-model-brief.md` | Roadmap 将 TrialPackage 版本记录列为 P1-1，后端 brief 的 Slice 1 已要求按 id + version 读取 | 区分“最小版本字段”为 P1-0，“完整版本管理 / 发布流”为 P1-1/P2 | 否 |
| AUD-04 | `p0-polish-qa-report.md` vs `p1-ui-design-brief.md` | QA 发现 390px 试航页轻微横向溢出；UI brief 已要求 390px 无横向溢出 | 将 390px 试航页溢出修复列为 P1-0 UI 必修 | 否 |
| AUD-05 | `p0-polish-qa-report.md` vs 禁用表达清单 | 禁用词在否定语境中出现 | 维持“禁止正向暗示，允许否定语境”的策略；P1 AntiPackagingCheck 必须测试 allowed_context | 否 |

## 12. 审计收口结论

未发现阻断级文档冲突。

P1 可以进入实现准备，但进入 P1-0 前必须先确认：

1. 是否允许逐题草稿保存。
2. 阻断后是否允许保存草稿但禁止完整导出。
3. Markdown 单一模板源在 P1-A 是否继续归属前端。
4. TrialPackage 最小版本字段和完整发布流的分期边界。
5. P0 legacy 记录兼容期结束标准。

推荐 P1-0 从以下顺序启动：

1. 产品确认 P1-A 决策和五个必须确认问题。
2. 后端用 `analysis_records` 承载 P1-A TrailRecord JSON，不新增 migration。
3. 前端封装 TrialPackage 只读加载和 TrailRecord 保存契约。
4. UI 先修主路径视觉权重、试航页强分区、结果页追溯链和 390px 溢出。
5. QA 建立 Scope Guard、TrialPackage 快照、TrailRecord 保存、Markdown 九项、OpenDocuments 归属边界和响应式回归。
