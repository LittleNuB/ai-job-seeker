# 寻径星图主 Agent Handoff

更新时间：2026-06-07

本文档是寻径星图后续产品推进的主 Agent 恢复点。后续如果主对话上下文压缩或更换 Agent，应先阅读本文，再阅读引用文档，不要仅凭聊天记录继续推进。

## 1. 当前主控结论

- 当前阶段：P0 / P1-A / P0.5 参赛 Demo 基本完成，进入 P1 产品化规划与数据底座规划阶段。
- 当前策略：不重新建仓；寻径星图继续在 `ai-job-seeker` 正式仓库内治理，但 `/pathfinder/*` 以独立产品壳呈现。
- 当前产品判断：参赛 Demo 主链路可用，视觉和文案已明显优于早期版本；后续重点转为“真实用户可使用的产品化能力”和“支撑产品落地的数据底座”。
- 当前不应继续做：无边界加功能、P1-B 专用表、P2 平台化、真实 RAG、能力认证、offer 概率预测、企业筛选、简历包装、多项目黑箱推荐、复杂评分。

## 2. 仓库与分支

- 正式仓库：`C:\Users\LittleNub\ai-job-seeker`
- 当前分支：`codex/pathfinder-p1a-integration`
- 远端分支：`origin/codex/pathfinder-p1a-integration`
- 当前本地状态：截至本文件创建前，本地分支相对远端 ahead 2。
- 最新相关 commits：
  - `e0b8820 copy: polish pathfinder evaluator-facing wording`
  - `628420c style: improve pathfinder visual productization`
  - `381dc7b fix: present pathfinder as standalone product shell`
  - `0f0985b feat: add pathfinder demo flow`
  - `1e33990 feat: add pathfinder record API`
  - `53aa9f3 docs: add pathfinder p0 p1a delivery materials`

## 3. 当前未提交 / 不可误提交项

以下为用户已有或非本轮范围改动，除非用户明确要求，不要混入 Pathfinder 后续提交：

- `README.md`
- `docs/DEVELOPMENT_LOG.md`
- `services/resume_service.py`
- `docs/AI_TRANSITION_COMPASS_PRD.md`
- `docs/product/*`

测试或运行可能导致本地数据库变脏，不应提交：

- `data/ai_job_copilot.db`

## 4. 关键文档索引

当前寻径星图基线文档：

- `docs/pathfinder-p0/README.md`
- `docs/pathfinder-p0/scope-lock-prd.md`
- `docs/pathfinder-p0/content-assets.md`
- `docs/pathfinder-p0/ux-flow.md`
- `docs/pathfinder-p0/p1-ui-design-brief.md`
- `docs/pathfinder-p0/final-delivery-checklist.md`
- `docs/pathfinder-p0/p0-competition-rehearsal.md`
- `docs/pathfinder-p0/p1-a-json-contract.md`
- `docs/pathfinder-p0/p1-a-frontend-implementation.md`
- `docs/pathfinder-p0/p1-a-backend-implementation.md`
- `docs/pathfinder-p0/p1-a-api-integration.md`
- `docs/pathfinder-p0/p1-a-qa-regression-report.md`
- `docs/pathfinder-p0/handoff-status.md`

后续新增主线文档建议：

- `docs/pathfinder-p0/p1-productization-prd.md`
- `docs/pathfinder-p0/data-foundation-plan.md`

## 5. 当前产品范围

已完成能力：

- `/pathfinder` 独立产品壳，不显示 AI Job Copilot 全局 Navbar / Footer。
- `/pathfinder/background` 小 C 背景与 3 条样例 JD。
- `/pathfinder/recommendation` 路径星图工作台。
- `/pathfinder/trial` OpenDocuments 来源参照 + 小 C 6 问试航工单。
- `/pathfinder/result` 航迹档案、反包装检查、Markdown 导出。
- 后端 Pathfinder 记录保存 API，复用 `analysis_records`。
- `X-User-Id` 仅作为非生产 Demo fallback；正式路径优先原项目 JWT auth。
- 6 问缺项、AI 使用说明缺失、包装开源项目风险表达均会阻断完整 Markdown 导出。

