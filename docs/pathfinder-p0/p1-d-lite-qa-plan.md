# 寻径星图 P1-D Lite 参赛提交版 QA 计划

任务 ID：QA-004

子对话名称：QA验证B

日期：2026-06-14

提交约束：2026-06-14 17:00 前保障稳定演示，不追求无限覆盖。

## 1. 目标与阶段结论

本计划用于 FE-004 / DATA-004 合并后的 P1-D Lite 回归验收。当前第一阶段只新增 QA 计划和 handoff 状态，不修改前端、后端、测试、fixture、migration 或运行逻辑。

P1-D Lite 的验收目标是确认寻径星图从 P1-C.1 的“航前 AI 访谈 -> 用户确认信号 -> 规则推荐 -> 已审计项目试航包”升级为：

> 简历上传或开放式 AI 访谈 -> 用户确认背景 / 自我认知信号 -> 个人 AI 求职星图 -> 12 个岗位星点与 Top 3 高亮 -> 三类适航任务入口 -> 适航成果包 / Markdown 导出。

核心 QA 结论标准：

- 第一屏必须是低摩擦入口，不再默认长手动表单。
- AI 追问必须是中文、开放式、可继续补充，并允许用户随时中止追问生成星图。
- 只有用户确认信号可以进入星图高亮、岗位星点解释和适航任务生成。
- 自我认知只能作为补充信号，不能包装成人格测试或职业测评结论。
- 星图必须呈现 12 个岗位星点、Top 3 高亮和点击探索能力。
- 三类适航任务只作为 P1-D Lite 任务类型入口和轻量内容包，不伪装成完整 generator。
- 结果页主叙事是“适航成果包”，Markdown 只是导出格式。
- P1-C.1 关键链路、`analysis_records` 复用、反包装阻断和 Scope Guard 不得回退。

## 2. 第一阶段交付边界

第一阶段只交付本文档和 `main-agent-handoff.md` 的 QA-004 计划状态。

不运行全量测试的原因：

- FE-004 / DATA-004 尚未合并到本任务分支，当前没有可执行的 P1-D Lite UI / 数据实现可验收。
- 本任务未修改运行逻辑、测试代码、依赖、fixture、数据库或迁移。
- 为 17:00 提交节奏保留回归窗口，避免在无实现差异的文档阶段消耗全量 E2E 时间。

第一阶段仍需运行：

```powershell
git diff --check
git status --short --branch
```

## 3. P1-D Lite 回归矩阵

