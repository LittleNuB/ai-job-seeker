@echo off
cd /d "%~dp0frontend"
where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found on PATH.
  echo Install Node.js 20+ and restart the terminal.
  exit /b 1
)

if not exist "node_modules" (
  echo Installing frontend dependencies...
  call npm ci
  if errorlevel 1 exit /b 1
)

call npm run dev
