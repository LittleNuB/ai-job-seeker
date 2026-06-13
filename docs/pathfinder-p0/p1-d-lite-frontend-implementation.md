# 寻径星图 P1-D Lite 前端实现说明

Date: 2026-06-14
Task: FE-004

## Scope

本次前端改造把 Pathfinder 从固定流程 Demo 调整为低摩擦“个人 AI 求职星图”体验。实现仍复用现有 P1-C.1 state、访谈 API、推荐 API、项目库 API、试航包生成、`analysis_records` 兼容链路和 Markdown 导出，不新增后端 API、数据库表或 migration。

## Implemented

- `/pathfinder`
  - 首屏改为两个主入口：上传简历生成星图、AI 聊聊我的经历。
  - 简历上传为前端本地占位，明确“上传后整理为可确认背景信号”。
  - 长表单不再作为默认第一印象。

- `/pathfinder/background`
  - 强化开放式 AI 访谈。
  - 增加“暂时够了，生成星图”动作。
  - 增加信号完整度：`可生成 / 建议补充 / 信息不足`。
  - 将偏好、工作方式、排斥项、学习意愿作为可补充自我认知信号，不做性格测评。
  - 手动表单降级为“编辑已提取信息 / 手动补充” fallback。

- `/pathfinder/recommendation`
  - 改为 2.5D 岗位星图工作台。
  - 展示 12 个岗位星点，按 AI 产品 / 应用、AI 开发 / 工程、AI 数据 / 评测、AI 运营 / 增长四个星域组织。
  - Top 3 星点高亮。
  - 点击星点后展示相关岗位叫法、样例 JD 信号、常见交付物、迁移入口、高亮原因和适航任务类型。
  - 展示三类适航任务入口：已核验开源项目拆解 + 场景改造、Vibe Coding 原型试航、AI 工具体验营运营方案试航。
  - 只有已核验开源项目链路继续生成完整试航任务；产品/运营仅作为提交版框架。

- `/pathfinder/trial`
  - 重新包装为适航任务页面，保留当前开源项目试航链路和稳定六问作答。

- `/pathfinder/result`
  - 重构为“适航成果包”。
  - 四个模块：岗位星点结论、适航成果包、证据链与边界、下一步 3/7 天打磨计划。
  - Markdown 保留为次级导出按钮和预览。

## Guardrails

- No Three.js.
- No GitHub Search.
- No new backend API.
- No migration.
- No RAG main path.
- No scores, percentages, offer probability, capability certification, employer screening, or resume packaging.
- LLM remains limited to interview follow-up and signal extraction; frontend does not let LLM decide final role or project eligibility.

## Files

- `frontend/src/features/pathfinder/p1d-pages.tsx`
- `frontend/src/features/pathfinder/components.tsx`
- `frontend/src/app/pathfinder/*/page.tsx`
- `frontend/src/app/pathfinder/layout.tsx`
- `frontend/e2e/pathfinder.spec.ts`

## Validation

- `cd frontend && npm run test:safety` passed.
- `cd frontend && npm run lint` passed.
- `cd frontend && npm run build` passed.
- `cd frontend && npm run test:e2e -- e2e/pathfinder.spec.ts` passed: 8 passed.
- Browser smoke checked `/pathfinder`, `/pathfinder/background`, `/pathfinder/recommendation`, `/pathfinder/result`.
- 390px mobile star map check: `scrollWidth=375`, viewport width `390`.

## Remaining Risks

- Resume upload is only a frontend placeholder for this submission.
- Product and operations pilot cards are productized frames, not full generators.
- Browser smoke without backend can show a local save failure state; mocked E2E covers records API success.
