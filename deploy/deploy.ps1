# ============================================
# NewMECA V2 - Lightsail Deployment Script
# ============================================
# Usage: .\deploy\deploy.ps1
# Run from the repository root directory (C:\git\NewMECAV2)
#
# Prerequisites:
#   - Docker Desktop running
#   - AWS CLI v2 configured (aws configure)
#   - lightsailctl plugin installed
#   - deploy/.env.staging file with frontend secrets (copy from .env.staging.example)
#   - deploy/.env.backend file with backend secrets (copy from .env.backend.example)
# ============================================

param(
    [switch]$SkipBuild,
    [switch]$SkipPush,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"

$ServiceName = "v2-container-service-1"
$Region = "us-east-1"
$RepoRoot = Split-Path -Parent $PSScriptRoot

# Ensure we're in the repo root
Set-Location $RepoRoot

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " NewMECA V2 - Lightsail Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------
# Helper: Parse .env file into hashtable
# ------------------------------------------
function Read-EnvFile {
    param([string]$Path)
    $vars = @{}
    if (-not (Test-Path $Path)) {
        return $null
    }
    Get-Content $Path | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#")) {
            $parts = $line -split "=", 2
            if ($parts.Length -eq 2) {
                $vars[$parts[0].Trim()] = $parts[1].Trim()
            }
        }
    }
    return $vars
}

# ------------------------------------------
# Load environment variables for frontend build args
# ------------------------------------------
$EnvFile = Join-Path $RepoRoot "deploy\.env.staging"
if (-not (Test-Path $EnvFile)) {
    Write-Host "ERROR: deploy/.env.staging not found!" -ForegroundColor Red
    Write-Host "Copy deploy/.env.staging.example to deploy/.env.staging and fill in your values." -ForegroundColor Yellow
    exit 1
}
$EnvVars = Read-EnvFile -Path $EnvFile

# ------------------------------------------
# Load backend secrets for deployment config
# ------------------------------------------
$BackendEnvFile = Join-Path $RepoRoot "deploy\.env.backend"
if (-not (Test-Path $BackendEnvFile)) {
    Write-Host "ERROR: deploy/.env.backend not found!" -ForegroundColor Red
    Write-Host "Copy deploy/.env.backend.example to deploy/.env.backend and fill in your values." -ForegroundColor Yellow
    exit 1
}
$BackendVars = Read-EnvFile -Path $BackendEnvFile

