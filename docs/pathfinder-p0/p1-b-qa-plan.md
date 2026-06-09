# 寻径星图 P1-B.1 QA 执行方案

任务 ID：QA-003

子对话名称：QA验证B

日期：2026-06-09

## 1. 目标与结论

本计划用于 P1-B.1 实现合并后的执行型 QA 验收。当前任务只产出 QA 执行方案和前后端测试用例审计清单，不实现功能代码，不修改前后端测试。

P1-B.1 的 QA 目标是确认寻径星图从 P1-A 的固定 OpenDocuments 试航，升级为“真实用户背景 -> 规则优先路径推荐 -> 人工审核项目匹配 -> 试航包生成”的受控产品链路，同时继续保留 P1-A 的 records 保存、反包装、Markdown、fallback 和参赛演示可回归能力。

验收主结论必须同时满足：

- 推荐受控：路径推荐由规则和证据链驱动，不由 LLM 主链路、黑箱评分或实时 GitHub / RAG 决定。
- 项目受控：只有 `approved_for_trial_package` 且 License 已核验的 `reference_only` 项目可生成完整 TrialPackage；P1-B.1 用户可见 approved 项目暂只接受 OpenDocuments。
- 保存兼容：继续复用 `analysis_records`，不新增 Pathfinder 专用表，不新增 Alembic migration，`/records` 兼容 P1-A / legacy 读取。
- Scope Guard：页面、API、fixture、Markdown 均不得出现评分、概率、认证、企业筛选、简历包装、真实 RAG、多项目黑箱推荐或开源贡献暗示。

本轮文档任务不跑前后端全量测试，原因是没有修改产品代码、测试代码、依赖或 fixture；只执行 `git diff --check` 验证文档空白和格式。

## 2. 回归范围

### 2.1 必测范围

- `POST /api/pathfinder/recommendations`：真实背景输入、信号抽取、路径推荐、证据链、scope disclaimer、run snapshot。
- `GET /api/pathfinder/projects`：人工审核项目库读取、状态过滤、License 边界、candidate 不进入可生成链路。
- `POST /api/pathfinder/trial-packages/generate`：基于 recommendation run、path、project 生成 TrialPackageCandidate。
- `/api/pathfinder/records` 及现有 record 子接口：P1-B.1 envelope 保存、P1-A 兼容、legacy 读取、跨用户隔离、阻断态保存策略。
- 前端 `/pathfinder/background`、`/pathfinder/recommendation`、`/pathfinder/trial`、`/pathfinder/result` 主链路。
- 数据 fixture：RolePath taxonomy、OpenSourceProjectRecord、ProjectMatchRule、TrialTaskTemplate、AntiPackagingBoundary、EvidenceMapping。
- P1-A 保留能力：6 问、反包装阻断、否定语境不误阻断、Markdown 导出、后端失败 fallback、390px 移动端。

### 2.2 禁止范围

本轮 QA 不接受以下能力进入 P1-B.1：

- LLM 直接决定路径、项目、结论或胜任判断。
- 实时 GitHub 搜索、自动抓仓库、真实 RAG、多项目黑箱推荐。
- stars / forks / commits 用作推荐依据、分数、排序或胜任解释。
- 能力认证、岗位胜任认证、offer / 录用 / 上岸概率。
- 企业筛选、企业推荐、精准内推、自动投递。
- 简历生成、简历优化、简历包装。
- 对外展示匹配分、推荐分、胜任分、排行榜或百分比。
- 专用 Pathfinder 表、migration、审核运营后台或多 TrialPackage 发布流。

## 3. 测试矩阵

