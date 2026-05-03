@echo off
cd /d "%~dp0backend"
setlocal

set VENV_DIR=.venv
set VENV_PY=%VENV_DIR%\Scripts\python.exe

if exist "%VENV_PY%" (
  "%VENV_PY%" --version >nul 2>nul
  if errorlevel 1 (
    echo Existing backend .venv is broken. Recreating it...
    rmdir /s /q "%VENV_DIR%"
  )
)

if not exist "%VENV_PY%" (
  echo Creating backend virtual environment...
  where py >nul 2>nul
  if not errorlevel 1 (
    py -3 -m venv "%VENV_DIR%"
  ) else (
    where python >nul 2>nul
    if errorlevel 1 (
      echo Python was not found on PATH.
      echo Install Python 3.11+ or restart your terminal/Codex after updating PATH.
      exit /b 1
    )
    python -m venv "%VENV_DIR%"
  )
)

if not exist "%VENV_PY%" (
  echo Failed to create backend virtual environment.
  exit /b 1
)

"%VENV_PY%" -m pip install -r requirements.txt
"%VENV_PY%" ..\scripts\migrate_db.py
if errorlevel 1 (
  echo Database migration failed.
  exit /b 1
)
"%VENV_PY%" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
