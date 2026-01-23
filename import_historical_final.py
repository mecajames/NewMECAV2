#!/usr/bin/env python3
"""
Historical Data Import Script - Final Version
Imports data from dump_production.sql with proper transformations:
- Skips extra columns where needed
- Reorders columns for events
- Normalizes country codes to ISO standards
- Uses ON CONFLICT DO NOTHING to preserve existing data
"""

import subprocess
import re
import sys

DUMP_FILE = "E:/MECA Oct 2025/NewMECAV2/apps/backend/src/migrations/dump_production.sql"
DOCKER_CMD = ["docker", "exec", "-i", "supabase_db_NewMECAV2", "psql", "-U", "postgres", "-d", "postgres"]

# Table configurations
# skip_indices: dump column indices to skip (0-based)
# column_reorder: map from dump index (after skip) to local index (for events only)
TABLE_CONFIGS = {
    'seasons': {
        'skip_indices': [],
        'column_reorder': None,  # Direct 1:1 mapping
        'num_local_cols': 9,     # Local has 10 but dump only has 9
    },
    'competition_classes': {
        'skip_indices': [],
        'column_reorder': None,
        'num_local_cols': 9,
    },
    'profiles': {
        'skip_indices': [26],  # Skip col 27 (membership_expires_at, 0-indexed: 26)
        'column_reorder': None,  # After skip, columns align
        'num_local_cols': 50,
        'iso_normalize': {
            19: 'country',   # billing_country
            24: 'country',   # shipping_country
            31: 'country',   # country
        }
    },
    'events': {
        'skip_indices': [17],  # Skip col 18 (format, 0-indexed: 17)
        'column_reorder': {
            # After skipping col 17, map remaining cols to local positions
            # Dump cols 0-15 -> Local cols 0-15 (direct)
            # Dump col 16 (season_id) -> Local col 20
            # Dump col 17 (venue_city) -> Local col 16
            # etc.
            0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7,
            8: 8, 9: 9, 10: 10, 11: 11, 12: 12, 13: 13, 14: 14, 15: 15,
            16: 20,  # season_id
            17: 16,  # venue_city (after skip)
            18: 17,  # venue_state
            19: 18,  # venue_postal_code
            20: 19,  # venue_country
            21: 21,  # points_multiplier
            22: 23,  # event_type
            23: 24,  # multi_day_group_id
            24: 25,  # day_number
            25: 26,  # member_entry_fee
            26: 27,  # non_member_entry_fee
            27: 28,  # has_gate_fee
            28: 29,  # gate_fee
            29: 30,  # flyer_image_position
            30: 22,  # formats
            31: 31,  # multi_day_results_mode
        },
        'num_local_cols': 32,
        'iso_normalize': {
            20: 'country',  # venue_country (dump col 21, after skip col 20)
        }
    },
    'memberships': {
        'skip_indices': [],
        'column_reorder': None,
        'num_local_cols': 40,
        'iso_normalize': {
            16: 'country',  # billing_country
        }
    },
    'competition_results': {
        'skip_indices': [22],  # Skip col 23 (state_code, 0-indexed: 22)
        'column_reorder': None,
        'num_local_cols': 22,
    },
    'orders': {
        'skip_indices': [],
        'column_reorder': None,
        'num_local_cols': 26,
    },
}