当前未接入：

- 寻径星图链路未接入实时 LLM。
- 后端不做路径推荐、不生成 Markdown、不做 RAG、不评分、不预测。
- 当前路径、JD、OpenDocuments 和 6 问仍是固定试航样例。

## 6. 子进程命名制度

命名采用“职责 + 字母”。

主 Agent 对话：

- 名称：`产品经理 / 主 Agent`
- Thread ID：`019e8de6-9fc9-78f1-a621-daa0cd53093e`
- 子对话完成任务后，应优先使用跨进程工具将结果回传到该 Thread ID。

职责建议：

- `前端开发A/B/C`
- `后端开发A/B/C`
- `产品规划A/B/C`
- `数据方案A/B/C`
- `QA验证A/B/C`
- `UI视觉A/B/C`

当前登记：

- `前端开发A`
  - Thread ID：`019e9899-44e7-7422-baad-af95528ef7b4`
  - 已完成：P0.5 视觉产品化、评委/体验者文案收口。

规则：

- 同一职责每新开一个对话，按字母递增。
- 主 Agent 发任务前应在本文档登记：任务 ID、子对话名称、Thread ID、预期交付。
- 子对话完成后应将结果回传给主 Agent 对话，并由主 Agent 更新本文档。

## 7. 任务 ID 制度

任务 ID 格式：

- `GOV-001`：治理 / handoff / 协作机制
- `P1-PRD-001`：P1 产品化 PRD
- `DATA-001`：数据底座方案
- `P1B-TECH-001`：P1-B 真实路径推荐技术契约
- `DATA-003`：P1-B 审核开源项目库与路径匹配规则
- `FE-001`：前端实现
- `BE-001`：后端实现
- `QA-001`：QA / 回归验证

已完成任务：

- `GOV-001`：初始化主 Agent 协作制度与主控 handoff。
- `P0.5-COPY-001`：评委/体验者文案收口，commit `e0b8820`。
- `P0.5-VISUAL-001`：视觉产品化，commit `628420c`。
- `P1-PRD-001`：P1 产品化 PRD，commit `613263e`。
- `DATA-001`：数据底座方案，commit `79e2d1b`。
- `PM-MERGE-001`：P1 PRD 与数据底座合并审计，见 `docs/pathfinder-p0/pm-merge-review-p1-prd-data.md`。
- `DATA-002`：P1-A 最小数据 fixture，主分支 commit `91ea465`。
- `BE-002`：P1-A TrailRecord 保存兼容，主分支 commit `e9084d1`。
- `FE-002`：P1-A 真实用户输入产品化，主分支 commit `3e443fd`。
- `QA-002`：P1-A 产品化 QA 计划，主分支 commit `0385db4`。
- `PM-MERGE-002`：P1-A 产品化第一轮实现合并审计，见 `docs/pathfinder-p0/pm-merge-review-p1a-implementation.md`。

待启动任务：

- 暂无。`P1B-TECH-001` 与 `DATA-003` 已并行启动。

## 8. 子任务提示词必须包含的回传协议

每个子对话任务提示词必须明确要求任务完成后通过跨进程工具回传给主 Agent 对话。回传内容必须包含：

- Task ID
- 子对话名称
- 修改 / 新增文件
- 是否 commit
- commit hash 与 message
- 验证命令和结果
- 是否触碰禁止范围
- 是否保留 B 类 dirty files
- remaining risks
- 是否建议主 Agent review
- 是否需要产品负责人判断

如果子对话无法使用跨进程工具回传，应在最终答复中明确说明，并让用户复制结果给主 Agent。

## 9. 子任务提交与推送制度

每个子任务提示词必须明确 commit / push 权限。

默认规则：

- 允许：本地修改和本地 commit。
- 禁止：push、force push、创建 PR、合并 PR。
- 例外：只有主 Agent 在任务提示词中明确写出允许 push / PR 时，子对话才可以执行。

