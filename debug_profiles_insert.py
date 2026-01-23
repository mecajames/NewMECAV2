#!/usr/bin/env python3
"""Debug profiles INSERT to find the actual error."""

import subprocess
import re

DUMP_FILE = "E:/MECA Oct 2025/NewMECAV2/apps/backend/src/migrations/dump_production.sql"
DOCKER_CMD = ["docker", "exec", "-i", "supabase_db_NewMECAV2", "psql", "-U", "postgres", "-d", "postgres"]

SKIP_COL = 26
COLUMN_MAP = {
    **{i: i for i in range(35)},
    35: 36, 36: 37, 37: 35, 38: 38, 39: 40, 40: 39,
    **{i: i for i in range(41, 50)},
}
COUNTRY_NORMALIZE = {'USA': 'US', 'United States': 'US', 'U.S.A.': 'US', 'U.S.': 'US'}
COUNTRY_COLS = [19, 24, 31]

def transform_row(row):
    cols = row.split('\t')
    for idx in COUNTRY_COLS:
        if idx < len(cols) and cols[idx] in COUNTRY_NORMALIZE:
            cols[idx] = COUNTRY_NORMALIZE[cols[idx]]
    filtered = [col for i, col in enumerate(cols) if i != SKIP_COL]
    output = ['\\N'] * 50
    for src_idx, dst_idx in COLUMN_MAP.items():
        if src_idx < len(filtered):
            output[dst_idx] = filtered[src_idx]
    return '\t'.join(output)

# Read dump data
with open(DUMP_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'COPY profiles FROM stdin;\n(.*?)\n\\.', content, re.DOTALL)
lines = match.group(1).strip().split('\n')
print(f"Found {len(lines)} profiles in dump")

# Check for meca_id conflicts
print("\nChecking for meca_id conflicts...")
existing_meca_ids = {'701500', '700947', '202401'}

conflict_rows = []
for i, line in enumerate(lines):
    cols = line.split('\t')
    meca_id = cols[13] if len(cols) > 13 else ''  # meca_id is at position 13
    if meca_id in existing_meca_ids:
        conflict_rows.append((i, meca_id, cols[0]))  # row index, meca_id, profile id

print(f"Found {len(conflict_rows)} rows with conflicting meca_ids:")
for idx, meca_id, profile_id in conflict_rows:
    print(f"  Row {idx}: meca_id={meca_id}, profile_id={profile_id}")

# Transform all rows
print("\nTransforming rows...")
transformed = [transform_row(line) for line in lines]
transformed_data = '\n'.join(transformed)

# Get local columns
proc = subprocess.run(DOCKER_CMD,
    input=b"SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles';",
    capture_output=True)
columns_output = proc.stdout.decode('utf-8')
columns = columns_output.strip().split('\n')[-2].strip()
print(f"Local columns: {len(columns.split(', '))}")

# Try insert with explicit error handling
sql = f"""
SET session_replication_role = replica;

-- Drop temp table if exists
DROP TABLE IF EXISTS tmp_profiles_debug;

-- Create temp table
CREATE TEMP TABLE tmp_profiles_debug (LIKE public.profiles INCLUDING ALL);

-- Copy data
COPY tmp_profiles_debug ({columns}) FROM stdin;
{transformed_data}
\\.

-- Show count in temp table
SELECT COUNT(*) as tmp_count FROM tmp_profiles_debug;

-- Try INSERT and show error
DO $$
BEGIN
    INSERT INTO public.profiles ({columns})
    SELECT {columns} FROM tmp_profiles_debug
    ON CONFLICT (id) DO NOTHING;
    RAISE NOTICE 'INSERT completed successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'INSERT failed: %', SQLERRM;
END $$;

-- Show final count
SELECT COUNT(*) as final_count FROM public.profiles;

DROP TABLE tmp_profiles_debug;
SET session_replication_role = DEFAULT;
"""

print("\n=== Running INSERT with error handling ===")
proc = subprocess.run(DOCKER_CMD, input=sql.encode('utf-8'), capture_output=True)
print("STDOUT:", proc.stdout.decode('utf-8'))
print("STDERR:", proc.stderr.decode('utf-8'))
