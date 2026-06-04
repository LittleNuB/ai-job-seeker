# 寻径星图 P0 Polish / P1 产品化 / P2 平台化任务板

版本：P1/P2 规划版

适用对象：UX/UI、前端、后端、QA、产品

关联基线：

- `docs/pathfinder-p0/scope-lock-prd.md`
- `docs/pathfinder-p0/content-assets.md`

## 1. 文档目的与边界

本文档用于把“寻径星图”从 P0 Demo 交付状态，整理为后续设计、前端、后端、QA 可分工执行的产品任务板。

本文档只规划：

- P0 polish：在不改 P0 Scope Lock 的前提下，强化表达一致性、内容追溯链、导出资产和 QA 检查。
- P1 产品化：把 P0 单一试航链路升级为可复用、可保存、可展示、可回归测试的试航模块。
- P2 平台化：在 P1 稳定后，探索多试航包、内容审核、回归测试控制台等平台能力。

本文档不修改 P0 Scope Lock，不新增 P0 范围，不暗示 P0 已包含 P1/P2 能力。

P0 仍然锁定：

- 唯一 Demo 用户：小 C
- 三条路径：
  - 行业 AI 应用产品助理：优先试航
  - 行业 AI 解决方案助理：适合探索
  - 算法工程 / 大模型研发：短期不建议
- 唯一开源项目：OpenDocuments
- 唯一任务：工程企业知识库 AI 助手试航
- 唯一导出格式：Markdown

P0 Markdown 导出资产必须包含：

- 候选人背景
- 路径结论
- 样例 JD 说明
- OpenDocuments 来源与 License
- OpenDocuments 原项目能力
- 小 C 试航贡献
- 不可声称内容
- 固定 6 问作答
- 免责声明

## 2. P0 Polish 任务板

P0 polish 只做表达、体验和 QA 收口，不重构 P0 信息架构，不新增路径、项目、任务、推荐能力或复杂评分。

| ID | 任务 | 优先级 | 依赖 | 验收标准 |
|---|---|---:|---|---|
| P0-POL-01 | Scope Lock 文案一致性检查 | P0 | P0 Scope Lock | 全站只出现小 C、三条路径、OpenDocuments、工程企业知识库 AI 助手试航；不出现 P1/P2 能力暗示。 |
| P0-POL-02 | 三条路径状态校准 | P0 | P0 Scope Lock | 路径状态必须保持为：行业 AI 应用产品助理“优先试航”；行业 AI 解决方案助理“适合探索”；算法工程 / 大模型研发“短期不建议”。 |
| P0-POL-03 | 禁止表达扫描 | P0 | P0 明确不做清单 | 页面和导出内容不得出现能力认证、求职结果概率、企业筛选、简历包装、多开源项目智能推荐、真实 RAG 检索、复杂评分等表达或同义暗示。 |
| P0-POL-04 | OpenDocuments 表达收敛 | P0 | P0 内容资产 | OpenDocuments 只作为固定公开参考项目；必须展示来源与 License；不得暗示小 C 参与 OpenDocuments 官方贡献。 |
| P0-POL-05 | 追溯链表达强化 | P0 | 航迹表已有结构 | 不重构航迹表字段；只强化“JD 证据、小 C 背景证据、OpenDocuments 证据、风险证据、下一步试航”之间的可追溯表达。 |
| P0-POL-06 | 作品集一页纸边界 polish | P0 | P0 作品集草稿 | 一页纸能清楚表达问题场景、方案拆解、参考项目、小 C 试航贡献和不可声称内容；不得写成正式简历或能力认证材料。 |
| P0-POL-07 | Markdown 导出资产校准 | P0 | P0 内容资产 | Markdown 导出必须包含：候选人背景、路径结论、样例 JD 说明、OpenDocuments 来源与 License、OpenDocuments 原项目能力、小 C 试航贡献、不可声称内容、固定 6 问作答、免责声明。 |
| P0-POL-08 | 固定 6 问呈现 polish | P0 | P0 固定 6 问 | 固定 6 问完整展示并进入导出；问题顺序和含义不被改写为新任务体系。 |
| P0-POL-09 | 风险与合规表达 polish | P0 | 反包装表达检查表 | 结果页必须明确“可说什么 / 不可声称什么”；不得把试航结果表达为岗位胜任证明。 |
| P0-POL-10 | P0 Demo 回归清单 | P0 | P0-POL-01 至 P0-POL-09 | 每次发布前可按清单检查：对象、路径、项目、任务、结果资产、禁止表达、OpenDocuments 归属边界均未越界。 |

