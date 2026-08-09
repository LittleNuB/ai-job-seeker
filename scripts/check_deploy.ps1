param(
    [string]$EnvFile = ".env.production",
    [string]$ComposeFile = "docker-compose.prod.yml",
    [string]$BaseUrl = "http://localhost:8088",
    [string]$Python = "python",
    [int]$MinCategories = 7,
    [int]$MinPositions = 40,
    [switch]$SkipBuild,
    [switch]$StartStack,
    [switch]$Cleanup,
    [switch]$DestroyVolumes
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $repoRoot $EnvFile
$composePath = Join-Path $repoRoot $ComposeFile

function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Name" -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
    Write-Host "OK: $Name" -ForegroundColor Green
}

function Invoke-DockerCompose {
    param([string[]]$Arguments)
    & docker compose --env-file $envPath -f $composePath @Arguments
}

function Test-HttpOk {
    param([string]$Url)
    try {
        $response = Invoke-WebRequest -UseBasicParsing $Url -TimeoutSec 3
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

function Wait-HttpOk {
    param(
        [string]$Name,
        [string]$Url,
        [int]$TimeoutSeconds = 90
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-HttpOk $Url) {
            Write-Host "OK: $Name ready at $Url" -ForegroundColor Green
            return
        }
        Start-Sleep -Seconds 2
    }

    throw "$Name did not become ready at $Url within ${TimeoutSeconds}s."
}

Push-Location $repoRoot
try {
    if (-not (Test-Path -LiteralPath $envPath)) {
        throw "Env file not found: $envPath"
    }
    if (-not (Test-Path -LiteralPath $composePath)) {
        throw "Compose file not found: $composePath"
    }

    Invoke-Step "Position data validation" {
        & $Python scripts\data\validate_positions.py
    }

    Invoke-Step "Docker Compose config" {
        Invoke-DockerCompose -Arguments @("config", "--quiet")
    }

    if (-not $SkipBuild) {
        Invoke-Step "Docker Compose build" {
            Invoke-DockerCompose -Arguments @("build")
        }
    }

    if ($StartStack) {
        Invoke-Step "Docker Compose up" {
            Invoke-DockerCompose -Arguments @("up", "-d")
        }

        Wait-HttpOk "readiness" "$($BaseUrl.TrimEnd('/'))/api/health/ready"

        Invoke-Step "API smoke" {
            & $Python scripts\smoke_api.py --base-url $BaseUrl --min-categories $MinCategories --min-positions $MinPositions
        }
    } else {
        Write-Host ""
        Write-Host "Skipping stack startup and smoke. Add -StartStack to run them." -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Deployment checks completed." -ForegroundColor Green
} finally {
    if ($Cleanup) {
        Write-Host ""
        Write-Host "Cleaning up Docker Compose stack..." -ForegroundColor Cyan
        if ($DestroyVolumes) {
            Invoke-DockerCompose -Arguments @("down", "-v")
        } else {
            Invoke-DockerCompose -Arguments @("down")
        }
    }
    Pop-Location
}
