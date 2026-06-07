# 寻径星图 P1-A 产品化 QA 回归计划

任务 ID：QA-002

子对话名称：QA验证A

日期：2026-06-07

## 1. 目标与结论

本计划用于 P1-A 产品化第一轮实现合并后的回归验收。当前任务只产出 QA 计划和验收标准，不等待 FE-002 / BE-002 / DATA-002 完成，也不直接修改前后端测试代码。

P1-A 产品化第一轮的 QA 目标是确认寻径星图从“小 C 固定参赛 Demo”升级为“真实用户可完成的一次固定试航工作台”后，仍保持固定试航包、证据链、保存、导出、反包装和 fallback 闭环稳定。

验收主结论必须同时满足：

- 真实用户输入：P1-A 产品流程不保留小 C 示意、默认身份、一键填充或默认作答。
- 固定试航包：OpenDocuments、三条路径、固定 6 问只读稳定，不做自由推荐。
- 保存导出：继续复用 `analysis_records`，无 migration；阻断态不得保存 full Markdown snapshot。
- Scope Guard：无 LLM 主链路、无评分、无概率、无认证、无企业筛选、无简历包装、多项目推荐或真实 RAG。

## 2. 回归范围

### 2.1 必测范围

- `/pathfinder`、`/pathfinder/background`、`/pathfinder/recommendation`、`/pathfinder/trial`、`/pathfinder/result` 主链路。
- 真实用户背景输入、职业约束、目标方向和最小授权提示。
- 固定 `p1a-opendocuments-engineering-kb@1.0.0` TrialPackage。
- 三条固定路径：行业 AI 应用产品助理、行业 AI 解决方案助理、算法工程 / 大模型研发。
- 固定 6 问用户作答、缺项阻断、第 6 问 AI 使用说明阻断。
- 结果页 TrailRecord、PortfolioDraft、InterviewPrep、AntiPackagingCheck、MarkdownSnapshot。
- OpenDocuments fixture：URL、License、核验日期、`reference_only`、不可声称内容。
- 样例 JD 匿名化 / 弱化公司名展示。
- 后端保存、恢复、删除、跨用户隔离、legacy 兼容。
- 后端不可用时本地草稿 fallback 与恢复后同步状态。
- 390px 移动端背景页、试航页、结果页。

### 2.2 禁止范围

本轮 QA 不接受以下能力进入 P1-A：

- LLM 作为主链路依赖。
- 自由 JD 推荐、路径重新推荐、多 TrialPackage 选择。
- 多开源项目推荐或黑箱项目匹配。
- 真实 RAG 检索、实时仓库抓取或自动分析公开项目。
- 能力认证、岗位胜任认证、通过标签。
- offer 概率、录用概率、上岸概率。
- 企业筛选、企业推荐、精准内推。
- 简历生成、简历优化、简历包装、自动投递。
- 匹配分、胜任分、综合分、排行榜。
- 专用 Pathfinder 表或 Alembic migration。

## 3. 测试矩阵