## 3. P1 产品定位

P1 的核心目标：

> 不扩展推荐能力，只把 P0 一次性 Demo 升级为可复用、可保存、可展示、可回归测试的试航模块。

P1 允许做：

- UI 基础体验升级
- TrialPackage 试航包对象
- TrailRecord 试航记录对象
- AntiPackagingCheck 反包装检查对象
- 作品集草稿
- 面试追问准备
- QA 与回归测试体系

P1 不允许做：

- 新增岗位推荐能力
- 新增企业筛选或企业推荐
- 新增多开源项目智能推荐
- 新增能力认证、求职结果概率或复杂评分
- 新增简历自动包装
- 新增真实 RAG 检索

## 4. P1 模块路线

### 4.1 UI 基础体验升级

UI 升级只改善试航模块的可读性、可操作性和可展示性，不引入新的推荐入口。

| ID | 任务 | 优先级 | 依赖 | 验收标准 |
|---|---|---:|---|---|
| P1-UI-01 | 全局信息架构整理 | P1-0 | P0 polish | 页面结构清晰呈现：候选人背景、路径结论、试航任务、结果资产、导出；不新增企业、简历、项目推荐入口。 |
| P1-UI-02 | 线性步骤导航 | P1-0 | P1-UI-01 | 用户能看到从加载 Demo 到导出 Markdown 的当前步骤；导航不允许跳到未定义 P1/P2 能力。 |
| P1-UI-03 | 路径结论卡片优化 | P1-0 | P0 三路径状态 | 三条路径状态、证据链和风险提示清晰；状态文案必须保持 P0 锁定版本。 |
| P1-UI-04 | 结果区分区展示 | P1-0 | P0 结果资产 | 航迹表摘要、作品集一页纸、指标表、用户流程草图说明、风险清单、合规表达建议、面试追问准备、Markdown 导出分区展示。 |
| P1-UI-05 | Markdown 预览体验 | P1-1 | P0 Markdown 导出 | 用户可预览导出内容；预览内容与实际导出内容一致，并包含 P0 要求的全部内容资产。 |
| P1-UI-06 | 空态 / 加载态 / 错误态 | P1-1 | P1-UI-01 | 缺少数据、生成失败、导出失败时有明确提示；提示不引导用户进入未定义推荐、认证或包装能力。 |
| P1-UI-07 | 响应式基础适配 | P1-2 | P1-UI-01 | 桌面端和常见移动端宽度下文本不重叠、按钮不溢出、结果区可读可操作。 |
| P1-UI-08 | 视觉规范最小集 | P1-2 | P1-UI-01 | 建立基础颜色、字号、间距、按钮、标签、卡片样式；保证参赛 Demo 壳可展示且不影响内容可信度。 |

### 4.2 TrialPackage

TrialPackage 是“试航包”，用于封装一个可复用的试航配置。它不是推荐器。

| ID | 任务 | 优先级 | 依赖 | 验收标准 |
|---|---|---:|---|---|
| P1-TP-01 | TrialPackage schema | P1-0 | P0 Scope Lock | 字段包含：trial_package_id、version、candidate_profile、path_cards、sample_jd_notes、source_project、trial_task、fixed_questions、output_assets、forbidden_claims、disclaimer。 |
| P1-TP-02 | P0 Demo 封装为 TrialPackage | P1-0 | P1-TP-01 | 小 C、三路径、样例 JD、OpenDocuments、工程企业知识库 AI 助手试航、固定 6 问和导出资产可作为一个固定试航包加载。 |
| P1-TP-03 | TrialPackage 版本记录 | P1-1 | P1-TP-01 | 每个试航包有稳定版本号；导出的 TrailRecord 能记录使用的 TrialPackage 版本。 |
| P1-TP-04 | TrialPackage 只读加载 | P1-1 | P1-TP-02 | 普通用户不能修改路径、项目、任务集合或固定 6 问；避免产品变成推荐配置器。 |
| P1-TP-05 | TrialPackage 回归快照 | P1-1 | P1-TP-03 | 固定 TrialPackage 加载后，路径状态、任务名、开源来源、License、固定 6 问和导出资产结构可被快照测试。 |

