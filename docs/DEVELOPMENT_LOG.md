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

## 2026-05-03 - Alembic Schema Baseline

### Changes

- Added Alembic configuration, async migration environment, and an initial schema migration for the current SQLAlchemy models.
- Added `scripts/migrate_db.py` to apply migrations and stamp existing local SQLite databases that already match the baseline.
- Changed `start-backend.bat` to run migrations before launching FastAPI.
- Updated `data/seed_positions.py` so seed data no longer creates schema implicitly.
- Documented the migration workflow in `docs/DATABASE_MIGRATIONS.md`.

### Verification

- Passed: `backend\.venv\Scripts\python.exe -m py_compile scripts\migrate_db.py data\seed_positions.py`.
- Passed: `backend\.venv\Scripts\python.exe -m compileall backend\app`.
- Passed: Alembic upgrade against `.codex-temp\migration_test.db`.
- Passed: position seed against `.codex-temp\migration_test.db` with 7 categories and 44 positions.
- Passed: existing SQLite baseline stamp against `.codex-temp\existing_copy.db`.
- Passed: `backend\.venv\Scripts\alembic.exe -c alembic.ini check` against the migrated temp database.

## 2026-05-03 - Production Config Guardrails

### Changes

- Removed the public JWT default secret from backend settings.
- Added `APP_ENV` and production validation for `DEBUG=false` plus a strong `JWT_SECRET`.
- Generates a temporary runtime JWT secret for local development when no secret is provided.
- Refreshed `.env.example` with backend, JWT, GLM, and frontend configuration.

### Verification

- Passed: `backend\.venv\Scripts\python.exe -m compileall backend\app`.
- Passed: `backend\.venv\Scripts\python.exe -m py_compile scripts\migrate_db.py data\seed_positions.py`.
- Passed: direct `Settings` validation checks for development fallback, production weak secret rejection, production `DEBUG=true` rejection, and production strong secret acceptance.
- Passed: live smoke run on `http://127.0.0.1:8124` against `.codex-temp\config_smoke.db`.

## 2026-05-03 - Backend Automated Tests

### Changes

- Added pytest, pytest-asyncio, and httpx as explicit backend test dependencies.
- Added pytest configuration and async FastAPI client fixtures.
- Test database is created from Alembic migrations under `.pytest-temp`.
- Added regression tests for auth flow, protected routes, export scoping, chat scoping, keyword search fallback, and production config guardrails.
- Documented the test workflow in `docs/TESTING.md`.

### Verification

- Passed: `backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt`.
- Passed: `cd backend; .\.venv\Scripts\python.exe -m pytest` with 11 tests.
- Passed: `backend\.venv\Scripts\python.exe -m compileall backend\app`.
- Passed: `backend\.venv\Scripts\python.exe -m py_compile scripts\migrate_db.py data\seed_positions.py`.

## 2026-05-03 - Frontend Auth Polish

### Changes

- Fixed mojibake text on the auth page and navbar.
- Added a small frontend auth session helper for token/email localStorage access.
- Improved login/register form copy, loading state, password length validation, and error messages.
- Normalized API/network error messages in the frontend client.

### Verification

- Passed: `cd frontend; npx tsc --noEmit`.
- Passed: `cd backend; .\.venv\Scripts\python.exe -m pytest` with 11 tests.
- Passed: `cd frontend; npm run lint` with pre-existing warnings in `explore` and `match` pages only.

## 2026-05-03 - Explore Loading State Fix

### Changes

- Fixed the explore page loading flow so category loading waits for the first position list before showing an empty state.
- Added a visible error message when category, position, or search requests fail.
- Replaced remaining mojibake copy on the explore page with readable Chinese.
- Removed the explore page lint warning by stabilizing load callbacks.

### Verification

- Passed: `cd frontend; npx tsc --noEmit`.
- Passed: `cd frontend; npm run lint` with pre-existing warnings in `match` only.
- Verified through the running Next proxy: 7 categories and 12 `algorithm` positions returned.

## 2026-05-03 - Frontend Core Copy Cleanup

### Changes

- Replaced mojibake copy across the home, JD analysis, resume match, file uploader, and score ring UI.
- Stabilized the match page position loader and removed its lint warnings.
- Kept the existing functional layout while making form labels, placeholders, empty states, and buttons readable.

### Verification

- Passed: `cd frontend; npx tsc --noEmit`.
- Passed: `cd frontend; npm run lint` with no warnings.
- Passed: `cd backend; .\.venv\Scripts\python.exe -m pytest` with 11 tests.
- Verified running frontend pages return 200 for `/`, `/jd`, and `/match`.

## 2026-05-03 - Auth Required Flow

### Changes

- Added frontend auth helpers for auth-change events, safe login return paths, and protected-operation checks.
- API client now turns HTTP 401 responses into a dedicated auth-required error and clears stale local sessions.
- Login/register supports `?next=/path` and returns users to their original page after authentication.
- Navbar listens for auth session changes so login/logout state updates immediately.
- JD analysis, resume matching, report export, file upload, and AI follow-up now require login before starting protected work.

### Verification

