# 寻径星图 P1-C.1 航前 AI 访谈与多项目匹配 QA 计划

任务 ID：QA-003

子对话名称：QA验证A

日期：2026-06-11

## 1. 目标与结论

本计划用于 BE-003 / FE-003 / DATA-003 合并后的 P1-C.1 执行型 QA。当前任务只产出 QA 计划，不实现运行代码，不修改前后端测试。

P1-C.1 的验收目标是确认寻径星图从 P1-B.1 的“真实背景 -> 规则路径推荐 -> 已审核项目匹配”升级为：

> 航前 AI 访谈 -> 候选背景信号抽取 -> 用户编辑 / 确认信号 -> 规则路径推荐 -> 已审计多项目 fixture 匹配 -> 受控试航包生成。

核心验收结论：

- AI 只做提问、追问和结构化候选信号抽取，不做最终录用预测、能力认证、企业筛选、简历包装或项目归属证明。
- DeepSeek 只由后端接入；前端不接触 key，日志和 commit 不泄漏 key。
- GitHub Search 暂不实现；多项目只能来自已审计 fixture，未核验项目不得作为正式试航主项目。
- 只有用户确认信号可以进入路径推荐、项目匹配和完整试航包生成。
- P1-A / P1-B 已有 `analysis_records` 复用、反包装、Markdown、fallback、390px 移动端能力继续回归。

## 2. 后端测试矩阵

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 | 优先级 |
|---|---|---|---|---|---|
| BE-P1C-001 | 无 key fallback | 不配置 DeepSeek key | 创建 interview session 并请求 AI 下一问 | 返回可继续的 fallback 手动输入状态；不抛 500；响应不泄漏 provider/key 路径 | P0 |
| BE-P1C-002 | mock DeepSeek 正常返回 | 使用 mock provider | 请求下一问 / 信号抽取 | 返回结构化 question、candidateSignals、providerMode=mock 或等价标识；不发真实网络请求 | P0 |
| BE-P1C-003 | JSON 输出损坏 | mock 返回非 JSON 或截断 JSON | 调用信号抽取 | 后端返回可恢复错误和手动输入 fallback；不保存损坏信号为 confirmed | P0 |
| BE-P1C-004 | JSON 缺字段 | mock 返回缺 signal id / source / confidence | 调用信号抽取 | schema 校验失败；候选信号不进入推荐；错误不含 prompt / key | P0 |
| BE-P1C-005 | 模型返回越界字段 | mock 返回 score、offerProbability、certification、resumePackaging | 调用信号抽取 | 后端拒绝或清洗越界字段，并记录 guard finding；不得写入可见响应 / `analysis_records` | P0 |
| BE-P1C-006 | 保存 interview session | 用户完成 2-3 轮访谈 | 保存 session | 复用 `analysis_records`，`type=pathfinder`，`match_score=null`，不新增 migration | P0 |
| BE-P1C-007 | 读取 interview session | 已保存 session | GET session | 返回 turns、candidateSignals、confirmedSignals、status；跨用户读取 404/403 | P0 |
| BE-P1C-008 | 用户确认 signal | 有候选信号 | PATCH confirm / edit / reject | confirmed signal 带用户确认时间、sourceTurnIds、editedByUser 标记； rejected 信号不进入推荐 | P0 |
| BE-P1C-009 | 未确认 signal 阻断推荐 | 只有候选信号，无 confirmed | 调用 recommendations | 返回 422 或 needs_confirmation；不得生成完整推荐 / TrialPackage | P0 |
| BE-P1C-010 | confirmed signal 推荐 | 至少 3 条 confirmed signal | 调用 recommendations | 推荐只引用 confirmed signal id；不引用 raw answer 全文作为公开证据 | P0 |
| BE-P1C-011 | 多项目 fixture 匹配 | DATA-003 多项目 fixture 已加载 | 调用 projects / match | 只返回 approved / verified 项为可选主项目； needs_review 不可生成 | P0 |
| BE-P1C-012 | needs_review 项目阻断 | 项目 status=needs_review | 调用 trial package generate | 返回 4xx 或不可生成状态；不得生成完整 TrialPackage | P0 |
| BE-P1C-013 | key 安全 | 配置真实 key 做本地 smoke | 调用一次真实 provider | 日志、响应、异常、数据库均不包含 key；前端 bundle 无 key | P0 |
| BE-P1C-014 | API 错误脱敏 | provider timeout / 401 / 429 | 调用 interview | 返回通用错误；不暴露 DeepSeek key、完整 provider response、请求 headers | P0 |
| BE-P1C-015 | migration 守卫 | 合并后仓库 | 检查 alembic / migrations | P1-C.1 无新增 migration；仍复用 `analysis_records` | P0 |

