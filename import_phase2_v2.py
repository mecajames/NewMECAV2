#!/usr/bin/env python3
"""
Phase 2: Import historical data with explicit column mapping.
Handles differences between dump schema and local schema.
"""

import subprocess
import re
import sys

DUMP_FILE = "E:/MECA Oct 2025/NewMECAV2/apps/backend/src/migrations/dump_production.sql"
DOCKER_CMD = ["docker", "exec", "-i", "supabase_db_NewMECAV2", "psql", "-U", "postgres", "-d", "postgres"]

# Define column mappings for each table
# Format: 'table': {'dump_columns': [...], 'local_columns': [...]}
# The lists must be in order and same length (after removing skipped columns)

TABLE_CONFIGS = {
    'seasons': {
        # Dump has 9 columns, local has 10 (extra: qualification_points_threshold)
        'dump_columns': ['id', 'year', 'name', 'start_date', 'end_date', 'is_current', 'is_next', 'created_at', 'updated_at'],
        'local_columns': ['id', 'year', 'name', 'start_date', 'end_date', 'is_current', 'is_next', 'created_at', 'updated_at'],
        'skip_dump_indices': [],
    },
    'events': {
        # Dump has 33 columns, local has 32 (skip: format at index 17)
        'dump_columns': ['id', 'title', 'description', 'event_date', 'registration_deadline', 'venue_name',
                        'venue_address', 'latitude', 'longitude', 'flyer_url', 'event_director_id', 'status',
                        'max_participants', 'registration_fee', 'created_at', 'updated_at', 'season_id',
                        'format',  # INDEX 17 - SKIP THIS
                        'venue_city', 'venue_state', 'venue_postal_code', 'venue_country', 'points_multiplier',
                        'event_type', 'multi_day_group_id', 'day_number', 'member_entry_fee', 'non_member_entry_fee',
                        'has_gate_fee', 'gate_fee', 'flyer_image_position', 'formats', 'multi_day_results_mode'],
        'local_columns': ['id', 'title', 'description', 'event_date', 'registration_deadline', 'venue_name',
                         'venue_address', 'latitude', 'longitude', 'flyer_url', 'event_director_id', 'status',
                         'max_participants', 'registration_fee', 'created_at', 'updated_at',
                         'venue_city', 'venue_state', 'venue_postal_code', 'venue_country', 'season_id',
                         'points_multiplier', 'formats', 'event_type', 'multi_day_group_id', 'day_number',
                         'member_entry_fee', 'non_member_entry_fee', 'has_gate_fee', 'gate_fee',
                         'flyer_image_position', 'multi_day_results_mode'],
        'skip_dump_indices': [17],  # format column
        # Mapping from dump index (after skip) to local column index
        'column_map': {
            0: 0,   # id -> id
            1: 1,   # title -> title
            2: 2,   # description -> description
            3: 3,   # event_date -> event_date
            4: 4,   # registration_deadline -> registration_deadline
            5: 5,   # venue_name -> venue_name
            6: 6,   # venue_address -> venue_address
            7: 7,   # latitude -> latitude
            8: 8,   # longitude -> longitude
            9: 9,   # flyer_url -> flyer_url
            10: 10, # event_director_id -> event_director_id
            11: 11, # status -> status
            12: 12, # max_participants -> max_participants
            13: 13, # registration_fee -> registration_fee
            14: 14, # created_at -> created_at
            15: 15, # updated_at -> updated_at
            16: 20, # season_id -> season_id (pos 20 in local)
            # 17 is format - SKIPPED
            17: 16, # venue_city -> venue_city (pos 16 in local)
            18: 17, # venue_state -> venue_state
            19: 18, # venue_postal_code -> venue_postal_code
            20: 19, # venue_country -> venue_country
            21: 21, # points_multiplier -> points_multiplier
            22: 23, # event_type -> event_type
            23: 24, # multi_day_group_id -> multi_day_group_id
            24: 25, # day_number -> day_number
            25: 26, # member_entry_fee -> member_entry_fee
            26: 27, # non_member_entry_fee -> non_member_entry_fee
            27: 28, # has_gate_fee -> has_gate_fee
            28: 29, # gate_fee -> gate_fee
            29: 30, # flyer_image_position -> flyer_image_position
            30: 22, # formats -> formats (pos 22 in local)
            31: 31, # multi_day_results_mode -> multi_day_results_mode
        }
    },
    'competition_classes': {
        'dump_columns': ['id', 'name', 'code', 'format', 'category', 'description', 'rules_url',
                        'is_active', 'created_at', 'updated_at', 'scoring_type', 'points_enabled'],
        'local_columns': ['id', 'name', 'code', 'format', 'category', 'description', 'rules_url',
                         'is_active', 'created_at', 'updated_at', 'scoring_type', 'points_enabled'],
        'skip_dump_indices': [],
    },
    'competition_results': {
        # 25 columns in dump, 24 in local (skip state_code at index 22)
        'dump_columns': ['id', 'event_id', 'competitor_id', 'competition_class_id', 'score', 'place',
                        'points', 'notes', 'created_at', 'updated_at', 'vehicle', 'vehicle_year',
                        'vehicle_make', 'vehicle_model', 'vehicle_color', 'season_id', 'category',
                        'score_details', 'competitor_name', 'organization', 'scoring_type', 'format',
                        'state_code',  # INDEX 22 - SKIP THIS
                        'num_competitors', 'tie_breaker_note'],
        'local_columns': ['id', 'event_id', 'competitor_id', 'competition_class_id', 'score', 'place',
                         'points', 'notes', 'created_at', 'updated_at', 'vehicle', 'vehicle_year',
                         'vehicle_make', 'vehicle_model', 'vehicle_color', 'season_id', 'category',
                         'score_details', 'competitor_name', 'organization', 'scoring_type', 'format',
                         'num_competitors', 'tie_breaker_note'],
        'skip_dump_indices': [22],  # state_code column
    },
    'memberships': {
        'dump_columns': ['id', 'user_id', 'membership_number', 'membership_type', 'status', 'start_date',
                        'end_date', 'created_at', 'updated_at', 'auto_renew', 'season_id', 'price_paid',
                        'stripe_subscription_id'],
        'local_columns': ['id', 'user_id', 'membership_number', 'membership_type', 'status', 'start_date',
                         'end_date', 'created_at', 'updated_at', 'auto_renew', 'season_id', 'price_paid',
                         'stripe_subscription_id'],
        'skip_dump_indices': [],
    },
    'orders': {
        'dump_columns': ['id', 'user_id', 'order_type', 'status', 'total_amount', 'stripe_payment_intent_id',
                        'created_at', 'updated_at', 'items', 'membership_id', 'event_id'],
        'local_columns': ['id', 'user_id', 'order_type', 'status', 'total_amount', 'stripe_payment_intent_id',
                         'created_at', 'updated_at', 'items', 'membership_id', 'event_id'],
        'skip_dump_indices': [],
    },
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

    # Find the COPY statement and data
    pattern = rf'COPY {table_name} FROM stdin;\n(.*?)\n\\.'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        return match.group(1)

    print(f"  No data found for table {table_name}")
    return None

def transform_row_simple(row, skip_indices):
    """Transform a row by removing columns at skip_indices"""
    columns = row.split('\t')
    new_columns = [col for i, col in enumerate(columns) if i not in skip_indices]
    return '\t'.join(new_columns)

def transform_row_mapped(row, skip_indices, column_map, num_local_cols):
    """Transform a row using column_map for reordering"""
    columns = row.split('\t')

    # First remove skipped columns
    filtered_cols = [col for i, col in enumerate(columns) if i not in skip_indices]

    # Create output array with correct size
    output = ['\\N'] * num_local_cols  # Default to NULL

    # Map columns to their new positions
    for dump_idx, local_idx in column_map.items():
        if dump_idx < len(filtered_cols):
            output[local_idx] = filtered_cols[dump_idx]

    return '\t'.join(output)

def import_table(table_name):
    """Import data for a table"""
    print(f"\n{'='*60}")
    print(f"Importing {table_name}...")
    print(f"{'='*60}")

    if table_name not in TABLE_CONFIGS:
        print(f"  No configuration for {table_name}")
        return False, 0

    config = TABLE_CONFIGS[table_name]
    skip_indices = config.get('skip_dump_indices', [])
    local_columns = config['local_columns']
    column_map = config.get('column_map', None)

    # Get the data from dump
    data = extract_copy_data(table_name)
    if data is None:
        return False, 0

    lines = data.strip().split('\n')
    original_count = len(lines)
    print(f"  Found {original_count} rows in dump")

    # Transform data
    if column_map:
        print(f"  Transforming with column mapping (skip indices: {skip_indices})")
        transformed_lines = [transform_row_mapped(line, skip_indices, column_map, len(local_columns)) for line in lines]
    elif skip_indices:
        print(f"  Transforming: removing column indices {skip_indices}")
        transformed_lines = [transform_row_simple(line, skip_indices) for line in lines]
    else:
        transformed_lines = lines

    transformed_data = '\n'.join(transformed_lines)
    columns_str = ', '.join(local_columns)
    print(f"  Target columns ({len(local_columns)}): {columns_str[:80]}...")

    # Build SQL with temp table approach
    sql = f"""
SET session_replication_role = replica;

-- Create temp table
CREATE TEMP TABLE tmp_import (LIKE public.{table_name} INCLUDING ALL);

-- Copy data into temp table
COPY tmp_import ({columns_str}) FROM stdin;
{transformed_data}
\\.

-- Insert with conflict handling
INSERT INTO public.{table_name} ({columns_str})
SELECT {columns_str} FROM tmp_import
ON CONFLICT (id) DO NOTHING;

-- Cleanup
DROP TABLE tmp_import;

SET session_replication_role = DEFAULT;

-- Report count
SELECT COUNT(*) as total FROM public.{table_name};
"""

    success, output = run_psql(sql, "Executing import")
    if success:
        # Parse count from output
        lines = output.strip().split('\n')
        for line in lines:
            if line.strip().isdigit():
                print(f"  Final table count: {line.strip()}")
                break

    return success, original_count

def main():
    tables_to_import = [
        'seasons',
        'events',
        'competition_classes',
        'competition_results',
        'memberships',
        'orders'
    ]

    # Note: profiles is complex - handle separately if needed

    print("="*60)
    print("Phase 2: Historical Data Import")
    print("="*60)
    print("\nImporting data from dump_production.sql")
    print("Existing records preserved (ON CONFLICT DO NOTHING)\n")

    results = {}
    for table in tables_to_import:
        success, count = import_table(table)
        results[table] = {'success': success, 'count': count}
        if not success:
            print(f"  WARNING: Issues with {table}, continuing...")

    print("\n" + "="*60)
    print("Import Summary")
    print("="*60)
    for table, result in results.items():
        status = "OK" if result['success'] else "ISSUES"
        print(f"  {table}: {result['count']} rows [{status}]")

    # Final counts
    print("\n" + "="*60)
    print("Final Database Counts")
    print("="*60)
    count_sql = """
    SELECT 'seasons' as tbl, COUNT(*) as cnt FROM seasons
    UNION ALL SELECT 'events', COUNT(*) FROM events
    UNION ALL SELECT 'competition_classes', COUNT(*) FROM competition_classes
    UNION ALL SELECT 'profiles', COUNT(*) FROM profiles
    UNION ALL SELECT 'memberships', COUNT(*) FROM memberships
    UNION ALL SELECT 'competition_results', COUNT(*) FROM competition_results
    UNION ALL SELECT 'orders', COUNT(*) FROM orders
    ORDER BY tbl;
    """
    success, output = run_psql(count_sql, "Getting final counts")
    if success:
        print(output)

if __name__ == '__main__':
    main()
