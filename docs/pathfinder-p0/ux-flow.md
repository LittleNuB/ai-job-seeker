# 寻径星图 P0 页面与交互基线

版本：任务 3 v1.2 通过版

## 1. 产品闭环

固定路径：

```text
/pathfinder
  -> /pathfinder/background
  -> /pathfinder/recommendation
  -> /pathfinder/trial
  -> /pathfinder/result
```

核心主线：

> 小 C 背景 + 样例 JD -> 三条岗位路径判断 -> OpenDocuments 工程企业知识库 AI 助手试航 -> 生成可追溯作品集起点

不做泛化 JD 粘贴，不引导提交 issue，不把 OpenDocuments 当作可包装的贡献项目。

## 2. 页面 1：寻径星图入口页

路由：`/pathfinder`

页面目的：

- 说明这是固定 Demo，不是开放 JD 推荐器。
- 说明本次 Demo 聚焦小 C 的工程企业知识库 AI 助手试航。

模块：

- 产品名 + 5 步流程
- P0 Demo 主线说明
- 本次 Demo 输入与输出预览
- 边界说明
- 主按钮：进入小 C Demo

关键文案：

> 寻径星图：小 C 的工程企业知识库 AI 助手试航

> 基于真实 JD 样例、小 C 背景和 OpenDocuments，生成一个可追溯的作品集起点。

边界：

- 不评估能力
- 不预测 offer
- 不暗示官方贡献
- 不把项目成果写成个人成果

## 3. 页面 2：小 C 背景与样例 JD 页

路由：`/pathfinder/background`

页面目的：

- 展示小 C 背景与 3 条样例 JD。
- 不做自由 JD 粘贴。

小 C 背景卡：

- 身份：研二 / 转产品方向探索
- 背景：有文档整理、用户调研、AI 工具使用经验
- 技术基础：
  - 基础 Python / 数据处理
  - 常用 AI 工具使用
  - 对 RAG、知识库问答有初步理解
- 短板：缺少企业级系统经验、缺少完整工程项目交付记录
- 目标：找到能连接 AI 产品、企业知识库、工程协作的作品集切入点

3 条样例 JD 卡：

1. 行业 AI 应用产品助理：与小 C 当前背景连接最强
2. 行业 AI 解决方案助理：可探索，但需要补充行业和交付理解
3. 算法工程 / 大模型研发：短期门槛较高，不作为 P0 试航主线

关键文案：

> P0 使用固定样例，不开放 JD 粘贴。这样可以把重点放在路径判断和试航产出，而不是泛化推荐。

按钮：

- 一键加载 Demo
- 查看星图推荐

## 4. 页面 3：星图推荐页

路由：`/pathfinder/recommendation`

页面目的：

- 同时展示三条岗位路径。
- 每条路径展示四类证据与下一步试航。

路径：

1. 行业 AI 应用产品助理：优先试航
2. 行业 AI 解决方案助理：适合探索
3. 算法工程 / 大模型研发：短期不建议

每条路径必须展示：

- JD 证据
- 小 C 背景证据
- OpenDocuments 证据
- 风险证据
- 下一步试航

推荐结论：

> P0 建议小 C 优先试航“行业 AI 应用产品助理”路径，因为它能同时连接 JD 要求、小 C 现有背景和 OpenDocuments 的知识库场景。

主按钮：

> 开始 OpenDocuments 试航

## 5. 页面 4：OpenDocuments 试航页

路由：`/pathfinder/trial`

页面目的：

- 展示 OpenDocuments 原项目能力。
- 让小 C 完成固定 6 问试航。
- 明确原项目能力和小 C 试航贡献的边界。

OpenDocuments 原项目能力：

- 多来源文档接入
- AI 文档搜索
- RAG 问答
- 引用来源展示
- Web UI / CLI / MCP 等公开能力

区块性质：

> 只读展示，作为小 C 试航理解的参考来源，不作为小 C 的个人产出。

固定 6 问：

1. 项目理解
2. 岗位连接
3. 场景缺口
4. 应用方案
5. 作品延展
6. AI 使用说明

