# 寻径星图 P0 Polish QA 回归验收报告

验收时间：2026-06-04

验收角色：P0 QA / 参赛演示负责人

关联基线：

- `scope-lock-prd.md`
- `content-assets.md`
- `ux-flow.md`
- `qa-demo-plan.md`
- `p1-product-roadmap.md`
- `p0-polish-copy-final.md`
- `p1-ui-design-brief.md`
- `p0-polish-frontend-implementation.md`
- `handoff-status.md`

## 1. QA 目标与边界

本次 QA 目标是对 P0 polish 前端实现做回归验收，确认当前 Demo 能稳定完成：

- 固定 P0 Scope Guard。
- 5 页静态闭环展示。
- 反包装文案与交互阻断。
- 完整 6 问后的 Markdown 复制 / 下载。
- 3 分钟参赛展示主链路。
- 390px 移动端基础可读可操作。

本次 QA 不新增功能，不扩大 P0 范围，不要求 P1/P2 能力进入 P0。

P0 仍锁定：

- 唯一 Demo 用户：小 C。
- 唯一公开参考项目：OpenDocuments。
- 唯一任务：工程企业知识库 AI 助手试航。
- 三条路径：行业 AI 应用产品助理 / 行业 AI 解决方案助理 / 算法工程或大模型研发。
- 唯一导出格式：Markdown。

本次 QA 不验收：

- TrialPackage。
- TrailRecord。
- AntiPackagingCheck 对象化。
- 保存草稿 / 历史记录。
- 后端记录联调。
- 多开源项目推荐。
- 自由 JD 粘贴。
- 真实 RAG 检索。
- 复杂评分系统。
- 企业筛选 / 企业推荐 / 精准内推。
- 简历包装 / 简历自动优化。
- 能力认证、岗位认证或录用概率预测。

## 2. 验收环境

前端目录：`frontend`

技术栈：

- Next.js 14.2.35
- Playwright
- ESLint
- TypeScript

浏览器验证：

- Codex in-app Browser。
- 桌面默认视口。
- 移动端 390px 视口。

Demo 地址：

- 交接地址：`http://127.0.0.1:3000/pathfinder`
- 回归主用地址：`http://127.0.0.1:3001/pathfinder`

环境说明：

- 开始浏览器验收时，`127.0.0.1:3000/pathfinder` 曾短暂返回 HTTP 500 且页面空白。
- 为不中断 QA，使用同一前端仓库启动备用端口 `3001` 完成主回归。
- 后续复测 `127.0.0.1:3000/pathfinder` 已恢复 200，入口页标题、边界文案和浏览器日志正常。

## 3. 已执行测试命令与结果

执行目录：`frontend`

| 命令 | 结果 | 备注 |
|---|---|---|
| `npm run test:safety` | 通过 | 输出 `Pathfinder static safety tests passed.` |
| `npm run lint` | 通过 | 输出 `No ESLint warnings or errors` |
| `npm run test:e2e` | 通过 | 4 passed |
| `npm run build` | 通过 | Next.js production build compiled successfully |

E2E 覆盖项：

- 未加载 Demo 进入推荐页时的保护。
- `/pathfinder` 到 `/pathfinder/result` 的完整静态闭环。
- 完整 6 问后 Markdown 下载，文件名为 `pathfinder-xiaoc-opendocuments.md`。
- 6 问未完成时不生成完整 Markdown，复制 / 下载按钮禁用。
- sessionStorage 中已有完整 6 问时，直接打开结果页仍可导出 Markdown。

## 4. 页面级验收结果

### `/pathfinder`

结论：通过。

已确认：

- 首屏显示“寻径星图：小 C 的工程企业知识库 AI 助手试航”。
- 固定 Demo 边界可见：1 个用户、3 条路径、1 个开源项目、1 个试航任务、1 种导出格式。
- 反包装边界清楚：不是简历包装工具，不做能力认证、企业推荐或录用预测。
- CTA 为“进入小 C Demo”。
- 未发现正向能力认证、概率、企业推荐、简历包装或多项目推荐入口。

### `/pathfinder/background`

结论：通过。

已确认：

- 页面说明清楚：只展示小 C 和 3 条样例 JD，不开放 JD 粘贴。
- 小 C 优势 / 短板 / 目标分区清楚。
- 技术基础包含基础 Python / 数据处理、常用 AI 工具使用、对 RAG 和知识库问答有初步理解。
- 样例 JD 说明可见：用于 P0 Demo 和当前样本趋势参考，不代表具体公司岗位要求或录用判断。
- 三条样例 JD 状态保持不变。