建议新增后端自动化：

- mock provider fixture：正常 JSON、损坏 JSON、缺字段 JSON、越界字段 JSON、timeout、401。
- 递归 forbidden key 扫描：API 响应、保存到 `analysis_records.result` 的 JSON、测试 mock payload。
- session 权限测试：不同 user id 不能读取、确认、删除对方访谈。
- 手动 fallback 测试：无 key / provider 失败时可保存用户手动背景信号。

## 3. 前端 E2E 矩阵

| 编号 | 场景 | 操作 | 预期结果 | 优先级 |
|---|---|---|---|---|
| FE-P1C-001 | AI 访谈可用路径 | 背景页输入一句话，mock AI 返回追问 | 页面展示 AI 问题、用户回答框、访谈进度和“生成候选信号”入口 | P0 |
| FE-P1C-002 | AI 失败 fallback | mock interview API 500 / no_key | 页面切换手动输入；用户可手动填写背景信号并继续 | P0 |
| FE-P1C-003 | 用户编辑 signal | AI 抽取候选信号 | 用户编辑文本、类型、证据摘要 | edited signal 被保存为用户确认版本，不保留未确认原文进入推荐 | P0 |
| FE-P1C-004 | 用户确认 signal | 勾选 / 确认若干信号 | 推荐按钮启用条件仅基于 confirmedSignals | P0 |
| FE-P1C-005 | 未确认信号不得推荐 | 有候选信号但未确认 | 点击推荐 | 被阻断并提示“需确认信号”；不调用完整推荐 API 或 API 返回阻断 | P0 |
| FE-P1C-006 | 多项目来自 fixture | mock projects 返回 approved + needs_review | UI 只允许 approved 项作为正式试航主项目；needs_review 标记待核验且 CTA 禁用 | P0 |
| FE-P1C-007 | OpenDocuments 不再唯一 | fixture 至少有 2 个 approved 项 | 项目匹配区展示多个已审计项目；OpenDocuments 只是其中一个 | P0 |
| FE-P1C-008 | 不显示 GitHub Search | 全链路页面 | 搜索按钮、输入框、文案扫描 | 不出现 GitHub Search、仓库实时搜索、自动抓取入口 | P0 |
| FE-P1C-009 | 不显示未审计项目 | fixture 含 candidate / needs_review | 用户正式选择区 | 未审计项目不作为默认可选主项目，不可进入完整试航包 | P0 |
| FE-P1C-010 | 反包装阻断仍有效 | 6 问或作品集含“我开发了 OpenDocuments / offer 概率” | 进入结果页 | full Markdown、复制、下载禁用；可保存 draft | P0 |
| FE-P1C-011 | key 不进前端 | build 后检查页面 / network / source | 前端无 DEEPSEEK key、provider secret、Key.txt 路径 | P0 |
| FE-P1C-012 | 用户回答不进 URL | 访谈多轮后刷新 / 复制 URL | URL 不包含 raw answer、简历片段、隐私内容 | P0 |
| FE-P1C-013 | 390px 无溢出 | 390px 打开访谈、信号确认、项目匹配、试航、结果 | `scrollWidth <= clientWidth`；主要按钮和表单可用 | P1 |

