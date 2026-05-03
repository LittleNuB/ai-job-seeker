# Smoke Tests

These checks validate the core API contract without consuming LLM quota.

## Prerequisites

Start the backend first:

```powershell
.\start-backend.bat
```

The startup script installs backend dependencies and applies Alembic migrations before FastAPI starts.

In another terminal, run:

```powershell
python scripts\smoke_api.py --base-url http://localhost:8000
```

If `python` is not on PATH, use the backend virtual environment after `start-backend.bat` creates it:

```powershell
backend\.venv\Scripts\python.exe scripts\smoke_api.py --base-url http://localhost:8000
```

## What It Covers

- Health endpoint responds.
- Position categories/list/search respond.
- JD and export endpoints reject anonymous access.
- Register/login/me auth flow works.
- Chat history and export are scoped to the authenticated user.
- File upload reaches the authenticated path without calling the LLM.

## Notes

The script creates a throwaway user with a unique email each run. It does not call JD analysis, resume matching, or chat generation because those consume model quota.
