const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

console.log('🚀 Importing all data to production via Supabase API...\n');

// Local Supabase (source)
const localClient = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

// Production Supabase (destination)
const prodClient = createClient(
  'https://qykahrgwtktqycfgxqep.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A'
);

async function syncTable(tableName, batchSize = 100) {
  console.log(`\n📦 Syncing ${tableName}...`);

  try {
    // Fetch all data from local
    const { data: localData, error: fetchError } = await localClient
      .from(tableName)
      .select('*');

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log(`   ⚠️  Table doesn't exist in local, skipping`);
        return;
      }
      throw fetchError;
    }

    if (!localData || localData.length === 0) {
      console.log(`   ℹ️  No data to sync`);
      return;
    }

    console.log(`   Found ${localData.length} records`);

    // Insert in batches
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < localData.length; i += batchSize) {
      const batch = localData.slice(i, i + batchSize);

      const { error: insertError } = await prodClient
        .from(tableName)
        .upsert(batch, { onConflict: 'id' });

      if (insertError) {
        console.log(`   ❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${insertError.message}`);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        if (localData.length > batchSize) {
          console.log(`   ✅ Progress: ${successCount}/${localData.length}`);
        }
      }
    }

    console.log(`   ✅ Synced ${successCount} records` + (errorCount > 0 ? ` (${errorCount} errors)` : ''));

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function syncAllData() {
  console.log('Starting data sync from local to production...\n');
  console.log('=' .repeat(60));

  // Tables to sync (in order to respect foreign keys)
  const tables = [
    'seasons',
    'competition_formats',
    'competition_classes',
    'events',
    'competition_results',
    'championship_archives',
    'championship_awards',
    'event_hosting_requests',
    'event_registrations',
    'media_files',
    'memberships',
    'mikro_orm_migrations',
    'notifications',
    'orders',
    'results_audit_log',
    'results_entry_sessions',
    'rulebooks',
    'site_settings',
    'team_members',
    'teams'
  ];

  for (const table of tables) {
    await syncTable(table);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n🎉 Data sync completed!\n');
}

syncAllData().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
