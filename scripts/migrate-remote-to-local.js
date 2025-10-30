/**
 * Script to migrate data from remote Supabase to local Supabase
 * Usage: node scripts/migrate-remote-to-local.js
 */

import { createClient } from '../apps/frontend/node_modules/@supabase/supabase-js/dist/module/index.js';

// Remote Supabase (source)
const REMOTE_URL = 'https://garsyqgdjpryqleufrev.supabase.co';
const REMOTE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcnN5cWdkanByeXFsZXVmcmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMDM1MTMsImV4cCI6MjA2OTU3OTUxM30.rujg_T4723OyWwYi3fMMWZLun2AMQXS_T2aSKpYg9Rw';

// Local Supabase (destination)
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const remoteClient = createClient(REMOTE_URL, REMOTE_ANON_KEY);
const localClient = createClient(LOCAL_URL, LOCAL_ANON_KEY);

// Tables to migrate (in order due to foreign key constraints)
const TABLES = [
  'profiles',
  'events',
  'event_registrations',
  'competition_results',
  'memberships',
  'rulebooks',
  'media_files',
  'site_settings',
  'hero_settings'
];

async function migrateTable(tableName) {
  console.log(`\n📦 Migrating table: ${tableName}`);

  try {
    // Fetch all data from remote
    const { data: remoteData, error: fetchError } = await remoteClient
      .from(tableName)
      .select('*');

    if (fetchError) {
      console.error(`❌ Error fetching from ${tableName}:`, fetchError.message);
      return;
    }

    if (!remoteData || remoteData.length === 0) {
      console.log(`ℹ️  No data found in ${tableName}`);
      return;
    }

    console.log(`   Found ${remoteData.length} rows`);

    // Delete existing data in local table (optional - comment out if you want to keep existing data)
    // const { error: deleteError } = await localClient
    //   .from(tableName)
    //   .delete()
    //   .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // Insert data into local database
    const { error: insertError } = await localClient
      .from(tableName)
      .upsert(remoteData, { onConflict: 'id' });

    if (insertError) {
      console.error(`❌ Error inserting into ${tableName}:`, insertError.message);
      return;
    }

    console.log(`✅ Successfully migrated ${remoteData.length} rows to ${tableName}`);

  } catch (error) {
    console.error(`❌ Unexpected error migrating ${tableName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting data migration from remote to local Supabase...\n');
  console.log(`📍 Remote: ${REMOTE_URL}`);
  console.log(`📍 Local: ${LOCAL_URL}\n`);

  for (const table of TABLES) {
    await migrateTable(table);
  }

  console.log('\n✨ Migration complete!');
}

main().catch(console.error);
