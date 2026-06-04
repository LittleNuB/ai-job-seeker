# 寻径星图 P1-A 前后端 API 联调说明

更新时间：2026-06-04

适用对象：前端、后端、QA、后续接手 Agent

关联文档：

- `docs/pathfinder-p0/p1-a-json-contract.md`
- `docs/pathfinder-p0/p1-a-frontend-implementation.md`
- `docs/pathfinder-p0/p1-a-backend-implementation.md`
- `docs/pathfinder-p0/handoff-status.md`

## 1. 联调目标

本次联调把 P1-A 前端本地 `TrailRecord` 闭环接入后端 `/api/pathfinder/records` 系列 API。

已接入：

- `POST /api/pathfinder/records`
- `GET /api/pathfinder/records/{record_id}`
- `PATCH /api/pathfinder/records/{record_id}/trial-answers`
- `PUT /api/pathfinder/records/{record_id}/result`
- `DELETE /api/pathfinder/records/{record_id}`

联调后，前端仍保留 `sessionStorage` 作为本地草稿兜底；后端保存失败不阻断 P0 Demo 试航。

## 2. 修改文件

| 文件 | 内容 |
|---|---|
| `frontend/src/features/pathfinder/api.ts` | 新增 P1-A API client，统一携带 `X-User-Id`，调用现有 `/api/pathfinder/records` 系列 API。 |
| `frontend/next.config.mjs` | 新增 `/api/:path*` rewrite，默认代理到 `http://127.0.0.1:8000/api/:path*`，避免浏览器跨域。 |
| `frontend/src/features/pathfinder/types.ts` | 新增 `BackendSyncStatus`、`BackendSyncState`，并把 `backendSync` 写入 `PathfinderState`。 |
| `frontend/src/features/pathfinder/contract.ts` | 初始化和归一化 `backendSync`；新增从后端 `TrailRecord` 归一为前端 state 的 helper。 |
| `frontend/src/features/pathfinder/state.tsx` | 接入 POST / GET / PATCH / PUT / DELETE，同步整包 `TrialAnswer[]` 和 `MarkdownSnapshot`；保留本地兜底。 |
| `frontend/src/features/pathfinder/pages.tsx` | 在试航页和结果页显示同步状态 UI；反包装阻断时保存 draft snapshot。 |
| `frontend/tests/pathfinder.spec.ts` | 新增 API 同步 E2E 和后端 GET 恢复 E2E。 |
| `frontend/scripts/pathfinder-static-tests.ts` | 增加 `backendSync` 初始状态静态断言。 |

## 3. backendSync 状态

前端状态新增：

```ts
type BackendSyncStatus =
  | "local_only"
  | "creating"
  | "saving"
  | "saved"
  | "failed"

type BackendSyncState = {
  status: BackendSyncStatus
  lastSavedAt?: string
  error?: string
}

type PathfinderState = {
  demoLoaded: boolean
  trailRecord: TrailRecord
  backendSync: BackendSyncState
}
```

UI 显示：

| 状态 | 页面文案 |
|---|---|
| `local_only` | 本地草稿 |
| `creating` | 正在保存 |
| `saving` | 正在保存 |
| `saved` | 已保存 |
| `failed` | 保存失败，可继续本地试航 |

失败策略：

- API 保存失败时，前端不丢弃本地 `TrailRecord`。
- 页面显示“保存失败，可继续本地试航”。
- `sessionStorage` 继续保存当前本地状态。
- 用户可继续编辑、查看结果或导出本地 Markdown。

## 4. API 同步流程

### 4.1 创建记录

当前端进入 Demo 并需要后端保存时，若 `trailRecord.recordId` 不存在：

```text
POST /api/pathfinder/records
```

请求体只发送 P1-A 创建所需字段：

- `schemaVersion`
- `trialPackageId`
- `trialPackageVersion`
- `selectedPathId`
- `userProfileSnapshot`

后端返回完整 `TrailRecord` 后，前端只合并：

- `recordId`
- `createdAt`
- `updatedAt`

本地答案和即时状态不被远端空记录覆盖。

### 4.2 保存作答

前端允许逐题编辑，但同步给后端时仍发送当前整包：

```text
PATCH /api/pathfinder/records/{record_id}/trial-answers
```

请求体包含：

- `schemaVersion = "p1-a.v1"`
- `changedQuestionId?`
- `trialAnswers: TrialAnswer[]`

`trialAnswers` 必须包含且只包含固定 6 问。

### 4.3 保存结果和快照

每次需要保存结果时：

```text
PUT /api/pathfinder/records/{record_id}/result
```

