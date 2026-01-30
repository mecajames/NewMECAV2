# MECA Database & Storage Restore Script
# Use this to restore from a backup

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [switch]$DatabaseOnly,
    [switch]$StorageOnly,
    [switch]$Force
)

# Configuration
$ContainerName = "supabase_db_NewMECAV2"
$StorageVolume = "supabase_storage_NewMECAV2"
$DbUser = "postgres"
$TempDir = "$env:TEMP\meca_restore_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MECA Restore Utility" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Validate backup file
if (!(Test-Path $BackupFile)) {
    Write-Host "ERROR: Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "Backup file: $BackupFile" -ForegroundColor Gray

# Confirm restore
if (!$Force) {
    Write-Host ""
    Write-Host "WARNING: This will OVERWRITE your current database and/or storage!" -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Are you sure you want to continue? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "Restore cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Create temp directory
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

# Extract backup
Write-Host ""
Write-Host "Extracting backup..." -ForegroundColor Yellow
Expand-Archive -Path $BackupFile -DestinationPath $TempDir -Force

# Find the database and storage files
$DbFile = Get-ChildItem -Path $TempDir -Filter "database_*.sql" | Select-Object -First 1
$StorageFile = Get-ChildItem -Path $TempDir -Filter "storage_*.tar" | Select-Object -First 1

Write-Host "  Found database backup: $($DbFile.Name)" -ForegroundColor Gray
if ($StorageFile) {
    Write-Host "  Found storage backup: $($StorageFile.Name)" -ForegroundColor Gray
}

# ========================================
# RESTORE DATABASE
# ========================================
if (!$StorageOnly -and $DbFile) {
    Write-Host ""
    Write-Host "[1/2] Restoring database..." -ForegroundColor Yellow

    # Check if container is running
    $containerStatus = docker ps --filter "name=$ContainerName" --format "{{.Status}}" 2>$null
    if (!$containerStatus) {
        Write-Host "ERROR: Docker container '$ContainerName' is not running!" -ForegroundColor Red
        exit 1
    }

    try {
        # Copy SQL file to container and restore
        docker cp $DbFile.FullName ${ContainerName}:/tmp/restore.sql
        docker exec $ContainerName psql -U $DbUser -d postgres -f /tmp/restore.sql 2>&1 | Out-Null
        docker exec $ContainerName rm /tmp/restore.sql

        Write-Host "  Database restored successfully!" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR: Database restore failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} elseif ($StorageOnly) {
    Write-Host ""
    Write-Host "[1/2] Skipping database restore (--StorageOnly flag)" -ForegroundColor Gray
}

# ========================================
# RESTORE STORAGE VOLUME
# ========================================
if (!$DatabaseOnly -and $StorageFile) {
    Write-Host ""
    Write-Host "[2/2] Restoring storage volume..." -ForegroundColor Yellow

    try {
        # Stop storage container temporarily
        Write-Host "  Stopping storage service..." -ForegroundColor Gray
        docker stop supabase_storage_NewMECAV2 2>$null

        # Clear existing volume and restore from backup
        docker run --rm `
            -v ${StorageVolume}:/target `
            -v ${TempDir}:/backup:ro `
            alpine sh -c "rm -rf /target/* && tar -xf /backup/$($StorageFile.Name) -C /target"

        # Restart storage container
        Write-Host "  Restarting storage service..." -ForegroundColor Gray
        docker start supabase_storage_NewMECAV2 2>$null

        Start-Sleep -Seconds 3

        Write-Host "  Storage restored successfully!" -ForegroundColor Green
    } catch {
        Write-Host "  ERROR: Storage restore failed: $($_.Exception.Message)" -ForegroundColor Red
        # Make sure to restart storage even if restore fails
        docker start supabase_storage_NewMECAV2 2>$null
    }
} elseif ($DatabaseOnly) {
    Write-Host ""
    Write-Host "[2/2] Skipping storage restore (--DatabaseOnly flag)" -ForegroundColor Gray
} elseif (!$StorageFile) {
    Write-Host ""
    Write-Host "[2/2] No storage backup found in archive" -ForegroundColor Gray
}

# Cleanup temp directory
Write-Host ""
Write-Host "Cleaning up temporary files..." -ForegroundColor Gray
Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue

# Restart services
Write-Host ""
Write-Host "Restarting Supabase services..." -ForegroundColor Yellow
docker restart supabase_rest_NewMECAV2 supabase_kong_NewMECAV2 2>$null | Out-Null
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESTORE COMPLETED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please verify your data in the application." -ForegroundColor Yellow
