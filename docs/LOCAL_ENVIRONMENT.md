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
3. Start FastAPI on `http://localhost:8000`.

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
