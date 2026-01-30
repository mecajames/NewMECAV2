/**
 * Enforce 90-Day Rule
 *
 * Rules:
 * - Active members (end_date >= NOW): KEEP
 * - Expired < 90 days: KEEP (grace period)
 * - Expired > 90 days OR no membership: DELETE
 *
 * Delete order: memberships → profiles → auth.users
 */

import { Client } from 'pg';

const db = new Client({
  host: '127.0.0.1',
  port: 54622,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

// Accounts to preserve regardless of membership status
const PRESERVED_EMAILS = [
  'mmakhool6@gmail.com',
];

// Placeholder profile for deleted users - historical records get reassigned here
const DELETED_USER_ID = '00000000-0000-0000-0000-000000999999';
const DELETED_USER_EMAIL = 'deleted-user@mecacaraudio.com';
const DELETED_USER_MECA_ID = 999999;

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    analyze: args.includes('--analyze'),
  };
}

async function run() {
  const { dryRun, analyze } = parseArgs();

  console.log('='.repeat(60));
  console.log('Enforce 90-Day Membership Rule');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  await db.connect();
  console.log('✅ Connected to database\n');

  // Ensure placeholder "Deleted User" profile exists
  const placeholderExists = await db.query('SELECT id FROM profiles WHERE id = $1', [DELETED_USER_ID]);
  if (placeholderExists.rows.length === 0 && !dryRun) {
    console.log('Creating placeholder "Deleted User" profile...');
    // First create auth user for the placeholder
    await db.query(`
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
      VALUES ($1, '00000000-0000-0000-0000-000000000000', $2, '', NOW(), NOW(), NOW(), 'authenticated', 'authenticated')
      ON CONFLICT (id) DO NOTHING
    `, [DELETED_USER_ID, DELETED_USER_EMAIL]);

    // Then create the profile
    await db.query(`
      INSERT INTO profiles (id, email, first_name, last_name, full_name, meca_id, role, membership_status, is_secondary_account, can_login, can_apply_judge, can_apply_event_director, created_at, updated_at)
      VALUES ($1, $2, 'Deleted', 'User', 'Deleted User', $3, 'user', 'expired', false, false, false, false, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [DELETED_USER_ID, DELETED_USER_EMAIL, DELETED_USER_MECA_ID]);
    console.log('✅ Placeholder profile created\n');
  }

  // Get users to KEEP (active OR expired < 90 days)
  const keepResult = await db.query(`
    WITH latest_membership AS (
      SELECT DISTINCT ON (user_id)
        user_id, end_date
      FROM memberships
      WHERE payment_status = 'paid'
      ORDER BY user_id, end_date DESC NULLS LAST
    )
    SELECT DISTINCT p.id, p.email,
      CASE
        WHEN lm.end_date >= NOW() THEN 'active'
        WHEN lm.end_date >= NOW() - INTERVAL '90 days' THEN 'grace_period'
        ELSE 'expired_over_90'
      END as status,
      lm.end_date
    FROM profiles p
    LEFT JOIN latest_membership lm ON p.id = lm.user_id
    WHERE lm.end_date >= NOW() - INTERVAL '90 days'
       OR LOWER(p.email) = ANY($1)
  `, [PRESERVED_EMAILS.map(e => e.toLowerCase())]);

  const keepIds = new Set(keepResult.rows.map(r => r.id));
  const keepEmails = new Set(keepResult.rows.map(r => r.email.toLowerCase()));

  // Categorize kept users
  const activeCount = keepResult.rows.filter(r => r.status === 'active').length;
  const graceCount = keepResult.rows.filter(r => r.status === 'grace_period').length;
  const preservedCount = keepResult.rows.filter(r =>
    PRESERVED_EMAILS.map(e => e.toLowerCase()).includes(r.email.toLowerCase())
  ).length;

  console.log('Users to KEEP:');
  console.log(`  Active members: ${activeCount}`);
  console.log(`  Grace period (< 90 days expired): ${graceCount}`);
  console.log(`  Preserved accounts: ${preservedCount}`);
  console.log(`  Total to keep: ${keepIds.size}\n`);

  // Get all auth users
  const allAuthResult = await db.query('SELECT id, email FROM auth.users');
  const allAuthUsers = allAuthResult.rows;

  // Users to DELETE
  const toDelete = allAuthUsers.filter(u => !keepIds.has(u.id) && !keepEmails.has(u.email.toLowerCase()));

  console.log('Users to DELETE:');
  console.log(`  Total auth users: ${allAuthUsers.length}`);
  console.log(`  To delete: ${toDelete.length}\n`);

  if (analyze) {
    // Show sample of users to delete
    console.log('Sample users to delete:');
    toDelete.slice(0, 20).forEach(u => {
      console.log(`  ${u.email}`);
    });
    if (toDelete.length > 20) {
      console.log(`  ... and ${toDelete.length - 20} more`);
    }
    await db.end();
    return;
  }

  if (toDelete.length === 0) {
    console.log('No users to delete!');
    await db.end();
    return;
  }

  // Delete users
  let deleted = 0;
  let authOnlyDeleted = 0;
  let errors = 0;

  for (let i = 0; i < toDelete.length; i++) {
    const user = toDelete[i];

    if (i % 100 === 0) {
      process.stdout.write(`\r[${i}/${toDelete.length}] Deleting...`);
    }

    if (dryRun) {
      deleted++;
      continue;
    }

    try {
      // Clean up nullable FK references first (these always succeed)
      await db.query('UPDATE profiles SET master_profile_id = NULL WHERE master_profile_id = $1', [user.id]);
      await db.query('UPDATE profiles SET judge_permission_granted_by = NULL WHERE judge_permission_granted_by = $1', [user.id]);
      await db.query('UPDATE profiles SET ed_permission_granted_by = NULL WHERE ed_permission_granted_by = $1', [user.id]);
      await db.query('UPDATE result_file_uploads SET uploaded_by_id = NULL WHERE uploaded_by_id = $1', [user.id]);
      await db.query('UPDATE result_teams SET member_id = NULL WHERE member_id = $1', [user.id]);
      await db.query('UPDATE events SET event_director_id = NULL WHERE event_director_id = $1', [user.id]);
      await db.query('UPDATE finals_registrations SET user_id = NULL WHERE user_id = $1', [user.id]);
      await db.query('UPDATE finals_votes SET voter_id = NULL WHERE voter_id = $1', [user.id]);
      await db.query('UPDATE world_finals_qualifications SET user_id = NULL WHERE user_id = $1', [user.id]);
      await db.query('UPDATE ratings SET rater_user_id = NULL WHERE rater_user_id = $1', [user.id]);
      await db.query('UPDATE shop_orders SET user_id = NULL WHERE user_id = $1', [user.id]);
      await db.query('UPDATE contact_submissions SET replied_by = NULL WHERE replied_by = $1', [user.id]);
      await db.query('UPDATE points_configuration SET updated_by = NULL WHERE updated_by = $1', [user.id]);
      await db.query('UPDATE communication_log SET member_id = NULL WHERE member_id = $1', [user.id]);
      await db.query('UPDATE communication_log SET sent_by = NULL WHERE sent_by = $1', [user.id]);
      await db.query('UPDATE messages SET from_user_id = NULL WHERE from_user_id = $1', [user.id]);
      await db.query('UPDATE messages SET to_user_id = NULL WHERE to_user_id = $1', [user.id]);
      await db.query('UPDATE subscriptions SET member_id = NULL WHERE member_id = $1', [user.id]);
      await db.query('UPDATE training_records SET trainer_id = NULL WHERE trainer_id = $1', [user.id]);
      await db.query('UPDATE judges SET approved_by = NULL WHERE approved_by = $1', [user.id]);
      await db.query('UPDATE judges SET created_by = NULL WHERE created_by = $1', [user.id]);
      await db.query('UPDATE event_directors SET approved_by = NULL WHERE approved_by = $1', [user.id]);
      await db.query('UPDATE event_directors SET created_by = NULL WHERE created_by = $1', [user.id]);
      await db.query('UPDATE event_judge_assignments SET requested_by = NULL WHERE requested_by = $1', [user.id]);
      await db.query('UPDATE event_director_assignments SET requested_by = NULL WHERE requested_by = $1', [user.id]);
      await db.query('UPDATE judge_season_qualifications SET qualified_by = NULL WHERE qualified_by = $1', [user.id]);
      await db.query('UPDATE event_director_season_qualifications SET qualified_by = NULL WHERE qualified_by = $1', [user.id]);
      await db.query('UPDATE judge_level_history SET changed_by = NULL WHERE changed_by = $1', [user.id]);
      await db.query('UPDATE judge_applications SET user_id = NULL WHERE user_id = $1', [user.id]);
      await db.query('UPDATE judge_applications SET reviewed_by = NULL WHERE reviewed_by = $1', [user.id]);
      await db.query('UPDATE judge_applications SET entered_by = NULL WHERE entered_by = $1', [user.id]);
      await db.query('UPDATE event_director_applications SET user_id = NULL WHERE user_id = $1', [user.id]);
      await db.query('UPDATE event_director_applications SET reviewed_by = NULL WHERE reviewed_by = $1', [user.id]);
      await db.query('UPDATE event_director_applications SET entered_by = NULL WHERE entered_by = $1', [user.id]);
      await db.query('UPDATE event_director_application_references SET checked_by = NULL WHERE checked_by = $1', [user.id]);
      await db.query('UPDATE judge_application_references SET checked_by = NULL WHERE checked_by = $1', [user.id]);

      // Delete user-specific data
      await db.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [user.id]);
      await db.query('DELETE FROM user_permission_overrides WHERE user_id = $1', [user.id]);
      await db.query('DELETE FROM meca_id_history WHERE profile_id = $1', [user.id]);

      // Delete memberships
      await db.query('UPDATE memberships SET master_billing_profile_id = NULL WHERE master_billing_profile_id = $1', [user.id]);
      await db.query('DELETE FROM memberships WHERE user_id = $1', [user.id]);

      // Try to delete profile + auth (will fail if there are NOT NULL FK references like achievements, orders, etc.)
      try {
        await db.query('DELETE FROM profiles WHERE id = $1', [user.id]);
        await db.query('DELETE FROM auth.users WHERE id = $1', [user.id]);
        deleted++;
      } catch {
        // Profile has historical data (achievements, orders, etc.) - just delete auth user
        // Profile is kept for historical reference but user can't login anymore
        await db.query('DELETE FROM auth.users WHERE id = $1', [user.id]);
        await db.query(`UPDATE profiles SET membership_status = 'expired', can_login = false WHERE id = $1`, [user.id]);
        authOnlyDeleted++;
      }
    } catch (err) {
      console.log(`\n❌ Error: ${user.email}: ${err instanceof Error ? err.message : 'Error'}`);
      errors++;
    }
  }

  console.log(`\r[${toDelete.length}/${toDelete.length}] Done!          \n`);

  // Verify final counts
  const finalAuth = await db.query('SELECT COUNT(*) as count FROM auth.users');
  const finalProfiles = await db.query('SELECT COUNT(*) as count FROM profiles');
  const finalActive = await db.query(`
    SELECT COUNT(DISTINCT p.id) as count
    FROM profiles p
    JOIN memberships m ON p.id = m.user_id
    WHERE m.payment_status = 'paid' AND m.end_date >= NOW()
  `);

  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Fully deleted (auth + profile): ${deleted}`);
  console.log(`Auth only deleted (profile kept for history): ${authOnlyDeleted}`);
  console.log(`Errors: ${errors}`);
  console.log('');
  console.log('Final counts:');
  console.log(`  Auth users: ${finalAuth.rows[0].count}`);
  console.log(`  Profiles: ${finalProfiles.rows[0].count}`);
  console.log(`  Active members: ${finalActive.rows[0].count}`);

  await db.end();
}

run().catch(console.error);
