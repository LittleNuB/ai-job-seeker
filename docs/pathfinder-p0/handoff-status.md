# 寻径星图 P0 任务状态与交接规则

更新时间：2026-06-04

## 1. 任务状态

| 任务 | 状态 | 说明 |
|---|---|---|
| 任务 1：P0 Scope / PRD 收敛 | 已通过 | Scope Lock 与 PRD 基线已固化 |
| 任务 2：内容资产包 | 已通过，待 v1.2 收尾 | v1.1 内容可用；需收尾术语和 Markdown 6 问作答格式 |
| 任务 3：交互与页面设计 | 已通过并归档 | v1.2 已完成，页面与路由可交给前端 |
| 任务 4：前端实现方案 | 已通过 | 可进入前端静态闭环实现 |
| 任务 5：后端与数据契约 | 已通过 | 采用 P0 最小无迁移方案，复用 `analysis_records` |
| 任务 6：QA / 参赛演示验收 | 已通过并归档 | 见 `qa-demo-plan.md` |
| 后端实现：记录保存 API | 已实现并验证 | `pytest` 9 passed；`scripts/migrate_db.py` 使用既有 migration，无新增迁移 |
| 前端实现：静态闭环 | 已实现并验证 | safety、lint、E2E、build 通过；已修复 sessionStorage hydration 竞态 |

## 1.1 后端实现验收记录

验收时间：2026-06-04

已验证：

- 复用 `analysis_records`，未新增 `pathfinder_records` 表。
- 未新增 Alembic migration。
- `type = "pathfinder"`。
- `input_text` 保存 Pathfinder 输入 JSON 字符串。
- `result` 保存 `trialAnswers`、`report`、`markdownSnapshot`。
- `input_file_url = null`。
- `match_score = null`。
- API 通过 `user_id + id + type = "pathfinder"` 隔离记录。
- 固定 6 问 ID 有强校验。
- `report` 拒绝评分 / 概率类字段。
- 后端不生成 Markdown，不做推荐，不做 RAG。

验证命令：

```text
cd backend
pytest
# 9 passed

python ../scripts/migrate_db.py
# 使用既有 20260503_0001 initial schema
```

联调注意：

- 当前 `PATCH /api/pathfinder/records/{record_id}/trial-answers` 要求 6 问一次性全量提交。
- 这符合 P0 Demo 的完整提交链路；如果前端后续要逐题自动保存草稿，需要另行调整为 partial update。

## 1.2 前端实现验收记录

验收时间：2026-06-04

已验证：

- `/pathfinder -> /pathfinder/background -> /pathfinder/recommendation -> /pathfinder/trial -> /pathfinder/result` 静态闭环跑通。
- 小 C 背景、3 条样例 JD、三条岗位路径、五类证据、OpenDocuments 原项目能力、固定 6 问、结果页 8 个模块均已落地。
- 前端纯函数生成 Markdown，支持复制 / 下载。
- 6 问未完成时不生成完整 Markdown。
- 页面文案、Mock 数据和 Markdown 导出通过禁用表达守卫。
- 移动端结果页 390px 视口无横向溢出。

验证命令：

```text
cd frontend
npm run test:safety
npm run lint
npm run test:e2e
# 4 passed
npm run build
```

验收中发现并修复：

- 问题：直接打开结果页时，`sessionStorage` 中已有完整 6 问状态可能被初始空状态覆盖，导致页面误判“6 问未完成”。
- 修复：`PathfinderProvider` 增加 hydration gate，读取 sessionStorage 完成前不写回、不渲染子页面。
- 回归：新增 E2E 用例覆盖“sessionStorage 中已有完整 6 问，直接打开结果页仍可导出 Markdown”。

当前本地前端服务：

```text
http://127.0.0.1:3000/pathfinder
PID: 30264
```

## 2. 对任务 4 的交接要求

前端实现方案必须覆盖：