建议 E2E mock：

- `POST /api/pathfinder/interview/sessions`
- `POST /api/pathfinder/interview/sessions/{id}/turns`
- `POST /api/pathfinder/interview/sessions/{id}/extract-signals`
- `PATCH /api/pathfinder/interview/sessions/{id}/signals`
- `POST /api/pathfinder/recommendations`
- `GET /api/pathfinder/projects`
- `POST /api/pathfinder/trial-packages/generate`

## 4. 数据 fixture 校验

DATA-003 合并后，QA 应对项目库 fixture 做静态校验，并在前后端运行时各抽检一次。

### 4.1 项目字段完整性

每个项目必须包含：

- `projectId`
- `name`
- `sourceUrl`
- `license`
- `licenseStatus` 或 `licenseVerificationStatus`
- `status`
- `sourceBoundary`
- `referenceRole`
- `approvedForTrialPackage` 或等价可生成门槛字段
- `verifiedAt` / `licenseVerifiedAt`
- `notClaimed`
- `forbiddenClaims`
- `allowedUseCases`
- `riskBoundaries`

缺 `license`、`status`、`sourceBoundary`、`referenceRole`、核验日期、不可声称内容任一项，即 No-Go。

### 4.2 多项目边界

- OpenDocuments 不再是唯一项目；fixture 至少包含多个项目记录。
- 只有 `approved_for_trial_package` 且 License verified 的项目可作为正式试航主项目。
- `needs_review`、`candidate`、`license_pending` 项目不得作为默认可选主项目，不得生成完整 TrialPackage。
- stars、forks、commit 日期等元数据如存在，只能作为背景，不得参与排序、评分或胜任解释。
- 项目匹配解释必须引用 confirmed user signal、项目能力、路径需求和边界说明，不得输出综合分。

### 4.3 无小 C 默认内容

fixture 不得包含：

- 小 C 默认身份。
- 小 C 默认作答。
- 小 C 作品集主体。
- 小 C 参与 OpenDocuments 或任何项目官方贡献的暗示。

P0 legacy 兼容可保留在专门 legacy 测试语境，但不得进入 P1-C.1 当前产品默认流。

## 5. 安全与隐私检查

### 5.1 Key 安全

必须验证：

- DeepSeek key 只在后端服务端读取。
- 前端代码、构建产物、浏览器 network payload、localStorage、sessionStorage 不包含 key。
- 日志、异常、API 错误、数据库记录不包含 key 或 `C:\Users\LittleNub\Desktop\Key.txt` 内容。
- `.env`、Key.txt、真实 provider response 不进入 commit。

### 5.2 用户回答隐私

必须验证：

- 用户原始回答只保存完成访谈和确认信号所需的最小内容。
- 完整简历片段、联系方式、企业内部资料不得暴露到 URL query/hash。
- 推荐页和 Markdown 默认展示结构化 confirmed signal，不直接公开 raw answer 全文。
- 删除 / 重开 session 不复用上一个用户的 raw answer。

### 5.3 API 错误脱敏

必须验证：

- provider 401/429/timeout 返回通用错误。
- 错误信息不包含 provider key、请求头、完整 prompt、完整模型原始输出。
- 无 key fallback 不应让用户误以为真实 AI 已运行。

## 6. Scope Guard

以下表达或字段不得出现在页面正向结论、API 可见响应、fixture 可见字段、Markdown 或 CTA 中：

```text
score
percent
percentage
offer probability
hire probability
certification
competency
employer shortlist
company recommendation
resume packaging
resume optimization
official contribution
contributed to OpenDocuments
胜任分
匹配分
百分比
概率
录用
上岸
能力认证
岗位认证
企业筛选
企业推荐
简历包装
简历优化
官方贡献
参与原项目开发
```

命中处理：

