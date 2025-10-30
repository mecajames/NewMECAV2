#!/bin/sh
# Simple Database Analyzer using PostgreSQL CLI tools
# Compares your local Supabase database structure

echo "🔍 NewMECA Database Analyzer"
echo "=============================="
echo ""

# Check environment variables
if [ -z "$LOCAL_DB_URL" ]; then
    echo "❌ LOCAL_DB_URL not set"
    exit 1
fi

OUTPUT_DIR="/app/output"
mkdir -p "$OUTPUT_DIR"

echo "📊 Analyzing local Supabase database..."
echo ""

# Export full schema
echo "1️⃣  Exporting database schema..."
pg_dump --schema-only "$LOCAL_DB_URL" > "$OUTPUT_DIR/local-schema.sql" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Schema exported to local-schema.sql"
else
    echo "❌ Failed to export schema"
fi

# Get table list with row counts
echo ""
echo "2️⃣  Analyzing tables..."
psql "$LOCAL_DB_URL" -c "
SELECT 
    schemaname as schema,
    tablename as table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
" > "$OUTPUT_DIR/tables-summary.txt" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Table summary saved"
    cat "$OUTPUT_DIR/tables-summary.txt"
fi

# Get column details
echo ""
echo "3️⃣  Extracting column information..."
psql "$LOCAL_DB_URL" -c "
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
" > "$OUTPUT_DIR/columns.txt" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Column details saved"
fi

# Get foreign keys
echo ""
echo "4️⃣  Finding foreign key relationships..."
psql "$LOCAL_DB_URL" -c "
SELECT
    tc.table_name as from_table,
    kcu.column_name as from_column,
    ccu.table_name as to_table,
    ccu.column_name as to_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
" > "$OUTPUT_DIR/foreign-keys.txt" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Foreign keys saved"
    cat "$OUTPUT_DIR/foreign-keys.txt"
fi

# Get indexes
echo ""
echo "5️⃣  Listing indexes..."
psql "$LOCAL_DB_URL" -c "
SELECT
    tablename as table,
    indexname as index,
    indexdef as definition
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
" > "$OUTPUT_DIR/indexes.txt" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Indexes saved"
fi

# Generate summary report
echo ""
echo "6️⃣  Generating summary report..."

cat > "$OUTPUT_DIR/ANALYSIS_REPORT.md" << EOF
# NewMECA Database Analysis Report

Generated: $(date)

## Database Connection
- Local Supabase: \`$LOCAL_DB_URL\`

## Files Generated

1. **local-schema.sql** - Complete database schema export
2. **tables-summary.txt** - All tables with sizes
3. **columns.txt** - Detailed column information
4. **foreign-keys.txt** - Foreign key relationships
5. **indexes.txt** - All database indexes

## Quick Stats

EOF

# Add table count
TABLE_COUNT=$(psql "$LOCAL_DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
echo "- **Tables**: $TABLE_COUNT" >> "$OUTPUT_DIR/ANALYSIS_REPORT.md"

# Add database size
DB_SIZE=$(psql "$LOCAL_DB_URL" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" 2>/dev/null | tr -d ' ')
echo "- **Database Size**: $DB_SIZE" >> "$OUTPUT_DIR/ANALYSIS_REPORT.md"

echo "" >> "$OUTPUT_DIR/ANALYSIS_REPORT.md"
echo "## Tables" >> "$OUTPUT_DIR/ANALYSIS_REPORT.md"
echo "" >> "$OUTPUT_DIR/ANALYSIS_REPORT.md"
echo "\`\`\`" >> "$OUTPUT_DIR/ANALYSIS_REPORT.md"
cat "$OUTPUT_DIR/tables-summary.txt" >> "$OUTPUT_DIR/ANALYSIS_REPORT.md" 2>/dev/null
echo "\`\`\`" >> "$OUTPUT_DIR/ANALYSIS_REPORT.md"

echo ""
echo "✅ Analysis complete!"
echo ""
echo "📁 Results saved to: $OUTPUT_DIR/"
echo ""
echo "View the report:"
echo "  cat docker/analysis-output/ANALYSIS_REPORT.md"
echo ""
