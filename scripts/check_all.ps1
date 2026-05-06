param(
    [switch]$E2E,
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
    [string]$E2EBaseUrl = "http://localhost:3000",
    [int]$E2EWorkers = 4,
    [switch]$StartServices,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3001
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$backendPython = Join-Path $backendDir ".venv\Scripts\python.exe"
$managedProcesses = @()
$managedPorts = @()

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

function Test-HttpReady {
    param(
        [string]$Url
    )

    try {
        $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 2
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

function Wait-HttpReady {
    param(
        [string]$Name,
        [string]$Url,
        [int]$TimeoutSeconds = 40
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-HttpReady $Url) {
            Write-Host "OK: $Name is ready at $Url" -ForegroundColor Green
            return
        }
        Start-Sleep -Milliseconds 750
    }

    throw "$Name did not become ready at $Url within ${TimeoutSeconds}s."
}

function Start-ManagedProcess {
    param(
        [string]$Name,
        [string]$FilePath,
        [string[]]$ArgumentList,
        [string]$WorkingDirectory
    )

    Write-Host "Starting $Name..." -ForegroundColor Cyan
    $process = Start-Process -FilePath $FilePath -ArgumentList $ArgumentList -WorkingDirectory $WorkingDirectory -WindowStyle Hidden -PassThru
    $script:managedProcesses += $process
    return $process
}

function Stop-ManagedProcesses {
    foreach ($process in $script:managedProcesses) {
        try {
            if ($process -and -not $process.HasExited) {
                Stop-Process -Id $process.Id -Force -ErrorAction Stop
            }
        } catch {
        }
    }

    foreach ($port in ($script:managedPorts | Select-Object -Unique)) {
        try {
            $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
            $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pidValue in $pids) {
                try {
                    Stop-Process -Id $pidValue -Force -ErrorAction Stop
                } catch {
                }
            }
        } catch {
        }
    }
}

if (((-not $SkipBackend) -or ($E2E -and $StartServices)) -and -not (Test-Path -LiteralPath $backendPython)) {
    throw "Backend Python not found at $backendPython. Run start-backend.bat or create backend\.venv first."
}

$startedAt = Get-Date
Write-Host "Running project checks from $repoRoot" -ForegroundColor White

try {
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

        if ($StartServices) {
            $backendHealthUrl = "http://127.0.0.1:$BackendPort/api/health"
            if (-not (Test-HttpReady $backendHealthUrl)) {
                Start-ManagedProcess "backend" $backendPython @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", [string]$BackendPort) $backendDir | Out-Null
                $script:managedPorts += $BackendPort
                Wait-HttpReady "backend" $backendHealthUrl
            } else {
                Write-Host "OK: backend is already available at $backendHealthUrl" -ForegroundColor Green
            }

            if (-not $PSBoundParameters.ContainsKey("E2EBaseUrl")) {
                $E2EBaseUrl = "http://localhost:$FrontendPort"
            }

            if (-not (Test-HttpReady $E2EBaseUrl)) {
                Start-ManagedProcess "frontend" "npm.cmd" @("run", "dev", "--", "-p", [string]$FrontendPort) $frontendDir | Out-Null
                $script:managedPorts += $FrontendPort
                Wait-HttpReady "frontend" $E2EBaseUrl
            } else {
                Write-Host "OK: frontend is already available at $E2EBaseUrl" -ForegroundColor Green
            }
        }

        Invoke-CheckStep "Frontend E2E" $frontendDir {
            $previousBaseUrl = $env:E2E_BASE_URL
            $previousWorkers = $env:E2E_WORKERS
            $env:E2E_BASE_URL = $E2EBaseUrl
            $env:E2E_WORKERS = [string]$E2EWorkers
            try {
                & npm run test:e2e
            } finally {
                $env:E2E_BASE_URL = $previousBaseUrl
                $env:E2E_WORKERS = $previousWorkers
            }
        }
    } else {
        Write-Host ""
        Write-Host "Skipping E2E. Use -E2E after backend and frontend services are running." -ForegroundColor Yellow
    }

    $elapsed = (Get-Date) - $startedAt
    Write-Host ""
    Write-Host ("All requested checks passed in {0:n1}s." -f $elapsed.TotalSeconds) -ForegroundColor Green
} finally {
    Stop-ManagedProcesses
}