如果子任务完成但验证未通过：

- 不应为了“完成任务”强行 commit。
- 可以提交已明确有效的文档产物，但必须在回传中说明验证失败原因和未解决风险。

## 10. 合并前审计制度

并行任务完成后，不直接进入开发实现。主 Agent 必须先执行 `PM merge review`。

`PM merge review` 必须处理：

- 两条任务结论是否冲突。
- P1-A / P1-B / P2 边界是否被混淆。
- 是否引入禁用能力：能力认证、offer 概率、企业筛选、简历包装、多项目黑箱推荐、真实 RAG、复杂评分。
- 是否需要调整 PRD、数据 schema、开发优先级。
- 哪些内容进入近期实现，哪些进入后续 backlog。

只有 `PM merge review` 通过后，才拆分前端、后端、数据、QA 的下一轮开发任务。

## 11. 主 Agent 更新制度

主 Agent 每次发任务前：

- 更新本文档的“进行中任务”。
- 记录子对话名称、Thread ID、任务摘要、预期交付。

主 Agent 收到任务结果后：

- 更新“已完成任务”。
- 记录 commit、验证结果、风险、下一步建议。
- 如有功能或产品基线变化，同步更新 `handoff-status.md` 或对应 PRD / plan。

## 12. 进行中任务

当前并行任务采用独立 git worktree 隔离模式。子任务可以在各自分支本地 commit，但禁止 push / PR。完成后由主 Agent 做 P1-B PM merge review，再决定是否进入开发拆分。

- `P1B-TECH-001`
  - 子对话名称：`技术方案A`
  - Thread ID：`019eacdd-a995-74b1-beba-de4a1c98386b`
  - worktree：`C:\Users\LittleNub\ai-job-seeker-worktrees\pathfinder-p1b-tech-001`
  - 分支：`codex/pathfinder-p1b-tech-001`
  - 任务摘要：输出 P1-B 真实路径推荐、审核开源项目匹配、试航包生成的技术方案与接口契约。
  - 预期交付：`docs/pathfinder-p0/p1-b-technical-architecture.md`

- `DATA-003`
  - 子对话名称：`数据方案C`
  - Thread ID：`019eacde-4254-7af2-8e64-f8fe13de9ac4`
  - worktree：`C:\Users\LittleNub\ai-job-seeker-worktrees\pathfinder-data-003`
  - 分支：`codex/pathfinder-data-003`
  - 任务摘要：输出 P1-B 审核开源项目库、路径标签体系、项目匹配规则和最小候选项目清单。
  - 预期交付：`docs/pathfinder-p0/p1-b-open-source-project-library.md`

## 12.1 产品负责人决策记录

2026-06-07，产品负责人确认 P1-A 产品化第一轮采用以下决策：

- P1-A 全由真实用户输入，不保留小 C 示意、默认身份、一键填充或默认作答。
- P1-A 第一轮暂不把 LLM 作为主链路依赖，先做真实输入、保存、导出、反包装。
- P1-A 继续复用 `analysis_records`，不新增 migration；P1-B 再做专用表 PRD。
- P1-A 默认匿名化 / 弱化 JD 公司名展示，只说样例 JD 与样本趋势参考。
- OpenDocuments License 和来源核验做成数据 fixture，由数据任务维护核验日期和边界说明。

## 13. 下一步主 Agent 工作

1. 等待 `P1B-TECH-001` 与 `DATA-003` 回传。
2. 核对两份方案是否冲突，尤其是真实路径推荐、项目库、TrialPackage 生成、LLM 边界和 Scope Guard。
3. 执行 P1-B PM merge review，决定哪些进入 P1-B.1 开发、哪些放入 P1-B.2 / P2。
4. 通过审计后再拆前端、后端、数据、QA 实现任务。
5. 暂不启动 P1-B 专用表、LLM 主链路、多试航包黑箱推荐或真实 RAG。

## 14. 当前服务参考

人工审查时常用本地服务：

- 前端：`http://127.0.0.1:3010/pathfinder`
- 后端：`http://127.0.0.1:8010`

