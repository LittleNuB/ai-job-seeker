# 寻径星图 P1-A 前端实现说明

本文档固化 P1-A 前端实现范围，供前端、后端和 QA 对齐。P1-A 前端实现以 `docs/pathfinder-p0/p1-a-json-contract.md` 为契约来源，在 P0 / P0 polish 页面基础上完成本地前端闭环，不扩大 P0 Scope Lock。

## 1. 修改文件

本次 P1-A 前端实现涉及以下文件：

| 文件 | 修改内容 |
|---|---|
| `frontend/src/features/pathfinder/types.ts` | 新增 P1-A TypeScript 类型，包括 `TrialPackage`、`TrailRecord`、`TrialAnswer[]`、`AntiPackagingCheck`、`PortfolioDraft`、`InterviewPrep`、`MarkdownSnapshot` 和五类状态。 |
| `frontend/src/features/pathfinder/contract.ts` | 新增 P1-A 前端契约实现：固定 `TrialPackage`、状态计算、答案归一、legacy state 兼容、反包装检查、Markdown 快照生成。 |
| `frontend/src/features/pathfinder/state.tsx` | 将前端状态从 P0 扁平状态升级为 `PathfinderState.trailRecord`；使用 reducer 管理逐题作答、填充 Demo、保存 Markdown 快照和 sessionStorage 持久化。 |
| `frontend/src/features/pathfinder/markdown.ts` | Markdown 继续由前端单一模板源生成；导出前执行完整性检查和 `AntiPackagingCheck`；通过后生成 `MarkdownSnapshot.exportScope = "full"`，阻断时生成草稿快照。 |
| `frontend/src/features/pathfinder/content-guard.ts` | 将 P0 禁用表达检查对象化为 P1-A finding 结构，区分正向越界表达和否定语境。 |
| `frontend/src/features/pathfinder/pages.tsx` | 页面展示 P1-A 状态、固定 TrialPackage 版本、反包装摘要、Markdown 快照导出状态；阻断时禁用完整 Markdown 复制和下载。 |
| `frontend/src/features/pathfinder/components.tsx` | 补充响应式约束，降低 390px 移动端溢出风险。 |
| `frontend/src/features/pathfinder/data.ts` | 对 P0 polish 内容资产继续复用，并适配前端 P1-A 类型命名。 |
| `frontend/scripts/pathfinder-static-tests.ts` | 增加 P1-A 契约、Markdown 九项、快照、反包装阻断和固定问题的静态测试。 |
| `frontend/tests/pathfinder.spec.ts` | 增加 P1-A E2E 覆盖：完整流程、session 恢复、P0 legacy 恢复、反包装阻断和 390px 移动端。 |

## 2. P1-A 前端状态结构

P1-A 前端状态以 `TrailRecord` 为主对象：

```ts
type PathfinderState = {
  demoLoaded: boolean
  trailRecord: TrailRecord
}
```

`TrailRecord` 固定使用：

- `schemaVersion = "p1-a.v1"`
- `trialPackageId = "p0-xiaoc-opendocuments"`
- `trialPackageVersion = "1.0.0"`
- `selectedPathId = "industry-ai-product-assistant"`
- `trialAnswers: TrialAnswer[]`
- `antiPackagingCheck: AntiPackagingCheck`
- `markdownSnapshot?: MarkdownSnapshot`

`TrialPackage` 在前端只读固定为 OpenDocuments 试航包：

- `sourceProject.role = "reference_only"`
- `questionIds` 固定为 P0 六问
- 不做多 TrialPackage 推荐
- 不做 TrialPackage 发布流

## 3. 状态流转实现方式

状态由 `contract.ts` 中的 `computeTrailRecordStatus` 统一计算，页面不自行推断状态。

