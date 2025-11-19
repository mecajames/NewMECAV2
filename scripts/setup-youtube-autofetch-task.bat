@echo off
echo Setting up YouTube Auto-Fetch Scheduled Task...
echo.

REM Get the current directory
set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..

REM Create the scheduled task
schtasks /create /tn "MECA YouTube Auto-Fetch" /tr "node \"%SCRIPT_DIR%youtube-auto-fetch.js\"" /sc hourly /st 00:00 /f

echo.
echo ✅ Scheduled task created successfully!
echo.
echo Task Name: MECA YouTube Auto-Fetch
echo Schedule: Runs every hour (checks if it's time to fetch based on your settings)
echo Script: %SCRIPT_DIR%youtube-auto-fetch.js
echo.
echo You can view/modify the task in Windows Task Scheduler
echo.
pause
