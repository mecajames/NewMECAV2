# Setup Windows Task Scheduler for Automated Database Backups
# Run this script once as Administrator to create the scheduled task

param(
    [string]$TaskName = "MECA_Database_Backup",
    [string]$BackupTime = "02:00",  # 2 AM daily
    [switch]$Remove
)

# Check for admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (!$isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

$ScriptPath = "E:\MECA Oct 2025\NewMECAV2\scripts\backup-database.ps1"
$BackupDir = "E:\MECA Oct 2025\Backups\Automated Backups"

# Remove existing task if requested or if recreating
if ($Remove -or (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue)) {
    if ($Remove) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
        Write-Host "Task '$TaskName' has been removed." -ForegroundColor Green
        exit 0
    }
    Write-Host "Removing existing task to recreate..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setting up Automated Database Backup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Create the action
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`" -BackupDir `"$BackupDir`""

# Create daily trigger at specified time
$Trigger = New-ScheduledTaskTrigger -Daily -At $BackupTime

# Task settings
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable:$false

# Principal (run whether user is logged in or not)
$Principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest

# Register the task
try {
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "Automated daily backup of MECA PostgreSQL database"

    Write-Host ""
    Write-Host "Scheduled task created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name: $TaskName"
    Write-Host "  Schedule: Daily at $BackupTime"
    Write-Host "  Backup Location: $BackupDir"
    Write-Host "  Retention: 30 days"
    Write-Host ""
    Write-Host "To test the backup now, run:" -ForegroundColor Yellow
    Write-Host "  & '$ScriptPath'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To remove this scheduled task later:" -ForegroundColor Yellow
    Write-Host "  .\setup-scheduled-backup.ps1 -Remove" -ForegroundColor Gray

} catch {
    Write-Host "ERROR: Failed to create scheduled task: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
