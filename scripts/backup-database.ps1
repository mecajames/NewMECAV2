# MECA Database & Storage Backup Script
# Run this script manually or via Windows Task Scheduler

param(
    [string]$BackupDir = "E:\MECA Oct 2025\Backups\Automated Backups",
    [int]$RetainDays = 30,
    [switch]$SkipStorage
)

# Configuration
$ContainerName = "supabase_db_NewMECAV2"
$StorageVolume = "supabase_storage_NewMECAV2"
$DbUser = "postgres"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$DateFolder = Get-Date -Format "MMMM_dd_yyyy"
$BackupPath = "$BackupDir\${DateFolder}_Backup"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MECA Full Backup - $Timestamp" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Create backup directory if it doesn't exist
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force | Out-Null
    Write-Host "Created backup directory: $BackupPath" -ForegroundColor Green
}

# Check if Docker container is running
$containerStatus = docker ps --filter "name=$ContainerName" --format "{{.Status}}" 2>$null
if (!$containerStatus) {
    Write-Host "ERROR: Docker container '$ContainerName' is not running!" -ForegroundColor Red
    exit 1
}

Write-Host "Container status: $containerStatus" -ForegroundColor Gray

# ========================================
# 1. DATABASE BACKUP
# ========================================
Write-Host ""
Write-Host "[1/3] Backing up database..." -ForegroundColor Yellow
$DbBackupFile = "$BackupPath\database_$Timestamp.sql"

try {
    docker exec $ContainerName pg_dump -U $DbUser -d postgres --clean --if-exists --no-owner --no-acl > $DbBackupFile

    if ($LASTEXITCODE -eq 0 -and (Test-Path $DbBackupFile)) {
        $FileSize = (Get-Item $DbBackupFile).Length / 1MB
        Write-Host "  Database backup completed! Size: $([math]::Round($FileSize, 2)) MB" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Database backup failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ========================================
# 2. STORAGE VOLUME BACKUP (Images/Files)
# ========================================
if (!$SkipStorage) {
    Write-Host ""
    Write-Host "[2/3] Backing up storage volume (images/files)..." -ForegroundColor Yellow
    $StorageBackupFile = "$BackupPath\storage_$Timestamp.tar"

    try {
        # Use a temporary container to backup the volume
        # This creates a tar archive of the entire storage volume
        docker run --rm `
            -v ${StorageVolume}:/source:ro `
            -v ${BackupPath}:/backup `
            alpine tar -cf /backup/storage_$Timestamp.tar -C /source .

        if ($LASTEXITCODE -eq 0 -and (Test-Path $StorageBackupFile)) {
            $StorageSize = (Get-Item $StorageBackupFile).Length / 1MB
            Write-Host "  Storage backup completed! Size: $([math]::Round($StorageSize, 2)) MB" -ForegroundColor Green
        } else {
            Write-Host "  WARNING: Storage backup may have failed or volume is empty" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  WARNING: Storage backup failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "[2/3] Skipping storage backup (--SkipStorage flag)" -ForegroundColor Gray
    $StorageBackupFile = $null
}

# ========================================
# 3. CREATE COMPRESSED ARCHIVE
# ========================================
Write-Host ""
Write-Host "[3/3] Creating compressed archive..." -ForegroundColor Yellow
$ZipFile = "$BackupPath\meca_full_backup_$Timestamp.zip"

$FilesToCompress = @($DbBackupFile)
if ($StorageBackupFile -and (Test-Path $StorageBackupFile)) {
    $FilesToCompress += $StorageBackupFile
}

Compress-Archive -Path $FilesToCompress -DestinationPath $ZipFile -Force

# Clean up uncompressed files
foreach ($file in $FilesToCompress) {
    if (Test-Path $file) {
        Remove-Item $file -Force
    }
}

$ZipSize = (Get-Item $ZipFile).Length / 1MB
Write-Host "  Compressed archive created! Size: $([math]::Round($ZipSize, 2)) MB" -ForegroundColor Green

# ========================================
# 4. CLEANUP OLD BACKUPS
# ========================================
Write-Host ""
Write-Host "Cleaning up backups older than $RetainDays days..." -ForegroundColor Yellow
$CutoffDate = (Get-Date).AddDays(-$RetainDays)
$RemovedCount = 0

Get-ChildItem -Path $BackupDir -Directory | Where-Object {
    $_.Name -match "^\w+_\d{2}_\d{4}_Backup$" -and $_.LastWriteTime -lt $CutoffDate
} | ForEach-Object {
    Write-Host "  Removing old backup: $($_.Name)" -ForegroundColor Gray
    Remove-Item $_.FullName -Recurse -Force
    $RemovedCount++
}

if ($RemovedCount -eq 0) {
    Write-Host "  No old backups to remove" -ForegroundColor Gray
}

# ========================================
# SUMMARY
# ========================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "BACKUP COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup Location:" -ForegroundColor White
Write-Host "  $ZipFile" -ForegroundColor Gray
Write-Host ""
Write-Host "Contents:" -ForegroundColor White
Write-Host "  - Database: All tables, schema, data" -ForegroundColor Gray
if (!$SkipStorage) {
    Write-Host "  - Storage: Profile images, team logos, galleries" -ForegroundColor Gray
}
Write-Host ""
Write-Host "Total Size: $([math]::Round($ZipSize, 2)) MB" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