边界提示：

> 左侧是 OpenDocuments 的公开能力，右侧是小 C 基于这些能力完成的理解、岗位映射和方案草稿。结果页会分开记录，避免把原项目能力写成小 C 的个人产出。

交互状态：

- 6 问未完成：可保存草稿，但不能生成完整航迹表。
- 单问为空：显示“这一问会影响结果页对应模块”。
- AI 使用说明为空：生成按钮禁用。
- 点击 Markdown 预览：打开抽屉。
- 点击生成：进入结果页。

不得出现：

- 协作编辑能力
- 官方贡献
- 相关公开 issue
- 小 C 已参与 OpenDocuments 项目

## 6. 页面 5：航迹表结果页

路由：`/pathfinder/result`

页面目的：

- 展示完整试航记录。
- 支持复制 / 下载 Markdown。

结果页必须包含：

1. 航迹表摘要
2. 作品集一页纸草稿
3. 指标表
4. 用户流程草图说明
5. 风险清单
6. 合规表达建议
7. 面试追问准备
8. Markdown 导出

航迹表摘要字段：

- 试航对象：OpenDocuments
- 推荐路径：行业 AI 应用产品助理
- 试航主题：工程企业知识库 AI 助手
- 输入来源：小 C 背景 + 3 条样例 JD + OpenDocuments 原项目能力
- 输出结果：作品集一页纸草稿 + 指标表 + 风险清单

关键文案：

> 这是一份试航记录，不是能力认证，也不是官方贡献记录。它用于说明小 C 如何从真实 JD 样例出发，形成一个可追溯的作品集起点。

## 7. 组件清单

- `StepProgress`
- `PageHeader`
- `DemoLoadButton`
- `ProfileCard`
- `SampleJDCard`
- `PathRecommendationCard`
- `EvidenceBlock`
- `RiskNotice`
- `SourcePanel`
- `TrialAnswerPanel`
- `BoundaryNotice`
- `SixQuestionForm`
- `MarkdownPreviewDrawer`
- `TrailSummary`
- `PortfolioOnePager`
- `MetricTable`
- `FlowSketchText`
- `RiskTable`
- `ComplianceSuggestion`
- `InterviewPrepCards`
- `ExportActions`

## 8. 页面状态与保护规则

空态：

- 页面 2：Demo 数据尚未加载。点击“一键加载 Demo”查看小 C 背景与 3 条样例 JD。
- 页面 3：需要先加载小 C 背景和样例 JD，才能生成岗位路径判断。
- 页面 4：请先选择“行业 AI 应用产品助理”路径，再开始 OpenDocuments 试航。
- 页面 5：完成 6 问试航后会生成航迹表。

加载态：

- 生成星图：正在对齐小 C 背景、样例 JD 和 OpenDocuments 场景...
- 生成航迹表：正在整理试航作答、风险边界和 Markdown...

错误态：

- Demo 数据加载失败：Demo 数据加载失败，请重试。
- 6 问未完成：还有试航问题未完成，结果页会缺少对应内容。
- Markdown 生成失败：Markdown 生成失败，航迹表内容已保留，可重新导出。

保护规则：

- 未加载 Demo 进入推荐页：提示返回 `/pathfinder/background`。
- 未选择优先路径进入试航页：默认选中“行业 AI 应用产品助理”。
- 6 问未完成进入结果页：展示缺项提示，不生成完整 Markdown。

## 9. P0 视觉验收标准

- 3 分钟内能讲清楚：小 C 为什么优先走“行业 AI 应用产品助理”。
- 页面 2 一眼能看出这是固定 Demo，不是开放 JD 推荐器。
- 页面 3 三条路径优先级清楚，且每条都有四类证据和下一步。
- 页面 4 OpenDocuments 原项目能力、小 C 试航作答区分明显。
- 页面 5 能直接导出 Markdown，且结果能作为作品集起点草稿。
- 移动端保持单列流程，不出现复杂图谱或横向表格挤压。
- 全流程不出现录取预测、能力认证或官方贡献暗示。

