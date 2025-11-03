@echo off
REM Restore Script - Restores code and database from backup
REM Usage: restore.bat [BACKUP_ID]
REM Example: restore.bat 20251102-143022

setlocal enabledelayedexpansion

echo ====================================
echo MECA Restore System
echo ====================================
echo.

REM Get backup ID from parameter or use latest
if "%1"=="" (
    if exist backups\latest-backup.txt (
        echo No backup ID specified. Using latest backup...
        set /p TIMESTAMP=<backups\latest-backup.txt
        echo Latest backup ID: !TIMESTAMP!
    ) else (
        echo ERROR: No backup ID specified and no latest backup found.
        echo Usage: scripts\restore.bat [BACKUP_ID]
        exit /b 1
    )
) else (
    set TIMESTAMP=%1
)

set BACKUP_DIR=backups\backup-%TIMESTAMP%

REM Check if backup exists
if not exist %BACKUP_DIR% (
    echo ERROR: Backup directory not found: %BACKUP_DIR%
    echo.
    echo Available backups:
    dir /b backups\backup-*
    exit /b 1
)

echo.
echo Restoring from backup: %TIMESTAMP%
echo Location: %BACKUP_DIR%
echo.

REM Show manifest if exists
if exist %BACKUP_DIR%\MANIFEST.txt (
    echo Backup Manifest:
    echo ----------------
    type %BACKUP_DIR%\MANIFEST.txt
    echo ----------------
    echo.
)

REM Confirmation prompt
set /p CONFIRM="Are you sure you want to restore this backup? This will overwrite current data! (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo Restore cancelled.
    exit /b 0
)

echo.
echo [1/3] Restoring CODE from Git...
echo ====================================

REM Read Git tag from manifest or construct it
set TAG_NAME=backup-%TIMESTAMP%

echo Checking out Git tag: %TAG_NAME%
git checkout %TAG_NAME%
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to checkout Git tag!
    echo The tag may not exist. Check git tag -l for available tags.
    goto :error
)
echo ✓ Code restored to backup point

REM Reinstall dependencies in case they changed
echo.
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: npm install had errors (continuing anyway)
)
echo ✓ Dependencies updated

echo.
echo [2/3] Restoring LOCAL DATABASE...
echo ====================================

if exist %BACKUP_DIR%\local-database.sql (
    echo WARNING: This will overwrite your current local database!
    set /p DB_CONFIRM="Restore local database? (yes/no): "
    if /i "!DB_CONFIRM!"=="yes" (
        echo Restoring local database...
        psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f %BACKUP_DIR%\local-database.sql
        if !ERRORLEVEL! NEQ 0 (
            echo ERROR: Database restore failed!
            goto :error
        )
        echo ✓ Local database restored
    ) else (
        echo Skipping local database restore
    )
) else (
    echo WARNING: No local database backup found in %BACKUP_DIR%
)

echo.
echo [3/3] Restoring REMOTE DATABASE (Optional)...
echo ====================================

if exist %BACKUP_DIR%\remote-database.sql (
    echo WARNING: This will overwrite your PRODUCTION database!
    set /p REMOTE_CONFIRM="Restore remote/production database? (yes/no): "
    if /i "!REMOTE_CONFIRM!"=="yes" (
        echo Restoring remote database...
        psql -h db.qykahrgwtktqycfgxqep.supabase.co -p 5432 -U postgres -d postgres -f %BACKUP_DIR%\remote-database.sql
        if !ERRORLEVEL! NEQ 0 (
            echo ERROR: Remote database restore failed!
            goto :error
        )
        echo ✓ Remote database restored
    ) else (
        echo Skipping remote database restore
    )
) else (
    echo No remote database backup found in %BACKUP_DIR%
)

echo.
echo ====================================
echo RESTORE COMPLETED SUCCESSFULLY!
echo ====================================
echo.
echo Your application has been restored to: %TIMESTAMP%
echo.
echo Next steps:
echo   1. Restart your development servers if running
echo   2. Verify the application is working correctly
echo   3. If you want to return to latest code: git checkout fix-branch
echo.
goto :end

:error
echo.
echo ====================================
echo RESTORE FAILED!
echo ====================================
echo.
echo Your system may be in an inconsistent state.
echo You may need to manually checkout the correct branch: git checkout fix-branch
echo.
exit /b 1

:end
endlocal
