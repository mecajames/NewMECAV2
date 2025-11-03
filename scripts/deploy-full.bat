@echo off
REM Full Production Deployment - NO OPTIONAL STEPS
REM Deploys code to GitHub AND syncs database to production automatically

setlocal enabledelayedexpansion

echo ====================================
echo MECA FULL PRODUCTION DEPLOYMENT
echo ====================================
echo.
echo This script will:
echo   1. Create a backup
echo   2. Build the application
echo   3. Push code to GitHub
echo   4. Sync database to production (AUTOMATIC)
echo.
echo WARNING: This WILL overwrite production database!
echo.

set /p CONFIRM="Continue with FULL deployment? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo Deployment cancelled.
    exit /b 0
)

echo.
echo [1/5] Creating BACKUP...
echo ====================================

call scripts\backup.bat
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backup failed! Aborting deployment for safety.
    exit /b 1
)
echo ✓ Backup completed

echo.
echo [2/5] Building APPLICATION...
echo ====================================

call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed! Fix build errors before deploying.
    exit /b 1
)
echo ✓ Build successful

echo.
echo [3/5] Pushing CODE to GitHub...
echo ====================================

REM Check current branch
for /f %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%

REM Check for uncommitted changes
git diff --quiet
if %ERRORLEVEL% NEQ 0 (
    echo Committing changes...
    git add .
    git commit -m "Production deployment - %date% %time%"
    if !ERRORLEVEL! NEQ 0 (
        echo ERROR: Git commit failed!
        exit /b 1
    )
    echo ✓ Changes committed
)

echo Pushing to GitHub...
git push origin %CURRENT_BRANCH%
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git push failed!
    exit /b 1
)
echo ✓ Code pushed to GitHub

REM Push tags
git push origin --tags
echo ✓ Tags pushed

echo.
echo [4/5] Creating DATABASE dump...
echo ====================================

set TEMP_DUMP=temp-production-sync.sql
call npx supabase db dump -f %TEMP_DUMP%
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to dump local database!
    exit /b 1
)
echo ✓ Database dump created

echo.
echo [5/5] Syncing DATABASE to Production...
echo ====================================
echo.
echo FINAL WARNING: About to overwrite production database!
set /p FINAL_CONFIRM="Type 'DEPLOY' to confirm: "

if /i not "%FINAL_CONFIRM%"=="DEPLOY" (
    echo Database sync cancelled.
    del %TEMP_DUMP%
    echo.
    echo Code was pushed to GitHub, but database was NOT synced.
    exit /b 0
)

echo.
echo Importing to production database...
psql -h db.qykahrgwtktqycfgxqep.supabase.co -p 5432 -U postgres -d postgres -f %TEMP_DUMP%
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Production database import failed!
    echo Your production database may be in an inconsistent state!
    del %TEMP_DUMP%
    exit /b 1
)

REM Clean up temp file
del %TEMP_DUMP%
echo ✓ Database synced to production

echo.
echo ====================================
echo FULL DEPLOYMENT COMPLETED!
echo ====================================
echo.
echo Status:
echo   ✓ Backup created
echo   ✓ Application built
echo   ✓ Code pushed to GitHub
echo   ✓ Database synced to production
echo.
echo Branch: %CURRENT_BRANCH%
echo.
echo Production is now updated with your latest code and data!
echo.

goto :end

:error
echo.
echo ====================================
echo DEPLOYMENT FAILED!
echo ====================================
echo.
echo Check the errors above and fix before trying again.
echo Your backup is safe and can be restored if needed.
exit /b 1

:end
endlocal