- 路由：`/pathfinder`、`/pathfinder/background`、`/pathfinder/recommendation`、`/pathfinder/trial`、`/pathfinder/result`
- 小 C 背景与 3 条样例 JD
- 三条路径推荐卡
- 四类证据 + 下一步试航
- OpenDocuments 原项目能力与小 C 试航贡献分区
- 固定 6 问表单
- 航迹表结果页
- Markdown 复制 / 下载
- 缺项与保护规则
- 禁用表达检查

不得增加：

- 自由 JD 粘贴
- 任意岗位推荐
- 多开源项目推荐
- 能力评分
- offer 概率
- 胜任认证
- 简历包装
- 官方贡献暗示

## 3. 对任务 5 的交接要求

后端/API 方案必须覆盖：

- 是否复用 `analysis_records` 或新增 `pathfinder_records`
- 最小 API 列表
- 请求 / 响应 JSON schema
- 数据模型与 Alembic 建议
- 6 问作答保存
- 航迹表结果保存 / 读取
- Markdown 导出边界
- 用户数据导出 / 删除复用方式
- pytest 测试用例

不得增加：

- 真实 RAG 检索
- OpenDocuments 仓库抓取与自动分析
- 复杂推荐算法
- 匹配分 / 胜任分 / 概率
- 企业筛选候选人能力
- 自动简历生成

## 4. 任务 2 v1.2 收尾要求

任务 2 只需做小范围收尾：

1. 全文把“OpenDocuments 原项目贡献”统一改成：
   - “OpenDocuments 原项目能力”
   - 或“OpenDocuments 原作者/维护者完成的能力”

2. Markdown 导出模板第 8 节“固定 6 问”补成完整导出格式：
   - 小 C 回答
   - 证据来源
   - 边界提示

3. 输出最终可交付给设计 / 开发的内容资产清单。

## 5. 统一禁用表达

禁止出现以下表达或同义表达：

- AI 能力认证
- 岗位胜任力认证
- offer 概率
- 录取概率
- 上岸概率
- 企业匹配分
- 岗位匹配分
- 简历自动优化
- 一键包装简历
- 自动投递
- 企业推荐
- 精准内推
- 多项目智能推荐
- 真实 RAG 检索
- 大模型研发训练路径
- 算法工程速成
- 保证就业
- 提升录用率
- 超越科班学生
- 官方贡献记录，除非存在真实公开贡献证据

推荐替代表达：

- 路径试航
- 短期可尝试方向
- 作品集表达材料
- 基于任务的求职探索
- 不建议短期投入
- 可展示的任务拆解
- 原项目公开能力
- 小 C 本次试航贡献

## 6. 后续 Agent 文档固化规则

后续分配给其它 agent 的文档型任务，必须在任务内完成文档固化，不再只返回纯文本建议。

执行要求：

1. agent 接到任务时，应明确目标文档路径，例如：
   - `docs/pathfinder-p0/p0-polish-copy-final.md`
   - `docs/pathfinder-p0/p1-product-roadmap.md`
   - 或后续对应的 P1 文档路径。
2. 若任务产出会影响 P0 页面文案、演示话术或 QA 验收，必须同步说明关联基线文档。
3. 若任务产出属于 P1/P2 规划，必须显式写明“不修改 P0 Scope Lock，不扩大 P0 范围”。
4. 文档落盘后，agent 应在最终回复中提供：
   - 文档路径
   - 已固化的章节摘要
   - 与 P0 Scope 的边界说明
   - 后续可交接给哪个角色。
5. 不允许只输出长文本而不固化，除非任务明确要求“只讨论、不写文档”。

## P1-A Contract Status