# ISO Country normalization
COUNTRY_NORMALIZE = {
    'USA': 'US',
    'United States': 'US',
    'U.S.A.': 'US',
    'U.S.': 'US',
    'united states': 'US',
    'usa': 'US',
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
        if error.strip():
            print(f"  ERROR: {error[:500]}")
        return False, error
    output = proc.stdout.decode('utf-8')
    return True, output


def extract_copy_data(table_name):
    """Extract COPY data for a table from the dump file"""
    with open(DUMP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = rf'COPY {table_name} FROM stdin;\n(.*?)\n\\.'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        return match.group(1)
    return None


def normalize_country(value):
    """Normalize country code to ISO standard"""
    if value in COUNTRY_NORMALIZE:
        return COUNTRY_NORMALIZE[value]
    return value


def transform_row(row, config):
    """Transform a row based on configuration"""
    columns = row.split('\t')
    skip_indices = config.get('skip_indices', [])
    column_reorder = config.get('column_reorder')
    num_local_cols = config.get('num_local_cols', len(columns))
    iso_normalize = config.get('iso_normalize', {})

    # First, apply ISO normalization to original columns
    for col_idx, field_type in iso_normalize.items():
        if col_idx < len(columns) and field_type == 'country':
            columns[col_idx] = normalize_country(columns[col_idx])

    # Remove skipped columns
    filtered = [col for i, col in enumerate(columns) if i not in skip_indices]

    # Apply reordering if specified
    if column_reorder:
        output = ['\\N'] * num_local_cols
        for src_idx, dst_idx in column_reorder.items():
            if src_idx < len(filtered):
                output[dst_idx] = filtered[src_idx]
        return '\t'.join(output)
    else:
        return '\t'.join(filtered)


def get_local_columns(table_name):
    """Get column names from local database"""
    sql = f"""
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '{table_name}';
    """
    success, output = run_psql(sql)
    if not success:
        return None
    lines = output.strip().split('\n')
    for line in lines:
        line = line.strip()
        if line and not line.startswith('-') and not line.startswith('string_agg') and not line.startswith('('):
            return line
    return None


def import_table(table_name):
    """Import data for a table"""
    print(f"\n{'='*60}")
    print(f"Importing {table_name}...")
    print(f"{'='*60}")

    config = TABLE_CONFIGS.get(table_name, {})

    # Extract data from dump
    data = extract_copy_data(table_name)
    if data is None:
        print(f"  No data found for {table_name}")
        return False, 0

    lines = data.strip().split('\n')
    original_count = len(lines)
    print(f"  Found {original_count} rows in dump")

    # Transform rows
    skip_indices = config.get('skip_indices', [])
    if skip_indices or config.get('column_reorder') or config.get('iso_normalize'):
        print(f"  Transforming data (skip: {skip_indices}, reorder: {bool(config.get('column_reorder'))}, iso: {bool(config.get('iso_normalize'))})")
        transformed = [transform_row(line, config) for line in lines]
    else:
        print(f"  Direct import (no transformation)")
        transformed = lines

    transformed_data = '\n'.join(transformed)

    # Get local column list
    columns = get_local_columns(table_name)
    if not columns:
        print(f"  ERROR: Could not get columns for {table_name}")
        return False, 0

    num_cols = len(columns.split(', '))
    print(f"  Target: {num_cols} columns")

    # For tables where dump has fewer cols than local (seasons)
    if table_name == 'seasons':
        # Only use first 9 columns from local
        col_list = columns.split(', ')[:9]
        columns = ', '.join(col_list)
        print(f"  Using first 9 columns: {columns[:50]}...")

    # Build import SQL
    sql = f"""
SET session_replication_role = replica;

CREATE TEMP TABLE tmp_import (LIKE public.{table_name} INCLUDING ALL);

COPY tmp_import ({columns}) FROM stdin;
{transformed_data}
\\.

INSERT INTO public.{table_name} ({columns})
SELECT {columns} FROM tmp_import
ON CONFLICT (id) DO NOTHING;

DROP TABLE tmp_import;

SET session_replication_role = DEFAULT;

SELECT COUNT(*) as total FROM public.{table_name};
"""

    success, output = run_psql(sql, "Executing import")

    if success:
        # Parse final count
        for line in output.strip().split('\n'):
            line = line.strip()
            if line.isdigit():
                print(f"  Final count: {line}")
                break

    return success, original_count


def main():
    # Import order respects foreign keys
    tables = [
        'seasons',           # No dependencies
        'competition_classes',  # Depends on seasons
        'profiles',          # No dependencies
        'events',            # Depends on seasons
        'memberships',       # Depends on profiles
        'competition_results',  # Depends on events, profiles, competition_classes
        'orders',            # Depends on profiles
    ]

    print("="*60)
    print("HISTORICAL DATA IMPORT")
    print("="*60)
    print(f"Source: {DUMP_FILE}")
    print("Mode: ON CONFLICT DO NOTHING (preserves existing data)")
    print()

    results = {}
    for table in tables:
        success, count = import_table(table)
        results[table] = {'success': success, 'dump_count': count}

    # Summary
    print("\n" + "="*60)
    print("IMPORT SUMMARY")
    print("="*60)

    for table, result in results.items():
        status = "OK" if result['success'] else "FAILED"
        print(f"  {table}: {result['dump_count']} rows [{status}]")

    # Final counts
    print("\n" + "="*60)
    print("FINAL DATABASE COUNTS")
    print("="*60)

    count_sql = """
    SELECT 'seasons' as tbl, COUNT(*) FROM seasons
    UNION ALL SELECT 'competition_classes', COUNT(*) FROM competition_classes
    UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
    UNION ALL SELECT 'events', COUNT(*) FROM events
    UNION ALL SELECT 'memberships', COUNT(*) FROM memberships
    UNION ALL SELECT 'competition_results', COUNT(*) FROM competition_results
    UNION ALL SELECT 'orders', COUNT(*) FROM orders
    ORDER BY tbl;
    """
    success, output = run_psql(count_sql)
    if success:
        print(output)


if __name__ == '__main__':
    main()
