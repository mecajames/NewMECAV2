/**
 * Restore orphaned profiles from remote Supabase
 *
 * 1. Find orphaned memberships (active, no profile)
 * 2. Fetch profile data from remote Supabase using user_ids
 * 3. Create auth users and profiles locally
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';

// Remote Supabase (production - has original data)
const REMOTE_URL = 'https://qykahrgwtktqycfgxqep.supabase.co';
const REMOTE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A';

// Local Supabase
const LOCAL_URL = 'http://127.0.0.1:54521';
const LOCAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const remoteSupabase = createClient(REMOTE_URL, REMOTE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
  console.log('Restore Orphaned Profiles from Remote Supabase');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  await db.connect();
  console.log('✅ Connected to local database\n');

  // Step 1: Get orphaned user_ids from memberships
  const orphanedResult = await db.query(`
    SELECT DISTINCT m.user_id
    FROM memberships m
    LEFT JOIN profiles p ON m.user_id = p.id
    WHERE m.payment_status = 'paid' AND m.end_date >= NOW() AND p.id IS NULL
  `);

  const orphanedIds = orphanedResult.rows.map(r => r.user_id);
  console.log(`Found ${orphanedIds.length} orphaned user_ids\n`);

  if (orphanedIds.length === 0) {
    console.log('Nothing to restore!');
    await db.end();
    return;
  }

  // Step 2: Fetch profile data from remote Supabase
  console.log('Fetching profile data from remote Supabase...');
  const { data: remoteProfiles, error: fetchError } = await remoteSupabase
    .from('profiles')
    .select('*')
    .in('id', orphanedIds);

  if (fetchError) {
    console.error('Error fetching from remote:', fetchError.message);
    await db.end();
    return;
  }

  console.log(`Found ${remoteProfiles?.length || 0} matching profiles in remote\n`);

  if (!remoteProfiles || remoteProfiles.length === 0) {
    console.log('No profiles found in remote for these user_ids');
    await db.end();
    return;
  }

  // Step 3: Create auth users and profiles locally
  let created = 0;
  let errors = 0;

  for (const profile of remoteProfiles) {
    process.stdout.write(`[${created + errors + 1}/${remoteProfiles.length}] ${profile.email}... `);

    if (dryRun) {
      console.log('[DRY RUN] Would create');
      created++;
      continue;
    }

    try {
      // Create auth user with the SAME ID as remote
      const { data: authData, error: authError } = await localSupabase.auth.admin.createUser({
        email: profile.email,
        email_confirm: true,
        user_metadata: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          force_password_change: true,
          restored_from_remote: true,
        },
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          console.log('⏭️ Already exists');
        } else {
          console.log(`❌ Auth error: ${authError.message}`);
          errors++;
        }
        continue;
      }

      // Now we have a new auth user, but it has a different ID!
      // We need to update the membership to point to the new ID
      const newUserId = authData.user.id;
      const oldUserId = profile.id;

      // Update membership records to point to new user
      await db.query(
        'UPDATE memberships SET user_id = $1 WHERE user_id = $2',
        [newUserId, oldUserId]
      );

      // Create profile with the new ID
      const { error: profileError } = await localSupabase
        .from('profiles')
        .insert({
          id: newUserId,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name,
          meca_id: profile.meca_id,
          role: profile.role || 'user',
          membership_status: 'active',
          force_password_change: true,
        });

      if (profileError) {
        console.log(`⚠️ Profile error: ${profileError.message}`);
      } else {
        console.log(`✅ Created (updated membership ${oldUserId} → ${newUserId})`);
        created++;
      }

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (err) {
      console.log(`❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Orphaned memberships: ${orphanedIds.length}`);
  console.log(`Remote profiles found: ${remoteProfiles.length}`);
  console.log(`✅ Created: ${created}`);
  console.log(`❌ Errors: ${errors}`);

  await db.end();
  console.log('\n✅ Done');
}

run().catch(console.error);
