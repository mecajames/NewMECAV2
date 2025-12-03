const { createClient } = require('@supabase/supabase-js');

console.log('🚀 Syncing Data to Production (Schema must be fixed first)\n');

// Local Supabase
const localClient = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

// Production Supabase
const prodClient = createClient(
  'https://qykahrgwtktqycfgxqep.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A'
);

async function syncTable(tableName, clearFirst = false, batchSize = 100) {
  console.log(`\n📦 Syncing ${tableName}...`);

  try {
    // Fetch all data from local
    const { data: localData, error: fetchError } = await localClient
      .from(tableName)
      .select('*');

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log(`   ⚠️  Table doesn't exist in local, skipping`);
        return { success: false, reason: 'table_not_found' };
      }
      throw fetchError;
    }

    if (!localData || localData.length === 0) {
      console.log(`   ℹ️  No data to sync`);
      return { success: true, count: 0 };
    }

    console.log(`   Found ${localData.length} records`);

    // Clear existing data if requested
    if (clearFirst) {
      console.log(`   🗑️  Clearing existing production data...`);
      const { error: deleteError } = await prodClient
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError && deleteError.code !== 'PGRST116') {
        console.log(`   ⚠️  Could not clear table: ${deleteError.message}`);
      }
    }

    // Insert in batches
    let successCount = 0;
    let errorCount = 0;
    let lastError = null;

    for (let i = 0; i < localData.length; i += batchSize) {
      const batch = localData.slice(i, i + batchSize);

      const { error: insertError } = await prodClient
        .from(tableName)
        .insert(batch);

      if (insertError) {
        lastError = insertError.message;
        console.log(`   ❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${insertError.message}`);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        if (localData.length > batchSize) {
          console.log(`   ✅ Progress: ${successCount}/${localData.length}`);
        }
      }
    }

    const status = successCount > 0 ? 'partial' : 'failed';
    console.log(`   ${successCount > 0 ? '✅' : '❌'} Synced ${successCount} records` + (errorCount > 0 ? ` (${errorCount} errors)` : ''));

    return {
      success: errorCount === 0,
      count: successCount,
      errors: errorCount,
      lastError,
      status
    };

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, reason: error.message, status: 'failed' };
  }
}

async function main() {
  console.log('=' .repeat(60));

  const results = {};

  // Tables to sync (in dependency order)
  const tables = [
    { name: 'seasons', clear: true },
    { name: 'competition_formats', clear: true },
    { name: 'competition_classes', clear: true },
    { name: 'events', clear: false }, // Don't clear events, might have production data
    { name: 'competition_results', clear: false },
    { name: 'championship_archives', clear: true },
    { name: 'event_hosting_requests', clear: false },
    { name: 'media_files', clear: false },
    { name: 'mikro_orm_migrations', clear: true },
    { name: 'rulebooks', clear: true },
    { name: 'site_settings', clear: false },
    { name: 'results_audit_log', clear: false },
    { name: 'results_entry_sessions', clear: false }
  ];

  for (const table of tables) {
    results[table.name] = await syncTable(table.name, table.clear);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 SUMMARY:\n');

  const successful = Object.entries(results).filter(([_, r]) => r.success).length;
  const failed = Object.entries(results).filter(([_, r]) => !r.success).length;
  const partial = Object.entries(results).filter(([_, r]) => r.status === 'partial').length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`⚠️  Partial: ${partial}`);
  console.log(`❌ Failed: ${failed}\n`);

  if (failed > 0) {
    console.log('Failed tables:');
    Object.entries(results)
      .filter(([_, r]) => !r.success)
      .forEach(([name, result]) => {
        console.log(`  - ${name}: ${result.lastError || result.reason || 'unknown error'}`);
      });
    console.log('');
  }

  console.log('🎉 Data sync completed!\n');
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
