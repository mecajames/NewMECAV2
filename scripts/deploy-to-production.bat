@echo off
REM Deploy to Production Script
REM Deploys current code to GitHub and syncs database to production

setlocal enabledelayedexpansion

echo ====================================
echo MECA Production Deployment
echo ====================================
echo.

echo This script will:
echo   1. Create a backup of current state
echo   2. Push code to GitHub
echo   3. Sync database to production (optional)
echo.

set /p CONFIRM="Continue with deployment? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo Deployment cancelled.
    exit /b 0
)

echo.
echo [1/5] Creating BACKUP before deployment...
echo ====================================

call scripts\backup.bat
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backup failed! Aborting deployment for safety.
    exit /b 1
)
echo ✓ Backup completed

echo.
echo [2/5] Running TESTS (if available)...
echo ====================================

REM Check if test script exists
call npm run test --if-present 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Tests failed or not configured
    set /p TEST_CONFIRM="Continue deployment anyway? (yes/no): "
    if /i not "!TEST_CONFIRM!"=="yes" (
        echo Deployment cancelled.
        exit /b 1
    )
) else (
    echo ✓ Tests passed or skipped
)

echo.
echo [3/5] Building APPLICATION...
echo ====================================

call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Build failed! Fix build errors before deploying.
    exit /b 1
)
echo ✓ Build successful

echo.
echo [4/5] Pushing CODE to GitHub...
echo ====================================

REM Check if on correct branch
for /f %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%

if not "%CURRENT_BRANCH%"=="main" (
    if not "%CURRENT_BRANCH%"=="master" (
        echo WARNING: You are not on main/master branch!
        set /p BRANCH_CONFIRM="Push %CURRENT_BRANCH% to GitHub? (yes/no): "
        if /i not "!BRANCH_CONFIRM!"=="yes" (
            echo Deployment cancelled.
            exit /b 1
        )
    )
)

REM Check for uncommitted changes
git diff --quiet
if %ERRORLEVEL% NEQ 0 (
    echo Found uncommitted changes. Committing...
    git add .

    set /p COMMIT_MSG="Enter commit message (or press Enter for default): "
    if "!COMMIT_MSG!"=="" (
        set COMMIT_MSG=Production deployment - %date% %time%
    )

    git commit -m "!COMMIT_MSG!"
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
    echo Check your GitHub authentication and network connection.
    exit /b 1
)
echo ✓ Code pushed to GitHub

REM Push tags as well
git push origin --tags
echo ✓ Tags pushed

echo.
echo [5/5] Syncing DATABASE to Production...
echo ====================================

echo.
echo WARNING: This will overwrite the production database with your local data!
echo.
set /p DB_SYNC="Sync local database to production? (yes/no): "

if /i "%DB_SYNC%"=="yes" (
    echo.
    echo Creating production database dump from local...

    REM Create temporary dump file
    set TEMP_DUMP=temp-production-sync.sql
    call npx supabase db dump -f %TEMP_DUMP%
    if !ERRORLEVEL! NEQ 0 (
        echo ERROR: Failed to dump local database!
        exit /b 1
    )

    echo.
    echo FINAL WARNING: About to overwrite production database!
    set /p FINAL_CONFIRM="Type 'DEPLOY' to confirm: "

    if /i "!FINAL_CONFIRM!"=="DEPLOY" (
        echo Importing to production database...
        psql -h db.qykahrgwtktqycfgxqep.supabase.co -p 5432 -U postgres -d postgres -f %TEMP_DUMP%
        if !ERRORLEVEL! NEQ 0 (
            echo ERROR: Production database import failed!
            echo Your production database may be in an inconsistent state!
            exit /b 1
        )

        REM Clean up temp file
        del %TEMP_DUMP%

        echo ✓ Database synced to production
    ) else (
        echo Database sync cancelled.
        del %TEMP_DUMP%
    )
) else (
    echo Skipping database sync
    echo Note: You may need to run migrations on production manually
)

echo.
echo ====================================
echo DEPLOYMENT COMPLETED!
echo ====================================
echo.
echo Code Status:
echo   - Branch: %CURRENT_BRANCH%
echo   - Pushed to: GitHub
echo   - Database: !DB_SYNC!
echo.
echo Next Steps:
echo   1. Verify deployment on production server
echo   2. Run migrations if needed: npx mikro-orm migration:up
echo   3. Restart production services
echo   4. Test production application
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