| 编号 | 验收主题 | 前置条件 | 操作 | 预期结果 | 优先级 |
|---|---|---|---|---|---|
| QA-P1B-001 | 背景信号抽取 | 输入真实用户完整背景 | 调用 recommendations API / 提交背景页 | 返回 `profileSignals`，覆盖行业、文档、沟通、数据、AI 工具、约束或风险；每条信号有 `sourceField` 和用户输入证据 | P0 |
| QA-P1B-002 | 背景不足处理 | 只填 0-1 个核心字段 | 提交推荐 | 返回 `insufficient_information` 或补充提示；不套用小 C、默认用户或伪造证据 | P0 |
| QA-P1B-003 | 路径推荐数量与状态 | 输入产品 / 方案 / 数据 / 运营类背景 | 查看推荐响应和页面 | 返回 3-4 条受控 RolePath；decision 仅为 `priority_trial`、`explore`、`not_recommended_short_term`、`insufficient_information` | P0 |
| QA-P1B-004 | 算法路径风险边界 | 非 CS / 非算法背景用户 | 查看算法 / 大模型相关路径 | 仅可显示为长期缺口或暂缓主攻，不生成短期完整 TrialPackage，不输出负面能力判断 | P0 |
| QA-P1B-005 | 推荐证据链 | 任一推荐结果 | 检查 path evidence | 每条用户可见推荐至少包含用户背景、样例 JD / 路径定义、项目或风险边界证据；无裸结论 | P0 |
| QA-P1B-006 | 无评分展示 | 任一推荐结果 | 扫描 API、页面、Markdown | 不出现 score、percent、rank、matchScore、offerProbability、competencyScore 等对外字段或文案 | P0 |
| QA-P1B-007 | 项目匹配 approved 门槛 | 项目库含 OpenDocuments 和 candidate 项 | 调用 projects / recommendations | 只有 OpenDocuments 可作为 `matched_for_trial`；candidate 只能 `candidate_needs_review` 或内部提示 | P0 |
| QA-P1B-008 | License 门槛 | 构造 `licenseVerificationStatus = pending` 项 | 尝试 generate | 返回 4xx 或不可生成状态；不得生成完整 TrialPackageCandidate | P0 |
| QA-P1B-009 | 项目 reference_only 边界 | OpenDocuments 命中 | 查看项目卡、API、导出 | 明确“公开参考 / reference_only / 不代表用户参与原项目”，不暗示用户贡献 | P0 |
| QA-P1B-010 | 项目匹配不依赖热度 | fixture 包含 stars/forks 背景字段 | 查看匹配解释 | 热度字段最多在内部背景出现，不进入推荐依据、排序、文案或 Markdown | P0 |
| QA-P1B-011 | 试航包生成成功 | 选择可生成路径 + OpenDocuments | 调用 generate / 点击生成试航包 | 返回 `schemaVersion = p1b.v1`、`trialPackageCandidate`、6 问或模板问题、requiredMarkdownSections、forbiddenClaims、antiPackagingDefaults | P0 |
| QA-P1B-012 | generate 绑定推荐运行 | 使用不存在或跨用户 run id | 调用 generate | 返回 404 / 403；不得跨用户读取 recommendationRun | P0 |
| QA-P1B-013 | generate 路径项目一致性 | 选择不匹配 path/project | 调用 generate | 返回 422 或 `not_matched`；不得强行生成 TrialPackage | P0 |
| QA-P1B-014 | records P1-B envelope | 生成试航包后保存 | 查询 `analysis_records` | `type = pathfinder`，`match_score = null`，`input_file_url = null`，`input_text/result` 为 JSON，含 recommendationRun / selectedPathId / selectedProjectId snapshot | P0 |
| QA-P1B-015 | records P1-A 兼容 | 存在 P1-A 记录 | GET record | 仍可读取 P1-A 记录，不要求 P1-B 字段，不改变旧记录语义 | P0 |
| QA-P1B-016 | legacy 小 C 兼容但不复用默认 | 存在 P0 legacy 记录 | GET record / 新建 P1-B | legacy 可读；新建 P1-B 不使用小 C 默认身份、作答或贡献字段 | P0 |
| QA-P1B-017 | 反包装正向阻断 | 作答含“我开发了 OpenDocuments / offer 概率 / 胜任认证 / 简历包装” | 运行反包装并导出 | `blocked`，full Markdown、复制、下载均禁用；可保存 draft | P0 |
| QA-P1B-018 | 否定语境不误阻断 | 文本含“不可声称参与 OpenDocuments 官方贡献” | 运行反包装 | 不阻断 full Markdown；finding 标记 allowed / negated context | P0 |
| QA-P1B-019 | Markdown P1-B 章节 | 试航完整且反包装通过 | 导出 Markdown | 包含背景、信号、路径结论、证据链、OpenDocuments 来源 License、reference_only、6 问、用户试航贡献、forbiddenClaims、免责声明 | P0 |
| QA-P1B-020 | 样例 JD 免责声明 | 推荐页和 Markdown 使用 JD 样本趋势 | 查看文案 | 必带“样例 JD / 当前样本趋势参考，不代表具体公司岗位要求或录用判断”同义说明 | P0 |
| QA-P1B-021 | fallback 本地草稿 | 拦截 records / generate 后端为 500 | 填背景、推荐、作答 | 页面不丢本地草稿，明确云端未保存 / 待同步；恢复后同步状态清晰 | P1 |
| QA-P1B-022 | 参赛演示主链路 | 使用演示输入脚本 | 背景 -> 推荐 -> 生成 -> 试航 -> 结果 -> Markdown | 全链路可完成，能演示阻断和修正，且不依赖产品默认演示数据 | P0 |
| QA-P1B-023 | 移动端主链路 | 390px 视口 | 打开背景、推荐、试航、结果页 | 主体无横向溢出；路径卡、项目卡、CTA、导出按钮可用 | P1 |
| QA-P1B-024 | Scope Guard 静态扫描 | BE/FE/DATA 合并后 | 扫描页面、测试 mock、fixture、API 响应、Markdown | 无禁用字段、禁用文案、migration、专用表或真实 RAG / GitHub 抓取入口 | P0 |