| 编号 | 场景 | 操作 | 预期结果 | 优先级 |
|---|---|---|---|---|
| FE-P1D-001 | 首页低摩擦入口 | 打开 `/pathfinder` | 首屏可见“上传简历”和“AI 航前访谈 / AI 追问”入口；长手动表单不作为默认第一印象 | P0 |
| FE-P1D-002 | 手动表单降级 | 从首页进入背景页 | 手动背景字段只作为信号编辑 / fallback，不抢占主 CTA | P0 |
| FE-P1D-003 | 简历上传入口 | 点击上传简历入口 | 可选择文件或看到明确的本地演示兜底；不声称已完成完整简历 parser 重写 | P0 |
| FE-P1D-004 | AI 中文追问 | 输入真实经历并发送 | 助手问题为简体中文；无英文 "Can you..."；无乱码；问题围绕真实经历、行动、产出和边界 | P0 |
| FE-P1D-005 | 开放式继续追问 | 连续补充两轮回答 | 页面允许继续补充；不强制固定 6 问结束；追问不直接给岗位结论 | P0 |
| FE-P1D-006 | 用户中止生成星图 | 有 1-2 条回答后点击“暂时够了 / 生成星图”类控制 | 系统进入信号整理或星图生成路径；不要求填完整长表单 | P0 |
| FE-P1D-007 | 回到访谈继续补充 | 从星图或信号页返回继续补充 | 既有信号保留；新回答可追加整理；不会丢失用户已确认内容 | P1 |
| FE-P1D-008 | 信号完整度 ready | 输入具体项目 / 工具 / 产出 / 边界 | 显示可生成星图状态；CTA 可用；提示仍说明结论来自用户确认信号和样例 JD | P0 |
| FE-P1D-009 | 信号完整度 suggested_more | 输入部分真实经历但缺工具或产出 | 允许继续生成第一版星图，同时建议补充弱信号；不得伪造证据 | P0 |
| FE-P1D-010 | 信号完整度 insufficient | 只输入“我想转 AI / 不知道” | 不生成完整结论；提示需要真实经历或具体行动；不展示虚假 Top 3 | P0 |
| FE-P1D-011 | 自我认知信号补充 | 输入偏好、工作方式、学习方式 | 作为解释和排序辅助出现；不出现人格测试、MBTI、职业测评、性格结论 | P0 |
| FE-P1D-012 | 12 个岗位星点 | 打开 recommendation 星图 | 12 个岗位星点可见或可通过同一星图视图完整访问；按星域分组 | P0 |
| FE-P1D-013 | Top 3 高亮 | 有足够 confirmed signals 后生成星图 | Top 3 被高亮并有证据解释；不得使用分数、百分比或录用概率 | P0 |
| FE-P1D-014 | 非 Top 星点探索 | 点击非高亮星点 | 展示岗位名、JD 样本任务、工具 / 交付物、迁移入口、适航任务类型和未高亮原因 | P0 |
| FE-P1D-015 | 星图移动端 | 390px 打开星图并点击星点 | 无横向溢出；星点、详情面板、CTA 不互相遮挡；主要内容可读可操作 | P0 |
| FE-P1D-016 | 开发适航任务 | 选择开发类星点 / 任务 | 显示已审计开源项目阅读与场景改造任务；保留项目来源、License 和不可声称边界 | P0 |
| FE-P1D-017 | 产品适航任务 | 选择产品类星点 / 任务 | 显示 Vibe Coding 原型试航任务：概念、PRD 摘要、用户流、验收指标、迭代清单 | P0 |
| FE-P1D-018 | 运营适航任务 | 选择运营类星点 / 任务 | 显示 AI 工具体验营任务：人群、节奏、内容日历、反馈循环、风险边界 | P0 |
| FE-P1D-019 | 任务生成边界 | 浏览三类任务 CTA / 文案 | 不声称完整自动 generator；产品 / 运营任务为引导式起点或内容包 | P0 |
| FE-P1D-020 | 结果页成果包主叙事 | 完成任一任务进入 result | 页面标题和结构以“适航成果包”为主；Markdown 是复制 / 下载导出，不是主结果 | P0 |
| FE-P1D-021 | 反包装仍阻断 | 在任务回答中写“我开发了 OpenDocuments / 保证 offer” | 完整导出禁用；可保存草稿；阻断原因清晰 | P0 |
| FE-P1D-022 | P1-C 链路不破 | AI 访谈 -> 确认信号 -> 推荐 -> 试航 -> 结果 / 导出 | 全链路成功；请求仍使用 confirmed signals、稳定 6 个 trial question id 和 records API | P0 |
| FE-P1D-023 | 现场演示兜底 | 后端或 LLM 不可用时打开演示路径 | 页面提供可控 fallback；不误导用户真实 LLM 或完整 parser 已运行 | P0 |

## 4. 后端与数据回归重点

P1-D Lite 如只改前端展示和静态数据，应保持 P1-C.1 后端合同稳定。

后端必查：

- `analysis_records` 继续复用；不新增 Alembic migration 或 Pathfinder 专用表。
- AI 访谈 API 仍只负责问题、追问、候选信号抽取和确认保存，不决定最终路径。
- 英文 / 空问题 / 乱码问题仍会回退到中文问题池。
- 未确认 signal 不进入 recommendation、trial package 或 result。
- 越界字段如 `score`、`offerProbability`、`certification` 被拒绝或清洗。
- 非 OpenDocuments 项目生成的 trial package 仍保存稳定 6 个 question ids。

数据必查：

- 12 个岗位星点有稳定 id、中文名称、星域、JD 样本任务、工具 / 交付物、迁移入口、适航任务类型和边界文案。
- 岗位星点基于 JD 样本信号或 taxonomy，不由 LLM 凭空决定。
- Top 3 高亮解释引用用户确认信号和 JD 样本信号，不使用复杂评分。
- 三类适航任务内容包边界清楚，产品 / 运营任务不伪装为已完成全量生成器。
- OpenDocuments 仍是 approved 项目之一，不暗示用户参与官方贡献。

## 5. Scope Guard

