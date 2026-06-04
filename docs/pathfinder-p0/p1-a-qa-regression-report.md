# 寻径星图 P1-A QA 回归报告

日期：2026-06-04

## 1. QA 范围

本次 QA 覆盖寻径星图 P1-A 前端、本地 API 联调和后端契约回归，目标是判断当前版本是否可以进入 P0 参赛彩排和 P1-A 阶段验收。

验证范围：

- P0 / P1-A Scope Guard：小 C、三条路径、OpenDocuments、工程企业知识库 AI 助手试航、Markdown 导出。
- 固定 Demo 主链路：`/pathfinder -> /pathfinder/background -> /pathfinder/recommendation -> /pathfinder/trial -> /pathfinder/result`。
- P1-A `TrailRecord` 保存、读取、恢复、MarkdownSnapshot 保存。
- `sessionStorage` fallback 和后端不可用提示。
- 反包装检查、6 问缺项阻断、第 6 问 AI 使用说明阻断。
- P0 legacy 兼容。
- 390px 移动端主链路抽查。

不在本次 QA 范围内：

- 不新增 TrialPackage 发布流。
- 不新增 P1-B 专用表或 Alembic migration。
- 不新增真实 RAG 检索、评分、概率、企业推荐、简历建议或平台化能力。

## 2. 验证环境

- 前端：Next.js 14.2.35，本地地址 `http://127.0.0.1:3000/pathfinder`
- 后端：FastAPI / uvicorn，本地地址 `http://127.0.0.1:8000`
- 数据库：SQLite，继续复用 `analysis_records`
- 临时用户标识：`X-User-Id`
- 浏览器验证：Codex in-app Browser
- 移动端抽查视口：390px / 375px 宽度

## 3. 自动化测试结果

前端验证：

| 命令 | 结果 |
|---|---|
| `npm run test:safety` | 通过 |
| `npm run lint` | 通过 |
| `npm run test:e2e` | 通过，11/11 |
| `npm run build` | 通过 |

后端验证：

| 命令 | 结果 |
|---|---|
| `python -m pytest` | 通过，12/12 |
| `python ../scripts/migrate_db.py` | 通过 |
| `git diff --check` | 通过 |

补充检查：

- Alembic `versions` 目录仅存在初始 schema，未新增 migration。
- 后端代码仍使用 `AnalysisRecord` / `analysis_records` 承载 Pathfinder P1-A 记录。
- 未发现 P1-B 专用表落地。

## 4. 真实联调结果

真实前后端联调通过。

验证路径：

1. 打开 `http://127.0.0.1:3000/pathfinder`
2. 进入小 C Demo
3. 查看背景页小 C 优势 / 短板 / 目标
4. 查看推荐页三条路径
5. 进入 OpenDocuments 试航页
6. 填入演示用小 C 作答
7. 进入结果页
8. 复制 Markdown
9. 使用后端 GET API 读取最新记录

验证结果：

- 页面显示后端同步状态为“已保存”。
- 最新 Pathfinder 记录为 `p1-a.v1 / exported / markdownSnapshot full + frontend`。
- 后端返回 `trialAnswers` 数量为 6。
- `MarkdownSnapshot.templateSource = "frontend"`。
- `MarkdownSnapshot.exportScope = "full"`。
- Markdown 内容包含九项必需章节。

## 5. fallback 结果

fallback 通过。

已验证场景：

- 后端 API 创建失败时，前端显示“保存失败，可继续本地试航”。
- 后端不可用不阻断本地填写 6 问。
- 后端不可用不阻断进入结果页。
- 前端仍可基于本地 `sessionStorage` 生成和导出 Markdown。

结论：P1-A fallback 满足“后端不可用时仍可完成本地试航”的要求。

## 6. 反包装结果

反包装机制通过。

已验证：

- 页面、mock data、Markdown 静态安全测试通过。
- 正向越界表达会命中阻断，例如把 OpenDocuments 写成小 C 开发成果。
- 阻断后不允许完整 Markdown 导出。
- 阻断场景允许生成 draft snapshot。
- 否定语境和不可声称清单不会误判为阻断。
- 结果页显示 P1-A 反包装检查摘要、命中统计和模板源。

禁止能力检查覆盖：

- 能力认证
- offer 概率 / 录用概率 / 上岸概率
- 企业筛选 / 企业推荐 / 精准内推
- 简历包装 / 简历自动优化
- 多开源项目智能推荐
- 真实 RAG 检索
- 复杂评分系统
- 算法工程速成 / 大模型研发训练路径
- 暗示小 C 参与 OpenDocuments 官方贡献
- 暗示完成试航等于岗位胜任或录用优势