## 4. 后端测试建议

BE-003 合并后，建议在 `backend/tests/test_pathfinder.py` 或新建专项测试文件中新增 / 调整以下用例：

- `POST /api/pathfinder/recommendations` 接受真实 `UserProfileInput`，返回 `schemaVersion = p1b.v1`、`recommendationRun`、`profileSignals`、`paths`、`projectMatches`、`scopeDisclaimer`。
- 背景不足时返回补充提示或 `insufficient_information`，不得生成伪造用户证据。
- 推荐 decision 枚举强校验，拒绝 `matched`、`certified`、`hireable`、`score_based` 等越界状态。
- 响应体递归扫描 forbidden keys：`score`、`matchScore`、`offerProbability`、`hireProbability`、`certification`、`resumePackaging`、`companyRecommendation`。
- `GET /api/pathfinder/projects?status=approved_for_trial_package` 只返回 License verified 且 `referenceRole = reference_only` 的项目。
- candidate / needs_review / license pending 项不可通过 generate 生成完整 TrialPackageCandidate。
- `POST /api/pathfinder/trial-packages/generate` 校验 recommendationRunId 属于当前用户。
- generate 校验 selectedPathId / selectedProjectId 必须来自同一 recommendation run 的 matched 项。
- generate 响应必须包含 antiPackagingDefaults、requiredMarkdownSections、forbiddenClaims、sampleJdDisclaimer。
- P1-B.1 保存继续写 `analysis_records`：`type = pathfinder`、`match_score is null`、`input_file_url is null`、无新表依赖。
- `/records` 读取兼容 P1-A envelope；P0 legacy 可读但不得被标为 P1-B 当前记录。
- 阻断态只允许 draft MarkdownSnapshot，full snapshot 在 blocked / incomplete / missing AI usage 时返回 422。
- 跨用户 GET / PATCH / PUT / DELETE recommendation-derived record 均隔离。
- 迁移守卫：后端测试或 CI 静态检查确认本轮无 Pathfinder 专用 migration。

## 5. 前端 E2E 建议

FE-003 合并后，建议在 `frontend/e2e/pathfinder.spec.ts` 新增 / 调整以下场景：

- 新用户进入背景页，表单为空，不存在小 C、一键 demo、默认作答。
- 真实用户背景提交后，前端调用 `/api/pathfinder/recommendations`，请求体包含用户输入和约束，响应结果驱动推荐页。
- 推荐页展示用户背景信号、3-4 条路径、每条路径证据链和 scope disclaimer。
- 推荐页不出现分数、百分比、排行榜、认证、offer 概率、企业筛选或简历包装。
- 项目卡只显示 OpenDocuments 为可生成参考项目，candidate 项如展示必须标记待核验且不可点击生成完整试航包。
- 点击可生成路径 / 项目后调用 `/api/pathfinder/trial-packages/generate`，进入 6 问试航页。
- generate 失败或项目 pending 时，页面显示不可生成原因，不能进入完整试航包。
- 试航页仍从空作答开始，缺任一问或第 6 问为空时结果页不展示 full Markdown。
- 正向越界表达阻断 full Markdown；否定语境不误阻断。
- full Markdown 包含 P1-B required sections，且包含 recommendationRun、path、project、License 和 `reference_only` 来源边界。
- records API 失败时本地草稿可继续，恢复后显示已同步或待同步。
- 390px 下背景页、推荐页、试航页、结果页 `scrollWidth <= clientWidth`。

