# 寻径星图 P1-A 后端实现说明

更新时间：2026-06-04

适用对象：后端、前端联调、QA

关联契约：

- `docs/pathfinder-p0/p1-a-json-contract.md`
- `docs/pathfinder-p0/p1-backend-data-model-brief.md`
- `docs/pathfinder-p0/handoff-status.md`

## 1. 修改文件

本次 P1-A 后端落地修改了以下文件：

| 文件 | 修改内容 |
|---|---|
| `backend/app/schemas/pathfinder.py` | 新增 P1-A `TrailRecord`、`TrialAnswer[]`、`AntiPackagingCheck`、`PortfolioDraft`、`InterviewPrep`、`MarkdownSnapshot` 等 schema；新增固定 6 问校验、状态计算、禁用字段校验。 |
| `backend/app/api/pathfinder.py` | 现有 `/api/pathfinder/records` 系列 API 改为读写 P1-A input/result envelope；新增 P0 legacy 读取归一化；保存结果时校验完整 Markdown 快照条件。 |
| `backend/tests/test_pathfinder.py` | 更新为 P1-A 契约测试，覆盖创建、读取、整包 answers 保存、结果保存、阻断规则、Markdown 快照、legacy 兼容和跨用户隔离。 |
| `docs/pathfinder-p0/p1-a-json-contract.md` | 补充 `X-User-Id` 是临时用户依赖，后续替换正式 auth。 |

未修改：

- 未新增数据库表。
- 未新增 Alembic migration。
- 未修改 `backend/app/models/analysis.py` 的表结构。

## 2. P1-A 后端存储结构

P1-A 后端继续复用 `analysis_records`，不新增 `pathfinder_records`、`trail_records` 或其它专用表。

字段映射如下：

| `analysis_records` 字段 | P1-A 用法 |
|---|---|
| `id` | 对应 `TrailRecord.recordId` |
| `user_id` | 记录所属用户；当前通过 `X-User-Id` 临时注入 |
| `type` | 固定为 `pathfinder` |
| `input_text` | 保存 P1-A input envelope JSON 字符串 |
| `input_file_url` | 固定为 `null` |
| `result` | 保存 P1-A result envelope JSON 字符串 |
| `match_score` | 固定为 `null` |
| `created_at` | 对应 `TrailRecord.createdAt` |

`input_text` envelope：

```json
{
  "schemaVersion": "p1-a.v1",
  "trialPackageId": "p0-xiaoc-opendocuments",
  "trialPackageVersion": "1.0.0",
  "selectedPathId": "industry-ai-product-assistant",
  "userProfileSnapshot": {},
  "trialPackageSnapshot": {}
}
```

`result` envelope：

```json
{
  "schemaVersion": "p1-a.v1",
  "status": "draft",
  "trialAnswers": [],
  "antiPackagingCheck": {},
  "portfolioDraft": {},
  "interviewPrep": {},
  "markdownSnapshot": {},
  "updatedAt": "2026-06-04T00:00:00Z"
}
```

`portfolioDraft`、`interviewPrep`、`markdownSnapshot` 为可选字段。后端只保存前端传入的 `markdownSnapshot`，不生成 Markdown，也不维护第二套 Markdown 模板。

## 3. API 请求 / 响应变化

API 路径保持不变：

```text
POST   /api/pathfinder/records
GET    /api/pathfinder/records/{record_id}
PATCH  /api/pathfinder/records/{record_id}/trial-answers
PUT    /api/pathfinder/records/{record_id}/result
DELETE /api/pathfinder/records/{record_id}
```

变化点：

- `POST /records` 请求体升级为 P1-A `CreatePathfinderRecordRequestP1A`，必须包含 `schemaVersion`、`trialPackageId`、`trialPackageVersion`、`selectedPathId`、`userProfileSnapshot`。
- `POST /records` 和 `GET /records/{id}` 响应统一返回 P1-A `TrailRecord`。
- `PATCH /trial-answers` 接收整包 `TrialAnswer[]`，允许空答案保留在整包中，但必须包含且只包含固定 6 问 ID。
- `PATCH /trial-answers` 响应返回 `recordId`、重算后的 `status`、`trialAnswers`、`updatedAt`。
- `PUT /result` 接收 `AntiPackagingCheck`、可选 `PortfolioDraft`、可选 `InterviewPrep`、可选 `MarkdownSnapshot`。
- `PUT /result` 响应返回 `recordId`、重算后的 `status`、`markdownSnapshotSaved`、`updatedAt`。
- `DELETE /records/{id}` 仍只删除当前用户自己的 `type = "pathfinder"` 记录。

所有读取、更新、删除继续按 `user_id + id + type = "pathfinder"` 隔离。`X-User-Id` 只是当前 Demo / 联调阶段临时用户依赖，后续必须替换为正式 auth 依赖。

## 4. 状态计算规则

后端不信任请求体中的 `status` 作为最终状态，而是基于保存后的 `TrialAnswer[]`、`AntiPackagingCheck` 和 `MarkdownSnapshot` 重新计算。

规则：

| 条件 | 后端状态 |
|---|---|
| 6 问均为空 | `draft` |
| 至少一题有内容，但 6 问不完整 | `answers_incomplete` |
| 6 问完整，但 `AntiPackagingCheck.status = "blocked"`、`blockingCount > 0` 或 `exportAllowed = false` | `anti_packaging_blocked` |
| 6 问完整，反包装检查无阻断，且尚未保存 full Markdown 快照 | `ready_to_export` |
| 6 问完整，反包装检查无阻断，且保存了 `markdownSnapshot.exportScope = "full"` | `exported` |