# ------------------------------------------
# Step 1: Build Docker images
# ------------------------------------------
if (-not $SkipBuild) {
    if (-not $FrontendOnly) {
        Write-Host "[1/5] Building backend Docker image..." -ForegroundColor Yellow
        docker build `
            -f deploy/backend.Dockerfile `
            -t newmeca-backend:latest `
            .
        if ($LASTEXITCODE -ne 0) { Write-Host "Backend build failed!" -ForegroundColor Red; exit 1 }
        Write-Host "Backend image built successfully." -ForegroundColor Green
    }

    if (-not $BackendOnly) {
        Write-Host "[2/5] Building nginx/frontend Docker image..." -ForegroundColor Yellow

        $buildArgs = @(
            "--build-arg", "VITE_SUPABASE_URL=$($EnvVars['VITE_SUPABASE_URL'])",
            "--build-arg", "VITE_SUPABASE_ANON_KEY=$($EnvVars['VITE_SUPABASE_ANON_KEY'])",
            "--build-arg", "VITE_API_URL=$($EnvVars['VITE_API_URL'])",
            "--build-arg", "VITE_RECAPTCHA_SITE_KEY=$($EnvVars['VITE_RECAPTCHA_SITE_KEY'])",
            "--build-arg", "VITE_STRIPE_PUBLISHABLE_KEY=$($EnvVars['VITE_STRIPE_PUBLISHABLE_KEY'])"
        )

        docker build `
            -f deploy/nginx.Dockerfile `
            @buildArgs `
            -t newmeca-nginx:latest `
            .
        if ($LASTEXITCODE -ne 0) { Write-Host "Nginx/frontend build failed!" -ForegroundColor Red; exit 1 }
        Write-Host "Nginx/frontend image built successfully." -ForegroundColor Green
    }
} else {
    Write-Host "[1-2/5] Skipping builds (--SkipBuild flag)" -ForegroundColor DarkGray
}

# ------------------------------------------
# Step 2: Push images to Lightsail
# ------------------------------------------
if (-not $SkipPush) {
    if (-not $FrontendOnly) {
        Write-Host "[3/5] Pushing backend image to Lightsail..." -ForegroundColor Yellow
        aws lightsail push-container-image `
            --region $Region --profile lightsail `
            --service-name $ServiceName `
            --label backend `
            --image newmeca-backend:latest
        if ($LASTEXITCODE -ne 0) { Write-Host "Backend push failed!" -ForegroundColor Red; exit 1 }
        Write-Host "Backend image pushed." -ForegroundColor Green
    }

    if (-not $BackendOnly) {
        Write-Host "[4/5] Pushing nginx image to Lightsail..." -ForegroundColor Yellow
        aws lightsail push-container-image `
            --region $Region --profile lightsail `
            --service-name $ServiceName `
            --label nginx `
            --image newmeca-nginx:latest
        if ($LASTEXITCODE -ne 0) { Write-Host "Nginx push failed!" -ForegroundColor Red; exit 1 }
        Write-Host "Nginx image pushed." -ForegroundColor Green
    }
} else {
    Write-Host "[3-4/5] Skipping push (--SkipPush flag)" -ForegroundColor DarkGray
}

# ------------------------------------------
# Step 3: Deploy to Lightsail
# ------------------------------------------
Write-Host "[5/5] Creating Lightsail deployment..." -ForegroundColor Yellow

# Read deployment template and inject secrets
$deploymentConfig = Get-Content (Join-Path $RepoRoot "deploy\deployment.template.json") -Raw | ConvertFrom-Json

# Get the latest pushed image references from Lightsail
Write-Host "  Fetching latest image references..." -ForegroundColor DarkGray
$images = aws lightsail get-container-images --service-name $ServiceName --region $Region --profile lightsail | ConvertFrom-Json

$backendImage = ($images.containerImages | Where-Object { $_.image -like "*backend*" } | Select-Object -First 1).image
$nginxImage = ($images.containerImages | Where-Object { $_.image -like "*nginx*" } | Select-Object -First 1).image

if (-not $backendImage -or -not $nginxImage) {
    Write-Host "ERROR: Could not find pushed images. Make sure both images are pushed." -ForegroundColor Red
    Write-Host "  Backend image: $backendImage" -ForegroundColor DarkGray
    Write-Host "  Nginx image: $nginxImage" -ForegroundColor DarkGray
    exit 1
}

Write-Host "  Backend image: $backendImage" -ForegroundColor DarkGray
Write-Host "  Nginx image: $nginxImage" -ForegroundColor DarkGray

# Update image references
$deploymentConfig.containers.backend.image = $backendImage
$deploymentConfig.containers.nginx.image = $nginxImage

# Inject backend secrets from .env.backend
$envMap = $deploymentConfig.containers.backend.environment
$secretKeys = @(
    "DATABASE_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "CORS_ORIGIN",
    "RECAPTCHA_SECRET_KEY", "SENDGRID_API_KEY", "SUPER_ADMIN_PASSWORD"
)
foreach ($key in $secretKeys) {
    if ($BackendVars.ContainsKey($key)) {
        $envMap.$key = $BackendVars[$key]
    }
}

# Write updated config to temp file
$tempDeployment = Join-Path $env:TEMP "newmeca-deployment.json"
$deploymentConfig | ConvertTo-Json -Depth 10 | Set-Content $tempDeployment

# Create the deployment
aws lightsail create-container-service-deployment `
    --region $Region --profile lightsail `
    --cli-input-json "file://$tempDeployment"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

# Clean up temp file
Remove-Item $tempDeployment -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Deployment initiated successfully!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Monitor deployment status:" -ForegroundColor Cyan
Write-Host "  aws lightsail get-container-service-deployments --service-name $ServiceName --region $Region --profile lightsail" -ForegroundColor White
Write-Host ""
Write-Host "Check service status:" -ForegroundColor Cyan
Write-Host "  aws lightsail get-container-services --service-name $ServiceName --region $Region --profile lightsail" -ForegroundColor White
Write-Host ""
Write-Host "View container logs:" -ForegroundColor Cyan
Write-Host "  aws lightsail get-container-log --service-name $ServiceName --container-name backend --region $Region --profile lightsail" -ForegroundColor White
Write-Host "  aws lightsail get-container-log --service-name $ServiceName --container-name nginx --region $Region --profile lightsail" -ForegroundColor White