### 4.3 TrailRecord

TrailRecord 是用户一次试航过程的记录，用于保存、回看和导出。

| ID | 任务 | 优先级 | 依赖 | 验收标准 |
|---|---|---:|---|---|
| P1-TR-01 | TrailRecord schema | P1-0 | TrialPackage | 字段包含：record_id、trial_package_id、trial_package_version、selected_path、answers、trace_summary、generated_outputs、anti_packaging_result、status、created_at、updated_at。 |
| P1-TR-02 | 保存试航记录 | P1-0 | P1-TR-01 | 用户完成试航后可保存 TrailRecord；刷新或重新进入后记录不丢失。 |
| P1-TR-03 | 查看历史试航记录 | P1-1 | P1-TR-02 | 用户可打开历史记录；只展示已完成试航内容，不生成新推荐或新路径。 |
| P1-TR-04 | TrailRecord 状态机 | P1-1 | P1-TR-01 | 状态包含 draft、completed、exported、export_failed；状态流稳定可测试。 |
| P1-TR-05 | TrailRecord 与 Markdown 关联 | P1-1 | P1-TR-02 | 每次 Markdown 导出能关联具体 record_id 和 TrialPackage 版本，便于追溯和回归。 |

### 4.4 AntiPackagingCheck

AntiPackagingCheck 是“反包装检查”，用于防止结果夸大、归属错误和求职结果承诺。

| ID | 任务 | 优先级 | 依赖 | 验收标准 |
|---|---|---:|---|---|
| P1-APC-01 | AntiPackagingCheck schema | P1-0 | P0 禁止表达清单 | 字段包含：check_id、rule_id、risk_level、matched_text、risk_reason、suggested_rewrite、blocking_policy。 |
| P1-APC-02 | 禁止表达规则集 | P1-0 | P1-APC-01 | 规则覆盖能力认证、求职结果概率、企业筛选、简历包装、多项目智能推荐、真实 RAG 检索、复杂评分、OpenDocuments 官方贡献暗示。 |
| P1-APC-03 | 作品集草稿检查 | P1-1 | P1-APC-02 | 作品集草稿不得声称已上线、已训练模型、已实现真实 RAG、已参与 OpenDocuments 官方开发、已获得岗位认证。 |
| P1-APC-04 | 面试回答边界检查 | P1-1 | P1-APC-02 | 面试追问回答不得把公开项目拆解说成个人研发成果，不得把试航结论说成岗位胜任证明。 |
| P1-APC-05 | 导出前检查 | P1-1 | P1-APC-02 | Markdown 导出前执行 AntiPackagingCheck；高风险命中时阻止导出或要求用户修改。 |
| P1-APC-06 | 检查结果可追溯 | P1-2 | P1-APC-05 | TrailRecord 中保存检查结果摘要，便于 QA 复现和问题定位。 |

### 4.5 作品集草稿

作品集草稿用于展示试航过程和思考材料，不是简历包装或能力认证。

| ID | 任务 | 优先级 | 依赖 | 验收标准 |
|---|---|---:|---|---|
| P1-PF-01 | 作品集草稿 schema | P1-0 | TrailRecord | 字段包含：title、target_path、problem_context、user_scenario、solution_outline、opendocuments_reference、xiaoc_trial_contribution、not_claimed、disclaimer。 |
| P1-PF-02 | 从 TrailRecord 生成草稿 | P1-0 | P1-PF-01 | 草稿内容只能来自 TrialPackage 和 TrailRecord，不引入新项目、新岗位、新企业或新推荐结论。 |
| P1-PF-03 | 草稿编辑能力 | P1-1 | P1-PF-02 | 用户可编辑文本；编辑后触发 AntiPackagingCheck。 |
| P1-PF-04 | 草稿展示页 | P1-1 | P1-PF-02 | 作品集草稿可作为独立展示页查看；页面明确其为试航材料，不伪装为正式简历。 |
| P1-PF-05 | 草稿导出到 Markdown | P1-1 | P1-PF-03 | Markdown 保留 OpenDocuments 来源与 License、小 C 试航贡献、不可声称内容和免责声明。 |

### 4.6 面试追问准备

面试追问准备用于帮助小 C解释试航过程、边界和个人贡献，不扩展到算法研发考核或岗位胜任认证。

