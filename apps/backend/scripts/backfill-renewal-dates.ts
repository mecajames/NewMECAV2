/**
 * Backfill Membership Renewal/Expiration Dates from PMPro
 *
 * Updates V2 membership end_date values using data from the PMPro
 * wp_pmpro_memberships_users table export.
 *
 * Handles 3 scenarios:
 *   1. Real enddate in PMPro -> use directly
 *   2. Auto-renew with 0000-00-00 or NULL enddate -> calculate from startdate + yearly cycles
 *   3. Admin/ED/Site Admin with no billing -> skip (no expiration needed)
 *
 * Usage:
 *   npx tsx scripts/backfill-renewal-dates.ts [options]
 *
 * Options:
 *   --dry-run       Preview what will be updated without making changes
 *   --file=PATH     Path to SQL file (default: C:\Users\mmakh\Downloads\wp_pmpro_memberships_users.sql)
 *   --all-statuses  Include expired/cancelled PMPro records (default: active only)
 *
 * Requires:
 *   - DATABASE_URL env var or defaults to local Supabase
 */

import { Client } from 'pg';
import * as fs from 'fs';

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_SQL_FILE = 'C:\\Users\\mmakh\\Downloads\\wp_pmpro_memberships_users.sql';

const LOCAL_DB_CONFIG = {
  host: '127.0.0.1',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

// ============================================
// TYPES
// ============================================

interface PMProMembershipUser {
  id: number;
  user_id: number;
  membership_id: number;
  billing_amount: number;
  cycle_number: number;
  cycle_period: string;
  status: string;
  startdate: string;
  enddate: string | null;
}

interface ProcessableRecord {
  record: PMProMembershipUser;
  resolvedEndDate: Date;
  source: 'pmpro_enddate' | 'calculated_renewal';
}

// ============================================
// SQL PARSING
// ============================================

function parseRowValues(rowData: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < rowData.length; i++) {
    const char = rowData[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      current += char;
      continue;
    }

    if (char === "'" && !escaped) {
      inString = !inString;
      continue;
    }

    if (char === ',' && !inString) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parsePMProMembershipUsers(sql: string): PMProMembershipUser[] {
  const results: PMProMembershipUser[] = [];

  const insertRegex = /INSERT INTO `wp_pmpro_memberships_users`[^;]+VALUES\s*([\s\S]+?);/gi;
  let insertMatch;

  while ((insertMatch = insertRegex.exec(sql)) !== null) {
    const valuesSection = insertMatch[1];
    const rowRegex = /\(([^)]+)\)/g;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(valuesSection)) !== null) {
      const values = parseRowValues(rowMatch[1]);

      const enddate = values[13];
      results.push({
        id: parseInt(values[0]) || 0,
        user_id: parseInt(values[1]) || 0,
        membership_id: parseInt(values[2]) || 0,
        billing_amount: parseFloat(values[5]) || 0,
        cycle_number: parseInt(values[6]) || 0,
        cycle_period: values[7] || '',
        status: values[11] || '',
        startdate: values[12] || '',
        enddate: enddate === 'NULL' ? null : enddate || null,
      });
    }
  }

  return results;
}

// ============================================
// HELPERS
// ============================================

const isAutoRenew = (r: PMProMembershipUser) => r.cycle_number > 0 && r.billing_amount > 0;
const isValidDate = (d: string | null) => d && d !== 'NULL' && d !== '0000-00-00 00:00:00';