| 编号 | 验收主题 | 前置条件 | 操作 | 预期结果 | 优先级 |
|---|---|---|---|---|---|
| QA-P1A-001 | 无小 C 默认身份 | 清空本地存储，新用户进入 `/pathfinder/background` | 查看表单初始值和辅助文案 | 表单为空或仅有字段提示；无“小 C”身份、经历、目标默认值 | P0 |
| QA-P1A-002 | 无一键填充 | 进入背景页和试航页 | 搜索按钮、链接、菜单 | 不存在“填入小 C 示例”“载入小 C Demo”“开始小 C 试航”等产品化入口 | P0 |
| QA-P1A-003 | 无默认作答 | 新用户进入 `/pathfinder/trial` | 查看 6 个作答输入框 | 6 问均为空；只允许问题解释和填写提示，不提供小 C 示例答案 | P0 |
| QA-P1A-004 | 固定试航包只读 | 任意真实用户完成背景输入 | 进入推荐页和试航页 | TrialPackage ID 为 `p1a-opendocuments-engineering-kb@1.0.0`；不可切换试航包 | P0 |
| QA-P1A-005 | 固定三路径 | 完成背景输入 | 查看推荐页 | 仅显示三条固定路径；不根据用户输入新增、删除或重排为个性化推荐 | P0 |
| QA-P1A-006 | 背景不足提示 | 背景页只填 0-1 个核心字段 | 进入推荐页 / 结果页 | 页面提示“背景信息不足，需补充”，不套用小 C 背景或默认证据 | P0 |
| QA-P1A-007 | 6 问缺项阻断 | 填写 5 问，任一题为空 | 尝试进入结果或导出 full Markdown | 状态为 `answers_incomplete`；不可复制 / 下载 full Markdown | P0 |
| QA-P1A-008 | 第 6 问为空阻断 | 前 5 问完整，第 6 问为空 | 尝试导出 | 明确提示 AI 使用说明缺失；不可导出 full Markdown | P0 |
| QA-P1A-009 | 正向能力认证阻断 | 在作答或作品集草稿输入“已通过岗位胜任认证” | 运行反包装检查 | `AntiPackagingCheck.status = blocked`；full Markdown 被禁用 | P0 |
| QA-P1A-010 | 正向 offer 概率阻断 | 输入“可提升 80% offer 概率” | 运行反包装检查 | 命中 offer 概率规则并阻断 full Markdown | P0 |
| QA-P1A-011 | 正向简历包装阻断 | 输入“自动优化并包装简历” | 运行反包装检查 | 命中简历包装规则并阻断 full Markdown | P0 |
| QA-P1A-012 | OpenDocuments 归属阻断 | 输入“我开发了 OpenDocuments / 参与官方贡献” | 运行反包装检查 | 命中开源项目归属规则并阻断 full Markdown | P0 |
| QA-P1A-013 | 否定语境不误阻断 | Markdown 中包含“不可声称参与 OpenDocuments 官方贡献” | 运行反包装检查 | 不阻断；finding context 为 `allowed_context` 或 `negated_context` | P0 |
| QA-P1A-014 | Markdown 九项完整 | 6 问完整且反包装通过 | 导出 full Markdown | 包含真实用户背景、路径结论、样例 JD 说明、OpenDocuments 来源与 License、原项目能力、用户试航贡献、不可声称内容、6 问作答、免责声明 | P0 |
| QA-P1A-015 | 后端复用 `analysis_records` | 后端服务可用 | 创建并保存记录 | `type = pathfinder`、`input_file_url = null`、`match_score = null`；无新增 migration | P0 |
| QA-P1A-016 | 阻断态不保存 full snapshot | 反包装阻断 | 调用保存结果 API，传 `exportScope = full` | 后端返回 422 或等价拒绝；允许 `exportScope = draft` | P0 |
| QA-P1A-017 | JD 弱化公司名 | 推荐页、结果页、导出 Markdown | 查看 JD 相关文案 | 默认只说“样例 JD / 样本趋势参考”；不突出真实公司名 | P0 |
| QA-P1A-018 | OpenDocuments fixture 可追溯 | DATA-002 fixture 已合并 | 查看页面、API payload、导出 | 可追溯 URL、License、核验日期、`reference_only`、不可声称内容 | P0 |
| QA-P1A-019 | fallback 本地草稿 | 拦截后端记录 API 为 500 | 填写背景和 6 问 | 本地草稿可继续；提示未保存到云端；恢复后同步状态清晰 | P1 |
| QA-P1A-020 | 移动端无横向溢出 | 视口 390px | 打开背景页、试航页、结果页 | `scrollWidth <= clientWidth`；按钮和表单可用 | P1 |
| QA-P1A-021 | Scope Guard 扫描 | 实现合并后 | 扫描页面、mock、API 响应、Markdown | 无正向 LLM 主链路、评分、概率、认证、企业筛选、简历包装、多项目推荐、真实 RAG | P0 |

## 4. 必跑命令

实现合并后的 QA 执行任务至少运行：

```powershell
git status --short --branch
git diff --check
```

