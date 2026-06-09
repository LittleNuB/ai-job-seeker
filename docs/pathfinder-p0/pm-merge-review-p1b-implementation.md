# 寻径星图 P1-B.1 实施合并审查

日期：2026-06-09
主 Agent：产品经理 / 主 Agent

## 1. 总体结论

P1-B.1 第一轮实施已经完成主干合并，可以作为下一轮产品人工审查和执行型 QA 的基线。

当前版本已从 P1-A 的“固定 OpenDocuments 试航闭环”升级为：

> 真实用户背景输入 -> 规则优先路径推荐 -> 人工审核项目匹配 -> TrialPackageCandidate 生成 -> 6 问试航 -> 反包装检查 -> Markdown 导出 / 后端保存。

本轮仍严格保持 Scope Guard：不接 LLM 主链路，不做实时 GitHub 搜索，不做真实 RAG，不新增 migration，不展示评分、概率、认证、胜任判断、企业筛选或履历包装表达。

## 2. 已合并提交

已合入主集成分支 `codex/pathfinder-p1a-integration`：

- `3dcde45 docs: add pathfinder p1b qa plan`
- `95e8114 data: add pathfinder p1b fixture set`
- `5789e51 feat: add pathfinder p1b recommendation APIs`
- `d5bb867 feat: add pathfinder p1b recommendation flow`

子任务原始 worktree 提交：

- QA-003 / QA验证B：`da815515 docs: add pathfinder p1b qa plan`
- DATA-004 / 数据方案D：`100f5df data: add pathfinder p1b fixture set`
- BE-003 / 后端开发B：`5afd2a8 feat: add pathfinder p1b recommendation APIs`
- FE-003 / 前端开发C：`b8270f7 feat: add pathfinder p1b recommendation flow`

## 3. 交付内容

### 数据

- 新增 P1-B.1 role path fixture。
- 新增 OpenDocuments 项目匹配规则。
- 新增 OpenDocuments 产品助理 / 解决方案助理 trial task template。
- OpenDocuments 仍是唯一 `approved_for_trial_package` 项目。
- 其他项目不进入用户可见完整试航包生成链路。

### 后端

- 新增 `POST /api/pathfinder/recommendations`。
- 新增 `GET /api/pathfinder/projects`。
- 新增 `POST /api/pathfinder/trial-packages/generate`。
- `/api/pathfinder/records` 保持 P1-A / legacy 兼容。
- 继续复用 `analysis_records`，无新增 Alembic migration。

### 前端

- 背景页提交真实用户输入后进入推荐流程。
- 推荐页展示 `UserProfileSignal`、4 条路径、`OpenDocuments approved` 项目匹配和证据链。
- 只有 approved OpenDocuments 匹配路径可生成 `TrialPackageCandidate` 并进入试航。
- 试航页 / 结果页 / Markdown / 反包装机制继续复用 P1-A。
- 前端 API client 支持后端 P1-B.1 API，也保留 `fallback_mock` 兜底。

### QA

- 新增 P1-B.1 QA 执行方案。
- 前端 safety 和 E2E 已补充 P1-B.1 fallback / 4 路径 / approved project / trial package 断言。
- 后端测试已覆盖 recommendation、projects、trial package generate、legacy records 兼容和 scope guard。

## 4. 验证结果

已通过：

- `cd backend && python -m pytest`：82 passed。
- `cd frontend && npm run test:safety`：通过。
- `cd frontend && npm run lint`：通过。
- `cd frontend && npm run build`：通过。
- `E2E_BASE_URL=http://127.0.0.1:3021 npm run test:e2e -- e2e/pathfinder.spec.ts`：7 passed。
- `.\scripts\check_all.ps1`：通过，包含 backend pytest、frontend typecheck、frontend lint。

完整 E2E 验证：

- 命令：`.\scripts\check_all.ps1 -E2E -StartServices -BackendPort 8010 -FrontendPort 3010 -E2EBaseUrl http://localhost:3010 -E2EWorkers 2`
- 结果：17 passed / 11 failed。
- Pathfinder 专项 7/7 通过。
- 失败集中在既有账号注册、账号页、历史记录、探索页数据加载、匹配页数据下拉等用例，表现为 auth / data fixture / protected route 环境问题，不是 P1-B.1 Pathfinder 新增链路断言失败。

## 5. Scope Guard

本轮未引入：

- LLM 主链路。
- 真实 GitHub 搜索。
- 真实 RAG。
- 能力认证。
- offer / 录用概率。
- 企业筛选。
- 履历包装。
- 分数、百分比或复杂评分系统。
- P1-B 专用表或 Alembic migration。

## 6. 当前风险

- P1-B.1 前端 `fallback_mock` 是兜底，不应被包装为正式推荐服务；上线前需确认后端 API 环境可用。
- 完整 E2E 仍有非 Pathfinder 失败，需要单独治理 auth / fixture / protected route 测试环境。
- P1-B.1 仍复用 `analysis_records`，长期项目库查询、审计、删除和版本治理应在 P1-B.2 专用表 PRD 中处理。
- FE-003 数据层有较多本地 fallback 内容，后续应逐步改为读取数据 fixture / 后端 response，减少前端重复静态数据。

## 7. 下一步建议

1. 产品负责人先人工审查 `/pathfinder` P1-B.1 主链路，重点看路径推荐解释、项目匹配边界和试航包生成体验。
2. QA 按 `docs/pathfinder-p0/p1-b-qa-plan.md` 做执行型回归。
3. 技术侧单独修复完整 E2E 中的既有 auth / fixture 问题，不与 Pathfinder P1-B.1 commit 混合。
4. 暂不 push main；如需远端同步，只推 `codex/pathfinder-p1a-integration` 分支。