### `/pathfinder/recommendation`

结论：通过。

已确认：

- 推荐结论清楚：小 C 优先试航“行业 AI 应用产品助理”。
- 三条路径状态正确：
  - 行业 AI 应用产品助理：优先试航。
  - 行业 AI 解决方案助理：适合探索。
  - 算法工程 / 大模型研发：短期不建议。
- 每条路径均包含 JD 证据、小 C 背景证据、OpenDocuments 证据、风险证据和下一步试航。
- 主 CTA 为“开始 OpenDocuments 试航”。
- 未出现评分、概率、胜任认证、企业推荐或岗位排序暗示。

### `/pathfinder/trial`

结论：通过，有一个非阻断响应式问题，见第 9 节。

已确认：

- OpenDocuments 原项目能力分区可见。
- 来源和 License 可见：
  - 来源：`https://github.com/joungminsung/OpenDocuments`
  - License：MIT
- 小 C 本次试航贡献分区可见。
- 文案明确：小 C 的贡献只包括场景拆解、2 周 MVP 方案、指标、风险、演示材料和作品集表达草稿。
- 固定 6 问完整展示。
- 每一问都显示“影响结果模块”。
- 示例作答按钮文案为“填入演示用小 C 作答，可继续编辑”。
- 第 6 问为空时，显示反包装阻断文案，并禁用进入结果页。

### `/pathfinder/result`

结论：通过。

已确认：

- 首屏追溯链可见：
  - 样例 JD + 小 C 背景 + OpenDocuments 原项目能力 -> 6 问试航 -> 航迹表 / 作品集草稿 / Markdown
- 结果页 8 个模块齐全：
  1. 航迹表摘要
  2. 作品集一页纸草稿
  3. 指标表
  4. 用户流程草图说明
  5. 风险清单
  6. 合规表达建议
  7. 面试追问准备
  8. Markdown 导出
- 作品集边界说明清楚：不是正式简历，不代表岗位能力认证，也不声明小 C 参与 OpenDocuments 官方贡献。
- 不可声称内容提示可见。
- Markdown 复制按钮可用，复制内容已人工检查。
- Markdown 下载按钮可用；下载行为由 E2E 覆盖。

## 5. 反包装机制验收结果

结论：通过。

已验证：

- 6 问未完成时，完整 Markdown 不生成。
- 6 问未完成时，结果页显示“6 问尚未完成”和缺项提示。
- 6 问未完成时，复制 Markdown / 下载 Markdown 按钮禁用。
- 第 6 问 AI 使用说明为空时，进入结果页被阻断。
- 第 6 问为空时，页面显示：
  - “请先补充‘AI 使用说明’。”
  - “这是反包装检查的必要项。”
  - “未说明 AI 如何辅助和如何人工筛选时，不能导出完整 Markdown。”
- 缺项提示说明会影响对应追溯链和结果模块。
- 页面未暗示小 C 参与 OpenDocuments 官方贡献。
- 页面未把 OpenDocuments 原项目能力写成小 C 个人开发成果。

## 6. Markdown 九项完整性验收结果

结论：通过。

完整 6 问后，复制 Markdown 内容长度约 4939 字符，包含以下九项：

| 项目 | 结果 |
|---|---|
| 候选人背景 | 通过 |
| 路径结论 | 通过 |
| 样例 JD 说明 | 通过 |
| OpenDocuments 来源与 License | 通过 |
| OpenDocuments 原项目能力 | 通过 |
| 小 C 试航贡献 | 通过 |
| 不可声称内容 | 通过 |
| 固定 6 问作答 | 通过 |
| 免责声明 | 通过 |

同时确认：

- Markdown 包含 OpenDocuments GitHub 来源。
- Markdown 包含 MIT License。
- Markdown 包含固定 6 问及小 C 作答。
- Markdown 中原项目能力和小 C 试航贡献分节呈现。

禁用表达检查结果：

- `npm run test:safety` 已通过。
- 页面文案、Mock 数据和 Markdown 均通过 `assertSafePathfinderCopy`。
- 人工检查中，“能力认证”“录用概率”“小 C 参与 OpenDocuments 官方贡献”等词只出现在否定语境、不可声称内容或免责声明中，不构成正向能力认证、概率预测或官方贡献暗示。
- 如果后续要求改为“禁用词零出现”而非“禁止正向暗示”，需要同步调整 `p0-polish-copy-final.md` 与安全扫描规则；当前实现与 P0 polish 最终文案一致。

