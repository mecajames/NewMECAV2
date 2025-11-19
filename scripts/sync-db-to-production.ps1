# Sync Local Database to Production
# This script syncs your local database to Supabase production

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Database Sync to Production" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if dump file exists
if (Test-Path "temp-production-sync.sql") {
    Write-Host "✓ Found existing database dump" -ForegroundColor Green
} else {
    Write-Host "Creating database dump from local..." -ForegroundColor Yellow
    npx supabase db dump --local -f temp-production-sync.sql

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create database dump!" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Database dump created" -ForegroundColor Green
}

Write-Host ""
Write-Host "WARNING: This will OVERWRITE your production database!" -ForegroundColor Red
Write-Host ""
$confirm = Read-Host "Type 'DEPLOY' to continue"

if ($confirm -ne "DEPLOY") {
    Write-Host "Database sync cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Connecting to production database..." -ForegroundColor Yellow

# Set password environment variable
$env:PGPASSWORD = "XWGCMaster123!"

# Import to production
Write-Host "Importing database to production..." -ForegroundColor Yellow
psql -h db.qykahrgwtktqycfgxqep.supabase.co -p 5432 -U postgres.qykahrgwtktqycfgxqep -d postgres -f temp-production-sync.sql

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Database import failed!" -ForegroundColor Red
    Write-Host "Your production database may be in an inconsistent state." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ Database successfully synced to production!" -ForegroundColor Green

# Clean up
Write-Host ""
Write-Host "Cleaning up temporary files..." -ForegroundColor Yellow
Remove-Item temp-production-sync.sql -ErrorAction SilentlyContinue
Write-Host "✓ Cleanup complete" -ForegroundColor Green

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your production database is now updated with:" -ForegroundColor White
Write-Host "  - Latest events with auto-detection" -ForegroundColor White
Write-Host "  - Updated seasons and classes" -ForegroundColor White
Write-Host "  - All local data and settings" -ForegroundColor White
Write-Host ""
