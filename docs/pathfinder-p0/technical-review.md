# 寻径星图 P0 前后端方案评审

更新时间：2026-06-04

## 1. 总体结论

任务 4 前端方案：已通过，可以进入实现。

任务 5 后端/API 方案：重修后已通过，可以进入实现；但 P0 开发顺序建议前端闭环优先，后端保存记录作为第二个 vertical slice。

## 2. PM 决策：Markdown 归属

P0 决策：

- 前端负责即时 Markdown 预览、复制与下载。
- Markdown 生成必须是纯函数，基于结构化 Demo 数据和 6 问作答生成。
- 后端 P0 不单独维护另一套 Markdown 模板。
- 如实现保存记录，后端保存结构化结果，并可保存前端生成的 `markdown_snapshot`，用于历史记录、用户数据导出或再次下载。

原因：

- P0 是参赛 Demo / 产品尖刀版本，前端即时导出最少依赖、最快闭环。
- 任务 4 已经把 Markdown 生成为纯函数并纳入测试，适合 P0。
- 后端重复生成 Markdown 会造成模板双写，增加联调和文案一致性风险。
- 用户数据权利可以通过保存结构化 result 和可选 `markdown_snapshot` 满足。

## 3. 任务 4 前端方案最终评审

可保留：

- 路由设计与 P0 页面一致。
- 组件拆分合理。
- 状态管理保持轻量，符合 P0。
- Guard 规则符合页面基线。
- Playwright / TS / ESLint 测试建议可用。
- Tailwind 风格方向符合工具型界面要求。

已修正并通过：

1. `TrialQuestion` 的 prompt 不能用泛化占位文案，必须使用 P0 固定 6 问完整问题。
2. 需要增加 `demoTrialAnswers`，支持参赛演示一键填充小 C 6 问作答。
3. `CandidateProfile` 类型需要补齐页面 2 的字段：身份、背景、技术基础、短板、目标。
4. `SampleJd` 需要包含“样例 JD，用于 P0 Demo 和当前样本趋势参考”的说明字段。
5. `generatePathfinderMarkdown` 不能只输出标题骨架，必须按内容资产完整输出：
   - 候选人背景
   - 星图路径结论
   - 样例 JD 说明
   - 开源来源与 License
   - OpenDocuments 原项目能力
   - 小 C 试航贡献
   - 不可声称内容
   - 固定 6 问及小 C 作答
   - 免责声明
6. `assertSafePathfinderCopy` 不只检查导出 Markdown，也要用于 mock data / 页面文案的静态测试。
7. 文件路径可参考 `src/app`，但实现时必须服从现有前端仓库结构；若现有项目不用 `src`，不得强行迁移。

实现注意：

- `assertSafePathfinderCopy` 的正则守卫只能作为兜底测试，不替代人工文案验收。
- `demoTrialAnswers` 是参赛演示便利能力，UI 上要表达为“填入小 C 示例作答”，不要暗示真实用户无需思考。
- `generatePathfinderMarkdown` 必须继续保持纯函数，不依赖 React state、DOM、路由或浏览器 API。

## 4. 任务 5 后端/API 方案最终评审

已纠偏并通过：

1. 示例用户偏离 P0：出现“本科、2 年运营、SQL、AI Product Manager”等内容，应全部回到小 C 传统工科硕士主线。
2. 6 问 schema 偏离 P0：不能使用 `q1` 到 `q6` 的泛化问题，应使用固定 question id：
   - `project_understanding`
   - `role_connection`
   - `scenario_gap`
   - `application_solution`
   - `portfolio_extension`
   - `ai_usage_explanation`
3. 当前本地迁移中的 `analysis_records` 字段为：
   - `id`
   - `user_id`
   - `type`
   - `input_text`
   - `input_file_url`
   - `result`
   - `match_score`
   - `created_at`
   
   后端方案直接使用 `analysis_type`、`status`、`input_data`、`intermediate_data`、`result_data` 与当前 schema 不一致。
4. “复用 analysis_records”方向可保留，但必须给出两档方案：
   - P0 最小无迁移：`type = "pathfinder"`，`input_text` 和 `result` 存 JSON 字符串。
   - P0+ 可选迁移：新增状态与 JSON 字段，但需明确迁移成本。
5. 后端不应在 P0 决定推荐路径或动态生成推荐范围。
6. Markdown 归属需按 PM 决策调整：前端生成即时导出，后端只保存结构化结果和可选 snapshot。

最终采用：

- A 方案：P0 最小无迁移。
- `analysis_records.type = "pathfinder"`。
- `analysis_records.input_text` 保存 Pathfinder 输入 JSON 字符串。
- `analysis_records.result` 保存 `trialAnswers`、`report`、`markdownSnapshot` 的 JSON 字符串。
- `input_file_url = null`。
- `match_score = null`。

最小 API：

```txt
POST   /api/pathfinder/records
GET    /api/pathfinder/records/{record_id}
PATCH  /api/pathfinder/records/{record_id}/trial-answers
PUT    /api/pathfinder/records/{record_id}/result
DELETE /api/pathfinder/records/{record_id}
```

不新增：

- `GET /api/pathfinder/records/{id}/export/markdown`
- `pathfinder_records` 表
- 后端 Markdown 模板

## 5. 前后端契约基准

若 P0 接后端，推荐最小契约：

```ts
type TrialQuestionId =
  | 'project_understanding'
  | 'role_connection'
  | 'scenario_gap'
  | 'application_solution'
  | 'portfolio_extension'
  | 'ai_usage_explanation'

type PathfinderRecordPayload = {
  demoVersion: 'p0-xiaoc-opendocuments'
  selectedPathId: 'industry-ai-product-assistant'
  trialAnswers: Record<TrialQuestionId, string>
  markdownSnapshot?: string
}
```

P0 后端不得返回：

- 匹配分
- 胜任力分
- offer 概率
- 自动简历建议
- 企业推荐
- 官方贡献暗示

## 6. 推荐开发顺序

### Slice 1：前端静态闭环

目标：

- 5 页路径跑通。
- 固定 Demo 数据展示正确。
- 一键填入小 C 6 问作答。
- 前端生成、复制、下载 Markdown。
- 不接后端。

验收：

- 3 分钟内能从 `/pathfinder` 走到导出。
- 6 问不完整时不生成完整 Markdown。
- 页面和导出内容通过禁用表达检查。

### Slice 2：后端记录保存

目标：

- 创建 Pathfinder 记录。
- 保存 6 问作答。
- 保存结构化 report 与 `markdownSnapshot`。
- 复用 `analysis_records` 历史、删除、导出能力。

验收：

- 不新增迁移。
- 不新增推荐或 RAG 能力。
- 权限检查使用 `user_id + id + type = "pathfinder"`。

### Slice 3：QA 与参赛演示

目标：

- E2E 覆盖主链路。
- 准备 3 分钟讲稿、备用截图、现场提问预案。
- 做反包装文案验收。
