/**
 * Restore orphaned profiles using email from memberships table
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

const LOCAL_URL = 'http://127.0.0.1:54521';
const LOCAL_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const localSupabase = createClient(LOCAL_URL, LOCAL_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
  console.log('Restore Orphaned Profiles from Memberships Email');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  await db.connect();
  console.log('✅ Connected to database\n');

  // Get orphaned memberships with email
  const orphanedResult = await db.query(`
    SELECT DISTINCT ON (m.user_id)
      m.user_id, m.email, m.billing_first_name, m.billing_last_name, m.meca_id
    FROM memberships m
    LEFT JOIN profiles p ON m.user_id = p.id
    WHERE m.payment_status = 'paid' AND m.end_date >= NOW() AND p.id IS NULL
    ORDER BY m.user_id, m.end_date DESC
  `);

  const withEmail = orphanedResult.rows.filter(r => r.email);
  const withoutEmail = orphanedResult.rows.filter(r => !r.email);

  console.log(`Orphaned memberships: ${orphanedResult.rows.length}`);
  console.log(`  - With email: ${withEmail.length}`);
  console.log(`  - Without email: ${withoutEmail.length}\n`);

  if (withEmail.length === 0) {
    console.log('No orphaned memberships with emails to restore');
    await db.end();
    return;
  }

  // Get existing auth emails
  const existingEmails = new Set<string>();
  const authResult = await db.query('SELECT email FROM auth.users');
  authResult.rows.forEach(r => existingEmails.add(r.email.toLowerCase()));
  console.log(`Existing auth users: ${existingEmails.size}\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const membership of withEmail) {
    const email = membership.email.toLowerCase();

    if (existingEmails.has(email)) {
      console.log(`[${membership.meca_id}] ${email} - ⏭️ Already exists in auth`);
      skipped++;
      continue;
    }

    process.stdout.write(`[${membership.meca_id}] ${email}... `);

    if (dryRun) {
      console.log('[DRY RUN] Would create');
      created++;
      continue;
    }

    try {
      // Create auth user
      const { data: authData, error: authError } = await localSupabase.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: {
          first_name: membership.billing_first_name,
          last_name: membership.billing_last_name,
          force_password_change: true,
          restored_from_membership: true,
        },
      });

      if (authError) {
        console.log(`❌ ${authError.message}`);
        errors++;
        continue;
      }

      const newUserId = authData.user.id;
      const oldUserId = membership.user_id;

      // Update membership to point to new user
      await db.query(
        'UPDATE memberships SET user_id = $1 WHERE user_id = $2',
        [newUserId, oldUserId]
      );

      // Create profile
      const { error: profileError } = await localSupabase
        .from('profiles')
        .insert({
          id: newUserId,
          email: email,
          first_name: membership.billing_first_name,
          last_name: membership.billing_last_name,
          meca_id: membership.meca_id,
          role: 'user',
          membership_status: 'active',
          force_password_change: true,
        });

      if (profileError) {
        console.log(`⚠️ Profile: ${profileError.message}`);
      } else {
        console.log(`✅ Created`);
        created++;
      }

      existingEmails.add(email);
      await new Promise(r => setTimeout(r, 50));

    } catch (err) {
      console.log(`❌ ${err instanceof Error ? err.message : 'Error'}`);
      errors++;
    }
  }

  // Show what's left without email
  if (withoutEmail.length > 0) {
    console.log('\n' + '-'.repeat(60));
    console.log(`Orphaned memberships WITHOUT email (${withoutEmail.length}):`);
    withoutEmail.slice(0, 10).forEach(m => {
      console.log(`  ${m.user_id} | ${m.billing_first_name} ${m.billing_last_name} | MECA: ${m.meca_id}`);
    });
    if (withoutEmail.length > 10) {
      console.log(`  ... and ${withoutEmail.length - 10} more`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Orphaned with email: ${withEmail.length}`);
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️ Skipped (exists): ${skipped}`);
  console.log(`❌ Errors: ${errors}`);
  console.log(`⚠️ Without email (need other source): ${withoutEmail.length}`);

  await db.end();
}

run().catch(console.error);
