#!/usr/bin/env python3
"""
Phase 2: Import historical data from dump_production.sql into the current database.
Uses temp tables and ON CONFLICT DO NOTHING to preserve existing records.
"""

import subprocess
import re
import sys

DUMP_FILE = "E:/MECA Oct 2025/NewMECAV2/apps/backend/src/migrations/dump_production.sql"
DOCKER_CMD = ["docker", "exec", "-i", "supabase_db_NewMECAV2", "psql", "-U", "postgres", "-d", "postgres"]

# Column indices to skip (0-based) - these columns don't exist in current schema
COLUMN_MAPPINGS = {
    'events': {'skip_indices': [17]},           # format column at position 18
    'competition_results': {'skip_indices': [22]},  # state_code at position 23
    'profiles': {'skip_indices': [27]},          # membership_expires_at at position 28
}

def run_psql(sql, description=""):
    """Run SQL command via psql in docker"""
    if description:
        print(f"  {description}...")
    proc = subprocess.run(
        DOCKER_CMD,
        input=sql.encode('utf-8'),
        capture_output=True
    )
    if proc.returncode != 0:
        error = proc.stderr.decode('utf-8')
        print(f"  ERROR: {error}")
        return False, error
    output = proc.stdout.decode('utf-8')
    return True, output

def extract_copy_data(table_name):
    """Extract COPY data for a table from the dump file"""
    with open(DUMP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the COPY statement and data - handle various formats
    patterns = [
        rf'COPY public\.{table_name} \([^)]+\) FROM stdin;\n(.*?)\n\\.',
        rf'COPY {table_name} \([^)]+\) FROM stdin;\n(.*?)\n\\.',
        rf'COPY public\.{table_name} FROM stdin;\n(.*?)\n\\.',
        rf'COPY {table_name} FROM stdin;\n(.*?)\n\\.',
    ]

    for pattern in patterns:
        match = re.search(pattern, content, re.DOTALL)
        if match:
            return match.group(1)

    print(f"  No data found for table {table_name}")
    return None

def transform_row(row, skip_indices):
    """Transform a row by removing columns at skip_indices"""
    columns = row.split('\t')
    new_columns = [col for i, col in enumerate(columns) if i not in skip_indices]
    return '\t'.join(new_columns)

def get_table_columns(table_name):
    """Get the column list for a table from the current schema"""
    sql = f"""
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '{table_name}';
    """
    success, output = run_psql(sql)
    if not success:
        return None
    # Parse the output - column list is on the third line
    lines = output.strip().split('\n')
    for line in lines:
        line = line.strip()
        if line and not line.startswith('-') and not line.startswith('string_agg') and not line.startswith('('):
            return line
    return None

def get_primary_key(table_name):
    """Get the primary key column for a table"""
    sql = f"""
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'public.{table_name}'::regclass AND i.indisprimary;
    """
    success, output = run_psql(sql)
    if not success:
        return 'id'  # Default to 'id'
    lines = output.strip().split('\n')
    for line in lines:
        line = line.strip()
        if line and not line.startswith('-') and not line.startswith('attname') and not line.startswith('('):
            return line
    return 'id'

def import_table(table_name):
    """Import data for a table using temp table + ON CONFLICT approach"""
    print(f"\n{'='*60}")
    print(f"Importing {table_name}...")
    print(f"{'='*60}")

    # Get the data from dump
    data = extract_copy_data(table_name)
    if data is None:
        return False, 0

    lines = data.strip().split('\n')
    original_count = len(lines)
    print(f"  Found {original_count} rows in dump")

    # Transform data if needed (remove extra columns)
    if table_name in COLUMN_MAPPINGS:
        skip_indices = COLUMN_MAPPINGS[table_name]['skip_indices']
        print(f"  Transforming: removing column indices {skip_indices}")
        lines = [transform_row(line, skip_indices) for line in lines]

    transformed_data = '\n'.join(lines)

    # Get current column list from schema
    columns = get_table_columns(table_name)
    if not columns:
        print(f"  ERROR: Could not get columns for {table_name}")
        return False, 0
    print(f"  Target columns: {columns[:80]}...")

    # Get primary key
    pk = get_primary_key(table_name)
    print(f"  Primary key: {pk}")

    # Create temp table, copy data, then insert with ON CONFLICT
    sql = f"""
SET session_replication_role = replica;

-- Create temp table with same structure
CREATE TEMP TABLE tmp_{table_name} (LIKE public.{table_name} INCLUDING ALL);

-- Copy data into temp table
COPY tmp_{table_name} ({columns}) FROM stdin;
{transformed_data}
\\.

-- Insert from temp to real table, skip duplicates
INSERT INTO public.{table_name} ({columns})
SELECT {columns} FROM tmp_{table_name}
ON CONFLICT ({pk}) DO NOTHING;

-- Get count of what was inserted
SELECT COUNT(*) as imported FROM public.{table_name};

-- Cleanup
DROP TABLE tmp_{table_name};

SET session_replication_role = DEFAULT;
"""

    success, output = run_psql(sql, f"Executing import")
    if success:
        # Parse the count from output
        match = re.search(r'(\d+)', output.split('imported')[-1] if 'imported' in output else output)
        if match:
            final_count = int(match.group(1))
            print(f"  Final table count: {final_count}")

    return success, original_count

def main():
    # Import order respects foreign key dependencies
    tables_to_import = [
        'seasons',
        'events',
        'competition_classes',
        'profiles',
        'memberships',
        'competition_results',
        'orders'
    ]

    print("="*60)
    print("Phase 2: Historical Data Import")
    print("="*60)
    print("\nThis will import data from dump_production.sql")
    print("Existing records will be preserved (ON CONFLICT DO NOTHING)\n")

    results = {}
    for table in tables_to_import:
        success, count = import_table(table)
        results[table] = {'success': success, 'count': count}
        if not success:
            print(f"  WARNING: Failed to import {table}, continuing with others...")

    print("\n" + "="*60)
    print("Import Summary")
    print("="*60)
    for table, result in results.items():
        status = "OK" if result['success'] else "FAILED"
        print(f"  {table}: {result['count']} rows attempted [{status}]")

    # Final counts
    print("\n" + "="*60)
    print("Final Database Counts")
    print("="*60)

    count_sql = """
    SELECT 'seasons' as table_name, COUNT(*) as count FROM seasons
    UNION ALL SELECT 'events', COUNT(*) FROM events
    UNION ALL SELECT 'competition_classes', COUNT(*) FROM competition_classes
    UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
    UNION ALL SELECT 'memberships', COUNT(*) FROM memberships
    UNION ALL SELECT 'competition_results', COUNT(*) FROM competition_results
    UNION ALL SELECT 'orders', COUNT(*) FROM orders
    ORDER BY table_name;
    """
    success, output = run_psql(count_sql, "Getting final counts")
    if success:
        print(output)

if __name__ == '__main__':
    main()
