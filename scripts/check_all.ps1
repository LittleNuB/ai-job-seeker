param(
    [switch]$E2E,
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [string]$E2EBaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$backendPython = Join-Path $backendDir ".venv\Scripts\python.exe"

function Invoke-CheckStep {
    param(
        [string]$Name,
        [string]$WorkingDirectory,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Name" -ForegroundColor Cyan
    Push-Location $WorkingDirectory
    try {
        & $Command
        if ($LASTEXITCODE -ne 0) {
            throw "$Name failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
    Write-Host "OK: $Name" -ForegroundColor Green
}

if (-not $SkipBackend -and -not (Test-Path -LiteralPath $backendPython)) {
    throw "Backend Python not found at $backendPython. Run start-backend.bat or create backend\.venv first."
}

$startedAt = Get-Date
Write-Host "Running project checks from $repoRoot" -ForegroundColor White

if (-not $SkipBackend) {
    Invoke-CheckStep "Backend pytest" $backendDir {
        & $backendPython -m pytest
    }
}

if (-not $SkipFrontend) {
    Invoke-CheckStep "Frontend typecheck" $frontendDir {
        & npx tsc --noEmit
    }

    Invoke-CheckStep "Frontend lint" $frontendDir {
        & npm run lint
    }
}

if ($E2E) {
    if ($SkipFrontend) {
        throw "Cannot run E2E when -SkipFrontend is set."
    }

    Invoke-CheckStep "Frontend E2E" $frontendDir {
        $previousBaseUrl = $env:E2E_BASE_URL
        $env:E2E_BASE_URL = $E2EBaseUrl
        try {
            & npm run test:e2e
        } finally {
            $env:E2E_BASE_URL = $previousBaseUrl
        }
    }
} else {
    Write-Host ""
    Write-Host "Skipping E2E. Use -E2E after backend and frontend services are running." -ForegroundColor Yellow
}

$elapsed = (Get-Date) - $startedAt
Write-Host ""
Write-Host ("All requested checks passed in {0:n1}s." -f $elapsed.TotalSeconds) -ForegroundColor Green
