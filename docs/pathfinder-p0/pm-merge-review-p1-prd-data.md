# 寻径星图 PM Merge Review：P1 PRD 与数据底座

日期：2026-06-07

主 Agent：产品经理 / 主 Agent

输入文档：

- `docs/pathfinder-p0/p1-productization-prd.md`
- `docs/pathfinder-p0/data-foundation-plan.md`

对应任务：

- `P1-PRD-001`：产品规划A，commit `613263e`，`docs: add pathfinder p1 productization prd`
- `DATA-001`：数据方案A，commit `79e2d1b`，`docs: add pathfinder data foundation plan`

## 1. 总体结论

两份文档可以合并进入下一阶段规划，没有阻断级冲突。

共同结论是：寻径星图下一步不应继续扩成开放岗位推荐器，而应先把当前参赛 Demo 产品化为“真实用户可完成的一次固定试航工作台”。P1-A 保留单一固定 TrialPackage、OpenDocuments、三条路径和固定 6 问，但允许用户填写自己的背景、完成自己的作答、保存 TrailRecord、通过反包装检查后导出 Markdown。

产品负责人已确认 5 个决策点。可以发布 P1-A 产品化第一轮任务。

确认后的关键变化：P1-A 全由真实用户输入，不保留小 C 示意或一键填充。小 C 只保留在 P0 历史文档和参赛复盘语境中，不进入 P1-A 产品流程、默认数据、作答样例或导出材料。

## 2. 一致结论

两份文档在以下点上保持一致：

1. P1-A 不做开放岗位推荐、不做自由 JD 推荐、不做多开源项目推荐。
2. P1-A 固定 `p1a-opendocuments-engineering-kb@1.0.0` TrialPackage，OpenDocuments 仍是只读公开参考项目。
3. P1-A 继续复用 `analysis_records`，不新增专用表，不新增 Alembic migration。
4. P1-A 核心产品化方向是：真实用户背景输入、固定 6 问作答、保存、反包装检查、Markdown 导出。
5. P1-B 再处理正式 auth、完整历史记录、导出历史、规则版本和专用表评估。
6. P2 再处理多 TrialPackage、内容审核工作台、发布流、规则后台和使用数据面板。
7. 全阶段禁止能力认证、offer 概率、企业筛选、简历包装、复杂评分、真实 RAG 和 OpenDocuments 官方贡献暗示。

## 3. 需要主 Agent 收口的差异

### 3.1 P1-A 是否允许替换候选人背景

PRD 倾向：P1-A 从“小 C 固定 Demo”升级为真实用户可填写背景。

数据方案提出待确认项：P1-A 是继续只支持固定小 C，还是允许替换候选人背景但不开放推荐。

产品负责人决策：

- P1-A 全由真实用户输入。
- 不保留小 C 示意或一键填充。
- 路径、样例 JD、OpenDocuments、固定 6 问、TrialPackage 仍只读固定。
- 系统不根据用户背景重新推荐路径，只展示“基于当前固定试航包的背景证据引用和作答材料”。

落地要求：后续前端、数据和导出文案不得把小 C 作为 P1-A 默认用户、默认背景、默认作答或默认作品集主体。

### 3.2 P1-A 是否接入 LLM

PRD 允许克制 LLM：背景摘要、6 问润色、面试追问、作品集草稿结构化、反包装表达检查。

数据方案强调：LLM 结构化和 fallback 归纳必须标注人工复核状态，不得混淆真实 JD 证据与模型补全。

产品负责人决策：

- P1-A 第一轮开发不把 LLM 作为主链路依赖。
- 先完成真实用户输入、保存、导出、反包装和 TrialPackage fixture。
- LLM 作为 P1-A 第二轮可选增强：只做“草稿辅助”，并强制标记为 AI 辅助草稿，导出前必须过 AntiPackagingCheck。

理由：当前最大问题是产品不像真实产品，而不是缺一个模型调用。先把可用闭环和数据边界打牢，再接 LLM 更稳。

### 3.3 P1-B 是否新增专用表

PRD 倾向：P1-B 评估专用表或迁移方案。

数据方案倾向：P1-A 复用 `analysis_records`，P1-B 再评估 `pathfinder_records`、`trial_packages`、`evidence_mappings` 等专用表。

产品负责人决策：

- P1-A 继续复用 `analysis_records`。
- P1-B 先写 migration PRD，不直接实现迁移。
- 只有历史记录、证据链查询、规则版本和删除策略确实被通用表限制时，再建专用表。

### 3.4 JD 样本公司名展示

数据方案指出当前 cleaned JD 覆盖 9 家公司样本，但公司名展示 / 匿名策略需确认。

产品负责人决策：

- P1-A 页面和导出默认使用“样例 JD / 当前样本趋势参考”，不突出真实公司名。
- 内部数据可保留公司字段用于去重、批次和质量报告。
- 如果展示公司名，必须加样本说明和来源边界，并由产品负责人单独确认。

### 3.5 OpenDocuments License 核验责任

