# 寻径星图 P0 文档索引

版本：P0 / Demo Lock

本目录固化任务 1、任务 2、任务 3 的已通过产物，作为后续任务 4 前端方案、任务 5 后端方案、任务 6 QA / 演示验收的产品基线。

## 当前结论

寻径星图 P0 是 AI Job Copilot 的新模块 / 参赛壳，面向传统工科等非 AI / 非 CS 背景学生，使用固定 Demo 主线证明：

> 小 C 能否基于样例 JD + OpenDocuments，完成一次“工程企业知识库 AI 助手”试航，并生成可追溯作品集起点。

P0 不做开放式 JD 推荐，不做多开源项目推荐，不做能力认证，不做 offer 概率预测，不做简历包装，不暗示用户参与 OpenDocuments 官方贡献。

## 文档清单

1. [Scope Lock 与 PRD](./scope-lock-prd.md)
2. [内容资产基线](./content-assets.md)
3. [页面与交互基线](./ux-flow.md)
4. [任务状态与交接规则](./handoff-status.md)
5. [前后端方案评审](./technical-review.md)
6. [QA 与参赛演示方案](./qa-demo-plan.md)
7. [P1/P2 产品路线任务板](./p1-product-roadmap.md)
8. [P0 Polish 文案最终稿](./p0-polish-copy-final.md)
9. [P1 UI 设计方案](./p1-ui-design-brief.md)（P1 UI 设计方案，不修改 P0 Scope）
10. [P0 Polish 前端实现记录](./p0-polish-frontend-implementation.md)
11. [P1 后端 / 数据模型预研方案](./p1-backend-data-model-brief.md)
12. [P1 规划一致性审计报告](./p1-planning-audit.md)

## 后续任务使用规则

- 任务 4 前端方案必须以 `scope-lock-prd.md` 和 `ux-flow.md` 为准。
- 任务 5 后端/API 方案必须以 `scope-lock-prd.md` 的 P0 边界为准，不得扩展真实 RAG 检索、复杂推荐或评分系统。
- 内容文案、Markdown 导出和反包装表达必须以 `content-assets.md` 为准。
- 任何新增功能如果不在 P0 文档中，默认进入 P1 待议，不进入当前 Demo 冲刺。
- 任务 4/5 的下一轮修订必须遵守 `technical-review.md` 中的 Markdown 归属和前后端契约决策。
- QA、演示验收和上线前检查必须以 `qa-demo-plan.md` 为准。
- P1/P2 规划以 `p1-product-roadmap.md` 为准，但不得反向扩大 P0 Scope。
- P0 polish 页面文案、演示话术和 Q&A 以 `p0-polish-copy-final.md` 为准。
- P1 UI / 视觉升级以 `p1-ui-design-brief.md` 为准，只改善可读性、专业感、信息层级、展示冲击力和反包装识别度，不修改 P0 Scope。
- P1 进入实现前，应以 `p1-planning-audit.md` 收口 P0/P1 文档一致性、P1-A/P1-B 路线、待产品确认问题和 P1-0 实施顺序。

## 最终交付状态

更新时间：2026-06-04

当前结论：寻径星图 P0 参赛彩排已通过，P1-A QA 回归已通过，当前版本可以进入最终参赛展示，也可以作为 P1-A 阶段验收基线。无展示阻断问题。

### P0 / P1-A 已完成能力

- P0 固定 Demo 闭环：`/pathfinder -> /pathfinder/background -> /pathfinder/recommendation -> /pathfinder/trial -> /pathfinder/result`。
- 固定范围：小 C、三条路径、OpenDocuments 公开参考项目、工程企业知识库 AI 助手试航、固定 6 问、Markdown 导出。
- 结果页：航迹表、作品集一页纸草稿、指标表、用户流程草图、风险清单、合规表达建议、面试追问准备和 Markdown 导出。
- P1-A JSON 契约：`TrailRecord / TrialAnswer[] / AntiPackagingCheck / MarkdownSnapshot` 已落地。
- 前后端 API 联调：已接入 `/api/pathfinder/records` 系列创建、读取、作答保存、结果保存和删除 API。
- 后端保存：继续复用 `analysis_records`，`type = "pathfinder"`，`input_text` 保存 P1-A input envelope，`result` 保存 P1-A result envelope，`input_file_url = null`，`match_score = null`。
- Markdown 归属：完整 Markdown 仍由前端单一模板源生成，后端只保存前端传入的 `markdownSnapshot`。
- fallback：后端不可用时，前端可继续依赖 `sessionStorage` 完成本地试航和 Markdown 导出。
- 反包装机制：6 问缺项、第 6 问 AI 使用说明缺失、正向越界表达和必需 Markdown section 缺失会阻断完整 Markdown 导出。