- P1-A JSON 契约：已新增 `docs/pathfinder-p0/p1-a-json-contract.md`，作为前端、后端、QA 的共同实现契约。
- P1-A 状态流转：已固化 `draft / answers_incomplete / anti_packaging_blocked / ready_to_export / exported` 五类状态。
- P1-A API 边界：继续沿用现有 `/api/pathfinder/records` 系列 API，后端复用 `analysis_records`，不新增 migration，不生成 Markdown，不做评分、不做 RAG。
- P1-A QA 验收：已覆盖逐题草稿保存、刷新恢复、6 问缺项阻断、反包装阻断、Markdown 快照、legacy 兼容、跨用户隔离、禁用字段和移动端 390px。
- 仍需后续处理：前端 P1-A 实现、后端 P1-A 契约落地、QA P1-A 回归，以及 P0 参赛彩排。

## P1-A Frontend Status

- P1-A 前端实现：已按 `p1-a-json-contract.md` 落地 `TrialPackage / TrailRecord / TrialAnswer[] / AntiPackagingCheck / MarkdownSnapshot` 前端闭环。
- 状态流转：已支持 `draft / answers_incomplete / anti_packaging_blocked / ready_to_export / exported`，答案变化后会重新计算状态。
- 反包装检查：已支持正向越界表达阻断完整 Markdown，否定语境不误阻断；阻断后允许保存草稿但禁止完整导出。
- MarkdownSnapshot：Markdown 仍由前端单一模板源生成，保存 `templateSource / templateVersion / exportScope / content / createdAt`。
- 验证命令：`npm run test:safety`、`npm run test:e2e`、`npm run lint`、`npm run build`、`git diff --check` 已通过。
- 仍需后续处理：后端 P1-A 契约落地、前后端 API 联调、QA P1-A 回归、P0 参赛彩排。

## P1-A Backend Status

- P1-A 后端实现：已按 `p1-a-json-contract.md` 落地 P1-A `TrailRecord` 契约，现有 `/api/pathfinder/records` 系列 API 路径保持不变。
- 存储策略：继续复用 `analysis_records`，`type = "pathfinder"`，`input_text` 保存 P1-A input envelope，`result` 保存 P1-A result envelope，`input_file_url = null`，`match_score = null`。
- API 契约：已支持创建、读取、整包 `TrialAnswer[]` 保存、结果与 `MarkdownSnapshot` 保存、删除；后端不生成 Markdown，不做推荐评分，不做 RAG。
- legacy 兼容：P0 legacy 记录可读取并归一为 P1-A `TrailRecord`，legacy `trialAnswers` 和 `markdownSnapshot` 已做兼容转换。
- 验证命令：`python -m pytest`、`python ../scripts/migrate_db.py`、`git diff --check` 已通过；无新增 Alembic migration。
- 仍需后续处理：前后端 API 联调、QA P1-A 回归、P0 参赛彩排，以及后续正式 auth 替换 `X-User-Id` 临时依赖。

## P1-A API Integration Status

- P1-A 前后端联调：已新增 `docs/pathfinder-p0/p1-a-api-integration.md`，固化 API client、状态同步、sessionStorage 恢复和验收边界。
- API 接入：前端已接入 `POST /api/pathfinder/records`、`GET /api/pathfinder/records/{record_id}`、`PATCH /api/pathfinder/records/{record_id}/trial-answers`、`PUT /api/pathfinder/records/{record_id}/result`、`DELETE /api/pathfinder/records/{record_id}`。
- backendSync 状态：`PathfinderState` 已新增 `backendSync`，支持 `local_only / creating / saving / saved / failed`，页面显示“本地草稿 / 正在保存 / 已保存 / 保存失败，可继续本地试航”。
- 后端恢复：当 sessionStorage 中已有 `recordId` 时，前端会通过 GET 读取后端 `TrailRecord` 并归一；GET 恢复期间不会把旧本地副本覆盖回后端。
- 保存策略：前端逐题编辑仍本地即时更新，后端同步时提交整包 `TrialAnswer[]`；完整 Markdown 只保存 `exportScope = "full"`，阻断时只保存 draft snapshot。
- 仍需后续处理：QA P1-A 回归、跨用户隔离联调、legacy 真实记录回归、正式 auth 替换 `X-User-Id`、P0 参赛彩排。

