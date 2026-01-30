#!/usr/bin/env python3
"""Test single profile row import with verbose debugging."""

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
COUNTRY_NORMALIZE = {'USA': 'US', 'United States': 'US'}
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

# Read first row
with open(DUMP_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'COPY profiles FROM stdin;\n(.*?)\n\\.', content, re.DOTALL)
first_row = match.group(1).strip().split('\n')[0]

print(f"Original columns: {len(first_row.split(chr(9)))}")
transformed = transform_row(first_row)
print(f"Transformed columns: {len(transformed.split(chr(9)))}")

# Show the transformed values around the problematic area
trans_cols = transformed.split('\t')
print("\nTransformed values (cols 33-42):")
for i in range(33, 43):
    print(f"  Col {i}: {trans_cols[i][:50] if len(trans_cols[i]) > 50 else trans_cols[i]}")

# Get local column names for positions 33-42
proc = subprocess.run(DOCKER_CMD,
    input=b"SELECT ordinal_position, column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND ordinal_position BETWEEN 34 AND 43 ORDER BY ordinal_position;",
    capture_output=True)
print("\nLocal column types (33-42):")
print(proc.stdout.decode('utf-8'))

# Try direct COPY of the transformed row
sql = f"""
SET client_min_messages TO DEBUG1;
SET session_replication_role = replica;

CREATE TEMP TABLE tmp_single (LIKE public.profiles INCLUDING ALL);

\\echo === Attempting COPY ===
COPY tmp_single FROM stdin;
{transformed}
\\.

SELECT COUNT(*) FROM tmp_single;
"""

print("\n=== Trying COPY ===")
proc = subprocess.run(DOCKER_CMD, input=sql.encode('utf-8'), capture_output=True)
print("STDOUT:", proc.stdout.decode('utf-8'))
print("STDERR:", proc.stderr.decode('utf-8'))