- Passed: `cd frontend; npm run build`.
- Passed: `cd frontend; npx tsc --noEmit`.
- Passed: `cd frontend; npm run lint`.
- Passed: `cd backend; .\.venv\Scripts\python.exe -m pytest` with 11 tests.
- Verified running frontend pages return 200 for `/auth?next=%2Fjd`, `/jd`, and `/match`, and the Next proxy health check returns 200.

## 2026-05-03 - Frontend E2E Baseline

### Changes

- Added Playwright as the frontend E2E test runner.
- Added Playwright config targeting already running local services at `http://localhost:3000` by default with the locally installed Edge browser.
- Added E2E tests for public pages, seeded explore data, login return paths, registration flow, logout, and protected-action redirects.
- Added `127.0.0.1` development CORS origins and associated auth form labels so browser tests can exercise local flows reliably.
- Documented the frontend E2E workflow in `docs/TESTING.md`.

### Verification

- Passed: `cd frontend; npm run test:e2e` with 7 tests against `http://localhost:3001`.

## 2026-05-03 - Project Check Script

### Changes

- Added `scripts/check_all.ps1` as the standard project verification entrypoint.
- The script runs backend pytest, frontend typecheck, frontend lint, and optional frontend E2E with `-E2E`.
- Documented the check workflow and configurable `E2EBaseUrl` in `docs/TESTING.md`.

### Verification

- Passed: `.\scripts\check_all.ps1`.

## 2026-05-03 - Frontend Session And History E2E

### Changes

- Added E2E helpers for unique test users and local chat-history fixtures.
- Added browser tests for login session persistence across reloads and page navigation.
- Added a logout test that asserts local auth storage is cleared before protected actions redirect to login.
- Added a chat-history E2E test that verifies seeded conversation messages are readable by the owner but not by another user or anonymous requests.
- Documented the history fixture environment variables in `docs/TESTING.md`.

### Verification

- Passed: `cd frontend; npm run test:e2e` with 10 tests against `http://localhost:3001`.
- Passed: `.\scripts\check_all.ps1 -E2E -E2EBaseUrl http://localhost:3001`.

## 2026-05-04 - History Records Page

### Changes

- Added `backend/app/schemas/records.py` with RecordListItem, RecordListResponse, RecordDetailResponse, DeleteResponse Pydantic schemas.
- Added `backend/app/api/records.py` with three endpoints: `GET /api/records` (paginated list, optional `type` filter), `GET /api/records/{id}` (detail), `DELETE /api/records/{id}` (delete). All scoped by `user_id`.
- Added `backend/tests/test_records.py` with 7 tests: anonymous rejection, list/detail/delete owner scoping, pagination, type filter, summary extraction.
- Registered records router in `backend/app/main.py`.
- Added `records` API methods to `frontend/src/lib/api.ts`.
- Created `frontend/src/app/history/page.tsx` — full history page with type filter tabs, card list, inline detail expansion, export, delete, pagination.
- Added History nav link to `frontend/src/components/Navbar.tsx`.
- Added `_extract_summary()` helper in records API: JD → inferred_role, match → "匹配得分：{score}/100".

### Verification

- Passed: `.\scripts\check_all.ps1` — 18 backend tests, frontend typecheck, lint clean.

## 2026-05-04 - JD Analysis Bug Fix

### Changes

- Fixed prompt type mismatch in `backend/app/services/jd_service.py`: `experience` and `education` changed from string to array format to match frontend `TagList` component.
- Made `frontend/src/app/jd/page.tsx` `TagList` component accept both `string | string[]`, normalizing strings to single-item arrays for backward compatibility with old records.
- Added rendering for 5 previously hidden fields:
  - `surface_requirements.education`
  - `hidden_needs.culture_signals` / `why_this_role`
  - `interview_focus.red_flags` / `standout_angles`
  - `interview_focus.likely_topics[].preparation`

### Verification

- Passed: `.\scripts\check_all.ps1` — 18 backend tests, frontend typecheck, lint clean.

## 2026-05-04 - History Detail Structured View

### Changes

- Replaced raw JSON dump in history detail with `ResultView` component in `frontend/src/app/history/page.tsx`.
- JD type: structured display of position overview, skills tags, hidden needs, interview focus, red flags, standout angles.
- Match type: score, sub-score breakdown, core advantages, capability gaps, improvement plan columns.
- Added helper components: `TagRow` (labeled tags), `TextLine` (label + text), `arr()` (string/array normalizer), `labelSB()` / `labelIMP()` (field label mappers).

### Verification

- Passed: frontend typecheck, lint clean.

## 2026-05-04 - Compliance Gaps Assessment

### Changes

- Added `docs/COMPLIANCE_GAPS.md` documenting PIPL compliance gaps across 5 areas: user rights (account deletion, data portability, chat deletion, password reset), informed consent (privacy policy, terms, third-party AI disclosure, cookie consent), data security (plaintext PII, no encryption, localStorage JWT, no login rate limit, no audit log), minor protection (no age verification), data lifecycle (no retention policy, no minimization).
- Each gap annotated with relevant legal article and priority P0-P3.
