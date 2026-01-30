import { Client } from 'pg';

const db = new Client({
  host: '127.0.0.1',
  port: 54622,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

async function run() {
  await db.connect();
  console.log('=== VERIFICATION VIA DIRECT SQL ===\n');

  // Count profiles by status
  const profileCounts = await db.query(`
    SELECT
      membership_status,
      COUNT(*) as count
    FROM profiles
    GROUP BY membership_status
    ORDER BY count DESC
  `);
  console.log('PROFILES BY STATUS:');
  profileCounts.rows.forEach((r: any) => console.log(`  ${r.membership_status || 'NULL'}: ${r.count}`));

  // Count memberships by active/expired
  const membershipCounts = await db.query(`
    SELECT
      CASE
        WHEN end_date >= NOW() THEN 'active'
        WHEN end_date >= NOW() - INTERVAL '90 days' THEN 'expired_under_90'
        ELSE 'expired_over_90'
      END as status,
      COUNT(*) as count
    FROM memberships
    WHERE payment_status = 'paid'
    GROUP BY 1
    ORDER BY count DESC
  `);
  console.log('\nMEMBERSHIPS BY END_DATE (paid only):');
  membershipCounts.rows.forEach((r: any) => console.log(`  ${r.status}: ${r.count}`));

  // Run the EXACT query from the migration script
  const migrationQuery = await db.query(`
    WITH latest_membership AS (
      SELECT DISTINCT ON (user_id)
        user_id,
        end_date,
        meca_id as membership_meca_id
      FROM memberships
      WHERE payment_status = 'paid'
      ORDER BY user_id, end_date DESC NULLS LAST
    )
    SELECT
      CASE
        WHEN p.membership_status = 'active' THEN 'active'
        WHEN lm.end_date >= NOW() - INTERVAL '90 days' AND lm.end_date < NOW() THEN 'expired_under_90_days'
        ELSE 'other'
      END as category,
      COUNT(*) as count
    FROM profiles p
    LEFT JOIN latest_membership lm ON p.id = lm.user_id
    WHERE
      p.membership_status = 'active'
      OR (
        p.membership_status != 'active'
        AND lm.end_date IS NOT NULL
        AND lm.end_date >= NOW() - INTERVAL '90 days'
        AND lm.end_date < NOW()
      )
    GROUP BY 1
  `);
  console.log('\nMIGRATION SCRIPT QUERY RESULTS:');
  migrationQuery.rows.forEach((r: any) => console.log(`  ${r.category}: ${r.count}`));

  // Show some expired_under_90_days examples
  const examples = await db.query(`
    WITH latest_membership AS (
      SELECT DISTINCT ON (user_id)
        user_id,
        end_date
      FROM memberships
      WHERE payment_status = 'paid'
      ORDER BY user_id, end_date DESC NULLS LAST
    )
    SELECT p.email, lm.end_date, p.membership_status
    FROM profiles p
    JOIN latest_membership lm ON p.id = lm.user_id
    WHERE
      p.membership_status != 'active'
      AND lm.end_date >= NOW() - INTERVAL '90 days'
      AND lm.end_date < NOW()
    LIMIT 10
  `);
  console.log('\nEXAMPLES OF EXPIRED < 90 DAYS:');
  if (examples.rows.length === 0) {
    console.log('  None found');
  } else {
    examples.rows.forEach((r: any) => console.log(`  ${r.email}: end_date=${r.end_date?.toISOString()}, status=${r.membership_status}`));
  }

  // Total auth users
  const authCount = await db.query(`SELECT COUNT(*) as count FROM auth.users`);
  console.log(`\nAUTH USERS: ${authCount.rows[0].count}`);

  await db.end();
}

run().catch(console.error);