## 7. 缺项阻断结果

缺项阻断通过。

已验证：

- 6 问未完成时，结果页不生成完整 Markdown。
- 第 6 问“AI 使用说明”为空时，试航页显示“6 问缺项”和“未完成：AI 使用说明”。
- 第 6 问为空时，“进入结果页”变为禁用按钮。
- 第 6 问为空时，页面明确提示“结果页也会保持完整 Markdown 导出阻断”。
- 恢复第 6 问后，状态恢复为完整可导出。

## 8. 移动端结果

移动端抽查通过。

验证结果：

- 结果页在 375px / 390px 宽度下 `scrollWidth == clientWidth`。
- 试航页在 390px 宽度下 `scrollWidth == clientWidth`。
- 结果页仍能看到追溯链、反包装摘要和 Markdown 导出区域。
- 试航页仍能看到 OpenDocuments 原项目能力、小 C 试航贡献、6 个 textarea 和主要按钮。
- 主体内容没有明显遮挡、重叠或不可读。

非阻断观察：

- 移动端顶部流程导航为横向可滚动控件，主体无横向溢出，不阻断参赛彩排。

## 9. Scope Guard 人工检查

Scope Guard 通过。

人工检查确认：

- 仍只有小 C 一个 Demo 用户。
- 仍只有三条路径：
  - 行业 AI 应用产品助理：优先试航
  - 行业 AI 解决方案助理：适合探索
  - 算法工程 / 大模型研发：短期不建议
- 仍只有 OpenDocuments 一个公开参考项目。
- 仍只有“工程企业知识库 AI 助手试航”一个任务。
- 仍只有 Markdown 导出。
- 未出现 P1-B 专用表、TrialPackage 发布流或 P2 平台化入口。
- 未出现评分、概率、企业推荐、真实 RAG、简历包装或能力认证入口。

## 10. 发现的问题

本轮发现 1 个问题，已修复。

### 问题 1：后端 GET 恢复后误触发自动保存

现象：

- 当 `sessionStorage` 中已有 `recordId` 时，前端会通过 `GET /api/pathfinder/records/{record_id}` 恢复后端 `TrailRecord`。
- 恢复完成后，即使用户没有编辑，也会误触发一次自动保存。
- 页面同步状态可能停在“正在保存”，影响 P1-A 后端恢复场景和参赛彩排稳定性。

影响：

- 不影响记录内容恢复。
- 不影响 Markdown 内容生成。
- 会影响同步状态可信度，因此判定为 QA 回归阻断项，需修复后才能验收。

修复：

- 在 `frontend/src/features/pathfinder/state.tsx` 中新增远端恢复后的自动同步跳过标记。
- 后端 GET 恢复出的记录先视为已同步。
- 用户后续执行加载 Demo、修改答案、填入演示答案、保存 Markdown 快照或重置时，再恢复正常同步。

验证：

- 修复后 `npm run test:e2e` 通过，后端恢复用例通过。
- 浏览器联调中结果页同步状态恢复为“已保存”。

## 11. 阻断 / 非阻断分类

阻断问题：

- 无。后端 GET 恢复后误触发自动保存问题已修复并回归通过。

非阻断问题：

- 移动端顶部流程导航横向滚动体验可在后续优化。
- 本地 dev server 输出 Node `DEP0060` warning，不影响应用运行和测试结果。
- 正式 auth 替换 `X-User-Id` 仍需后续处理。

## 12. 已修复问题

已修复：后端 GET 恢复后误触发自动保存，导致同步状态停在“正在保存”。

修复结论：

- P1-A 恢复场景已稳定。
- 后端 GET 恢复不会无用户变更地覆盖回后端。
- 用户后续编辑和 Markdown 快照保存仍会正常同步。

## 13. 是否建议进入参赛彩排

建议进入。

结论：

- P1-A QA 回归通过。
- 当前版本可以进入 P0 参赛彩排。
- 无阻断问题。
- 剩余问题均为非阻断。

## 14. 是否建议进入 P1-A 验收

建议进入。

结论：

- P1-A QA 回归通过。
- 当前版本可以进入 P1-A 阶段验收。
- P1-A 前端、本地 API 联调、后端契约、fallback、反包装、缺项阻断、Markdown full / draft 快照和 legacy 兼容均已通过回归。
- 当前版本可作为 P1-A 阶段验收基线。

