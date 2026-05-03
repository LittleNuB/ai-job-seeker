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
