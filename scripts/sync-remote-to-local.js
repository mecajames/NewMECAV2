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

  // Insert remote data
  const { error: insertError } = await local.from(tableName).insert(data);

  if (insertError) {
    console.error(`❌ Error inserting into ${tableName}:`, insertError.message);
  } else {
    console.log(`✅ Synced ${data.length} record(s) to local ${tableName}`);
  }
}

async function main() {
  console.log('🚀 Syncing remote database to local...\n');

  // Sync in order to handle foreign key constraints
  await syncTable('profiles');
  await syncTable('events');
  await syncTable('event_registrations');
  await syncTable('results');
  await syncTable('rulebooks');
  await syncTable('media_library');
  await syncTable('site_settings');
  await syncTable('hero_carousel_items');

  console.log('\n✅ Sync complete!');
}

main().catch(console.error);
