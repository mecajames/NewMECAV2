#!/bin/bash

# Complete Backup Script - Database + Storage Files
# This backs up both the database AND the actual files in Supabase storage

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/complete_$TIMESTAMP"

echo "🔄 Creating complete backup..."
echo "📁 Backup directory: $BACKUP_DIR"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/storage"

# 1. Backup database
echo "💾 Backing up database..."
docker exec supabase_db_NewMECAV2 pg_dump -U postgres -d postgres > "$BACKUP_DIR/database.sql" 2>&1

if [ $? -eq 0 ]; then
    echo "   ✅ Database backed up: $(du -h "$BACKUP_DIR/database.sql" | cut -f1)"
else
    echo "   ❌ Database backup failed"
    exit 1
fi

# 2. Backup storage files from Docker container
echo ""
echo "📦 Backing up storage files..."

# Copy the entire storage directory from the Supabase storage container
# The storage files are in /mnt in the supabase_storage_NewMECAV2 container
docker cp supabase_storage_NewMECAV2:/mnt "$BACKUP_DIR/storage/" 2>/dev/null

if [ $? -eq 0 ]; then
    STORAGE_SIZE=$(du -sh "$BACKUP_DIR/storage" | cut -f1)
    echo "   ✅ Storage files backed up: $STORAGE_SIZE"
else
    echo "   ⚠️  Warning: Could not backup storage files (container may not have files yet)"
fi

# 3. Create backup manifest
echo ""
echo "📋 Creating backup manifest..."
cat > "$BACKUP_DIR/manifest.txt" <<EOF
MECA Complete Backup
===================
Timestamp: $TIMESTAMP
Date: $(date)

Contents:
- database.sql: PostgreSQL database dump
- storage/: Supabase storage files (PDFs, images, etc.)

Database Stats:
- Size: $(du -h "$BACKUP_DIR/database.sql" | cut -f1)
- Lines: $(wc -l < "$BACKUP_DIR/database.sql")

Storage Stats:
- Size: $(du -sh "$BACKUP_DIR/storage" 2>/dev/null | cut -f1 || echo "0")

User Account:
- Email: james@mecacaraudio.com
- MECA ID: 202401
- Role: admin

To Restore:
-----------
1. Database: cat database.sql | docker exec -i supabase_db_NewMECAV2 psql -U postgres -d postgres
2. Storage: docker cp storage/storage supabase_storage_NewMECAV2:/var/lib/
EOF

echo "   ✅ Manifest created"

# 4. Create compressed archive
echo ""
echo "🗜️  Compressing backup..."
cd backups
tar -czf "complete_$TIMESTAMP.tar.gz" "complete_$TIMESTAMP" 2>/dev/null

if [ $? -eq 0 ]; then
    ARCHIVE_SIZE=$(du -h "complete_$TIMESTAMP.tar.gz" | cut -f1)
    echo "   ✅ Backup compressed: $ARCHIVE_SIZE"
    echo ""
    echo "✅ Complete backup finished!"
    echo ""
    echo "📦 Backup archive: backups/complete_$TIMESTAMP.tar.gz ($ARCHIVE_SIZE)"
    echo "📂 Backup folder: backups/complete_$TIMESTAMP"
    echo ""
    echo "To restore: ./scripts/complete-restore.sh backups/complete_$TIMESTAMP.tar.gz"
else
    echo "   ⚠️  Compression failed, but backup folder is available"
    echo ""
    echo "✅ Complete backup finished!"
    echo ""
    echo "📂 Backup folder: backups/complete_$TIMESTAMP"
fi

cd ..