| ID | 任务 | 优先级 | 依赖 | 验收标准 |
|---|---|---:|---|---|
| P1-IV-01 | 面试追问准备 schema | P1-0 | TrailRecord | 字段包含：question、answer_points、evidence_source、boundary_reminder、forbidden_claims。 |
| P1-IV-02 | 基于作品集生成追问 | P1-0 | 作品集草稿 | 追问只围绕试航任务、OpenDocuments、样例 JD、用户场景、方案拆解、边界表达，不扩展到算法研发能力考核。 |
| P1-IV-03 | 回答边界提醒 | P1-1 | AntiPackagingCheck | 每个回答要点包含“可以说明的内容”和“不可声称的内容”。 |
| P1-IV-04 | 面试准备展示区 | P1-1 | P1-IV-02 | 结果页可展示追问准备；视觉上与作品集草稿区分，避免混成简历包装。 |
| P1-IV-05 | 面试准备导出 | P1-2 | P1-IV-03 | 面试追问准备可作为 Markdown 的独立区块导出；导出前通过 AntiPackagingCheck。 |

### 4.7 QA 与回归测试

QA 验收原则：P1 不扩展推荐能力，只升级为可复用、可保存、可展示、可回归测试的试航模块。

| ID | 任务 | 优先级 | 依赖 | 验收标准 |
|---|---|---:|---|---|
| P1-QA-01 | Scope Guard 测试用例 | P1-0 | P0 Scope Lock | 自动或人工测试确认未出现新增推荐能力、能力认证、求职结果概率、企业筛选、简历包装、多项目智能推荐、真实 RAG 检索、复杂评分。 |
| P1-QA-02 | TrialPackage 回归用例 | P1-0 | TrialPackage | 固定 TrialPackage 输入下，路径状态、任务、项目、固定 6 问、导出资产结构稳定。 |
| P1-QA-03 | TrailRecord 保存回归 | P1-0 | TrailRecord | 保存、刷新、重新打开后，selected_path、answers、generated_outputs、status 一致。 |
| P1-QA-04 | AntiPackagingCheck 回归 | P1-1 | AntiPackagingCheck | 输入高风险表达时能命中；输入合规表达时不阻断核心试航内容。 |
| P1-QA-05 | Markdown 快照测试 | P1-1 | Markdown 导出 | 固定试航记录导出的 Markdown 结构稳定，并包含 P0 内容资产要求的九类内容。 |
| P1-QA-06 | UI 基础回归 | P1-2 | UI 基础体验升级 | 核心页面在桌面和移动端可读、可操作、无明显遮挡；路径状态和边界文案未丢失。 |
| P1-QA-07 | OpenDocuments 归属边界测试 | P1-1 | AntiPackagingCheck | 页面、草稿、追问和导出中不得暗示小 C 参与 OpenDocuments 官方贡献。 |

## 5. P2 平台化方向

P2 仅在 P1 对象、保存、展示、检查、回归测试稳定后进入。P2 平台化方向必须继承 P1 Scope Guard，不能把平台化误做成推荐系统。

| ID | 方向 | 优先级 | 依赖 | 验收标准 |
|---|---|---:|---|---|
| P2-PLAT-01 | 多 TrialPackage 管理 | P2-0 | P1 TrialPackage 稳定 | 支持运营管理多个已配置试航包；用户只选择试航包，不触发自动推荐排序。 |
| P2-PLAT-02 | 试航包模板库 | P2-0 | P2-PLAT-01 | 可复用候选人画像模板、路径集合模板、任务模板、输出资产模板；模板发布前必须通过 Scope Guard。 |
| P2-PLAT-03 | 内容审核工作台 | P2-1 | AntiPackagingCheck | 运营可查看风险表达、修改模板、维护禁止表达规则；高风险内容不能直接发布。 |
| P2-PLAT-04 | 作品集展示空间 | P2-1 | P1 作品集草稿 | 用户可管理多个作品集草稿展示页；仍不提供简历自动包装能力。 |
| P2-PLAT-05 | 面试准备库 | P2-1 | P1 面试追问准备 | 用户可沉淀不同 TrailRecord 对应的追问准备；不得生成岗位胜任认证话术。 |
| P2-PLAT-06 | 回归测试控制台 | P2-1 | P1 QA | 每个 TrialPackage 可运行快照测试、禁止表达测试、导出结构测试和 OpenDocuments 归属边界测试。 |
| P2-PLAT-07 | 轻量权限与发布流 | P2-2 | 多 TrialPackage 管理 | 支持草稿、审核、发布、下线；未审核试航包不能进入生产入口。 |
| P2-PLAT-08 | 使用数据分析面板 | P2-2 | TrailRecord | 只展示完成率、保存率、导出率、检查命中率等过程数据；不展示求职成功率或录用预测。 |
| P2-PLAT-09 | 外部内容引用规范 | P2-2 | 内容审核工作台 | 管理开源项目、样例 JD、任务材料的来源、版本、License 和引用说明。 |
| P2-PLAT-10 | API / SDK 边界设计 | P2-3 | P2 平台能力稳定 | 对外只暴露试航包加载、试航记录保存、导出、反包装检查能力；不暴露推荐评分接口。 |

