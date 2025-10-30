#!/bin/sh

# Database Schema Analyzer Script
# Uses PostgreSQL command-line tools to analyze database structure

echo "🔍 Analyzing database schema..."

# Check if we can connect to local database
if [ -n "$LOCAL_DB_URL" ]; then
  echo "Analyzing local PostgreSQL database..."
  
  # Export database schema
  pg_dump --schema-only -f /app/output/local-schema.sql "$LOCAL_DB_URL"
  
  # Generate schema diagram data
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
  " > /app/output/schema-columns.txt
  
  # Get table relationships
  psql "$LOCAL_DB_URL" -c "
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY';
  " > /app/output/foreign-keys.txt
  
  # Get indexes
  psql "$LOCAL_DB_URL" -c "
    SELECT
      schemaname,
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  " > /app/output/indexes.txt
  
  echo "✅ Schema analysis complete!"
  echo "📁 Files saved to /app/output/"
else
  echo "⚠️  LOCAL_DB_URL not set, skipping local database analysis"
fi

# Run Node.js analyzer
node /app/analyze-db.js