前端回归：

```powershell
cd frontend
npm run test:safety
npm run lint
npm run test:e2e
npm run build
```

后端回归：

```powershell
cd backend
python -m pytest backend/tests/test_pathfinder.py
```

如实现触碰后端 schema、模型或数据库启动路径，再补跑：

```powershell
python -m pytest
```

本 QA-002 文档任务不跑前后端全量测试，原因是本轮不修改产品代码、测试代码、依赖或数据 fixture；只需执行 `git diff --check` 验证文档格式和空白。

## 5. 手工审查脚本

### 5.1 桌面主链路

1. 清空浏览器 `sessionStorage` 和 `localStorage`。
2. 打开 `/pathfinder`，确认入口不再以小 C 为第一视角，不出现“一键填充小 C”。
3. 点击开始试航，进入 `/pathfinder/background`。
4. 不填写背景直接尝试继续，确认页面阻断或提示补充真实用户背景。
5. 填写一个真实用户背景样例：
   - 教育 / 行业背景：传统制造业项目助理。
   - 项目经验：整理设备运维文档、协调跨部门问题。
   - AI 工具使用：用 AI 做资料摘要和表格初稿。
   - 目标方向：AI 应用产品助理。
   - 约束：3 个月内完成作品集起点。
6. 进入推荐页，确认三条路径固定展示，且证据中引用用户输入，不套用小 C。
7. 进入试航页，确认 OpenDocuments 来源、License、`reference_only` 和不可声称内容可见。
8. 查看 6 问，确认作答为空、无默认答案、无示例填充按钮。
9. 填写 5 问，保留第 6 问为空，确认无法导出 full Markdown。
10. 补齐第 6 问，进入结果页。
11. 在作答中加入“我开发了 OpenDocuments”，确认反包装阻断。
12. 改为“不可声称参与 OpenDocuments 官方贡献”，确认不误阻断。
13. 导出 full Markdown，人工核对九项章节。

### 5.2 后端保存审查

1. 使用真实用户输入创建记录。
2. 查询数据库 `analysis_records`。
3. 确认：
   - `type = pathfinder`
   - `input_file_url is null`
   - `match_score is null`
   - `input_text` 和 `result` 均为可解析 JSON
   - JSON 中无 `offerProbability`、`recommendationScore`、`certification`、`resumePackaging` 等字段
4. 在反包装阻断状态保存 `draft` snapshot，确认成功。
5. 在反包装阻断状态保存 `full` snapshot，确认失败。

### 5.3 移动端审查

1. 将视口设置为 390px 宽。
2. 分别打开背景页、试航页、结果页。
3. 在控制台执行：

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

4. 逐页确认表单、textarea、主要 CTA、导出按钮和阻断提示可见且可点击。

## 6. E2E 用例增删建议

现有 `frontend/e2e/pathfinder.spec.ts` 仍以 P0 小 C Demo 为主，应在 FE-002 合并后调整为产品化基线。

建议删除或改写：

- 删除“开始小 C 试航”“填入小 C 示例作答，可继续编辑”等断言。
- 删除入口页、小 C 背景页、小 C 示例作答作为 P1-A 主链路的正向断言。
- 将 `xiaoc_trial_contribution` 必需章节改为 `user_trial_contribution` 或等价产品化字段。
- 将 `trialPackageId = p0-xiaoc-opendocuments` 改为 `p1a-opendocuments-engineering-kb` 或最终 DATA-002 fixture ID。

建议新增：

- 新用户背景表单为空，不存在小 C 默认身份和一键填充。
- 背景不足时推荐页 / 结果页显示补充提示，不使用小 C fallback。
- 真实用户背景输入后，推荐页仍显示固定三路径，不做自由推荐。
- 试航页 6 问为空开始，填 5 问无法导出。
- 第 6 问为空时结果页无 full Markdown textarea / 复制 / 下载能力。
- 正向越界表达阻断 full Markdown。
- 否定语境和不可声称清单不误阻断。
- full Markdown 包含九项，且用户主体来自 `UserProfileInput`。
- 后端 API 失败后本地草稿可继续，恢复后显示同步成功或待同步状态。
- 390px 背景页、试航页、结果页无横向溢出。
- 页面文案默认弱化 JD 公司名，只显示样例 JD 与样本趋势参考。