请求体包含：

- `status`
- `antiPackagingCheck`
- `portfolioDraft?`
- `interviewPrep?`
- `markdownSnapshot?`

完整导出时：

- `markdownSnapshot.templateSource = "frontend"`
- `markdownSnapshot.exportScope = "full"`
- `antiPackagingCheck.exportAllowed = true`
- 九项必需 Markdown section 全部存在

反包装阻断时：

- 前端可保存 `markdownSnapshot.exportScope = "draft"`。
- 完整 Markdown 复制 / 下载仍禁用。

### 4.4 后端恢复

若 `sessionStorage` 中已有 `trailRecord.recordId`：

```text
GET /api/pathfinder/records/{record_id}
```

成功后：

- 后端返回的 `TrailRecord` 会被归一为前端 `PathfinderState`。
- `backendSync.status = "saved"`。
- `lastSavedAt` 使用后端 `updatedAt`。

GET 恢复期间，前端暂停自动 PUT/PATCH，避免把旧本地副本覆盖回后端。

### 4.5 删除记录

`resetDemo` 时如本地存在 `recordId`，前端会尝试：

```text
DELETE /api/pathfinder/records/{record_id}
```

删除失败不影响本地 reset。

## 5. sessionStorage 边界

P1-A 仍保留本地草稿：

- P1-A key：`pathfinder-p1-a-state`
- P0 legacy key：`pathfinder-p0-state`

读取顺序：

1. 优先读取 `pathfinder-p1-a-state`。
2. 若不存在，读取 `pathfinder-p0-state` 并归一为 P1-A state。
3. 若 P1-A state 中存在 `recordId`，再通过后端 GET 恢复最新 `TrailRecord`。

写入策略：

- 每次前端状态变化仍写回 `pathfinder-p1-a-state`。
- `backendSync` 也会写入本地，便于刷新后保留同步状态。

## 6. API client 配置

默认配置：

- 前端调用同源 `/api/pathfinder/records`。
- Next rewrite 把 `/api/:path*` 转发到 `PATHFINDER_API_ORIGIN`。
- `PATHFINDER_API_ORIGIN` 默认值为 `http://127.0.0.1:8000`。

环境变量：

| 变量 | 用途 |
|---|---|
| `PATHFINDER_API_ORIGIN` | Next rewrite 的后端 origin。 |
| `NEXT_PUBLIC_PATHFINDER_API_ORIGIN` | 可作为 rewrite origin 的前端公开配置兜底。 |
| `NEXT_PUBLIC_PATHFINDER_USER_ID` | 当前 Demo / 联调用的 `X-User-Id`。 |
| `NEXT_PUBLIC_PATHFINDER_API_ENABLED=false` | 关闭 API 同步，只保留本地草稿。 |

`X-User-Id` 当前仍是 P1-A 临时联调依赖，后续正式用户体系接入后必须替换。

## 7. 测试覆盖

新增/更新测试：

- `syncs TrailRecord answers and markdown snapshot to P1-A records API`
  - 验证 POST 创建记录。
  - 验证 PATCH 提交整包 6 问 `TrialAnswer[]`。
  - 验证 PUT 保存 `AntiPackagingCheck`。
  - 验证下载后 PUT 保存 `MarkdownSnapshot.exportScope = "full"`。
  - 验证请求带 `X-User-Id`。

- `restores TrailRecord from backend when session storage contains recordId`
  - sessionStorage 中预置 `recordId`。
  - 验证前端调用 GET。
  - 验证后端返回的完整答案恢复到结果页。
  - 验证恢复后页面可导出 Markdown。

- 静态测试补充：
  - `createInitialPathfinderState().backendSync.status === "local_only"`。

## 8. 与 P0 Scope Lock 的边界

本次联调不扩大 P0 / P1-A 范围：

- 不新增 TrialPackage 推荐。
- 不新增发布流。
- 不新增专用表或 migration。
- 不新增后端 Markdown 生成。
- 不新增评分、RAG、offer 概率、能力认证、企业筛选或简历包装字段。
- 前端仍只使用固定小 C、固定 3 条样例 JD、固定 OpenDocuments 试航包、固定 6 问。

## 9. 仍需后续处理

- QA P1-A 回归需基于真实 API 覆盖跨用户隔离、legacy 读取、禁用字段、阻断保存和 full snapshot。
- 正式 auth 接入后替换 `X-User-Id`。
- 若后续新增历史记录页，可直接复用 `getPathfinderRecord` 和 `deletePathfinderRecord`。
- P1-B 专用表、迁移、TrialPackage 管理和发布流仍不属于 P1-A。