- 正向可见表达为 P0 阻断。
- 否定语境、不可声称清单、Scope Guard 文档说明不阻断，但不得进入推荐结论或 CTA。
- 模型返回越界字段时，后端必须拒绝或清洗，且 QA 需要确认不会被前端展示。

## 7. 验收命令

BE / FE / DATA 合并后的执行型 QA 至少运行：

```powershell
cd backend
python -m pytest
```

```powershell
cd frontend
npm run test:safety
npm run lint
npm run build
npm run test:e2e -- e2e/pathfinder.spec.ts
```

```powershell
git diff --check
git status --short --branch
```

真实 LLM smoke test 必须手动启用 key，默认 CI 和默认 mock 测试不得发真实 DeepSeek 请求。建议 smoke 只覆盖：

1. 后端读取 key 成功但不打印。
2. 一轮访谈返回结构化问题。
3. 一次信号抽取返回 schema-valid JSON。
4. 关闭 key 后 fallback 仍可用。

本 QA-003 文档任务只需运行：

```powershell
git diff --check
git status --short --branch
```

原因：本轮只新增 QA 计划和 handoff 状态，不修改前端、后端、测试代码、依赖、fixture 或运行逻辑。

## 8. Go / Conditional Go / No-Go

### Go

满足以下条件可建议 Go：

- 后端无 key fallback、mock DeepSeek、坏 JSON、越界字段、session 保存 / 读取、signal 确认、`analysis_records` 复用测试通过。
- 前端 AI 访谈、失败 fallback、信号编辑 / 确认、未确认阻断、多项目 fixture、无 GitHub Search、反包装、390px 测试通过。
- 数据 fixture 多项目字段完整，OpenDocuments 不再唯一，needs_review 不可生成完整试航包。
- key、用户回答、provider 错误全部通过安全隐私检查。
- Scope Guard 无 P0 阻断命中。
- 验收命令全部通过；真实 LLM 只在手动 smoke 中使用。

### Conditional Go

仅当产品负责人明确接受风险时可 Conditional Go：

- 真实 LLM smoke 因 key 或网络不可用未跑，但 mock provider、fallback、schema 校验和 key 不泄漏检查全部通过。
- 多项目 fixture 中只有 2-3 个 approved 项目，但字段完整且 needs_review 阻断可靠。
- 用户 raw answer 仍保存在后端 session 内部，但可见页、URL、Markdown 只展示 confirmed signals，且有删除 / 覆盖策略说明。
- fallback 手动输入体验不够顺滑，但不会丢数据，不误导用户“AI 已运行”。

### No-Go

任一项出现即 No-Go：

- 前端接触或泄漏 DeepSeek key。
- provider 错误暴露 key、请求头、完整 prompt 或内部配置。
- 未确认 signal 可进入完整推荐或试航包生成。
- 模型返回的 score、概率、认证、企业筛选、简历包装等字段进入可见响应或数据库当前记录。
- GitHub Search / 实时抓取入口出现在 P1-C.1。
- 未核验 / needs_review 项目可作为正式试航主项目。
- needs_review 项目可生成完整 TrialPackage。
- 反包装正向越界未阻断。
- P1-C.1 新增 migration 或 Pathfinder 专用表。
- 390px 核心页面横向溢出导致访谈、确认、项目选择或导出不可用。

## 9. 当前已知风险

- P1-C.1 引入 LLM provider 后，JSON 稳定性和错误脱敏是最大新增风险；mock 不足以替代手动 smoke。
- 多项目 fixture 扩展可能诱发“推荐分 / 排序 / 项目热度”表达，QA 必须强扫。
- 用户确认 signal 是产品可信边界，任何“候选信号直接推荐”的捷径都应阻断。
- 当前指定必读文件 `docs/pathfinder-p0/p1-b-implementation-merge-review.md` 在仓库不存在；实际读取的是 `docs/pathfinder-p0/pm-merge-review-p1b-implementation.md`。
