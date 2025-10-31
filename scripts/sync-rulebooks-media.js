import { createClient } from '@supabase/supabase-js';

const REMOTE_URL = 'https://qykahrgwtktqycfgxqep.supabase.co';
const REMOTE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A';

const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const remote = createClient(REMOTE_URL, REMOTE_KEY);
const local = createClient(LOCAL_URL, LOCAL_KEY);

async function syncTable(tableName, selectQuery = '*') {
  console.log(`\n📥 Syncing ${tableName}...`);

  const { data, error } = await remote.from(tableName).select(selectQuery);

  if (error) {
    console.error(`❌ Error fetching ${tableName}:`, error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log(`   No data in ${tableName}`);
    return;
  }

  console.log(`   Found ${data.length} record(s)`);

  // Delete existing local data
  const { error: deleteError } = await local.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.log(`   ⚠️  Delete warning: ${deleteError.message}`);
  }

  // Insert remote data
  const { error: insertError } = await local.from(tableName).insert(data);

  if (insertError) {
    console.error(`❌ Error inserting into ${tableName}:`, insertError.message);
    console.error('   First record:', JSON.stringify(data[0], null, 2));
  } else {
    console.log(`✅ Synced ${data.length} record(s) to local ${tableName}`);
  }
}

async function syncAuthUsers() {
  console.log(`\n📥 Syncing auth.users...`);

  const { data, error } = await remote.auth.admin.listUsers();

  if (error) {
    console.error(`❌ Error fetching auth users:`, error.message);
    return;
  }

  if (!data || !data.users || data.users.length === 0) {
    console.log(`   No auth users found`);
    return;
  }

  console.log(`   Found ${data.users.length} user(s)`);

  // For each user, create them in local auth
  for (const user of data.users) {
    const { error: createError } = await local.auth.admin.createUser({
      email: user.email,
      email_confirm: true,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
    });

    if (createError) {
      console.log(`   ⚠️  User ${user.email}: ${createError.message}`);
    } else {
      console.log(`   ✅ Created user: ${user.email}`);
    }
  }
}

async function main() {
  console.log('🚀 Syncing users, profiles, events, rulebooks and media files from remote to local...\n');

  // Sync auth users first (required for profiles foreign key)
  await syncAuthUsers();

  // Sync profiles (depends on auth.users)
  await syncTable('profiles');

  // Sync events
  await syncTable('events');

  // Sync rulebooks
  await syncTable('rulebooks');

  // Sync media files
  await syncTable('media_files');

  console.log('\n✅ Sync complete!');
}

main().catch(console.error);