| 状态 | 触发条件 | 前端行为 |
|---|---|---|
| `draft` | 六问全部为空 | 保持草稿态，可逐题输入。 |
| `answers_incomplete` | 至少一题已填写，但六问未全部完成 | 允许继续保存到 sessionStorage，结果页不允许完整 Markdown 导出。 |
| `anti_packaging_blocked` | 六问完成，但答案或 Markdown 命中正向越界表达，或检查结果 `exportAllowed = false` | 允许保存草稿快照，禁止复制 / 下载完整 Markdown。 |
| `ready_to_export` | 六问完成，反包装检查通过，尚未保存完整快照 | 允许复制 / 下载完整 Markdown。 |
| `exported` | 已保存 `MarkdownSnapshot.exportScope = "full"` | 页面显示已保存快照。 |

状态变更入口：

- `answerQuestion`：逐题更新 `TrialAnswer[]`，重新计算 `AntiPackagingCheck`，并清除旧 `markdownSnapshot`。
- `fillDemoAnswers`：填充固定六问 Demo 答案，重新计算状态。
- `saveMarkdownSnapshot`：保存前端生成的 `MarkdownSnapshot` 和导出前检查结果，再重新计算状态。
- `normalizeStoredPathfinderState`：读取 P1-A 或 P0 legacy session 后归一为 P1-A `TrailRecord`。

## 4. AntiPackagingCheck 前端规则

前端规则来源于 P0 禁用表达清单，已对象化为 `AntiPackagingFinding[]`。

当前规则覆盖：

- 岗位胜任 / 能力认证 / 评分打分
- offer、录用、上岸概率预测
- 企业筛选、企业推荐、精准内推
- 简历包装、简历自动优化
- 多开源项目智能推荐
- 真实 RAG 检索、复杂评分系统
- 算法工程速成、大模型研发训练路径
- OpenDocuments 归属错误、官方贡献暗示
- 将小 C 写成 OpenDocuments 开发者
- 将 2 周试航写成企业级 RAG 系统交付
- AI 替代人工复核或专业审核

判定策略：

- 正向越界表达：`riskLevel = "blocking"`，`blockingPolicy = "block_full_markdown_export"`，完整 Markdown 复制 / 下载禁用。
- 否定语境：命中 `不 / 不得 / 不能 / 不可 / 禁止 / 回避 / 避免 / 不是 / 不构成` 等语境时，记录为 `riskLevel = "info"`，不阻断。
- Markdown 导出前还会检查九个必需章节是否存在，缺失章节作为阻断项处理。

P1-A 前端不提供运营规则工作台，不做规则在线配置，不保存独立规则表。

## 5. MarkdownSnapshot 生成规则

Markdown 仍由前端 `markdown.ts` 单一模板源生成。后端在 P1-A 只需要保存快照，不生成 Markdown，也不维护第二套模板。

快照字段：

```ts
type MarkdownSnapshot = {
  templateSource: "frontend"
  templateVersion: string
  exportScope: "draft" | "full"
  content: string
  contentHash?: string
  createdAt: string
}
```

生成规则：

- `templateSource` 固定为 `frontend`。
- `templateVersion` 固定为 `frontend.pathfinder.p1-a.v1`。
- `exportScope = "full"`：仅在六问完整且 `AntiPackagingCheck.exportAllowed = true` 时生成。
- `exportScope = "draft"`：反包装阻断时可生成草稿快照，但不能触发完整复制 / 下载。
- `contentHash` 使用前端本地 `djb2-*` 哈希，作为 QA 对比和回归辅助，不作为安全签名。
- 完整 Markdown 必须包含九项章节：候选人背景、路径结论、样例 JD 说明、OpenDocuments 来源与 License、OpenDocuments 原项目能力、小 C 试航贡献、不可声称内容、固定 6 问作答、免责声明。

## 6. sessionStorage / API client 边界

P1-A 前端当前实现的是本地闭环：

