@echo off
REM Database Restoration Script for Windows
REM This script restores the database from a backup file

if "%~1"=="" (
    echo Usage: restore-backup.bat ^<backup_file^>
    echo Example: restore-backup.bat backups\backup_20251023_114431.sql
    echo.
    echo Available backups:
    dir /B backups\*.sql
    exit /b 1
)

set BACKUP_FILE=%~1

if not exist "%BACKUP_FILE%" (
    echo Error: Backup file not found: %BACKUP_FILE%
    exit /b 1
)

echo 🔄 Starting database restoration...
echo 📁 Backup file: %BACKUP_FILE%
echo.

echo 🛑 Stopping Supabase...
call npx supabase stop

echo 🚀 Starting Supabase...
call npx supabase start

echo ⏳ Waiting for database to be ready...
timeout /t 5 /nobreak >nul

echo 🧹 Cleaning database...
docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"

echo 📦 Restoring from backup...
type "%BACKUP_FILE%" | docker exec -i supabase_db_NewMECAV2 psql -U postgres -d postgres

echo.
echo ✅ Verifying restoration...
echo Checking your user account:
docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "SELECT email, first_name, last_name, meca_id, role FROM profiles WHERE email='james@mecacaraudio.com';"

echo.
echo Checking rulebooks count:
docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "SELECT COUNT(*) as rulebook_count FROM rulebooks;"

echo.
echo Checking events count:
docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "SELECT COUNT(*) as event_count FROM events;"

echo.
echo Checking site settings count:
docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "SELECT COUNT(*) as settings_count FROM site_settings;"

echo.
echo ✅ Database restoration complete!
echo 🌐 Frontend should be running at: http://localhost:5173
echo 📧 Login email: james@mecacaraudio.com
echo 🔑 Password: Admin123!