## 7. 后端测试用例建议

现有 `backend/tests/test_pathfinder.py` 覆盖 P1-A 旧契约，但仍有小 C 字段和旧 TrialPackage ID。BE-002 合并后建议补充：

- `POST /api/pathfinder/records` 接受 `UserProfileInput`，不要求小 C 字段。
- 创建 payload 若包含 `defaultCandidate = xiaoc`、`prefillDemoAnswers`、`xiaocTrialContribution` 等产品化禁用字段，应拒绝或归一移除。
- 固定 TrialPackage ID / version 强校验为 DATA-002 fixture。
- `requiredSections` 使用 `user_trial_contribution`，兼容旧 `xiaoc_trial_contribution` 只限 legacy 读取。
- 6 问缺任一题时拒绝 full MarkdownSnapshot。
- `ai_usage_explanation` 空字符串时拒绝 full MarkdownSnapshot。
- `antiPackagingCheck.exportAllowed = false` 时拒绝 full MarkdownSnapshot。
- `blocked` 状态只允许保存 draft snapshot。
- 响应体和保存 JSON 均不得包含评分、概率、认证、企业推荐、简历包装、真实 RAG 字段。
- `analysis_records` 复用检查：无专用表依赖、`match_score = null`、`input_file_url = null`。
- 跨用户读取、更新、删除继续隔离。
- P0 legacy 小 C 记录可读取，但不得被标记为真实用户产品化记录或完整检查通过。

## 8. 数据 fixture 校验建议

DATA-002 合并后，QA 应对 JSON fixture 做静态和运行时校验。

### 8.1 TrialPackage fixture

必须包含：

- `trialPackageId = p1a-opendocuments-engineering-kb@1.0.0` 或主 Agent 确认的最终 ID。
- 固定三条路径及稳定 path id。
- 固定 6 问，且 question id 与前后端契约一致。
- `sampleJdNotice` 明确“样例 JD / 样本趋势参考”，不代表具体公司岗位或录用判断。
- `forbiddenClaims` 覆盖能力认证、offer 概率、企业筛选、简历包装、多项目推荐、真实 RAG、OpenDocuments 官方贡献。
- 不包含小 C 默认身份、默认作答或默认作品集主体。

### 8.2 OpenSourceProjectRecord fixture

必须包含：

- `name = OpenDocuments`
- `sourceUrl`
- `license`
- `licenseVerifiedAt`
- `licenseVerifiedBy` 或可追溯负责人字段
- `referenceRole = reference_only`
- `publicCapabilities`
- `notClaimed`
- `status`

License 核验日期缺失、`reference_only` 缺失、`notClaimed` 缺失均为 No-Go。

### 8.3 EvidenceMapping fixture

必须覆盖：

- 样例 JD 到路径结论的证据映射。
- 用户背景到路径说明的证据映射。
- OpenDocuments 来源到试航任务的证据映射。
- 反包装规则到导出章节的映射。
- Markdown 九项章节到源对象的映射。

## 9. 参赛演示回归路径

P1-A 产品化后参赛演示不再使用“小 C 一键 Demo”作为主产品路径。建议演示固定使用一个人工准备的“参赛演示输入脚本”，但该脚本应独立于产品默认数据。

演示路径：

1. 打开 `/pathfinder`，讲产品边界：固定试航，不做认证、概率、筛选、简历包装。
2. 进入背景页，粘贴真实用户演示背景。
3. 展示推荐页三条固定路径和证据链，强调不是自由推荐。
4. 进入试航页，展示 OpenDocuments 来源、License、原项目能力和不可声称内容。
5. 填写 6 问演示作答，先演示第 6 问为空阻断，再补齐。
6. 在结果页演示反包装：输入“我开发了 OpenDocuments”阻断，再改成否定边界说明。
7. 导出 Markdown，讲九项章节和保存状态。
8. 简短说明后端不可用 fallback：保存失败不影响本地草稿，恢复后可同步。

