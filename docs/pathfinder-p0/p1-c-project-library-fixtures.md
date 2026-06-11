# 寻径星图 P1-C.1 多开源项目审计库 Fixture

日期：2026-06-11

任务 ID：DATA-003

子对话名称：数据方案B

## 交付范围

本轮建立 P1-C.1 可用的多项目审计库 fixture，不实现 GitHub Search、不做实时抓取、不改前后端运行逻辑、不新增数据库表或 migration。

P1-C.1 的产品边界是：

- 从已审计项目库中展示项目推荐卡。
- 用户只能选择 `approved_for_trial_package` 且 License 已核验的项目进入通用试航模板。
- 未审计、`needs_review` 或 `candidate` 项目不得作为完整试航主项目。
- 匹配解释只表达规则命中，不输出分数、排名、最佳项目、能力认证或录用判断。

## 新增 / 更新 Fixture

项目记录：

- `data/pathfinder/open-source-projects/opendocuments.json`
- `data/pathfinder/open-source-projects/ragflow.json`
- `data/pathfinder/open-source-projects/unstructured.json`
- `data/pathfinder/open-source-projects/apache-superset.json`
- `data/pathfinder/open-source-projects/chatwoot.json`
- `data/pathfinder/open-source-projects/node-red.json`
- `data/pathfinder/open-source-projects/openrefine.json`

匹配与模板：

- `data/pathfinder/project-matching/p1c-project-library-matching.json`

反包装规则：

- `data/pathfinder/anti-packaging-rules/p1a-rules.json` 升级 `rulesVersion = p1c-rules.v1`，新增通用开源项目归属规则。

## 项目列表与 License 状态

| projectId | 项目 | 方向 | License | 状态 | 核验日期 |
|---|---|---|---|---|---|
| `opendocuments` | OpenDocuments | RAG / 知识库 / 企业文档搜索 | MIT | `verified` | 2026-06-11 |
| `ragflow` | RAGFlow | RAG / Agentic 知识工作流 | Apache-2.0 | `verified` | 2026-06-11 |
| `unstructured` | Unstructured | 文档解析 / 文档 ETL | Apache-2.0 | `verified` | 2026-06-11 |
| `apache-superset` | Apache Superset | 数据可视化 / BI | Apache-2.0 | `verified` | 2026-06-11 |
| `chatwoot` | Chatwoot | 智能客服 / 工单 / 客户支持 | MIT Expat outside enterprise directory | `verified` | 2026-06-11 |
| `node-red` | Node-RED | 低代码 / 工作流自动化 | Apache-2.0 | `verified` | 2026-06-11 |
| `openrefine` | OpenRefine | 行业数据处理 / 数据清洗 | BSD-3-Clause | `verified` | 2026-06-11 |

核验方法均为人工打开公开仓库页、README 和 License 文件页。Stars、forks、commits、release cadence 只允许记录为 `nonCanonicalMetadata`，不得参与项目选择、匹配解释或用户可见排序。

## OpenSourceProjectRecord Schema 摘要

每个项目记录必须包含：

- 来源：`sourceUrl`、`officialUrl`、`host`、`repositoryVisibility`
- License：`license`、`licenseSpdxId`、`licenseFileUrl`、`licenseVerificationStatus`、`licenseVerifiedAt`
- 审计边界：`referenceRole = reference_only`、`status`、`lastManualCheckAt`、`manualCheckMethod`
- 匹配特征：`suitableUserSignals`、`unsuitableUserSignals`、`pathFit`、`projectTags`、`capabilityTags`、`riskTags`
- 试航入口：`trialTaskIdea`、`evidenceRequirements`
- 反包装：`forbiddenClaims`、`riskNotes`、`sourceBoundary`、`notClaimed`、`allowedContexts`、`reviewTriggers`

`status = approved_for_trial_package` 的硬门槛：

- `licenseVerificationStatus = verified`
- `referenceRole = reference_only`
- 已有人工 README / License 核验日期
- 已填写不可声称内容和 review trigger
- 未使用热度、排名或分数作为适配依据

## P1-C.1 匹配 Fixture

`p1c-project-library-matching.json` 定义：

- `selectionPolicy`：只允许 approved + verified + reference_only 项目进入完整试航。
- `projectCardSchema`：前端项目卡必须展示来源、License、适配信号、边界和不可声称内容；禁止 `matchScore`、`ranking`、`bestProject` 等字段。
- `genericTrialTemplate`：选中任一已审计项目后进入通用 6 问模板。
- `matchRules`：规则解释项目与用户确认信号的连接，不做评分排序。

匹配规则覆盖：

- 文档问答 / 知识库：OpenDocuments、RAGFlow
- 文档解析 / 数据准备：Unstructured
- BI / 指标看板：Apache Superset
- 客服 / 工单 / 运营实施：Chatwoot
- 低代码流程自动化：Node-RED
- 数据清洗 / 质量检查：OpenRefine

## 反包装更新

新增规则 `p1c-open-source-project-attribution-general`：

- 阻断：“我开发了该开源项目”“我参与官方贡献”“我复现完整系统”“我完成企业级交付”等归属或交付承诺。
- 允许：“基于该开源项目做场景拆解”“仅作为 reference_only 参考”“我的贡献是试航方案、流程、指标和边界说明”等边界表达。

同一段同时出现否定边界和正向承诺时，按阻断处理。

## 非目标

本轮未做：

- GitHub Search 或自动候选发现
- 实时仓库抓取
- 真实 RAG
- 多项目黑箱推荐
- 项目热度排序
- 能力认证、offer 概率、企业筛选、简历包装或复杂评分
- 运行时代码、数据库表或 migration

## 输入缺口

任务要求读取 `AGENTS.md` 和 `CONTEXT.md`，但在正式仓库和 DATA-003 worktree 中未找到。`docs/pathfinder-p0/p1-c-agentic-interview-plan.md` 未在当前 DATA-003 worktree 中找到，但在其他正式 worktree 中存在，本轮已读取 `pathfinder-fe-003` 中的同名文档作为 P1-C 输入。

## Remaining Risks

- License 和 README 可能变化，需要定期复核；建议超过 60 天自动标记待复核。
- Chatwoot 的 License 文件明确区分 enterprise 目录边界，后续 UI 必须保留该说明。
- 项目匹配规则目前是 fixture，不是运行时实现；FE / BE 需要在实现中继续禁止分数、排名和热度依据。
- 新项目库扩大后，QA 需要补充“基于项目做场景拆解”与“我开发了项目”的正反语境用例。
- P1-C.2 若继续扩展 10-20 个项目，建议引入二人复核或产品负责人抽检流程。
