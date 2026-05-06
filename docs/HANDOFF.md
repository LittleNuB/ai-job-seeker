# Handoff Notes

This document is for the next coding agent taking over `ai-job-seeker`.

## Current State

- Workspace: `C:\Users\LittleNub\ai-job-seeker`
- Active branch: `deepseek/function-dev`
- Latest known commit: `4184df7 feat: add auth throttling and upload guards`
- Date of handoff update: 2026-05-06

Related branches:

- `deepseek/function-dev`: active product/function development branch.
- `codex/model-eval-comparison`: parked branch — two-stage rubric scoring (evidence extraction → dimension scoring), for future multi-model evaluation.
- `deepseek/eval-framework`: parked branch — four-dimension eval framework (A+C+E+F), human annotation, eval report.
- `codex/stabilize-dev-foundation`: earlier stabilization baseline (archived).

The project is now in a much more stable development state:

- FastAPI backend has authenticated user scoping on core protected workflows.
- JWT production guardrails are in place.
- Alembic baseline migrations are in place.
- Account center, profile, data export, and account deletion are implemented.
- Privacy policy, user agreement, and AI disclaimer pages are linked in the app.
- Login rate limiting and file upload size/type guards are in place.
- Backend pytest regression tests are in place.
- Frontend Playwright E2E tests cover public pages, auth, session, history, account, and match UX.
- Resume-match UX includes waiting stages, elapsed time, cancel, timeout/failure, and retry.
- `scripts/check_all.ps1` is the standard verification entrypoint (supports -E2E -StartServices).

## Do Not Accidentally Commit

At the time of handoff, these files are intentionally dirty or local-only:

- Modified local SQLite DB: `data/ai_job_copilot.db`
- Untracked local JSON files:
  - `test_correct.json`
  - `test_meituan.json`
  - `test_meituan_utf8.json`

Treat them as local data. Do not stage or commit them unless the user explicitly asks.

These paths are now covered by `.gitignore`, but still check status before staging.

Always start with:

```powershell
git status --short
```

## Startup

Backend:

```powershell
.\start-backend.bat
```

Expected backend URL:

```text
http://localhost:8000
```

Frontend:

```powershell
cd frontend
npm run dev
```

Expected frontend URL:

```text
http://localhost:3000
```

If port `3000` is occupied, run the frontend on another port:

```powershell
cd frontend
npm run dev -- -H 0.0.0.0 -p 3001
```

## Verification

Use the standard quick check before commits:

```powershell
.\scripts\check_all.ps1
```

This runs:

- Backend pytest
- Frontend TypeScript check
- Frontend lint

To include frontend E2E, start backend and frontend first, then run:

```powershell
.\scripts\check_all.ps1 -E2E
```

Preferred full local verification now starts missing services automatically:

```powershell
.\scripts\check_all.ps1 -E2E -StartServices
```

If frontend is already on a non-default port:

```powershell
.\scripts\check_all.ps1 -E2E -E2EBaseUrl http://localhost:3001
```

Tune E2E workers if needed:

```powershell
.\scripts\check_all.ps1 -E2E -StartServices -E2EWorkers 2
```

Latest full verification before this update:

```powershell
.\scripts\check_all.ps1 -E2E -StartServices
```

Result:

- Backend pytest: 18 passed
- Frontend typecheck: passed
- Frontend lint: passed
- Frontend E2E: 12 passed using 4 workers

## Important Docs

Read these before changing behavior:

- `docs/DEVELOPMENT_LOG.md`: chronological record of stabilization work.
- `docs/TESTING.md`: test commands and E2E fixture notes.
- `docs/DATABASE_MIGRATIONS.md`: Alembic workflow.
- `docs/LOCAL_ENVIRONMENT.md`: local Python, venv, and Git checks.
- `docs/SMOKE_TESTS.md`: API smoke test workflow.

## Architecture Snapshot

Backend:

- Framework: FastAPI
- DB: SQLite locally via SQLAlchemy async engine
- Migrations: Alembic
- Auth: JWT bearer token, `get_current_user`
- Tests: pytest, pytest-asyncio, httpx

Frontend:

- Framework: Next.js 14 App Router
- UI: React + Tailwind + lucide-react
- Auth storage: `localStorage` keys `auth_token` and `auth_email`
- API client: `frontend/src/lib/api.ts`
- Auth helpers: `frontend/src/lib/auth.ts`
- E2E: Playwright targeting locally installed Microsoft Edge

## Current Test Coverage

Backend pytest covers:

- Register, login, and `/api/auth/me`
- Protected JD, export, and chat history routes
- Export scoping by user
- Chat history scoping by user
- Keyword search fallback when `GLM_API_KEY` is missing
- Production config guardrails
- Account deletion, data export, auth throttling, upload guards

Frontend E2E covers:

- Home, auth, and explore render core content
- Explore loads seeded position data
- Login link preserves `next`
- Registration returns to requested page
- Login session persists across reload/navigation
- Logout clears local session storage
- Protected JD analysis, resume matching, and AI follow-up redirect anonymous users to login
- Chat history messages are readable by the owner only
- History records page lists only the current user's records
- Account profile page loads with stats
- Resume-match waiting panel, cancel flow, timeout failure panel, and retry success

Note: chat-history E2E seeds one local SQLite conversation to avoid spending LLM quota.

## Development Rules

- Keep each feature or fix in its own commit.
- Do not commit local DB files or ad hoc test JSON files.
- Before editing, inspect current status and relevant files.
- Prefer existing project patterns over new abstractions.
- Run `.\scripts\check_all.ps1` before normal commits.
- Run `.\scripts\check_all.ps1 -E2E -StartServices` for frontend/auth/history/match UX changes.
- Update `docs/DEVELOPMENT_LOG.md` for meaningful changes.

## Known Constraints

- Some older source strings still display as mojibake in shell output depending on PowerShell encoding. Use Node `fs.readFileSync(..., "utf8")`, browser rendering, or Playwright snapshots before assuming the file is corrupted.
- Playwright uses local Microsoft Edge to avoid requiring a Chromium download.
- E2E tests can be run against existing services or via `.\scripts\check_all.ps1 -E2E -StartServices`.
- The local DB may be modified by live smoke/E2E runs. This is expected; do not commit it.

## Suggested Next Work

Recommended next product work:

1. Deployment packaging and environment docs (MVP Week 2).
2. Model config sanity pass, timeout/fallback settings (MVP Week 2).
3. Trial acceptance testing with realistic resumes/JDs (MVP Week 2).
4. Multi-model evaluation using rubric scoring from `codex/model-eval-comparison` branch
   (see `docs/SECURE_PUBLIC_RELEASE_PLAN.md` Phase 4 for 7-model comparison plan).
5. Frontend E2E for JD result rendering, match result rendering, and report download.

Items completed on the active branch:
- Account center/profile, user data export, account deletion.
- Chat history management (delete conversations).
- Privacy policy, user agreement, AI disclaimer pages.
- Login rate limiting, file upload size/type guards, log redaction guardrails.
- Resume-match waiting, cancel, timeout, retry UX.
- Two release plans: `docs/MVP_RELEASE_PLAN.md` and `docs/SECURE_PUBLIC_RELEASE_PLAN.md`.

Recommended first step for a new agent:

```powershell
git status --short
.\scripts\check_all.ps1
```

Then read `docs/DEVELOPMENT_LOG.md` from the most recent entries backward.