function calculateNextRenewal(record: PMProMembershipUser): Date | null {
  const start = new Date(record.startdate);
  if (isNaN(start.getTime())) return null;

  const now = new Date();
  const yearsElapsed = Math.floor((now.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const nextRenewal = new Date(start);
  nextRenewal.setFullYear(nextRenewal.getFullYear() + yearsElapsed + 1);
  return nextRenewal;
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const allStatuses = args.includes('--all-statuses');

  const fileArg = args.find(a => a.startsWith('--file='));
  const sqlFile = fileArg ? fileArg.split('=')[1] : DEFAULT_SQL_FILE;

  console.log('Backfill Membership Renewal Dates from PMPro');
  console.log('=============================================');
  console.log('Mode: ' + (dryRun ? 'DRY RUN' : 'LIVE'));
  console.log('SQL file: ' + sqlFile);
  console.log('Filter: ' + (allStatuses ? 'ALL statuses' : 'ACTIVE only'));
  console.log('');

  // Read and parse SQL file
  if (!fs.existsSync(sqlFile)) {
    console.error('ERROR: SQL file not found: ' + sqlFile);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf-8');
  const allRecords = parsePMProMembershipUsers(sql);
  console.log('Parsed ' + allRecords.length + ' total PMPro membership-user records');

  // Filter to active records (unless --all-statuses)
  const activeRecords = allStatuses
    ? allRecords
    : allRecords.filter(r => r.status === 'active');

  console.log('Active records to analyze: ' + activeRecords.length);

  // Categorize into 3 scenarios
  const realEnddateRecords = activeRecords.filter(r => isValidDate(r.enddate));
  const autoRenewNoDate = activeRecords.filter(r => isAutoRenew(r) && !isValidDate(r.enddate));
  const skipRecords = activeRecords.filter(r => !isAutoRenew(r) && !isValidDate(r.enddate));

  // Build combined processable records
  const records: ProcessableRecord[] = [];

  for (const r of realEnddateRecords) {
    const d = new Date(r.enddate!);
    if (!isNaN(d.getTime())) {
      records.push({ record: r, resolvedEndDate: d, source: 'pmpro_enddate' });
    }
  }

  for (const r of autoRenewNoDate) {
    const d = calculateNextRenewal(r);
    if (d) {
      records.push({ record: r, resolvedEndDate: d, source: 'calculated_renewal' });
    }
  }

  console.log('');
  console.log('Scenario breakdown:');
  console.log('  Real PMPro enddate:            ' + realEnddateRecords.length + ' records');
  console.log('  Auto-renew (calculated):       ' + autoRenewNoDate.length + ' records');
  console.log('  Skipped (admin/ED/no billing): ' + skipRecords.length + ' records');
  console.log('  Total to process:              ' + records.length + ' records');
  console.log('');

  // Connect to V2 database
  const dbUrl = process.env.DATABASE_URL;
  let client: Client;

  if (dbUrl) {
    const isLocal = dbUrl.includes('127.0.0.1') || dbUrl.includes('localhost');
    client = new Client({
      connectionString: dbUrl,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
    console.log('Connecting to database via DATABASE_URL...');
  } else {
    client = new Client(LOCAL_DB_CONFIG);
    console.log('Connecting to local database (127.0.0.1:54322)...');
  }

  try {
    await client.connect();
    console.log('Connected to database');

    // Step 1: Build PMPro user_id -> V2 profile mapping using order metadata
    console.log('');
    console.log('Building PMPro user_id -> V2 profile mapping...');

    const { rows: ordersWithPmpro } = await client.query(`
      SELECT DISTINCT ON (metadata->>'pmpro_user_id')
        metadata->>'pmpro_user_id' AS pmpro_user_id,
        member_id,
        p.email,
        p.full_name
      FROM orders o
      JOIN profiles p ON p.id = o.member_id
      WHERE o.metadata->>'pmpro_user_id' IS NOT NULL
      ORDER BY metadata->>'pmpro_user_id', o.created_at DESC
    `);

    const pmproToProfile = new Map<number, { profileId: string; email: string; name: string }>();
    for (const row of ordersWithPmpro) {
      const pmproId = parseInt(row.pmpro_user_id);
      if (!isNaN(pmproId)) {
        pmproToProfile.set(pmproId, {
          profileId: row.member_id,
          email: row.email,
          name: row.full_name,
        });
      }
    }

    console.log('Mapped ' + pmproToProfile.size + ' PMPro user IDs to V2 profiles');

    // Step 2: Process each record
    console.log('');
    console.log('Processing renewal dates...');
    console.log('');

    let updated = 0;
    let skipped = 0;
    let noMapping = 0;
    let noMembership = 0;
    let alreadyCorrect = 0;
    const unmappedUsers: Array<{ user_id: number; status: string; enddate: string | null; source: string }> = [];

    for (const { record, resolvedEndDate, source } of records) {
      const profile = pmproToProfile.get(record.user_id);

      if (!profile) {
        noMapping++;
        unmappedUsers.push({
          user_id: record.user_id,
          status: record.status,
          enddate: record.enddate,
          source,
        });
        continue;
      }

      // Find the most recent membership for this profile
      const { rows: memberships } = await client.query(`
        SELECT id, end_date, payment_status, start_date
        FROM memberships
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [profile.profileId]);

      if (memberships.length === 0) {
        noMembership++;
        continue;
      }

      const membership = memberships[0];
      const currentEndDate = membership.end_date ? new Date(membership.end_date) : null;

      // Skip if end_date is already the same (within 1 day tolerance)
      if (currentEndDate) {
        const diffMs = Math.abs(resolvedEndDate.getTime() - currentEndDate.getTime());
        const diffDays = diffMs / (1000 * 60 * 60 * 1000 * 24);
        if (diffDays < 1) {
          alreadyCorrect++;
          continue;
        }
      }

      const oldEndStr = currentEndDate ? currentEndDate.toISOString().split('T')[0] : 'NULL';
      const newEndStr = resolvedEndDate.toISOString().split('T')[0];
      const sourceLabel = source === 'calculated_renewal' ? ' [CALCULATED]' : '';

      if (dryRun) {
        console.log('  [DRY RUN] ' + profile.name + ' (' + profile.email + ')' + sourceLabel);
        console.log('            PMPro user_id: ' + record.user_id + ' | end_date: ' + oldEndStr + ' -> ' + newEndStr);
        updated++;
      } else {
        await client.query(`
          UPDATE memberships
          SET end_date = $1, updated_at = NOW()
          WHERE id = $2
        `, [resolvedEndDate, membership.id]);

        console.log('  Updated: ' + profile.name + ' (' + profile.email + ') | ' + oldEndStr + ' -> ' + newEndStr + sourceLabel);
        updated++;
      }
    }

    // Summary
    console.log('');
    console.log('=============================================');
    console.log('Summary:');
    console.log('  Total records processed:   ' + records.length);
    console.log('  Updated:                   ' + updated);
    console.log('  Already correct:           ' + alreadyCorrect);
    console.log('  No V2 profile mapping:     ' + noMapping);
    console.log('  No V2 membership found:    ' + noMembership);
    console.log('  Skipped (invalid date):    ' + skipped);

    if (unmappedUsers.length > 0) {
      console.log('');
      console.log('Unmapped PMPro user IDs (no matching V2 profile):');
      for (const u of unmappedUsers.slice(0, 20)) {
        console.log('  user_id: ' + u.user_id + ' | status: ' + u.status + ' | enddate: ' + u.enddate + ' | ' + u.source);
      }
      if (unmappedUsers.length > 20) {
        console.log('  ... and ' + (unmappedUsers.length - 20) + ' more');
      }
    }

    if (dryRun) {
      console.log('');
      console.log('This was a dry run. No changes were made.');
      console.log('Run without --dry-run to apply changes.');
    } else {
      console.log('');
      console.log('Renewal dates backfilled successfully!');
    }

  } catch (error: any) {
    console.error('Error: ' + error.message);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
