# 寻径星图 P1-D Lite 数据内容基线

Task ID: DATA-004
Date: 2026-06-14
Status: P1-D Lite competition content baseline

## 1. 交付结论

本任务为 P1-D Lite 前端提供两个只读内容 fixture：

- `data/pathfinder/role-star-points/p1d-role-star-points.json`
- `data/pathfinder/pilot-task-packs/p1d-pilot-task-packs.json`

它们定义 12 个用户可见的 `岗位星点` 和三类 `适航任务`。这些内容用于前端星图、星点详情、试航任务入口和适航成果包文案，不新增后端运行逻辑、不新增 migration、不调用 GitHub Search。

所有岗位表达都来自现有 taxonomy、当前 JD 样本趋势、已审计项目 fixture 和人工产品定义的组合。它们只能说明“当前样例 JD / 当前样本趋势参考中出现过哪些工作信号”，不能表达市场全量、岗位结果判断、能力认证、offer / 录用概率、企业筛选或简历包装。

## 2. 来源资产

| 来源 | 用途 | 边界 |
|---|---|---|
| `data/ai_positions.json` | 7 个 AI 岗位方向、46 个结构化岗位，作为 12 星点的 taxonomy 来源 | 偏 AI 技术岗位，不代表市场全量 |
| `scraper/cleaned/cleaned_jds.json` | 2537 条 cleaned JD 样本，覆盖 9 家公司样本，用于样本趋势参考 | 不复制原始 JD 文本，不代表全网或全市场 |
| `data/pathfinder/open-source-projects/*.json` | 已核验公开项目的 License、reference_only、forbiddenClaims | 公开项目只作参考，不是用户项目贡献 |
| `data/pathfinder/project-matching/p1c-project-library-matching.json` | 项目卡和通用试航模板的选择边界 | 明确禁止 GitHub Search、未审计项目主试航、评分和排名 |
| `docs/pathfinder-p0/p1-d-lite-scope.md` | P1-D Lite 12 星点、三类试航、2.5D 星图和成果包定位 | 比赛提交范围，不包含 P2 平台化能力 |

## 3. 12 个岗位星点如何形成

12 个岗位星点不是从 46 个岗位中直接展示全量列表，而是按 P1-D Lite 的用户入口和前端星图体验重新分组。

| 星域 | 岗位星点 | 主要来源 |
|---|---|---|
| 产品与方案星域 | AI 应用产品助理、AI 产品经理助理、行业 AI 解决方案助理 | `AI 产品经理`、`数据产品经理`、`AI 商业化产品经理`、`AI 解决方案架构师` 和 P1-B role path |
| 应用开发星域 | RAG 应用开发、Agent 应用开发、AI 工具链开发 | `RAG 工程师`、`AI 应用开发工程师`、`Prompt 工程师`、`MLOps/AI 平台工程师`、`AI 全栈工程师` |
| 数据与评测星域 | AI 数据标注与质检、LLM 评测助理、数据分析助理 | `AI 标注经理`、`AI 训练师`、`数据分析师`、`数据科学家`、`数据治理工程师` |
| 运营增长星域 | AI 内容运营、AI 社群运营、AI 活动运营 | `AI 内容运营`、`AI 运营/增长专家`、`AI 教育产品经理`、运营实施相关 role path |

每个星点都包含：

- `relatedRoleNames`：对应 taxonomy 或既有 Pathfinder role path 的岗位叫法；
- `jdSignalSummary`：只写当前样例 JD / 样本趋势参考；
- `commonTasks`、`commonDeliverables`、`commonTools`：供前端星点详情使用；
- `migrationEntrySignals`：把用户真实经历映射到可试航入口；
- `riskSignals` 和 `notClaims`：防止过度承诺和包装；
- `pilotTaskType`：三类试航之一；
- `sampleEvidenceNotes`：说明来自哪个 fixture 或文档；
- `simulatedExample`：只作前端解释样例，并明确 `isEvidence=false`。

## 4. 为什么只做 12 个，不展示 46 个全量

P1-D Lite 的核心页面是个人 AI 求职星图，不是岗位百科或招聘目录。直接展示 46 个 taxonomy 岗位有三个问题：