以下内容不得出现在正向结论、CTA、岗位星点高亮、结果页成果包、Markdown 正文或 API 可见响应中：

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
GitHub Search
RAG retrieval
Three.js
胜任分
匹配分
百分比
概率
录用
offer
上岸
能力认证
岗位认证
职业测评结论
人格测试
企业筛选
企业推荐
简历包装
简历优化
官方贡献
参与原项目开发
真实 RAG
自动抓取
```

允许出现的语境：

- 文档、不可声称清单、风险提示或反包装阻断说明中以否定方式出现。
- 技术实现注释中说明某能力 deferred 或 out of scope。

不允许出现的语境：

- 将用户描述为“已认证”“高概率录用”“适合某公司筛选”的正向结论。
- 用数值或百分比解释岗位星点匹配。
- 暗示 GitHub Search、真实 RAG、Three.js 已在 P1-D Lite 主链路落地。

## 6. 执行型验证命令

FE-004 / DATA-004 合并后，建议主 Agent 要求 QA-004 执行以下最小回归：

```powershell
cd frontend
npm run test:safety
npm run lint
npm run build
npm run test:e2e -- e2e/pathfinder.spec.ts
```

```powershell
cd backend
python -m pytest tests/test_pathfinder.py -q
```

```powershell
git diff --check
git status --short --branch
```

如时间允许，增加完整后端回归：

```powershell
cd backend
python -m pytest
```

如需要模拟现场演示，使用受控端口运行：

```powershell
.\scripts\check_all.ps1 -E2E -StartServices -BackendPort 8010 -FrontendPort 3010 -E2EBaseUrl http://localhost:3010 -E2EWorkers 2
```

## 7. 人工演示验收脚本

推荐 8 分钟现场 smoke：

1. 打开 `/pathfinder`，确认首屏不是长表单，能看到简历上传和 AI 追问入口。
2. 选择 AI 追问，输入一段真实经历，确认下一问为中文。
3. 输入第二段回答后，点击“生成星图 / 暂时够了”类控制。
4. 在信号整理区确认至少一条真实经历信号；如有自我认知信号，确认其只作为补充解释。
5. 进入星图，确认 12 个岗位星点、Top 3 高亮和点击探索详情。
6. 点击一个开发类任务，确认开源项目来源和不可声称边界。
7. 返回或切换查看产品 Vibe Coding / 运营 AI 工具体验营任务入口，确认它们是引导式任务，不是完整 generator。
8. 进入结果页，确认“适航成果包”为主，Markdown 为导出；输入越界表述后确认反包装阻断。
9. 切到 390px viewport，快速检查首页、访谈、星图、任务、结果无横向溢出。

现场兜底：

- LLM 不可用时，使用本地 fallback 问题和手动信号确认路径。
- 简历解析未完成时，上传入口可展示“提取为待确认信号 / 演示占位”边界，不声称完整 parser。
- 若产品 / 运营任务尚未支持完整保存，保留为内容包和下一步建议，不进入完整 records 导出链。

## 8. Go / Conditional Go / No-Go

### Go

满足以下条件可建议提交：

- 首页低摩擦入口、AI 中文追问、随时生成星图、继续补充路径可演示。
- 信号完整度三档有效：`ready`、`suggested_more`、`insufficient`。
- 12 个岗位星点、Top 3 高亮、点击探索和 390px 移动端通过。
- 三类适航任务可见，边界清楚，不伪装完整 generator。
- 结果页以适航成果包为主，Markdown 仅导出。
- P1-C 关键链路、反包装、records API、稳定 trial question ids 不回退。
- Scope Guard 无 P0 命中。
- FE 最小回归和 `backend/tests/test_pathfinder.py` 通过。

### Conditional Go

仅产品负责人明确接受时可 Conditional Go：

- 简历上传只做到入口和待确认信号占位，但 AI 追问主路径完整可用。
- 产品 / 运营任务只能生成静态内容包，不能保存完整结构化成果，但边界表达明确。
- 真实 LLM smoke 因 key 或网络未跑，但中文 fallback、mock E2E 和静态安全检查通过。
- 390px 某些装饰元素降级，但核心 CTA、星点详情、任务选择和导出可用。

### No-Go

任一项出现即 No-Go：

- 首屏仍以长手动表单为默认体验。
- AI 问题出现英文、乱码，或直接替用户决定岗位 / 项目 / 结论。
- 未确认 signal 可进入星图 Top 3、试航任务或结果页。
- `insufficient` 信息仍生成完整 Top 3 或完整成果包。
- 自我认知被描述为人格测试、职业测评或独立推荐依据。
- 星图少于 12 个岗位星点，或 Top 3 使用评分 / 百分比 / 概率。
- 产品 / 运营任务被包装成完整 generator，但实际没有生成链路。
- 结果页仍以 Markdown 报告为主，适航成果包不可见。
- 出现 offer、认证、企业筛选、简历包装、GitHub Search、真实 RAG、Three.js 已落地等越界表达。
- 反包装阻断失效或 390px 核心路径横向溢出。

## 9. 当前剩余风险

- FE-004 / DATA-004 尚未在本分支合并，本文档目前是计划，不代表 P1-D Lite 已回归通过。
- 简历上传如果只做入口，必须在演示中明确是低摩擦入口 / 待确认信号，不可暗示完整 parser 已完成。
- 12 岗位星点的证据质量依赖 DATA-004；QA 需要重点核对 JD 样本信号和边界文案。
- 产品 / 运营任务是 P1-D Lite 新增展示面，最容易被误写成完整 generator 或作品包装，需要强扫文案。
- 390px 星图布局风险高，FE 合并后必须做截图或浏览器实测。
