# Local Development Environment

This project expects a normal Windows Python installation for day-to-day backend work.

## Required Checks

From a fresh PowerShell terminal:

```powershell
cd C:\Users\LittleNub\ai-job-seeker
python --version
py --version
```

At least one of `python` or `py` should resolve to Python 3.11 or newer. If both fail, install Python and enable "Add Python to PATH", then restart the terminal and Codex.

## Backend Virtual Environment

The backend startup script uses `backend\.venv`. If that venv exists but points to a removed Python installation, the script will delete and recreate it.

```powershell
.\start-backend.bat
```

Expected behavior:

1. Create `backend\.venv` if needed.
2. Install `backend\requirements.txt`.
3. Apply Alembic database migrations.
4. Start FastAPI on `http://localhost:8000`.

## Database Migrations

Use Alembic for schema changes:

```powershell
python scripts\migrate_db.py
```

See `docs\DATABASE_MIGRATIONS.md` for the migration workflow.

## Environment Variables

Copy `.env.example` to `.env` and set local secrets there. Leave `DATABASE_URL` commented out to use the default local SQLite database. For local development, `JWT_SECRET` may be empty; the backend generates a temporary runtime secret so the public default key is never used.

For production-like runs, set:

```powershell
APP_ENV=production
DEBUG=false
JWT_SECRET=<stable-random-secret-at-least-32-characters>
```

The backend will refuse to start in production if `JWT_SECRET` is missing, too short, or set to a known placeholder.

## Smoke Test

In a second terminal after the backend starts:

```powershell
backend\.venv\Scripts\python.exe scripts\smoke_api.py --base-url http://localhost:8000
```

## Git Write Check

Codex needs to be able to create lock files inside `.git\refs` to branch, tag, stage, and commit.

```powershell
git branch codex-write-test-temp
git branch -D codex-write-test-temp
git tag codex-write-test-temp
git tag -d codex-write-test-temp
```

If these fail with `Permission denied`, check Windows permissions, antivirus/sync locks, or restart Codex after opening the project folder with write access.