1. 对非 AI / 非 CS 转型用户噪音过高，特别是算法、芯片、基础设施等硬技术岗位会让第一屏变成岗位列表。
2. 46 个岗位看似完整，容易被误读为市场覆盖或系统推荐能力，而当前数据只能支持样本趋势参考。
3. 比赛提交前需要稳定前端内容基线，12 个星点更适合形成 2.5D 星图、top 3 高亮和点击探索。

因此，12 个星点采用“产品 / 方案、应用开发、数据 / 评测、运营增长”四个星域，每个星域 3 个星点。它们覆盖 P1-D Lite 的试航入口，而不是穷尽所有 AI 岗位。

## 5. 三类适航任务如何对应真实需求

| 任务包 | 对应岗位星点 | 对应 JD 样本信号 | 产出 |
|---|---|---|---|
| `development_open_source_adaptation` | 行业 AI 解决方案助理、RAG 应用开发、Agent 应用开发、AI 工具链开发、AI 数据标注与质检、LLM 评测助理、数据分析助理 | 开源参考项目阅读、场景拆解、数据 / 检索 / 评测 / 工具链边界、PoC 范围 | 项目拆解、场景改造方案、技术边界、面试追问准备 |
| `product_vibe_coding_prototype` | AI 应用产品助理、AI 产品经理助理 | 需求拆解、用户流程、MVP、验收指标、反馈闭环 | 原型概念、PRD 摘要、用户流程、验收指标、迭代清单 |
| `operations_ai_experience_camp` | AI 内容运营、AI 社群运营、AI 活动运营 | 内容、用户、活动、社群、反馈、AIGC 工具使用和复盘 | AI 工具体验营运营方案、内容日历、任务卡、反馈闭环、复盘指标 |

运营任务被明确写成“AI 工具体验营运营方案试航”，不是泛泛的运营方案。它要求目标人群、活动节奏、内容日历、AI 工具任务、反馈闭环、复盘指标和风险边界同时存在。

## 6. 内容 provenance

| 内容类型 | 在 fixture 中的标记 | 是否可作为证据 |
|---|---|---|
| 现有 taxonomy | `sampleEvidenceNotes.scope=taxonomy_reference` | 可作为岗位命名和分组依据 |
| cleaned JD 样本趋势 | `sampleEvidenceNotes.scope=sample_trend_reference_only` | 可作为样本趋势参考，不可写成市场全量 |
| 已审计项目 fixture | `sampleEvidenceNotes.scope=audited_fixture_reference` | 可作为公开参考项目边界和任务素材 |
| P1-D 产品定义 | `sampleEvidenceNotes.scope=product_definition` | 可作为前端内容结构依据 |
| 模拟任务例子 | `simulatedExample.isEvidence=false` | 不可作为 JD 证据或用户经历证据 |
| 人工产品定义 | fixture 字段本身 | 可作为 P1-D Lite 文案和任务结构，但不替代 JD 样本 |

## 7. 明确不做

DATA-004 不做以下能力：

- 不做 GitHub Search；
- 不做新的大规模抓取；
- 不做全市场覆盖、岗位真实分布或招聘强度判断；
- 不做分数、百分比、排名、复杂评分；
- 不做 offer / 录用概率预测；
- 不做能力认证、岗位胜任证明、企业筛选或简历包装；
- 不做真实 RAG 主链路；
- 不让 LLM 直接决定岗位、项目或结论；
- 不新增后端 / 前端运行逻辑；
- 不新增 Alembic migration 或专用 Pathfinder 表。

## 8. 前端使用建议

前端可以直接读取 12 个 `roleStarPoints` 生成星图节点，并按 `starField` 分组。高亮 top 3 时应基于用户确认信号和规则命中解释，而不是显示分数。

星点详情页建议展示：

- `jdSignalSummary`
- `commonTasks`
- `commonDeliverables`
- `migrationEntrySignals`
- `riskSignals`
- `pilotTaskType`
- `notClaims`

适航任务入口可以读取 `taskPacks`，按 `applicableRoleStarPointIds` 过滤。结果页应呈现为 `适航成果包`，Markdown 只是导出格式。
