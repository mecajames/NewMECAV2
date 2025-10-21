#!/bin/bash
# Export tables from Supabase and import to local Docker

set -e

echo "🔄 Supabase Data Export/Import Tool"
echo "===================================="
echo ""

# Configuration
PROD_DB_URL="${VITE_SUPABASE_URL}"
LOCAL_DB_URL="postgresql://postgres:postgres@localhost:54322/postgres"

# Check if we have the Supabase connection
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ VITE_SUPABASE_URL not set"
    echo "Set it in .env.development or export it"
    exit 1
fi

# Get the database connection string from Supabase dashboard
echo "📋 To get your production database URL:"
echo "   1. Go to: https://supabase.com/dashboard/project/garsyqgdjpryqleufrev/settings/database"
echo "   2. Copy the 'Connection string' (URI format)"
echo "   3. Paste it when prompted below"
echo ""

read -p "Enter your Supabase database connection string (or press Enter to skip): " PROD_CONNECTION

if [ -z "$PROD_CONNECTION" ]; then
    echo ""
    echo "⚠️  No connection string provided"
    echo ""
    echo "Alternative method using Supabase CLI:"
    echo "  supabase db dump --db-url 'your-connection-string' -f dump.sql"
    echo "  supabase db reset"
    echo ""
    exit 0
fi

# Create backup directory
BACKUP_DIR="./backups/export-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo ""
echo "📦 Exporting specific tables from production..."

# Tables to export (add/remove as needed)
TABLES=(
    "profiles"
    "events"
    "event_registrations"
    "competition_results"
    "memberships"
    "rulebooks"
    "site_settings"
)

# Export schema and data for each table
for table in "${TABLES[@]}"; do
    echo "  ⏳ Exporting: $table"
    
    # Export schema
    pg_dump "$PROD_CONNECTION" \
        --schema-only \
        --table="public.$table" \
        --no-owner \
        --no-acl \
        > "$BACKUP_DIR/${table}_schema.sql" 2>/dev/null || echo "    ⚠️  Schema export failed"
    
    # Export data
    pg_dump "$PROD_CONNECTION" \
        --data-only \
        --table="public.$table" \
        --column-inserts \
        --no-owner \
        --no-acl \
        > "$BACKUP_DIR/${table}_data.sql" 2>/dev/null || echo "    ⚠️  Data export failed"
    
    if [ -f "$BACKUP_DIR/${table}_schema.sql" ] && [ -f "$BACKUP_DIR/${table}_data.sql" ]; then
        echo "    ✅ Exported"
    fi
done

echo ""
echo "📥 Importing into local Supabase..."

# Make sure local Supabase is running
if ! docker ps | grep -q "supabase_db_NewMECAV2"; then
    echo "❌ Local Supabase is not running"
    echo "   Start it with: supabase start"
    exit 1
fi

# Import each table
for table in "${TABLES[@]}"; do
    if [ -f "$BACKUP_DIR/${table}_schema.sql" ]; then
        echo "  ⏳ Importing: $table"
        
        # Import schema first
        psql "$LOCAL_DB_URL" -f "$BACKUP_DIR/${table}_schema.sql" 2>&1 | grep -v "ERROR.*already exists" || true
        
        # Import data
        if [ -f "$BACKUP_DIR/${table}_data.sql" ]; then
            psql "$LOCAL_DB_URL" -f "$BACKUP_DIR/${table}_data.sql" > /dev/null 2>&1 || echo "    ⚠️  Some data may already exist"
            echo "    ✅ Imported"
        fi
    fi
done

echo ""
echo "✅ Export/Import complete!"
echo ""
echo "📁 Backup saved to: $BACKUP_DIR"
echo ""
echo "🔍 Verify with:"
echo "   make shell"
echo "   \\dt"
echo "   SELECT * FROM profiles LIMIT 5;"
echo ""