### 本地启动方式

后端：

```text
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

前端：

```text
cd frontend
npm install
npm run dev
```

默认联调配置：

- 前端访问同源 `/api/pathfinder/records`。
- `frontend/next.config.mjs` 默认把 `/api/:path*` 转发到 `http://127.0.0.1:8000/api/:path*`。
- 可用 `PATHFINDER_API_ORIGIN` 或 `NEXT_PUBLIC_PATHFINDER_API_ORIGIN` 覆盖后端 origin。
- 可用 `NEXT_PUBLIC_PATHFINDER_USER_ID` 设置 Demo / 联调用 `X-User-Id`。
- 可用 `NEXT_PUBLIC_PATHFINDER_API_ENABLED=false` 关闭 API 同步，只保留本地草稿。

### 验证命令

前端：

```text
cd frontend
npm run test:safety
npm run lint
npm run test:e2e
npm run build
```

后端：

```text
cd backend
python -m pytest
python ../scripts/migrate_db.py
```

仓库检查：

```text
git diff --check
```

最近固化结果：前端 `test:e2e` 11/11 通过，后端 `python -m pytest` 12/12 通过，迁移脚本通过，未新增 Alembic migration。

### 关键文档索引

- [Scope Lock 与 PRD](./scope-lock-prd.md)
- [P1-A JSON 数据契约与验收标准](./p1-a-json-contract.md)
- [P1-A 前端实现说明](./p1-a-frontend-implementation.md)
- [P1-A 后端实现说明](./p1-a-backend-implementation.md)
- [P1-A 前后端 API 联调说明](./p1-a-api-integration.md)
- [P1-A QA 回归报告](./p1-a-qa-regression-report.md)
- [P0 参赛彩排验收](./p0-competition-rehearsal.md)
- [最终交付清单](./final-delivery-checklist.md)
- [任务状态与交接规则](./handoff-status.md)

### 参赛展示入口

- 展示入口：`http://127.0.0.1:3000/pathfinder`
- 后端健康检查入口：`http://127.0.0.1:8000/docs`
- 点击路径：`/pathfinder -> /pathfinder/background -> /pathfinder/recommendation -> /pathfinder/trial -> /pathfinder/result`
- 参赛讲稿与点击脚本：`docs/pathfinder-p0/p0-competition-rehearsal.md`

### 当前已知非阻断问题

- 正式 auth 尚未接入，P1-A 当前仍使用 `X-User-Id` 作为 Demo / 联调阶段临时用户依赖。
- 移动端顶部流程导航是横向可滚动控件，主体在 375px / 390px 已验证无横向溢出；导航体验可后续优化。
- 本地 dev server 可能输出 Node `DEP0060` warning，不影响应用运行和测试结果。
- 若 3000 端口复用旧 dev server，E2E 的 `X-User-Id` 断言可能命中旧环境变量；展示前建议重启干净前端服务。

### 后续范围说明

P1-B / P2 不在当前最终交付范围内。以下能力不得反向并入本次 P0 / P1-A 交付：专用 `pathfinder_records` / `trail_records` 表、Alembic 新迁移、TrialPackage 管理和发布流、历史记录筛选页、正式 auth 接入、内容审核工作台、多试航包推荐、多开源项目智能推荐、真实 RAG 检索、推荐评分、offer 概率、能力认证、企业筛选、简历包装或自动投递。