服务 PID 会变化，启动或停止前应重新探测端口。不要假设旧 PID 仍有效。

## DATA-001 Status

- 任务状态：已完成；主 Agent 已纳入 PM merge review。
- 子对话名称：`数据方案A`
- 预期交付：`docs/pathfinder-p0/data-foundation-plan.md`
- 实际交付：已新增 `docs/pathfinder-p0/data-foundation-plan.md`，并在本文档追加 DATA-001 状态。
- commit 信息：`79e2d1b docs: add pathfinder data foundation plan`
- 验证：`git diff --check` 通过；文档任务未跑前后端全量测试。
- 注意事项：当前 B 类 dirty files 不属于本任务提交范围，需继续保留并避免误提交。

## P1-PRD-001 Status

- 任务 ID：`P1-PRD-001`
- 子对话名称：`产品规划A`
- 状态：已完成；主 Agent 已纳入 PM merge review。
- 预期交付：新增 `docs/pathfinder-p0/p1-productization-prd.md`；记录 P1 产品化目标、P1-A / P1-B / P2 边界、核心 schema、LLM 接入边界、历史 / 编辑 / 导出机制、反包装机制、前端 / 后端 / 数据 / QA 拆解。
- 已触碰文件：`docs/pathfinder-p0/p1-productization-prd.md`、`docs/pathfinder-p0/main-agent-handoff.md`。
- Forbidden scope：未触碰 `README.md`、`docs/DEVELOPMENT_LOG.md`、`services/resume_service.py`、`docs/AI_TRANSITION_COMPASS_PRD.md`、`docs/product/*`、`data/ai_job_copilot.db`。
- Commit 信息：`613263e docs: add pathfinder p1 productization prd`
- 验证：`git diff --check` 通过；必需章节与 schema 检查通过；文档任务未跑前后端全量测试。
- 后续建议：主 Agent 已完成 PM merge review，统一收口 P1-A / P1-B / P2 边界。

## PM-MERGE-001 Status

- 任务状态：已完成。
- 交付文件：`docs/pathfinder-p0/pm-merge-review-p1-prd-data.md`
- 主结论：`P1-PRD-001` 与 `DATA-001` 无阻断级冲突，可以进入 P1-A 产品化第一轮，但需产品负责人先确认 5 个决策点。
- 已确认 P1-A 范围：全由真实用户输入，不保留小 C 示意；固定 TrialPackage / OpenDocuments / 三条路径 / 6 问；复用 `analysis_records`；不做专用表、不做自由推荐、不把 LLM 作为第一轮主链路依赖。
- 已确认决策：真实用户输入、LLM 第一轮暂缓、P1-A 继续复用 `analysis_records`、JD 公司名匿名 / 弱化展示、OpenDocuments License fixture 维护方式。

## PM-MERGE-002 Status

- 任务状态：已完成。
- 交付文件：`docs/pathfinder-p0/pm-merge-review-p1a-implementation.md`
- 已合并任务：`DATA-002`、`BE-002`、`FE-002`、`QA-002`
- 主分支 commits：
  - `91ea465 data: add pathfinder p1a fixture baseline`
  - `e9084d1 feat: support pathfinder p1a user trail records`
  - `3e443fd feat: productize pathfinder user input flow`
  - `0385db4 docs: add pathfinder p1a productization qa plan`
- 合并后修订：QA 计划已更新为 FE / BE 合并后的事实状态。
- Contract 结论：current contract 使用 `p1a-opendocuments-engineering-kb`、`user_trial_contribution`、`sourceProjectReference`、`userTrialContribution`；旧 `p0-xiaoc-opendocuments` 与 `xiaoc_trial_contribution` 只保留为 legacy 兼容语境。
- 验证：backend pytest 78 passed；frontend safety / lint / build passed；Pathfinder E2E 7 passed；`.\scripts\check_all.ps1` passed。
- 当前建议：进入产品负责人人工审查和执行型 QA，不 push main，不启动 P1-B。