浏览器工具限制：

- Codex in-app Browser 不支持监听 download event。
- 下载功能以 Playwright E2E 验证为准，已确认下载文件名为 `pathfinder-xiaoc-opendocuments.md`。

## 7. 3 分钟演示验收结果

结论：通过。

按 12 步演示动作走查：

1. 打开 `/pathfinder`：通过。
2. 指向边界提示：通过。
3. 进入小 C Demo：通过。
4. 背景页加载 Demo：通过。
5. 展示小 C 优势 / 短板 / 目标：通过。
6. 进入推荐页：通过。
7. 展示三条路径状态：通过。
8. 进入试航页：通过。
9. 展示左右分区：通过。
10. 填入演示用小 C 作答：通过。
11. 清空第 6 问并展示阻断：通过。
12. 恢复第 6 问，进入结果页，展示追溯链和 Markdown 导出：通过。

演示判断：

- 主路径清楚，3 分钟内可讲清为什么小 C 优先试航“行业 AI 应用产品助理”。
- 反包装阻断可在第 6 问处稳定展示。
- 结果页首屏追溯链适合参赛讲解。
- 建议正式演示前预先确认 `127.0.0.1:3000` dev server 已稳定响应 200。

## 8. 移动端 / 响应式抽查结果

结论：基本通过，有一个非阻断问题。

390px 已抽查：

- `/pathfinder`
- `/pathfinder/background`
- `/pathfinder/recommendation`
- `/pathfinder/trial`
- `/pathfinder/result`

已确认：

- 页面主体基本单列可读。
- 入口页、背景页、推荐页无页面级横向溢出。
- 结果页追溯链可见。
- 结果页 Markdown 区域存在，复制 / 下载按钮可点击。
- 结果页在 390px 下 `documentElement.scrollWidth` 未超过视口。
- 未发现框架错误浮层。
- 未发现明显文字重叠或按钮不可点击。

注意：

- 顶部步骤导航在移动端以横向滚动方式呈现，不阻断使用。
- 试航页在 390px 下出现轻微页面级横向溢出：`documentElement.scrollWidth = 416`，视口宽度为 `390`。
- 溢出主要来自 OpenDocuments 原项目能力 / 小 C 试航贡献区块宽度约 400px。
- 该问题不阻断桌面参赛演示，但建议进入下一轮 polish 或 P1 UI 时处理。

## 9. 发现的问题

| 编号 | 严重级别 | 问题 | 复现 / 证据 | 建议 |
|---|---|---|---|---|
| P0-PQA-01 | 低 | 验收开始时 `127.0.0.1:3000/pathfinder` 曾短暂返回 500 且浏览器空白，后续复测恢复 200 | 初始 `Invoke-WebRequest` 返回 500；后续复测入口页正常，浏览器日志为空 | 演示前固定重启或确认 dev server，避免现场首屏空白 |
| P0-PQA-02 | 中低 | 390px 下试航页有轻微页面级横向溢出 | `documentElement.scrollWidth = 416`，视口宽度 `390`；主要区块宽度约 400px | 前端后续把试航页容器改为 `w-full min-w-0` 或降低移动端卡片固定宽度；不建议为此扩大 P0 功能范围 |
| P0-PQA-03 | 低 | Markdown 字面禁词检查会命中否定语境词 | “能力认证”“录用概率”“小 C 参与 OpenDocuments 官方贡献”只出现在不可声称内容 / 免责声明中；`test:safety` 通过 | 当前按语义安全判定通过；若后续要求禁词零出现，需要同步改最终文案和安全规则 |

## 10. 总体验收结论

P0 polish 前端实现通过 QA 回归验收，可以用于参赛演示。

通过依据：

- `test:safety`、`lint`、`test:e2e`、`build` 全部通过。
- P0 Scope Guard 未越界。
- 页面文案与 `p0-polish-copy-final.md` 基本一致。
- OpenDocuments 原项目能力与小 C 本次试航贡献分区清楚。
- 第 6 问 AI 使用说明为空时可稳定阻断完整 Markdown 导出。
- 完整 6 问后 Markdown 九项齐全。
- 3 分钟演示链路可稳定完成。

非阻断风险：

- 正式演示前需确认 3000 端口服务稳定。
- 移动端试航页轻微横向溢出建议后续修复。
- 禁用词策略需继续保持“禁止正向暗示”与“允许否定说明”的一致口径。
