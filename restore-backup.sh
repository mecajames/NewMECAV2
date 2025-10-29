#!/bin/bash

# Database Restoration Script
# This script restores the database from a backup file

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: ./restore-backup.sh <backup_file>"
    echo "Example: ./restore-backup.sh ./backups/backup_20251023_114431.sql"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/*.sql
    exit 1
fi

BACKUP_FILE=$1

# Check if file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Starting database restoration..."
echo "📁 Backup file: $BACKUP_FILE"
echo ""

# Stop Supabase (this will preserve the container)
echo "🛑 Stopping Supabase..."
npx supabase stop

# Start Supabase fresh
echo "🚀 Starting Supabase..."
npx supabase start

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Drop and recreate public schema to clean everything
echo "🧹 Cleaning database..."
docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;"

# Restore from backup
echo "📦 Restoring from backup..."
cat "$BACKUP_FILE" | docker exec -i supabase_db_NewMECAV2 psql -U postgres -d postgres

# Verify restoration
echo ""
echo "✅ Verifying restoration..."
echo "Checking your user account:"
docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "SELECT email, first_name, last_name, meca_id, role FROM profiles WHERE email='james@mecacaraudio.com';"

echo ""
echo "Checking rulebooks count:"
docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "SELECT COUNT(*) as rulebook_count FROM rulebooks;"

echo ""
echo "Checking events count:"
docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "SELECT COUNT(*) as event_count FROM events;"

echo ""
echo "Checking site settings count:"
docker exec supabase_db_NewMECAV2 psql -U postgres -d postgres -c "SELECT COUNT(*) as settings_count FROM site_settings;"

echo ""
echo "✅ Database restoration complete!"
echo "🌐 Frontend should be running at: http://localhost:5173"
echo "📧 Login email: james@mecacaraudio.com"
echo "🔑 Password: Admin123!"
