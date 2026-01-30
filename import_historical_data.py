#!/usr/bin/env python3
"""
Import historical data from dump_production.sql into the current database schema.
This script transforms the data to fit the current schema without modifying it.
"""

import subprocess
import re
import sys

DUMP_FILE = "E:/MECA Oct 2025/NewMECAV2/apps/backend/src/migrations/dump_production.sql"
DOCKER_CMD = ["docker", "exec", "-i", "supabase_db_NewMECAV2", "psql", "-U", "postgres", "-d", "postgres"]

# Column mappings: table -> (dump_columns, current_columns, columns_to_skip_indices)
# Index is 0-based
COLUMN_MAPPINGS = {
    'events': {
        'skip_indices': [17],  # format column at position 18 (0-indexed: 17)
    },
    'competition_results': {
        'skip_indices': [22],  # state_code column at position 23 (0-indexed: 22)
    },
    'profiles': {
        'skip_indices': [27],  # membership_expires_at at position 28 (0-indexed: 27)
    },
}

def run_psql(sql):
    """Run SQL command via psql in docker"""
    proc = subprocess.run(
        DOCKER_CMD,
        input=sql.encode('utf-8'),
        capture_output=True
    )
    if proc.returncode != 0:
        print(f"Error: {proc.stderr.decode('utf-8')}")
        return False
    print(proc.stdout.decode('utf-8'))
    return True

def extract_copy_data(table_name):
    """Extract COPY data for a table from the dump file"""
    with open(DUMP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the COPY statement and data
    pattern = rf'COPY {table_name} FROM stdin;\n(.*?)\n\\.'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print(f"No data found for table {table_name}")
        return None

    return match.group(1)

def transform_row(row, skip_indices):
    """Transform a row by removing columns at skip_indices"""
    columns = row.split('\t')
    new_columns = [col for i, col in enumerate(columns) if i not in skip_indices]
    return '\t'.join(new_columns)

def import_table(table_name):
    """Import data for a table"""
    print(f"\n{'='*60}")
    print(f"Importing {table_name}...")
    print(f"{'='*60}")

    data = extract_copy_data(table_name)
    if data is None:
        return False

    lines = data.strip().split('\n')
    print(f"Found {len(lines)} rows")

    # Check if we need to transform the data
    if table_name in COLUMN_MAPPINGS:
        skip_indices = COLUMN_MAPPINGS[table_name]['skip_indices']
        print(f"Transforming data: removing column indices {skip_indices}")
        transformed_lines = [transform_row(line, skip_indices) for line in lines]
        data = '\n'.join(transformed_lines)

    # Get current column list
    get_columns_sql = f"""
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '{table_name}';
    """
    proc = subprocess.run(DOCKER_CMD, input=get_columns_sql.encode('utf-8'), capture_output=True)
    columns = proc.stdout.decode('utf-8').strip().split('\n')[-2].strip()
    print(f"Target columns: {columns[:100]}...")

    # Use COPY with explicit column list
    copy_sql = f"COPY {table_name} ({columns}) FROM stdin;\n{data}\n\\.\n"

    # Disable triggers for import
    full_sql = f"""
SET session_replication_role = replica;
{copy_sql}
SET session_replication_role = DEFAULT;
SELECT COUNT(*) as imported FROM {table_name};
"""

    return run_psql(full_sql)

def main():
    tables_to_import = ['seasons', 'events', 'competition_classes', 'competition_results', 'profiles', 'memberships', 'orders']

    print("Starting historical data import...")
    print("This will transform dump data to fit the current schema.\n")

    for table in tables_to_import:
        success = import_table(table)
        if not success:
            print(f"Failed to import {table}")
            # Continue with other tables

    print("\n" + "="*60)
    print("Import complete!")
    print("="*60)

if __name__ == '__main__':
    main()
