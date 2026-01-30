/**
 * Fix profiles for auth users that were created but profiles failed
 */

import { Client } from 'pg';

const db = new Client({
  host: '127.0.0.1',
  port: 54622,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
  };
}

async function run() {
  const { dryRun } = parseArgs();

  console.log('='.repeat(60));
  console.log('Fix Profiles for Auth Users Without Profiles');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  await db.connect();
  console.log('✅ Connected to database\n');

  // Find auth users without profiles
  const orphanedAuth = await db.query(`
    SELECT a.id, a.email, a.raw_user_meta_data
    FROM auth.users a
    LEFT JOIN profiles p ON a.id = p.id
    WHERE p.id IS NULL
  `);

  console.log(`Auth users without profiles: ${orphanedAuth.rows.length}\n`);

  if (orphanedAuth.rows.length === 0) {
    console.log('All auth users have profiles!');
    await db.end();
    return;
  }

  // Get membership data to match
  const membershipData = await db.query(`
    SELECT DISTINCT ON (user_id)
      user_id, billing_first_name, billing_last_name, meca_id, email
    FROM memberships
    WHERE payment_status = 'paid'
    ORDER BY user_id, end_date DESC
  `);

  const membershipMap = new Map<string, any>();
  membershipData.rows.forEach(m => {
    if (m.email) {
      membershipMap.set(m.email.toLowerCase(), m);
    }
  });

  console.log(`Memberships with email: ${membershipMap.size}\n`);

  let created = 0;
  let errors = 0;

  for (const authUser of orphanedAuth.rows) {
    const email = authUser.email.toLowerCase();
    const metadata = authUser.raw_user_meta_data || {};
    const membership = membershipMap.get(email);

    const firstName = metadata.first_name || membership?.billing_first_name || 'Unknown';
    const lastName = metadata.last_name || membership?.billing_last_name || 'User';
    const fullName = `${firstName} ${lastName}`.trim();
    const mecaId = membership?.meca_id || null;

    process.stdout.write(`[${mecaId || 'NO-MECA'}] ${email}... `);

    if (dryRun) {
      console.log(`[DRY RUN] Would create profile: ${fullName}`);
      created++;
      continue;
    }

    try {
      // Update membership to point to auth user id if needed
      if (membership && membership.user_id !== authUser.id) {
        await db.query(
          'UPDATE memberships SET user_id = $1 WHERE user_id = $2',
          [authUser.id, membership.user_id]
        );
      }

      // Create profile directly via SQL
      await db.query(`
        INSERT INTO profiles (
          id, email, first_name, last_name, full_name, meca_id,
          role, membership_status, force_password_change,
          is_secondary_account, can_login, can_apply_judge, can_apply_event_director,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          'user', 'active', true,
          false, true, true, true,
          NOW(), NOW()
        )
      `, [authUser.id, email, firstName, lastName, fullName, mecaId]);

      console.log(`✅ Created (${fullName})`);
      created++;

    } catch (err) {
      console.log(`❌ ${err instanceof Error ? err.message : 'Error'}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Auth users without profiles: ${orphanedAuth.rows.length}`);
  console.log(`✅ Created: ${created}`);
  console.log(`❌ Errors: ${errors}`);

  await db.end();
}

run().catch(console.error);
