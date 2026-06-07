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
- `FE-001`：前端实现
- `BE-001`：后端实现
- `QA-001`：QA / 回归验证

已完成任务：

- `GOV-001`：初始化主 Agent 协作制度与主控 handoff。
- `P0.5-COPY-001`：评委/体验者文案收口，commit `e0b8820`。
- `P0.5-VISUAL-001`：视觉产品化，commit `628420c`。

待启动任务：

- `P1-PRD-001`：P1 产品化 PRD。
- `DATA-001`：数据底座方案。

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

当前并行任务：

- `P1-PRD-001`
  - 子对话名称：`产品规划A`
  - Thread ID：`019ea085-1496-73a2-abbc-1e8552a04d21`
  - 任务摘要：输出寻径星图 P1 产品化 PRD，回答当前 Demo 如何变成真实用户可使用的产品，并明确 P1-A / P1-B / P2 边界。
  - 预期交付：`docs/pathfinder-p0/p1-productization-prd.md`，并回传任务状态。
  - 权限：允许本地 commit；禁止 push、force push、创建 PR、合并 PR。

- `DATA-001`
  - 子对话名称：`数据方案A`
  - Thread ID：`019ea085-a7f5-7711-b153-e5a698889901`
  - 任务摘要：盘点现有数据资产，设计寻径星图产品化所需的数据底座、数据对象、获取方式、清洗标注和质量标准。
  - 预期交付：`docs/pathfinder-p0/data-foundation-plan.md`，并回传任务状态。
  - 权限：允许本地 commit；禁止 push、force push、创建 PR、合并 PR。

并发注意：两个子任务都可能追加本文档。如遇 `main-agent-handoff.md` 并发变更或冲突，子对话不得强行覆盖，应回传状态块，由主 Agent 统一合并。

## 13. 下一步主 Agent 工作

1. 等待 `产品规划A` 回传 `P1-PRD-001`。
2. 等待 `数据方案A` 回传 `DATA-001`。
3. 两个任务完成后做 PM merge review。
4. 将 PRD 与数据方案合并为下一阶段开发路线：
   - 前端产品化任务
   - 后端记录 / 历史 / auth 任务
   - 数据采集 / 清洗 / 标注任务
   - QA 验收任务

## 14. 当前服务参考

人工审查时常用本地服务：

- 前端：`http://127.0.0.1:3010/pathfinder`
- 后端：`http://127.0.0.1:8010`

服务 PID 会变化，启动或停止前应重新探测端口。不要假设旧 PID 仍有效。