## 6. 数据 fixture 校验

DATA-004 合并后，QA 应对 JSON fixture 做静态校验和一次运行时校验。

### 6.1 RolePath taxonomy

必须包含：

- 四条主试航路径：行业 AI 应用产品助理、行业 AI 解决方案助理、AI 数据评测助理、AI 应用运营 / 实施助理。
- 算法工程 / 大模型研发仅作为长期缺口或暂缓主攻参考，不进入短期 TrialPackage 生成。
- 每条路径具备 path id、title、用户信号要求、JD 样本信号、风险边界、可生成模板类型。
- 不包含胜任分、概率、认证、岗位录用判断。

### 6.2 OpenSourceProjectRecord

OpenDocuments approved 记录必须包含：

- `projectId = opendocuments`
- `sourceUrl = https://github.com/joungminsung/OpenDocuments`
- `license = MIT` 或等价 SPDX
- `licenseVerificationStatus = verified`
- `licenseFileUrl`
- `lastManualCheckAt` / `licenseVerifiedAt`
- `referenceRole = reference_only`
- `status = approved_for_trial_package`
- `publicCapabilities`
- `notClaimed`
- `forbiddenClaims`
- `allowedContexts`

缺 License、核验日期、`reference_only`、`notClaimed`、`forbiddenClaims` 任一项即 No-Go。

### 6.3 Candidate 项

候选项目类型必须：

- `status = candidate` 或 `needs_review`
- `licenseVerificationStatus = pending` 或等价未核验状态
- 不填虚构 URL / License / 核验人
- 不作为用户可生成 TrialPackage 的项目
- 若在 UI 可见，只作为“待核验候选类型”展示，不进入生成 CTA

### 6.4 ProjectMatchRule / TrialTaskTemplate / EvidenceMapping

必须校验：

- ProjectMatchRule 采用硬门槛 + 规则命中解释，不输出综合分。
- TrialTaskTemplate 绑定 approved project、targetRolePathIds、fixedQuestions、requiredMarkdownSections、forbiddenClaims、disclaimer。
- EvidenceMapping 覆盖用户背景、样例 JD / 路径定义、OpenDocuments 来源、项目匹配规则、反包装边界、Markdown 章节。
- Approved 模板的 anti-packaging coverage 为 100%。

## 7. Scope Guard

执行型 QA 必须对以下范围做递归扫描：

- `frontend` 页面、组件、E2E mock、可见文案。
- `backend` API schema、router、service、test payload。
- `data/pathfinder/**` fixture。
- 导出的 Markdown 内容。
- `docs/pathfinder-p0/**` 中作为产品契约的 P1-B 文档。

推荐扫描词：

```text
score|Score|评分|分数|百分比|概率|offer|录用|上岸|胜任|认证|通过|企业筛选|企业推荐|精准内推|简历包装|简历优化|自动投递|排行榜|ranking|rank|real RAG|实时 GitHub|stars|forks|我开发了 OpenDocuments|参与官方贡献
```

命中后按语境判断：

- 正向能力、概率、认证、包装、贡献暗示为 P0 阻断。
- 否定语境、不可声称清单、Scope Guard 文档说明不阻断，但需确认不会进入正向 CTA 或结论。
- stars / forks / commits 若仅在内部 `background_only_not_used_for_scoring` 字段出现，可记录为非阻断；若用于排序或文案，即 No-Go。

## 8. 参赛演示回归路径

P1-B.1 参赛演示建议使用独立演示输入脚本，不作为产品默认值。

演示路径：