完整 Markdown 快照保存额外校验：

- `markdownSnapshot.templateSource` 必须为 `frontend`。
- `markdownSnapshot.exportScope = "full"` 时，固定 6 问必须全部非空。
- `markdownSnapshot.exportScope = "full"` 时，反包装检查不能是 `not_run` 或 `blocked`，且 `exportAllowed` 必须为 `true`。
- `markdownSnapshot.exportScope = "full"` 时，九个必需 Markdown section 必须全部为 `true`。
- 阻断状态下允许保存 `exportScope = "draft"` 的草稿快照。

## 5. legacy 兼容策略

P1-A 读取层兼容 P0 legacy `analysis_records`：

- 如果 `input_text` 或 `result` 缺少 `schemaVersion = "p1-a.v1"`，按 P0 legacy 解析。
- legacy `trialAnswers: Record<TrialQuestionId, string>` 会转换为 P1-A `TrialAnswer[]`。
- legacy `markdownSnapshot: string` 会转换为 P1-A `MarkdownSnapshot`，其中 `templateSource = "frontend"`，`templateVersion = "legacy-p0"`。
- legacy 记录缺少 `AntiPackagingCheck` 时，返回最小 `not_run` 检查对象，不伪造为已通过。
- legacy 读取不会回填数据库，避免隐式迁移。
- 权限隔离仍按 `user_id + id + type = "pathfinder"` 执行。

## 6. 禁止字段校验

后端拒绝在 P1-A input / result JSON 中写入或返回以下业务字段及等价字段：

- `matchScore` / `match_score`
- `abilityScore`
- `competencyScore`
- `offerProbability`
- `hireProbability`
- `recommendationScore`
- `resumeOptimization`
- `resumePackaging`
- `companyRecommendation`
- `certification`

说明：

- 数据库字段 `analysis_records.match_score` 仍存在，但 P1-A Pathfinder 记录固定保存为 `null`。
- API 响应不把 `match_score` 作为 Pathfinder 业务字段返回。
- 后端不做推荐评分、不做 RAG、不返回 offer 概率、能力认证、企业推荐或简历包装字段。

## 7. 测试覆盖

`backend/tests/test_pathfinder.py` 已覆盖：

- 创建 P1-A 记录并写入 `analysis_records` envelope。
- `type = "pathfinder"`、`input_file_url = null`、`match_score = null`。
- GET 返回 P1-A `TrailRecord` 且不返回禁用字段。
- 跨用户读取返回 404。
- 整包 `TrialAnswer[]` 保存，允许空答案，缺项时状态为 `answers_incomplete`。
- 未知、重复、缺失 question id 均被拒绝。
- 6 问完整且检查通过后进入 `ready_to_export`。
- 保存 full `MarkdownSnapshot` 后进入 `exported`，且后端不改写 `content`。
- 阻断检查下拒绝 full snapshot，但允许 draft snapshot。
- full snapshot 要求 6 问完整、九项 section 完整、`templateSource = "frontend"`。
- 禁用字段在 input / result 中会被拒绝。
- P0 legacy 记录可读取并归一为 P1-A `TrailRecord`。
- DELETE 只删除本人 Pathfinder 记录，非 Pathfinder `AnalysisRecord` 不可通过该 API 访问。

验证命令：

```text
cd backend
python -m pytest
python ../scripts/migrate_db.py
git diff --check
```

## 8. 与 P0 Scope Lock 的边界说明

本次 P1-A 后端实现不扩大 P0 Scope：

- 仍只承载固定 `p0-xiaoc-opendocuments@1.0.0` 试航包记录。
- 仍只支持固定路径 `industry-ai-product-assistant`。
- 仍只支持固定 6 问。
- 仍复用 `analysis_records`。
- 没有新增数据库表。
- 没有新增 Alembic migration。
- 后端不生成 Markdown。
- 后端不做推荐评分。
- 后端不做 RAG。
- 后端不做 offer 概率、能力认证、企业推荐、简历包装或自动投递。
- P1-A 未实现 P1-B / P2 的专用表、TrialPackage 管理、发布流、内容审核工作台、历史筛选或多试航包管理能力。

## 9. 仍需前后端联调的点

后续联调重点：

- 前端创建记录时按 P1-A `CreatePathfinderRecordRequestP1A` 提交 `userProfileSnapshot`。
- 前端逐题保存时必须提交当前完整 `TrialAnswer[]` 整包，而不是单题 patch。
- 前端保存结果时传入的 `AntiPackagingCheck.requiredMarkdownSections` 需要覆盖九项必需 section。
- 前端保存 full Markdown 快照前，需要确保 6 问完整且 `AntiPackagingCheck.exportAllowed = true`。
- 阻断状态下前端只能保存 `exportScope = "draft"` 的 Markdown 快照。
- 前端需要适配 `POST /records` 和 `GET /records/{id}` 返回完整 `TrailRecord`，不再依赖 P0 的 `id/demoVersion/candidateProfile` 扁平响应。
- QA 需要基于真实 API 跑 P1-A 回归，包括 legacy 读取、跨用户隔离、禁用字段和 Markdown 快照保存。
- 正式用户体系接入后，需要替换 `X-User-Id` 临时依赖。
