# 寻径星图 P1-C.1 后端实现说明

日期：2026-06-11

任务：BE-003 / 航前 AI 访谈后端实现

## 1. 实现范围

P1-C.1 后端新增航前访谈 API，用于在路径推荐前通过 AI 追问真实经历，并把候选信号交给用户确认。LLM 只参与访谈追问和结构化信号抽取，不直接决定路径、项目或试航包。

新增 API：

- `POST /api/pathfinder/interview/sessions`
- `GET /api/pathfinder/interview/sessions/{session_id}`
- `POST /api/pathfinder/interview/sessions/{session_id}/turns`
- `POST /api/pathfinder/interview/sessions/{session_id}/signals`
- `PUT /api/pathfinder/interview/sessions/{session_id}/confirmed-signals`

现有 P1-B.1 API 保持兼容：

- `POST /api/pathfinder/recommendations`
- `GET /api/pathfinder/projects`
- `POST /api/pathfinder/trial-packages/generate`
- `/api/pathfinder/records` 系列 P1-A TrailRecord API

## 2. 存储策略

继续复用 `analysis_records`，不新增表，不新增 Alembic migration。

P1-C.1 interview session 存储约定：

- `analysis_records.type = "pathfinder"`
- `analysis_records.input_file_url = null`
- `analysis_records.match_score = null`
- `input_text.schemaVersion = "p1c.v1"`
- `input_text.recordKind = "interview_session"`
- `result.schemaVersion = "p1c.v1"`
- `result.recordKind = "interview_session"`
- `result.session` 保存 `InterviewSession`

读取、更新和确认信号继续按 `user_id + id + type = "pathfinder"` 隔离。

## 3. Schema

新增核心对象：

- `InterviewSession`
- `InterviewMessage`
- `InterviewSessionCreateRequest`
- `InterviewTurnRequest`
- `InterviewTurnResponse`
- `ExtractedProfileSignal`
- `SignalExtractionResult`
- `SignalConfirmation`
- `ConfirmedSignalsRequest`

`ExtractedProfileSignal` 是模型抽取的候选信号，默认 `status = "candidate"`。`SignalConfirmation` 是用户确认、编辑或拒绝后的信号。后续路径推荐只能使用用户确认信号。

## 4. DeepSeek Client

新增 `backend/app/services/pathfinder_interview_client.py`。

实现要点：

- 默认 provider：DeepSeek。
- 默认 OpenAI-compatible base URL：`https://api.deepseek.com`。
- 默认模型：`deepseek-v4-flash`。
- 可通过 `DEEPSEEK_CHAT_MODEL` 切到 `deepseek-v4-pro`。
- 代码优先读取 `DEEPSEEK_API_KEY`，兼容读取 `LLM_API_KEY`。
- 代码不读取、不打印、不写入本地 key 文件。
- 本地运行时如需使用 `C:\Users\LittleNub\Desktop\Key.txt`，应由开发者在 shell 中把内容注入 `DEEPSEEK_API_KEY` 环境变量，不能提交 key。
- 设置 request timeout 和 retry。
- 无 key、超时、连接错误或 API 错误时返回显式 fallback 状态，不让异常泄露 key 或供应商细节。

DeepSeek 官方文档核验：

- Models & Pricing：OpenAI-format base URL 为 `https://api.deepseek.com`，模型包含 `deepseek-v4-flash` 和 `deepseek-v4-pro`。
- Create Chat Completion：`/chat/completions` 支持 `response_format={"type":"json_object"}`。
- JSON Output：使用 JSON output 时仍必须在 system/user message 中明确要求模型输出 JSON。

参考：

- https://api-docs.deepseek.com/quick_start/pricing
- https://api-docs.deepseek.com/api/create-chat-completion
- https://api-docs.deepseek.com/guides/json_mode

## 5. Scope Guard

P1-C.1 继续拒绝或过滤以下越界字段：

- score / scores / percent / percentage
- matchScore / recommendationScore / competencyScore / abilityScore
- offerProbability / hireProbability
- certification
- companyRecommendation / employerShortlist
- resumeOptimization / resumePackaging
- projectOwnership / openDocumentsOwnership

服务端不信任模型原文。模型输出必须先通过 JSON 解析、Pydantic schema 校验和 forbidden-key 扫描，校验通过后才会写入 `analysis_records`。

## 6. 失败降级

- 无 `DEEPSEEK_API_KEY`：创建 session 和 turn 返回 fallback assistant message，`llmStatus = "no_key"`。
- 模型追问返回非法 JSON：保存 fallback assistant message，`modelStatus = "invalid_json"`。
- 信号抽取返回非法 JSON：返回 `SignalExtractionResult.modelStatus = "invalid_json"`，不接受任何信号。
- 模型输出禁用字段：返回 422，不保存该次候选信号。

## 7. 测试覆盖

`backend/tests/test_pathfinder.py` 新增 mock LLM 测试，不发真实网络请求：

- 无 key fallback session 创建。
- session 保存 / 读取 / 跨用户隔离。
- turn 保存和 assistant message 回写。
- LLM JSON 无效时不接受信号。
- 禁用字段被拒绝。
- 信号抽取和用户确认信号 round trip。
- `analysis_records` 复用约束。
