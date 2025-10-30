@echo off
REM Complete Backup Script - Database + Storage Files

set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DIR=backups\complete_%TIMESTAMP%

echo 🔄 Creating complete backup...
echo 📁 Backup directory: %BACKUP_DIR%
echo.

REM Create backup directory
mkdir "%BACKUP_DIR%" 2>nul
mkdir "%BACKUP_DIR%\storage" 2>nul

REM 1. Backup database
echo 💾 Backing up database...
docker exec supabase_db_NewMECAV2 pg_dump -U postgres -d postgres > "%BACKUP_DIR%\database.sql" 2>&1

if %errorlevel% equ 0 (
    echo    ✅ Database backed up
) else (
    echo    ❌ Database backup failed
    exit /b 1
)

REM 2. Backup storage files
echo.
echo 📦 Backing up storage files...
docker cp supabase_storage_NewMECAV2:/var/lib/storage "%BACKUP_DIR%\storage\" 2>nul

if %errorlevel% equ 0 (
    echo    ✅ Storage files backed up
) else (
    echo    ⚠️  Warning: Could not backup storage files
)

REM 3. Create manifest
echo.
echo 📋 Creating backup manifest...
(
echo MECA Complete Backup
echo ===================
echo Timestamp: %TIMESTAMP%
echo Date: %date% %time%
echo.
echo Contents:
echo - database.sql: PostgreSQL database dump
echo - storage/: Supabase storage files ^(PDFs, images, etc.^)
echo.
echo User Account:
echo - Email: james@mecacaraudio.com
echo - MECA ID: 202401
echo - Role: admin
echo.
echo To Restore:
echo -----------
echo 1. Database: type database.sql ^| docker exec -i supabase_db_NewMECAV2 psql -U postgres -d postgres
echo 2. Storage: docker cp storage\storage supabase_storage_NewMECAV2:/var/lib/
) > "%BACKUP_DIR%\manifest.txt"

echo    ✅ Manifest created
echo.
echo ✅ Complete backup finished!
echo.
echo 📂 Backup folder: %BACKUP_DIR%
echo.
echo To restore, use: scripts\complete-restore.bat %BACKUP_DIR%
