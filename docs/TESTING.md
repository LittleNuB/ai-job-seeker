# Automated Tests

Backend regression tests use `pytest` with a temporary SQLite database. The test database is created by Alembic, so tests do not touch `data\ai_job_copilot.db`.

## Install Test Dependencies

```powershell
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

## Run Backend Tests

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

## Run The Standard Check Suite

Use the project-level check script before commits:

```powershell
.\scripts\check_all.ps1
```

By default it runs backend pytest, frontend typecheck, and frontend lint.

Run E2E as well after starting backend and frontend services:

```powershell
.\scripts\check_all.ps1 -E2E
```

If the frontend is not on `http://localhost:3000`, pass the target URL:

```powershell
.\scripts\check_all.ps1 -E2E -E2EBaseUrl http://localhost:3001
```

The chat-history E2E spec seeds one local SQLite conversation so it can verify history access without spending LLM quota. By default it uses:

- Python: `backend\.venv\Scripts\python.exe`
- Database: `data\ai_job_copilot.db`

Override these when needed:

```powershell
$env:E2E_PYTHON="C:\path\to\python.exe"
$env:E2E_SQLITE_DB="C:\path\to\ai_job_copilot.db"
```

The tests set their own environment:

- `APP_ENV=test`
- `DEBUG=false`
- `GLM_API_KEY=`
- `DATABASE_URL=sqlite+aiosqlite:///.../.pytest-temp/test.db`
- `JWT_SECRET=test-secret-for-pytest-only-please-rotate`

## What Is Covered

- Register, login, and `/api/auth/me`.
- Anonymous users cannot access protected JD, export, or chat history routes.
- Export records are scoped to the current user.
- Chat history is scoped to the current user.
- Position search falls back to keyword search when `GLM_API_KEY` is missing.
- Production config rejects weak JWT secrets and `DEBUG=true`.

## Frontend E2E Tests

The first E2E layer uses Playwright against already running local services.
The Playwright project targets the locally installed Microsoft Edge browser, so it does not require downloading Chromium during normal Windows development.

Start the app:

```powershell
.\start-backend.bat
cd frontend
npm run dev -- -H 0.0.0.0 -p 3000
```

Then run:

```powershell
cd frontend
npm run test:e2e
```

Set `E2E_BASE_URL` if the frontend is running somewhere other than `http://localhost:3000`.

Current E2E coverage:

- Home, auth, and explore pages render core content.
- Explore loads seeded position data through the running API proxy.
- Login links preserve the current page as `next`.
- Registering from `?next=/jd` returns to JD and updates the navbar.
- Login sessions persist across reloads and navigation.
- Logout clears local session storage and protected actions return to login.
- Chat history messages are readable by the owner only.
- Protected JD analysis, resume matching, and AI follow-up redirect unauthenticated users to login.
