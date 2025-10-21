#!/bin/bash
# Quick export of a single table from Supabase Studio

TABLE_NAME="${1:-site_settings}"

echo "📦 Quick Table Export: $TABLE_NAME"
echo ""
echo "🌐 Open Supabase Studio and run this SQL:"
echo ""
echo "COPY (SELECT * FROM $TABLE_NAME) TO STDOUT WITH (FORMAT CSV, HEADER);"
echo ""
echo "Then save the output to: backups/tables/${TABLE_NAME}.csv"
echo ""
echo "Or use the SQL Editor to export as CSV:"
echo "  1. Go to SQL Editor in Supabase Studio"
echo "  2. Run: SELECT * FROM $TABLE_NAME;"
echo "  3. Click 'Download as CSV'"
echo "  4. Save to backups/tables/${TABLE_NAME}.csv"
echo ""
echo "📥 To import into local:"
echo ""
echo "  psql postgresql://postgres:postgres@localhost:54322/postgres -c \\"
echo "    \"COPY $TABLE_NAME FROM '/path/to/${TABLE_NAME}.csv' CSV HEADER;\""
echo ""