数据方案提出 GitHub URL、License、仓库变化和下线条件需要治理。

产品负责人决策：

- P1-A 上线前新增 `OpenSourceProjectRecord` fixture，记录 URL、License、核验日期、核验人和不可声称内容。
- License 或 README 发生重大变化时，TrialPackage 标记为 `needs_review`，禁止新增导出快照，已导出历史保留当时快照。

## 4. Scope Guard 审计

本次合并审计未发现两份文档引入以下能力：

- 能力认证
- offer 概率或录用预测
- 企业筛选候选人
- 简历包装或自动投递
- 多开源项目黑箱推荐
- 真实 RAG 检索
- 复杂评分系统
- OpenDocuments 官方贡献暗示

两份文档中出现这些词，主要是作为“不做 / 禁止 / 不能支撑”的边界说明。后续前端、后端、数据和 QA 任务仍需保留禁用词正反语境测试，避免把否定语境误判为阻断。

## 5. 合并后的 P1-A 范围

产品负责人确认后的 P1-A 只包含以下能力：

1. 背景输入：真实用户填写自己的背景；不提供小 C 一键填充、默认身份或默认作答。
2. 固定试航包：只读加载 `p1a-opendocuments-engineering-kb@1.0.0`。
3. 固定路径：三条路径固定展示，不做重新推荐。
4. 证据链：展示 JD 样例证据、用户背景证据、OpenDocuments 公开来源、风险边界和下一步试航。
5. 固定 6 问：用户完成自己的作答；页面可提供问题解释和填写提示，但不提供小 C 示例答案。
6. 结果产物：TrailRecord、PortfolioDraft、InterviewPrep、AntiPackagingCheck、MarkdownSnapshot。
7. 保存与恢复：继续复用 `analysis_records`，支持当前记录恢复、保存和删除。
8. 导出：前端单一 Markdown 模板源，阻断状态不能导出 full Markdown。
9. 数据 fixture：TrialPackage、OpenSourceProjectRecord、EvidenceMapping、AntiPackagingRule 最小 JSON。
10. QA：真实用户输入、缺项阻断、反包装阻断、Markdown 九项、移动端和 fallback 回归。

## 6. 不进入 P1-A 的内容

以下内容暂不进入 P1-A：

- 自由 JD 输入和路径推荐。
- 多 TrialPackage 选择。
- 多开源项目推荐。
- 真实 RAG。
- LLM 改变路径结论。
- 专用表和 migration。
- 完整历史记录列表和筛选。
- 正式内容审核后台。
- 使用数据面板。
- 作品集公开展示空间。
- 简历导出或简历优化。

## 7. 下一轮任务建议

确认 5 个产品决策后，建议按以下顺序发布任务：

1. `DATA-002`：固化 P1-A 最小数据 fixture
   - 产物：TrialPackage JSON、OpenSourceProjectRecord JSON、EvidenceMapping JSON、AntiPackagingRule JSON、JD batch metadata 草案。
   - 要求：TrialPackage ID 使用 `p1a-opendocuments-engineering-kb@1.0.0`，不包含小 C 默认用户数据。
   - 不做：新表、抓取、真实 RAG、多项目推荐。

2. `FE-002`：真实用户输入与固定试航包产品化
   - 产物：背景输入表单、固定 TrialPackage 展示、结果页真实用户文案、Markdown 使用用户快照。
   - 要求：移除 P1-A 产品流程中的小 C 示意、默认背景和默认作答。
   - 不做：新路径推荐、LLM 主链路、多包选择。

3. `BE-002`：P1-A TrailRecord 保存兼容
   - 产物：兼容 `UserProfileInput`、`TrialPackage` 快照、`EvidenceMapping` 摘要、反包装状态和 MarkdownSnapshot。
   - 不做：migration、专用表、后端 Markdown 生成、评分字段。

4. `QA-002`：P1-A 产品化回归计划
   - 产物：真实用户输入、无小 C 默认内容、保存恢复、缺项阻断、反包装阻断、Markdown 导出、移动端和 fallback 的验收用例。

## 8. 产品负责人已确认决策

2026-06-07，产品负责人确认：

1. P1-A 全由真实用户输入，不保留小 C 示意。
2. P1-A 第一轮暂不把 LLM 作为主链路依赖，先做真实输入、保存、导出、反包装。
3. P1-A 继续复用 `analysis_records`，不新增 migration；P1-B 再做专用表 PRD。
4. P1-A 默认匿名化 / 弱化 JD 公司名展示，只说样例 JD 与样本趋势参考。
5. OpenDocuments License 和来源核验做成数据 fixture，由数据任务维护核验日期和边界说明。

## 9. 主 Agent 判断

可以进入下一阶段，但不是直接开发所有 P1 功能。

推荐进入“P1-A 产品化第一轮”，目标是把当前展示 Demo 变成真实用户可使用的一次固定试航产品。第一轮不追求智能推荐、不追求 LLM 炫技、不追求数据规模扩张，优先把输入、证据链、保存、导出和反包装做成稳定产品闭环。