- P1-A session key：`pathfinder-p1-a-state`
- P0 legacy session key：`pathfinder-p0-state`
- 读取时优先读取 P1-A state，若不存在则读取 P0 legacy state 并归一为 `TrailRecord`。
- 写入时只写回 P1-A state。
- 前端允许逐题草稿保存，但保存对象仍是完整 `TrailRecord` / `TrialAnswer[]` 包。

API client 边界：

- 本次前端实现未新增真实 API client，也未调用 `/api/pathfinder/records`。
- P1-A 后端联调时，应继续沿用现有 `/api/pathfinder/records` 系列 API，把前端 `TrailRecord` 作为整包 JSON 保存。
- 前端不会发送评分、RAG 检索结果、offer 概率、能力认证或企业筛选字段。
- 后端不应在 P1-A 重新生成 Markdown，只保存前端传入的 `markdownSnapshot`。

## 7. 测试覆盖

已覆盖的测试：

- `npm run test:safety`
  - 固定六问和 Demo 答案覆盖。
  - P1-A `TrialPackage` id、version、`sourceProject.role`。
  - Markdown 九项章节。
  - `MarkdownSnapshot.templateSource / templateVersion / exportScope / content`。
  - 反包装正向越界表达阻断。
  - 否定边界文案可通过安全检查。

- `npm run test:e2e`
  - 固定路由完整流程：`/pathfinder`、`/pathfinder/background`、`/pathfinder/recommendation`、`/pathfinder/trial`、`/pathfinder/result`。
  - 六问完成后进入 `ready_to_export`。
  - 结果页展示 P1-A 反包装摘要和前端模板版本。
  - P1-A session 恢复。
  - P0 legacy session 恢复。
  - 正向越界表达触发 `anti_packaging_blocked`，复制 / 下载完整 Markdown 禁用。
  - 390px 移动端不产生横向溢出。

已通过的验证命令：

```txt
npm run test:safety
npm run test:e2e
npm run lint
npm run build
git diff --check
```

## 8. 与 P0 Scope Lock 的边界说明

P1-A 前端实现不修改 P0 Scope Lock，不扩大 P0 Demo 范围。

仍保持：

- 只有小 C 一个固定用户。
- 只有 3 条样例 JD。
- 只有 3 条路径，其中 OpenDocuments 试航路径为优先路径。
- 只有一个 OpenDocuments 固定试航包。
- 只有固定 6 问试航。
- 只导出 Markdown。
- OpenDocuments 只作为公开参考项目，不作为小 C 的个人开发成果。

P1-A 未实现：

- 多 TrialPackage 推荐。
- TrialPackage 发布流。
- 专用数据表或 Alembic migration。
- 后端 Markdown 生成。
- 后端推荐评分。
- 真实 RAG 检索。
- 能力认证。
- offer 概率预测。
- 企业筛选候选人。
- 简历包装或自动优化。
- P1-B 历史记录页、专用表迁移或完整发布流。
- P2 内容审核工作台、运营规则配置或多项目智能推荐。

## 9. 仍需后端 P1-A 配合的点

后端 P1-A 仍需落地：

- 继续沿用 `/api/pathfinder/records` 系列 API，接收和返回 P1-A `TrailRecord`。
- 复用 `analysis_records` 保存整包 answers JSON / `TrailRecord` JSON，不新增 migration。
- 保存 `trialPackageId + trialPackageVersion`。
- 保存 `TrialAnswer[]`、`AntiPackagingCheck`、`MarkdownSnapshot`。
- 支持 P0 legacy 记录读取并归一为 P1-A `TrailRecord`。
- 确保跨用户隔离：用户只能读取、更新、删除自己的记录。
- 阻断状态下允许保存草稿，但不得把 `exportScope = "draft"` 记录标记为完整导出。
- 不生成 Markdown、不做评分、不做 RAG、不返回 offer 概率或能力认证字段。
- 与前端联调 `draft / answers_incomplete / anti_packaging_blocked / ready_to_export / exported` 五类状态语义。