## P1-A QA Regression Status

- QA 回归：P1-A QA 回归已通过，覆盖自动化测试、真实前后端联调、fallback、反包装、缺项阻断、移动端和 Scope Guard。
- 自动化验证：`npm run test:safety`、`npm run lint`、`npm run test:e2e`、`npm run build`、`python -m pytest`、`python ../scripts/migrate_db.py` 已通过。
- 真实联调：前端 `http://127.0.0.1:3000/pathfinder` 与后端 `http://127.0.0.1:8000` 主链路通过，最新 Pathfinder 记录为 `p1-a.v1 / exported / markdownSnapshot full + frontend`。
- fallback：后端不可用时前端仍可使用 sessionStorage 完成本地试航和 Markdown 导出。
- Scope Guard：未发现 P0 / P1-A scope 扩散，仍限定小 C、三条路径、OpenDocuments、工程企业知识库 AI 助手试航和 Markdown 导出。
- 结论：当前版本可进入 P0 参赛彩排，也可作为 P1-A 阶段验收基线。
- 仍需后续处理：P0 参赛彩排、正式 auth 替换 `X-User-Id`、移动端顶部流程导航横向滚动体验可在后续优化。

## P0 Competition Rehearsal Status

- 参赛彩排：已通过，新增 `docs/pathfinder-p0/p0-competition-rehearsal.md` 固化本轮彩排结果。
- 展示脚本：已固化 3 分钟讲稿，覆盖问题定义、产品定位、星图推荐页、OpenDocuments 试航页、结果页和收束话术。
- 点击路径：已固化 `/pathfinder -> /pathfinder/background -> /pathfinder/recommendation -> /pathfinder/trial -> /pathfinder/result` 的 14 步点击脚本。
- 兜底方案：已固化后端不可用、刷新恢复、Markdown 下载失败、复制权限拦截、移动端不稳定、API 保存失败和“是否包装项目”质疑的现场处理。
- Scope Guard：已通过，仍限定小 C、三条路径、OpenDocuments、工程企业知识库 AI 助手试航、固定 6 问和 Markdown 导出。
- 结论：建议进入最终参赛展示，无阻断问题。
- 仍需后续处理：正式 auth 替换 `X-User-Id` 临时依赖；移动端顶部流程导航体验可在后续优化。

## Final Delivery Status

- 最终交付：已完成 P0 / P1-A 最终交付收口，新增 `docs/pathfinder-p0/final-delivery-checklist.md`，并在 `README.md` 固化最终交付状态、启动方式、验证命令、文档索引、展示入口、非阻断风险和后续范围边界。
- 可展示结论：可以进入最终参赛展示，也可以作为 P1-A 阶段验收基线；当前无展示阻断问题。
- 关键入口：展示入口 `http://127.0.0.1:3000/pathfinder`；后端 API 文档 `http://127.0.0.1:8000/docs`；展示路径 `/pathfinder -> /pathfinder/background -> /pathfinder/recommendation -> /pathfinder/trial -> /pathfinder/result`；参赛讲稿 `docs/pathfinder-p0/p0-competition-rehearsal.md`。
- 验证命令：前端 `cd frontend && npm run test:safety && npm run lint && npm run test:e2e && npm run build`；后端 `cd backend && python -m pytest && python ../scripts/migrate_db.py`；仓库检查 `git diff --check`。
- 非阻断风险：正式 auth 尚未替换 `X-User-Id`；移动端顶部流程导航横向滚动体验可后续优化；本地 dev server 可能输出 Node `DEP0060` warning；展示前需避免复用旧 3000 dev server。
- 后续建议：P1-B / P2 另行处理正式 auth、专用表迁移、历史记录页、TrialPackage 管理、发布流、内容审核和多包能力；不得反向扩大当前 P0 / P1-A 交付范围。