1. 打开 `/pathfinder`，说明边界：受控试航，不做认证、概率、企业筛选、简历包装。
2. 进入背景页，粘贴真实用户演示背景。
3. 提交后展示推荐页：用户信号、3-4 条路径、规则命中证据、样例 JD 免责声明。
4. 展示 OpenDocuments 项目卡：公开来源、License、`reference_only`、不可声称内容。
5. 选择路径和 OpenDocuments，生成 TrialPackageCandidate。
6. 进入试航页，展示 6 问为空开始；先演示第 6 问为空阻断，再补齐。
7. 结果页演示反包装：输入“我开发了 OpenDocuments”阻断，再改为“不可声称参与 OpenDocuments 官方贡献”通过。
8. 导出 Markdown，核对 P1-B required sections 和 records 保存状态。
9. 简短演示后端不可用 fallback：保存失败不丢本地草稿，恢复后可同步。

演示前检查：

- 最新 FE / BE / DATA 合并到同一分支。
- 清空浏览器 localStorage / sessionStorage。
- 后端数据库可写，`analysis_records` 最新记录可读。
- OpenDocuments fixture License 和 `reference_only` 可见。
- 390px 推荐页、试航页、结果页无主体横向溢出。

## 9. Go / No-Go 标准

### Go

满足以下条件可建议 Go：

- 所有 P0 测试矩阵通过。
- 后端 recommendations / projects / generate / records 兼容测试通过。
- 前端 E2E 覆盖真实背景到生成试航包、6 问、反包装、Markdown、fallback、移动端。
- DATA fixture 静态校验通过，OpenDocuments approved 字段完整，candidate 不可生成。
- `git diff --check`、前端 safety、lint、E2E、build、后端 Pathfinder 测试通过。
- Scope Guard 无未解决阻断项。

### Conditional Go

仅当产品负责人明确接受风险时可 Conditional Go：

- candidate 项在 UI 可见，但生成 CTA 被可靠禁用且文案明确待核验。
- fallback 恢复需要用户手动点击同步，但不会丢数据且状态不误导。
- OpenDocuments License 核验人字段暂缺，但 License、核验日期、URL、`reference_only`、notClaimed 完整。
- E2E 未覆盖所有 forbidden 同义词，但覆盖核心类别且后端递归扫描覆盖补足。

### No-Go

任一项出现即 No-Go：

- 背景不足时伪造或套用默认用户证据。
- LLM、实时 GitHub、真实 RAG 或热度指标决定推荐 / 项目。
- candidate、needs_review、license pending 项可生成完整 TrialPackage。
- 推荐、项目、Markdown 或 API 对外展示分数、概率、认证、胜任、录用、企业筛选、简历包装。
- 正向 OpenDocuments 归属暗示、能力认证、offer 概率、简历包装未被反包装阻断。
- full Markdown 缺 required sections 或阻断态仍可导出 / 保存 full snapshot。
- P1-B.1 新增专用表或 migration。
- `/records` 破坏 P1-A / legacy 读取。

## 10. 当前测试缺口与剩余风险

- P1-B.1 只有 OpenDocuments 一个 approved 项目，项目匹配能力展示会克制；这是当前安全边界，不应通过虚构 approved 项目扩大演示。
- recommendation / project / generate 三类 API 尚未实现，本计划中的自动化用例需等待 BE-003 / FE-003 / DATA-004 合并后落地。
- 真实 fixture 文件路径和 schema 命名可能随 DATA-004 微调，QA 执行时需以主 Agent 最终契约为准更新断言。
- P1-B.1 继续复用 `analysis_records`，历史检索和审计能力有限；专用表应留到 P1-B.2 再评估。
- 建议等待 BE / FE / DATA 合并后再执行完整回归；当前文档任务只做计划审计和格式验证。

## 11. 必跑命令

文档任务本轮只跑：

```powershell
git status --short --branch
git diff --check
```

BE / FE / DATA 合并后的执行型 QA 至少补跑：

```powershell
cd backend
python -m pytest backend/tests/test_pathfinder.py
```

```powershell
cd frontend
npm run test:safety
npm run lint
npm run test:e2e
npm run build
```

如实现触碰数据库模型、migration、应用启动、通用 auth 或共享 schema，再补跑后端全量：

```powershell
python -m pytest
```
