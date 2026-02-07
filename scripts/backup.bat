@echo off
REM Complete Backup Script - Code + Database + Files
REM Creates a complete backup point that can be restored later

setlocal enabledelayedexpansion

echo ====================================
echo MECA Complete Backup System
echo ====================================
echo.

REM Get timestamp for backup naming
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%-%datetime:~8,6%
set BACKUP_DIR=backups\backup-%TIMESTAMP%

echo Creating backup directory: %BACKUP_DIR%
if not exist backups mkdir backups
if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%

echo.
echo [1/4] Backing up DATABASE...
echo ====================================

REM Backup local database
echo Dumping local development database...
call npx supabase db dump -f %BACKUP_DIR%\local-database.sql
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Local database backup failed!
    goto :error
)
echo ✓ Local database backed up

REM Backup remote database
echo.
echo Dumping remote production database...
call npx supabase db dump --db-url "postgresql://postgres.qykahrgwtktqycfgxqep:XWGCMaster123!@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f %BACKUP_DIR%\remote-database.sql
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Remote database backup failed (continuing anyway)
) else (
    echo ✓ Remote database backed up
)

echo.
echo [2/4] Backing up CODE (Git)...
echo ====================================

REM Check if there are uncommitted changes
git diff --quiet
if %ERRORLEVEL% NEQ 0 (
    echo Found uncommitted changes. Creating Git commit...
    git add .
    git commit -m "Backup checkpoint - %TIMESTAMP%"
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Git commit failed!
        goto :error
    )
    echo ✓ Changes committed
) else (
    echo No uncommitted changes found
)

REM Create Git tag for this backup point
set TAG_NAME=backup-%TIMESTAMP%
echo Creating Git tag: %TAG_NAME%
git tag -a %TAG_NAME% -m "Backup checkpoint created on %TIMESTAMP%"
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Git tag creation failed!
    goto :error
)
echo ✓ Git tag created: %TAG_NAME%

REM Get current commit hash
for /f %%i in ('git rev-parse HEAD') do set COMMIT_HASH=%%i
echo ✓ Current commit: %COMMIT_HASH%

echo.
echo [3/4] Creating BACKUP MANIFEST...
echo ====================================

REM Create manifest file with backup details
(
    echo MECA Backup Manifest
    echo ====================
    echo.
    echo Backup Date: %date% %time%
    echo Backup ID: %TIMESTAMP%
    echo.
    echo Git Information:
    echo   - Tag: %TAG_NAME%
    echo   - Commit: %COMMIT_HASH%
    echo   - Branch:
    git branch --show-current
    echo.
    echo Database Backups:
    echo   - Local: %BACKUP_DIR%\local-database.sql
    echo   - Remote: %BACKUP_DIR%\remote-database.sql
    echo.
    echo To restore this backup:
    echo   1. Run: git checkout %TAG_NAME%
    echo   2. Run: scripts\restore.bat %TIMESTAMP%
    echo.
) > %BACKUP_DIR%\MANIFEST.txt

echo ✓ Manifest created

echo.
echo [4/4] Creating RESTORE POINT file...
echo ====================================

REM Create a quick restore point reference
(
    echo %TIMESTAMP%
    echo %TAG_NAME%
    echo %COMMIT_HASH%
) > backups\latest-backup.txt

echo ✓ Latest backup reference updated

echo.
echo ====================================
echo BACKUP COMPLETED SUCCESSFULLY!
echo ====================================
echo.
echo Backup ID: %TIMESTAMP%
echo Location: %BACKUP_DIR%
echo Git Tag: %TAG_NAME%
echo.
echo To restore this backup later, run:
echo   scripts\restore.bat %TIMESTAMP%
echo.
goto :end

:error
echo.
echo ====================================
echo BACKUP FAILED!
echo ====================================
echo Please check the errors above and try again.
exit /b 1

:end
endlocal
