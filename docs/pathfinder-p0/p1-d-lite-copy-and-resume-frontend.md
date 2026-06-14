# 寻径星图 P1-D Lite 文案清理与简历上传前端接入

Date: 2026-06-14
Task: FE-005

## Scope

本任务承接 P1-D Lite 参赛提交前的用户化收口：

- 清理 `/pathfinder/*` 路由中的用户可见工程表达。
- 将首页“上传简历生成星图”从提示入口接入到简历解析接口。
- 解析结果只进入可确认背景信号，不直接生成推荐或试航任务。
- 失败时给用户可理解的继续路径：换文件，或通过 AI 访谈补充经历线索。

## Runtime Behavior

- 新增 `parsePathfinderResume(file)` 前端 client：
  - `POST /api/pathfinder/resume/parse`
  - multipart form field: `file`
  - normalized response fields: `source`, `fileName`, `fileType`, `textLength`, `modelStatus`, `signals`, `readiness`, `missingSignalTypes`, `userMessage`
- 首页上传文件后展示“正在读取简历里的经历线索”。
- 解析成功后：
  - parsed signals 写入 `state.extractedSignals`；
  - `state.signalConfirmationStatus` 进入 `pending_confirmation`；
  - `state.profileSubmitted` 保持 false；
  - 页面跳转到 `/pathfinder/background`；
  - 用户需要确认或修改信号后，才会进入 `/pathfinder/recommendation`。
- 解析失败后：
  - 不显示技术错误栈；
  - 展示“暂时没能读取这份简历”；
  - 用户仍可重新上传或进入 AI 访谈。

## Copy Guard

新增静态检查会抽取 routed P1-D 页面中可能渲染的 JSX text / string literal，并与 data / Markdown copy 一起检查以下工程词不正向出现在用户可见文案中：

`API`, `后端`, `前端`, `不新增`, `占位`, `fallback`, `mock`, `schema`, `fixture`, `P1-D`, `P1-C`, `实现范围`, `低摩擦入口心智`, `低摩擦`, `本轮`, `运行逻辑`, `migration`

测试文件、开发文档和运行时对象字段不作为用户可见文案扫描对象。

## Scope Guard

- 未新增后端实现。
- 未新增数据库表或 migration。
- 未接入 GitHub Search。
- 未引入真实 RAG 主链路。
- 未引入评分、百分比、offer 概率、能力认证、企业筛选或简历包装。
- LLM 仍不能直接决定最终岗位、项目或就业结论。

## Validation

- `cd frontend && npm run test:safety` passed.
- `cd frontend && npm run lint` passed.
- `cd frontend && npm run build` passed.
- `cd frontend && E2E_BASE_URL=http://127.0.0.1:3025 npm run test:e2e -- e2e/pathfinder.spec.ts` passed: 9 passed.
- `git diff --check` passed.
- Browser spot check on `http://127.0.0.1:3025` passed:
  - `/pathfinder`
  - `/pathfinder/background`
  - `/pathfinder/recommendation`
  - `/pathfinder/recommendation` at 390px viewport, `scrollWidth=375`

Note: the default Playwright base URL `localhost:3000` was already occupied by an older running app instance during this task, so E2E was rerun against the isolated FE-005 server on port 3025.
