# Development Log

## 2026-05-02 - Codex Takeover Baseline

- Base branch: `feat/fastapi-nextjs-upgrade`
- Base HEAD: `31128d5 feat: 流式聊天（SSE token-by-token + 工具调用指示器）`
- Intended branch: `codex/stabilize-dev-foundation`
- Git branch/tag creation status: blocked by local `.git` write permission errors.
- Existing dirty files before Codex edits:
  - Modified: `data/ai_job_copilot.db`
  - Untracked: `test_correct.json`
  - Untracked: `test_meituan.json`
  - Untracked: `test_meituan_utf8.json`

### Scope

Stabilize the development foundation before feature work:

- Restore a reproducible backend startup workflow.
- Remove localhost hardcoding from frontend upload.
- Keep all changes small and reviewable until Git branch/tag creation is available.

### Verification Notes

- Previous backend syntax check passed via bundled Python: `python -m compileall backend/app`.
- Previous frontend type check passed: `tsc --noEmit`.
- Previous `next build` was blocked by sandbox `spawn EPERM`; this should be re-run in a normal local terminal.
## 2026-05-02 - Stabilization Pass 1

### Changes

- Replaced the broken `backend/venv` startup assumption with a reproducible `.venv` startup path in `start-backend.bat`.
- Changed file upload from hardcoded `http://localhost:8000` to the app-relative `/api/files/upload` route.
- Added auth token helpers in the frontend API client and attached `Authorization` headers to JSON, streaming, export, and file-upload requests.
- Added a minimal `/auth` page for login/register and navbar login/logout controls.
- Required authenticated users for JD analysis, resume matching, file upload, chat, chat history, and export.
- Bound `AnalysisRecord` and `ChatConversation` writes to `user_id`; export and chat history now filter by `user_id`.
- Reused the first model response in streaming chat to avoid duplicate LLM calls.
- Made embedding index startup skip vector mode when `GLM_API_KEY` is missing, allowing keyword search fallback.

### Verification

- Passed: `python -m compileall backend/app` using bundled Codex Python.
- Passed: `tsc --noEmit` using the frontend TypeScript install.

### Notes

- Git branch/tag creation is still blocked by `.git` write permission errors in this session.
- Pre-existing dirty files remain untouched: `data/ai_job_copilot.db`, `test_correct.json`, `test_meituan.json`, `test_meituan_utf8.json`.
## 2026-05-03 - Smoke Test Framework

### Changes

- Added `scripts/smoke_api.py`, a standard-library-only smoke test runner for the running FastAPI backend.
- Added `docs/SMOKE_TESTS.md` with startup and execution instructions.
- Smoke coverage avoids LLM quota usage and checks health, positions, anonymous protection, auth flow, scoped export/chat history, and authenticated file upload routing.

### Verification

- Passed: `python -m py_compile scripts/smoke_api.py` using bundled Codex Python.
- Passed: `python -m compileall backend/app` using bundled Codex Python.
- Passed: `tsc --noEmit` using the frontend TypeScript install.

### Notes

- The live smoke script was not executed in this turn because the backend server is not running in this session.
- Run it after starting the backend: `python scripts/smoke_api.py --base-url http://localhost:8000`.
## 2026-05-03 - Live Smoke Run

### Changes

- Replaced the auth password hashing path with direct `bcrypt` usage because `passlib` is incompatible with the installed `bcrypt 5.x` runtime in this environment.
- Added an explicit `bcrypt>=4.0.0,<6.0.0` dependency because the application now imports `bcrypt` directly.

### Verification

- Live smoke passed on `http://127.0.0.1:8123`:
  - health
  - categories
  - positions
  - position search
  - anonymous JD/export rejection
  - register/login/me
  - scoped chat history
  - scoped export
  - authenticated file upload path
- Cleaned the generated `smoke+...@example.com` user after the smoke run.
- Removed temporary `.codex-backend-*.log` files.

### Notes

- Port `8000` appears to be occupied by a stale or external process in this session, so live smoke used `8123` to validate the current code.
- The global `python`/`py` commands are not available in this shell; the live run used Codex's bundled Python plus the existing backend venv `site-packages`.
## 2026-05-03 - Environment Retest

### Changes

- Hardened `start-backend.bat` so it detects a broken `backend\.venv`, recreates it, and gives a clear error if neither `py` nor `python` is available on PATH.
- Added `docs/LOCAL_ENVIRONMENT.md` with local Python, backend venv, smoke test, and Git write checks.

### Verification

- Passed: `python -m compileall backend/app` using bundled Codex Python plus backend venv site-packages.
- Passed: `python -m py_compile scripts/smoke_api.py` using bundled Codex Python.
- Passed: `tsc --noEmit` using the frontend TypeScript install.

### Notes

- Current branch is `codex/stabilize-dev-foundation`, and `baseline-before-codex-takeover` exists.
- Codex still cannot create new branch/tag refs in this session: `.git/refs/...lock Permission denied`.
- Global `python` and `py` are still not visible in this Codex shell.
- Both `backend\.venv` and `backend\venv` still point to the removed Python path and are unusable from this shell.
