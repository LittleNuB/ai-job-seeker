# 寻径星图 P2 岗位场景 Fixture

Task ID: DATA-007
Date: 2026-06-15
Status: aligned role star point names and scenario groups

## 1. 交付结论

本轮更新 `data/pathfinder/role-scenarios/p2-role-scenarios.json`，在 DATA-006 的 72 个岗位场景基础上，对齐 PM merge review 后确定的前台唯一 12 星点命名。

本 fixture 仍只提供只读数据，不新增前端、后端、数据库迁移、搜索、抓取或运行链路。所有 JD 证据只作为当前样本趋势参考，不代表市场完整覆盖。

## 2. 数据模型

fixture 继续使用 `RoleStarPoint -> RoleScenario -> PilotTaskBinding` 三层结构：

- `roleStarPoints`：12 个正式岗位星点父级，展示名必须与 PM 基线完全一致。
- `roleScenarioGroups`：按岗位星点分组，每个星点 6 个 `RoleScenario`。
- `pilotTaskBinding`：每个场景绑定到 P1-D 三类任务包之一，并标明当前是 `template_ready` 还是 `needs_task_review`。

每个 `RoleScenario` 都保留以下字段：

- `scenarioId`
- `roleStarPointId`
- `displayName`
- `scenarioSummary`
- `status`
- `jdEvidenceBasis`
- `commonTasks`
- `commonDeliverables`
- `entryThreshold`
- `industryPreferenceTags`
- `toolCategories`
- `pilotTaskBinding`
- `notClaims`
- `provenance`

## 3. 12 个岗位星点

| 岗位星点 ID | 展示名 | 场景数 | active | needs_review |
|---|---|---:|---:|---:|
| `ai-application-product-manager` | AI 产品经理（AI应用方向） | 6 | 5 | 1 |
| `ai-data-product-manager` | 数据产品经理（AI数据方向） | 6 | 5 | 1 |
| `ai-solution-architect` | AI解决方案架构师 | 6 | 5 | 1 |
| `ai-implementation-consultant` | AI应用实施顾问 | 6 | 4 | 2 |
| `ai-application-engineer` | AI应用开发工程师 | 6 | 6 | 0 |
| `rag-engineer` | RAG工程师 | 6 | 5 | 1 |
| `agent-application-engineer` | Agent应用开发工程师 | 6 | 5 | 1 |
| `mlops-ai-platform-engineer` | MLOps/AI平台工程师 | 6 | 5 | 1 |
| `llm-evaluation-engineer` | LLM评测工程师 | 6 | 5 | 1 |
| `ai-annotation-qc-specialist` | AI数据标注与质检专家 | 6 | 5 | 1 |
| `ai-data-analyst` | AI数据分析师 | 6 | 5 | 1 |
| `ai-operations-growth-specialist` | AI运营/增长专家 | 6 | 3 | 3 |

总计：12 个岗位星点、12 个场景分组、72 个岗位场景，其中 58 个 `active`、14 个 `needs_review`、0 个 `draft`。

## 4. DATA-007 收敛记录

| DATA-006 旧口径 | DATA-007 处理 |
|---|---|
| `Prompt 工程师` | 不再作为前台星点；保留为应用开发、Agent、产品或运营场景中的 prompt / 模板子场景来源。 |
| `AI 全栈工程师` | 收敛为 `AI应用开发工程师`。 |
| `AI 标注经理` | 收敛为 `AI数据标注与质检专家`。 |
| `LLM 评测专员` | 收敛为 `LLM评测工程师`。 |
| `Agent 应用开发工程师` | ID 收敛为 `agent-application-engineer`，展示名对齐为 `Agent应用开发工程师`。 |

新增 `AI应用实施顾问` 星点，包含 6 个场景：实施需求确认与范围澄清、配置清单与权限台账、客户培训与上手材料、问题台账与响应分级、验收测试与交接清单、上线观察与运营支持。其中验收交接和上线观察场景因直接 JD 证据较薄，先标记为 `needs_review`。

## 5. 证据边界

`jdEvidenceBasis` 只写短证据摘要和内部样本引用，例如 `cleaned_jds[107]`。这些引用来自当前仓库内的 cleaned JD 样本、岗位 taxonomy、P1-D 星点 fixture、P1-D 任务包和已审计公开项目 fixture。

证据表达必须遵守以下边界：

- 只说当前样本趋势参考，不说市场完整覆盖。
- 不复制大段 JD 原文。
- 不把公司名作为默认前台字段。
- 不把 LLM 归纳当作真实岗位证据。
- 对证据较薄但产品价值明确的场景标记 `needs_review`。

## 6. 后续使用建议

前台不应一次性暴露全部 72 个场景。建议先按用户确认信号，在每个岗位星点下展示 3 到 5 个最相关场景，并保留“探索更多场景”的入口。

后续若要把 `needs_review` 提升为 `active`，应补充更直接的 JD 样本或人工核验资料，并同步更新 `jdEvidenceBasis.sourceSampleRefs` 与 `provenance`。
