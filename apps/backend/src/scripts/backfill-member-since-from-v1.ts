/**
 * One-time backfill script: Populates member_since from V1 database.
 *
 * This script connects to the V1 database (mecaevents-db-1), finds the earliest
 * event date for each member, then updates V2 profiles where the V1 date is earlier
 * than the existing member_since (or where member_since is null).
 *
 * Usage:
 *   npx ts-node src/migrations/backfill-member-since-from-v1.ts
 *
 * Requires:
 *   - DATABASE_URL env var (V2 database)
 *   - V1_DATABASE_URL env var (or uses hardcoded V1 connection)
 */
import pg from 'pg';
const { Client } = pg;

const V1_CONFIG = {
  host: 'ls-f9bb3cf7787cc3dce3cf1deef31e08dfa0f34c31.cexp2mtr0fvk.us-east-1.rds.amazonaws.com',
  port: 5432,
  user: 'dbmasteruser',
  password: 'gQNyCDu4Wz9L94Nn4gKaBnjH',
  database: 'dbmecaevents',
  ssl: { rejectUnauthorized: false },
};

async function main() {
  const v2Url = process.env.DATABASE_URL;
  if (!v2Url) {
    console.error('ERROR: DATABASE_URL env var is required (V2 database connection string)');
    process.exit(1);
  }

  console.log('Connecting to V1 database...');
  const v1 = new Client(V1_CONFIG);
  await v1.connect();

  console.log('Connecting to V2 database...');
  // Detect local Supabase (no SSL) vs remote (SSL required)
  const isLocal = v2Url.includes('127.0.0.1') || v2Url.includes('localhost');
  const v2 = new Client({
    connectionString: v2Url,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  await v2.connect();

  // Step 1: Fetch earliest event date per member from V1
  console.log('Querying V1 for earliest event dates...');
  const v1Result = await v1.query(`
    SELECT m.memberid::text AS meca_id, MIN(e.startdate)::date AS member_since
    FROM members m
    JOIN results r ON r.memberno = m.memberid
    JOIN events e ON r.eventid = e.eventid
    WHERE m.memberid <> 999999
    GROUP BY m.memberid
    ORDER BY m.memberid
  `);
  console.log(`Found ${v1Result.rows.length} members with event history in V1`);

  // Step 2: Update V2 profiles where V1 date is earlier or member_since is null
  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const row of v1Result.rows) {
    const { meca_id, member_since } = row;

    const result = await v2.query(
      `UPDATE profiles
       SET member_since = $1
       WHERE meca_id = $2
         AND (member_since IS NULL OR member_since > $1)`,
      [member_since, meca_id],
    );

    if (result.rowCount && result.rowCount > 0) {
      updated++;
    } else {
      // Check if profile exists
      const exists = await v2.query('SELECT id FROM profiles WHERE meca_id = $1', [meca_id]);
      if (exists.rows.length === 0) {
        notFound++;
      } else {
        skipped++; // Profile exists but V2 date was already earlier
      }
    }
  }

  console.log(`\nBackfill complete:`);
  console.log(`  Updated: ${updated} profiles`);
  console.log(`  Skipped: ${skipped} (V2 date was already earlier)`);
  console.log(`  Not found: ${notFound} (no matching V2 profile)`);

  await v1.end();
  await v2.end();
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
