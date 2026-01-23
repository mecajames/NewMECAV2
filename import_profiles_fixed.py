#!/usr/bin/env python3
"""
Fixed profiles import with proper column mapping.
Handles both column skip (membership_expires_at) and column reordering.
"""

import subprocess
import re

DUMP_FILE = "E:/MECA Oct 2025/NewMECAV2/apps/backend/src/migrations/dump_production.sql"
DOCKER_CMD = ["docker", "exec", "-i", "supabase_db_NewMECAV2", "psql", "-U", "postgres", "-d", "postgres"]

# Dump schema column order (0-indexed, from schema_baseline):
# 0: id, 1: email, 2: full_name, 3: phone, 4: role, 5: membership_status
# 6: membership_expiry, 7: avatar_url, 8: bio, 9: created_at, 10: updated_at
# 11: first_name, 12: last_name, 13: meca_id, 14: profile_picture_url
# 15: billing_street, 16: billing_city, 17: billing_state, 18: billing_zip
# 19: billing_country, 20: shipping_street, 21: shipping_city, 22: shipping_state
# 23: shipping_zip, 24: shipping_country, 25: use_billing_for_shipping
# 26: membership_expires_at (SKIP)
# 27: address, 28: city, 29: state, 30: postal_code, 31: country, 32: is_public
# 33: vehicle_info, 34: car_audio_system, 35: profile_images
# 36: force_password_change, 37: account_type, 38: cover_image_position
# 39: is_secondary_account, 40: master_profile_id, 41: can_login, 42: is_trainer
# 43: can_apply_judge, 44: can_apply_event_director
# 45: judge_permission_granted_at, 46: judge_permission_granted_by
# 47: ed_permission_granted_at, 48: ed_permission_granted_by
# 49: judge_certification_expires, 50: ed_certification_expires

# Local schema column order (0-indexed):
# 0-25: same as dump (0-25)
# 26: address (dump 27 after skip)
# 27: city (dump 28)
# ...
# 34: profile_images (dump 35)
# 35: cover_image_position (dump 38!)
# 36: force_password_change (dump 36!)
# 37: account_type (dump 37!)
# 38: is_secondary_account (dump 39)
# 39: can_login (dump 41!)
# 40: master_profile_id (dump 40!)
# 41: is_trainer (dump 42)
# ...rest same offset

SKIP_COL = 26  # membership_expires_at

# After skipping col 26, dump indices become:
# 0-25 -> local 0-25
# 26 (was 27 address) -> local 26
# ... up to 34 (was 35 profile_images) -> local 34
# 35 (was 36 force_password_change) -> local 36
# 36 (was 37 account_type) -> local 37
# 37 (was 38 cover_image_position) -> local 35
# 38 (was 39 is_secondary_account) -> local 38
# 39 (was 40 master_profile_id) -> local 40
# 40 (was 41 can_login) -> local 39
# 41 (was 42 is_trainer) -> local 41
# 42-49 same offset -> local 42-49

# Map from dump index (after skip) to local index
COLUMN_MAP = {
    # 0-34: direct mapping
    **{i: i for i in range(35)},
    # Reordering for positions 35-40
    35: 36,  # force_password_change -> local 36
    36: 37,  # account_type -> local 37
    37: 35,  # cover_image_position -> local 35
    38: 38,  # is_secondary_account -> local 38
    39: 40,  # master_profile_id -> local 40
    40: 39,  # can_login -> local 39
    # 41-49: direct mapping
    **{i: i for i in range(41, 50)},
}

# ISO country normalization
COUNTRY_NORMALIZE = {
    'USA': 'US',
    'United States': 'US',
    'U.S.A.': 'US',
    'U.S.': 'US',
}

# Country column indices (in dump, before skip)
COUNTRY_COLS = [19, 24, 31]  # billing_country, shipping_country, country


def run_psql(sql, description=""):
    if description:
        print(f"  {description}...")
    proc = subprocess.run(DOCKER_CMD, input=sql.encode('utf-8'), capture_output=True)
    if proc.returncode != 0:
        print(f"  ERROR: {proc.stderr.decode('utf-8')[:500]}")
        return False, proc.stderr.decode('utf-8')
    return True, proc.stdout.decode('utf-8')


def normalize_country(value):
    return COUNTRY_NORMALIZE.get(value, value)


def transform_row(row):
    cols = row.split('\t')

    # Normalize country columns (before skip)
    for idx in COUNTRY_COLS:
        if idx < len(cols):
            cols[idx] = normalize_country(cols[idx])

    # Skip column 26
    filtered = [col for i, col in enumerate(cols) if i != SKIP_COL]

    # Apply reordering
    output = ['\\N'] * 50
    for src_idx, dst_idx in COLUMN_MAP.items():
        if src_idx < len(filtered):
            output[dst_idx] = filtered[src_idx]

    return '\t'.join(output)


def main():
    print("="*60)
    print("PROFILES IMPORT (FIXED)")
    print("="*60)

    # Read dump data
    with open(DUMP_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = r'COPY profiles FROM stdin;\n(.*?)\n\\.'
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        print("ERROR: Could not find profiles data in dump")
        return

    lines = match.group(1).strip().split('\n')
    print(f"  Found {len(lines)} profiles in dump")

    # Transform all rows
    print("  Transforming rows (skip col 26, reorder 35-40, ISO normalize)...")
    transformed = [transform_row(line) for line in lines]
    transformed_data = '\n'.join(transformed)

    # Get local columns
    success, output = run_psql("""
        SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles';
    """)
    columns = output.strip().split('\n')[-2].strip()
    print(f"  Local columns: {len(columns.split(', '))}")

    # Build import SQL - handle both id AND meca_id conflicts
    sql = f"""
SET session_replication_role = replica;

CREATE TEMP TABLE tmp_profiles (LIKE public.profiles INCLUDING ALL);

COPY tmp_profiles ({columns}) FROM stdin;
{transformed_data}
\\.

-- Delete rows from temp that have conflicting meca_id with existing profiles
DELETE FROM tmp_profiles t
WHERE EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.meca_id = t.meca_id
);

-- Now insert, handling only id conflicts
INSERT INTO public.profiles ({columns})
SELECT {columns} FROM tmp_profiles
ON CONFLICT (id) DO NOTHING;

DROP TABLE tmp_profiles;

SET session_replication_role = DEFAULT;

SELECT COUNT(*) as total FROM public.profiles;
"""

    success, output = run_psql(sql, "Executing import")

    if success:
        print(f"\nResult:\n{output}")
    else:
        # Try to identify the error row
        print("\nTrying to identify problematic row...")


if __name__ == '__main__':
    main()
