#!/usr/bin/env python3
import re
import subprocess

DUMP_FILE = "E:/MECA Oct 2025/NewMECAV2/apps/backend/src/migrations/dump_production.sql"
DOCKER_CMD = ["docker", "exec", "-i", "supabase_db_NewMECAV2", "psql", "-U", "postgres", "-d", "postgres"]

with open(DUMP_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'COPY profiles FROM stdin;\n(.*?)\n\\.'
match = re.search(pattern, content, re.DOTALL)
if match:
    lines = match.group(1).strip().split('\n')
    print(f"Total profiles rows: {len(lines)}")

    first_row = lines[0]
    cols = first_row.split('\t')
    print(f"Original columns: {len(cols)}")

    # Skip column 26 (0-indexed = col 27 in 1-indexed)
    skip_indices = [26]
    filtered = [col for i, col in enumerate(cols) if i not in skip_indices]
    print(f"After skip col 26: {len(filtered)}")

    # Show what column 26 contains
    print(f"\nColumn 26 (0-indexed) value: '{cols[26][:100]}'")
    print(f"Column 25: '{cols[25][:50]}'")
    print(f"Column 27: '{cols[27][:50]}'")

    # Test importing one row
    transformed_row = '\t'.join(filtered)

    # Get local columns
    proc = subprocess.run(DOCKER_CMD,
        input=b"SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles';",
        capture_output=True)
    columns_output = proc.stdout.decode('utf-8')
    print(f"\nLocal columns query result:\n{columns_output}")

    # Try a test import
    test_sql = f"""
SET client_min_messages TO WARNING;
SET session_replication_role = replica;
CREATE TEMP TABLE tmp_test (LIKE public.profiles INCLUDING ALL);
"""
    proc = subprocess.run(DOCKER_CMD, input=test_sql.encode('utf-8'), capture_output=True)
    print(f"Create temp table: {proc.returncode == 0}")
    if proc.returncode != 0:
        print(f"Error: {proc.stderr.decode('utf-8')}")
else:
    print("Pattern not found!")
