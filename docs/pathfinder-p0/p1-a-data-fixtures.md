# 寻径星图 P1-A 数据 Fixture

日期：2026-06-07

任务 ID：DATA-002

子对话名称：数据方案B

## 交付范围

本轮只固化 P1-A 最小数据 fixture，不实现运行时代码、不新增数据库表、不新增 migration。

新增 fixture：

- `data/pathfinder/trial-packages/p1a-opendocuments-engineering-kb.json`
- `data/pathfinder/open-source-projects/opendocuments.json`
- `data/pathfinder/evidence-mappings/p1a-opendocuments-engineering-kb.json`
- `data/pathfinder/anti-packaging-rules/p1a-rules.json`

这些文件为后续前端和后端提供稳定参考数据源：`TrialPackageRecord`、`OpenSourceProjectRecord`、`EvidenceMappingSet`、`AntiPackagingRuleSet`。

## 核心决策落地

P1-A fixture 采用固定 `trialPackageId = p1a-opendocuments-engineering-kb`，版本 `1.0.0`。

fixture 不包含历史演示用户资料、默认身份、一键填充、默认作答或默认作品集主体。用户背景证据只保留占位和边界说明，运行时必须来自真实用户授权输入。

样例 JD 默认以“样例 JD / 当前样本趋势参考”表达，`companyDisplayScope = hidden`，不突出真实公司名，不表达市场全量覆盖、具体公司岗位要求或录用判断。

OpenDocuments 仅作为 `reference_only` 的公开参考项目。fixture 明确区分原项目公开能力和用户本次试航产出，不允许暗示用户参与原仓库开发或官方贡献。

## OpenDocuments 核验记录

联网核验日期：2026-06-07

核验方式：人工打开 GitHub 仓库页和 LICENSE 文件页。GitHub 未认证 REST API 在本次任务中遇到 rate limit，因此 stars、forks、commit 数只作为非规范观察值，不作为 fixture 的判断依据。

核验结论：

- GitHub URL：`https://github.com/joungminsung/OpenDocuments`
- License 文件 URL：`https://github.com/joungminsung/OpenDocuments/blob/main/LICENSE`
- License：MIT
- 核验状态：`verified`
- 试航使用角色：`reference_only`

边界：

- 不做实时仓库抓取。
- 不做真实 RAG。
- 不把 GitHub 元数据作为推荐评分、岗位胜任或录用判断。
- License、README、仓库可见性或项目定位发生重大变化时，关联 TrialPackage 应标记 `needs_review`。

## Evidence Mapping 覆盖

`p1a-opendocuments-engineering-kb` 证据映射覆盖：

- JD 证据：三条匿名化样例 JD 的任务信号和边界。
- 用户背景证据占位：只接受真实用户授权输入，不绑定具体用户。
- OpenDocuments 证据：公开来源、License、原项目能力和 reference_only 边界。
- 风险证据：能力认证、offer 概率、企业筛选、简历包装、多项目推荐、真实 RAG、复杂评分和 OpenDocuments 官方贡献暗示。
- 下一步试航：2 周 MVP 范围、问题清单、流程草图、指标表、风险清单、作品集草稿和面试解释材料。

## AntiPackagingRule 覆盖

规则集 `p1a-rules.v1` 覆盖九类阻断项：

- 能力认证 / 岗位胜任认证
- offer、录用、上岸或就业结果预测
- 企业筛选、企业推荐、精准内推或候选人排序
- 简历包装、简历优化、自动投递或经历美化
- 真实 RAG、实时仓库抓取或自动仓库分析声明
- 多开源项目智能推荐或项目排行榜
- 匹配分、胜任分、综合分或排名
- OpenDocuments 归属误导或官方贡献暗示
- AI 替代合同、规范、施工方案等专业复核

每条规则同时包含 `forbidden` 和 `allowedContexts`。否定语境如“不做能力认证”“不代表录用判断”“OpenDocuments 仅作为公开参考项目”不应自动阻断，应记录为 `negated_context` 或 `allowed_context` 供 QA 复核。同一段既有否定说明又有正向承诺时，按阻断处理。

## 与现有契约的关系

本轮不修改 `frontend/src/features/pathfinder/data.ts`、`frontend/src/features/pathfinder/types.ts` 或 `backend/app/schemas/pathfinder.py`。这些运行时契约仍保留历史 P0 命名；本 fixture 记录 P1-A 产品负责人已确认的新数据基线，供后续 FE-002 / BE-002 做兼容实现时引用。

需要后续实现注意的命名差异：

- 旧契约中部分 Markdown section 使用历史演示用户命名；本 fixture 使用 `user_trial_contribution` 表达真实用户试航产出。
- 旧运行时代码固定包 ID 仍为历史 P0 ID；本 fixture 的 P1-A 数据包 ID 是 `p1a-opendocuments-engineering-kb`。

## 非目标

本轮未做：

- 抓取或自动同步 GitHub 数据
- 真实 RAG
- 多开源项目推荐
- 能力认证、offer 概率、企业筛选、简历包装或复杂评分
- 新增表、migration、后端 API 或前端运行逻辑

## Remaining Risks

- GitHub License 和 README 可能在未来变化，需要数据维护者定期复核。
- 旧前后端契约仍有历史 P0 命名，后续 FE-002 / BE-002 需要做兼容迁移或映射。
- AntiPackagingRule 目前是 fixture 规则，不是运行时检测实现；QA 仍需基于规则补正向 / 否定语境用例。
- 样例 JD 来源批次元数据仍不完整，P1-B 前应补 JDRecord sourceBatchId、采样日期、清洗版本和展示权限说明。