演示前检查：

- 本地前端和后端服务端口可访问。
- 清空浏览器本地存储。
- 准备一份独立演示输入文本，不作为产品默认值。
- 后端最新记录可读取，状态为 `exported` 且 `markdownSnapshot.exportScope = full`。
- 390px 主体无横向溢出。

## 10. 阻断 / 非阻断分级

### 10.1 阻断级

出现任一项即 No-Go：

- P1-A 主流程出现小 C 默认身份、默认背景、示例作答或一键填充。
- 背景不足时套用小 C 或其他默认用户完成推荐 / 导出。
- 6 问缺项或第 6 问为空仍可导出 full Markdown。
- 正向能力认证、offer 概率、企业筛选、简历包装、OpenDocuments 归属包装未阻断。
- 否定语境被全部当作阻断，导致不可声称章节无法导出。
- full Markdown 缺九项任一项。
- 阻断态可保存 `exportScope = full`。
- 后端新增 migration 或专用 Pathfinder 表进入 P1-A。
- API 响应包含评分、概率、认证、企业推荐、简历包装或真实 RAG 字段。
- JD 页面或导出默认突出真实公司名且无样本说明。
- OpenDocuments fixture 缺 License、核验日期、`reference_only` 或不可声称内容。
- 390px 背景页、试航页、结果页主体横向溢出影响表单或按钮使用。

### 10.2 非阻断级

可记录为 P1-B / P2 backlog：

- 移动端顶部流程导航横向滚动，但主体内容无溢出。
- 反包装建议改写文案不够顺滑，但阻断语义正确。
- fallback 恢复后需要用户手动点击一次同步，但状态说明清晰。
- 样例 JD 来源说明位置不够醒目，但导出和详情中完整可见。
- legacy 小 C 记录展示仍可读，但已明确标注为 P0 历史记录。
- E2E 覆盖未包含所有 forbidden 同义词，但覆盖核心类别。

## 11. Go / No-Go 标准

### Go

满足以下条件可建议 Go：

- 所有 P0 优先级测试矩阵通过。
- `git diff --check`、前端 E2E、前端 safety、lint、build、后端 Pathfinder 测试通过。
- 主链路桌面浏览器手工通过。
- 390px 三页移动端手工通过。
- 阻断 / 非阻断清单中无未解决阻断项。
- QA 报告明确列出剩余风险，且均为非阻断。

### Conditional Go

仅当产品负责人明确接受风险时可 Conditional Go：

- 文案弱化 JD 公司名已完成，但个别内部调试字段仍在不可见 payload 中保留公司名。
- OpenDocuments License fixture 已有核验日期和 License，但核验人字段暂缺。
- fallback 恢复后的同步体验不够顺滑，但不会丢数据且状态不误导。

### No-Go

任一阻断级问题未修复，或 Scope Guard 被破坏，即 No-Go。

特别是：无小 C 默认内容、6 问 / 第 6 问阻断、反包装阻断、Markdown 九项、`analysis_records` 复用、无 migration、无评分概率认证，是 P1-A 第一轮不可让步标准。

## 12. 当前已知测试缺口

截至本计划撰写时，现有自动化仍主要验证 P0 小 C Demo：

- `frontend/e2e/pathfinder.spec.ts` 中有“小 C 背景”“填入小 C 示例作答”等正向断言。
- `backend/tests/test_pathfinder.py` 中仍使用 `p0-xiaoc-opendocuments`、`xiaoc_trial_contribution` 和小 C 用户 fixture。
- `docs/pathfinder-p0/p1-a-json-contract.md` 仍记录旧 P1-A 契约，后续应由主 Agent 安排产品化契约更新或兼容说明。

这些缺口不阻断 QA-002 文档交付，但必须在 FE-002 / BE-002 / DATA-002 合并后进入执行型 QA 任务。