## 6. 总体验收原则

P0 验收：

- 不修改 P0 Scope Lock。
- 只强化内容一致性、追溯链表达、导出资产和 QA 检查。
- 不重构航迹表字段。
- 三条路径状态必须保持：优先试航、适合探索、短期不建议。
- Markdown 导出必须符合 P0 内容资产要求。

P1 验收：

- 可复用：P0 Demo 被封装为 TrialPackage。
- 可保存：用户每次试航形成 TrailRecord。
- 可展示：结果能形成作品集草稿和面试追问准备。
- 可回归测试：固定输入下，路径状态、任务、导出结构、禁止表达检查稳定。
- 不扩展推荐：不新增企业推荐、项目推荐、岗位推荐、求职结果概率、能力认证、简历包装。

P2 验收：

- 平台化只管理试航包、内容审核、展示、回归测试和引用规范。
- 不把多试航包管理升级为自动推荐系统。
- 不把作品集展示空间升级为简历包装系统。
- 不把数据分析面板升级为求职结果预测系统。

## 7. 明确不做清单

P0 / P1 / P2 全阶段都不做：

- 不做能力认证
- 不做 offer 概率预测
- 不做企业筛选
- 不做简历包装
- 不做多开源项目智能推荐
- 不做真实 RAG 检索
- 不做复杂评分系统
- 不做岗位胜任认证
- 不做自动投递
- 不做企业推荐或精准内推
- 不做算法工程速成或大模型研发训练路径
- 不暗示小 C 参与 OpenDocuments 官方贡献
- 不暗示完成试航等于具备岗位录用优势

## 8. 给 UX/UI、前端、后端、QA 的后续交接摘要

### UX/UI

重点交付：

- P1-UI-01 至 P1-UI-08 的页面结构、步骤导航、结果分区和 Markdown 预览体验。
- 保持 P0 三路径状态文案，不创造新的路径标签。
- 作品集草稿和面试追问准备要清楚区分，避免视觉上像简历包装或认证证书。
- 所有页面必须保留 OpenDocuments 来源与 License、不可声称内容和免责声明入口。

### 前端

重点交付：

- TrialPackage 加载与只读展示。
- TrailRecord 的保存、回看、状态呈现和 Markdown 预览。
- AntiPackagingCheck 的导出前提示与阻断交互。
- 响应式基础适配和 UI 回归检查。

前端不得新增：

- 新路径选择器
- 企业筛选入口
- 多项目推荐入口
- 分数、概率、认证类展示组件

### 后端

重点交付：

- TrialPackage、TrailRecord、AntiPackagingCheck 的 schema 与接口。
- TrailRecord 持久化和 Markdown 导出关联。
- TrialPackage 版本记录和回归快照支持。
- AntiPackagingCheck 规则集和导出前检查能力。

后端接口边界：

- 允许：加载试航包、保存试航记录、生成结果资产、执行反包装检查、导出 Markdown。
- 不允许：推荐评分、企业匹配、offer 预测、简历包装、真实 RAG 检索。

### QA

重点交付：

- P0 Scope Guard 测试。
- P1 TrialPackage / TrailRecord / AntiPackagingCheck 回归测试。
- Markdown 快照测试，确认包含 P0 内容资产九类内容。
- OpenDocuments 归属边界测试，确认没有暗示小 C 参与官方贡献。
- UI 基础回归，确认核心页面可读、可操作、无遮挡。

QA 判定准则：

> 任何新增能力只要让产品看起来像推荐器、认证器、简历包装器、企业筛选器或真实 RAG 系统，都应判定为越界。
