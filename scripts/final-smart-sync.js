const { createClient } = require('@supabase/supabase-js');

console.log('🚀 Final Smart Sync - Only Missing Data\n');

const localClient = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

const prodClient = createClient(
  'https://qykahrgwtktqycfgxqep.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A'
);

async function syncMissingRecords(tableName) {
  console.log(`\n📦 Syncing ${tableName}...`);

  try {
    // Fetch local data
    const { data: localData, error: localError } = await localClient
      .from(tableName)
      .select('*');

    if (localError || !localData || localData.length === 0) {
      console.log(`   ℹ️  No local data`);
      return { success: true, count: 0 };
    }

    // Fetch production data
    const { data: prodData, error: prodError } = await prodClient
      .from(tableName)
      .select('id');

    const existingIds = new Set(prodData?.map(r => r.id) || []);
    const missingRecords = localData.filter(r => !existingIds.has(r.id));

    if (missingRecords.length === 0) {
      console.log(`   ✅ Already synced (${localData.length}/${localData.length})`);
      return { success: true, count: localData.length, skipped: true };
    }

    console.log(`   Found ${missingRecords.length} missing records (${existingIds.size} already exist)`);

    // Insert missing records
    let successCount = 0;
    const batchSize = 50;

    for (let i = 0; i < missingRecords.length; i += batchSize) {
      const batch = missingRecords.slice(i, i + batchSize);

      const { error: insertError } = await prodClient
        .from(tableName)
        .insert(batch);

      if (insertError) {
        console.log(`   ❌ Batch error: ${insertError.message}`);
      } else {
        successCount += batch.length;
        if (missingRecords.length > batchSize) {
          process.stdout.write(`\r   ✅ Progress: ${successCount}/${missingRecords.length}`);
        }
      }
    }

    if (missingRecords.length > batchSize) console.log('');

    const total = existingIds.size + successCount;
    console.log(`   ✅ Completed: ${total}/${localData.length} total (${successCount} new)`);

    return { success: true, count: total, inserted: successCount };

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('=' .repeat(70));

  const tables = [
    'events',
    'competition_results',
    'event_hosting_requests',
    'mikro_orm_migrations'
  ];

  const results = {};
  for (const table of tables) {
    results[table] = await syncMissingRecords(table);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 FINAL SYNC SUMMARY\n');

  const successful = Object.values(results).filter(r => r.success).length;
  const failed = Object.values(results).filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}\n`);

  Object.entries(results).forEach(([name, r]) => {
    if (r.success) {
      if (r.skipped) {
        console.log(`✅ ${name}: ${r.count} records (already synced)`);
      } else {
        console.log(`✅ ${name}: ${r.count} records (${r.inserted} new)`);
      }
    } else {
      console.log(`❌ ${name}: ${r.error}`);
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n🎉 Migration completed!\n');
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
