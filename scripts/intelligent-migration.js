const { createClient } = require('@supabase/supabase-js');

console.log('🚀 Intelligent Database Migration\n');
console.log('This script will intelligently migrate data while handling schema differences.\n');

// Local Supabase
const localClient = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

// Production Supabase (using db. subdomain for direct database access)
const prodClient = createClient(
  'https://qykahrgwtktqycfgxqep.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A',
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: false
    }
  }
);

// Schema mapping - handles differences between local and production
const schemaMapping = {
  'results_audit_log': {
    columnMapping: {
      'old_data': 'old_values',
      'new_data': 'new_values'
    }
  }
};

// Tables that require special handling
const specialHandling = {
  'media_files': {
    skipIfForeignKeyError: true,
    removeColumns: ['uploaded_by'] // Remove FK reference if user doesn't exist
  },
  'site_settings': {
    skipIfForeignKeyError: true,
    removeColumns: ['updated_by']
  }
};

async function getProductionSchema(tableName) {
  try {
    // Try to fetch one row to see what columns exist
    const { data, error } = await prodClient
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      return null;
    }

    if (data && data.length > 0) {
      return Object.keys(data[0]);
    }

    // If no data, we can't determine schema - assume table doesn't exist
    return null;
  } catch (err) {
    return null;
  }
}

function transformRow(tableName, row, productionColumns) {
  let transformed = { ...row };

  // Apply column mappings
  if (schemaMapping[tableName] && schemaMapping[tableName].columnMapping) {
    const mapping = schemaMapping[tableName].columnMapping;
    for (const [oldCol, newCol] of Object.entries(mapping)) {
      if (transformed[oldCol] !== undefined) {
        transformed[newCol] = transformed[oldCol];
        delete transformed[oldCol];
      }
    }
  }

  // Remove columns that don't exist in production
  if (productionColumns) {
    const transformedKeys = Object.keys(transformed);
    for (const key of transformedKeys) {
      if (!productionColumns.includes(key)) {
        delete transformed[key];
      }
    }
  }

  // Apply special handling
  if (specialHandling[tableName]) {
    const handling = specialHandling[tableName];
    if (handling.removeColumns) {
      for (const col of handling.removeColumns) {
        delete transformed[col];
      }
    }
  }

  return transformed;
}

async function syncTableIntelligently(tableName, clearFirst = false) {
  console.log(`\n📦 Syncing ${tableName}...`);

  try {
    // Step 1: Get production schema
    console.log(`   🔍 Checking production schema...`);
    const productionColumns = await getProductionSchema(tableName);

    if (!productionColumns) {
      console.log(`   ⚠️  Table doesn't exist in production or is empty - skipping for now`);
      console.log(`   💡 You may need to create this table manually first`);
      return { success: false, reason: 'table_not_in_production' };
    }

    console.log(`   ✅ Production has columns: ${productionColumns.slice(0, 5).join(', ')}...`);

    // Step 2: Fetch local data
    const { data: localData, error: fetchError } = await localClient
      .from(tableName)
      .select('*');

    if (fetchError) {
      console.log(`   ⚠️  Can't fetch from local: ${fetchError.message}`);
      return { success: false, reason: 'local_fetch_error' };
    }

    if (!localData || localData.length === 0) {
      console.log(`   ℹ️  No data in local database`);
      return { success: true, count: 0 };
    }

    console.log(`   📊 Found ${localData.length} records in local`);

    // Step 3: Clear production if requested
    if (clearFirst) {
      console.log(`   🗑️  Clearing production data...`);
      const { error: deleteError } = await prodClient
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError && !deleteError.message.includes('schema cache')) {
        console.log(`   ⚠️  Clear warning: ${deleteError.message}`);
      }
    }

    // Step 4: Transform and insert data
    console.log(`   🔄 Transforming and inserting data...`);
    let successCount = 0;
    let errorCount = 0;
    const batchSize = 50;

    for (let i = 0; i < localData.length; i += batchSize) {
      const batch = localData.slice(i, i + batchSize);
      const transformedBatch = batch.map(row => transformRow(tableName, row, productionColumns));

      const { error: insertError } = await prodClient
        .from(tableName)
        .insert(transformedBatch);

      if (insertError) {
        // Check if it's a foreign key error and we should skip
        if (specialHandling[tableName]?.skipIfForeignKeyError && insertError.message.includes('foreign key')) {
          console.log(`   ⚠️  Skipping batch due to FK constraint (expected)`);
          errorCount += batch.length;
        } else {
          console.log(`   ❌ Batch ${Math.floor(i / batchSize) + 1} error: ${insertError.message}`);
          errorCount += batch.length;
        }
      } else {
        successCount += batch.length;
        if (localData.length > batchSize) {
          process.stdout.write(`\r   ✅ Progress: ${successCount}/${localData.length}`);
        }
      }
    }

    if (localData.length > batchSize) {
      console.log(''); // New line after progress
    }

    console.log(`   ${successCount > 0 ? '✅' : '❌'} Completed: ${successCount} success, ${errorCount} errors`);

    return {
      success: errorCount === 0,
      partial: successCount > 0 && errorCount > 0,
      count: successCount,
      errors: errorCount
    };

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, reason: error.message };
  }
}

async function main() {
  console.log('=' .repeat(70));
  console.log('\nStarting intelligent migration...\n');

  const results = {};

  // Define tables in dependency order with sync strategy
  const syncPlan = [
    { name: 'competition_formats', clear: true, critical: true },
    { name: 'championship_archives', clear: true, critical: false },
    { name: 'seasons', clear: true, critical: true },
    { name: 'competition_classes', clear: true, critical: true },
    { name: 'events', clear: false, critical: true }, // Don't clear - might have production data
    { name: 'competition_results', clear: false, critical: true },
    { name: 'rulebooks', clear: true, critical: false },
    { name: 'site_settings', clear: false, critical: false }, // Don't clear settings
    { name: 'event_hosting_requests', clear: false, critical: false },
    { name: 'mikro_orm_migrations', clear: true, critical: false },
    { name: 'results_audit_log', clear: false, critical: false },
    { name: 'results_entry_sessions', clear: false, critical: false },
    { name: 'media_files', clear: false, critical: false }
  ];

  for (const table of syncPlan) {
    results[table.name] = await syncTableIntelligently(table.name, table.clear);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 MIGRATION SUMMARY\n');

  const successful = Object.values(results).filter(r => r.success).length;
  const partial = Object.values(results).filter(r => r.partial).length;
  const failed = Object.values(results).filter(r => !r.success && !r.partial).length;

  console.log(`✅ Successful:  ${successful}`);
  console.log(`⚠️  Partial:     ${partial}`);
  console.log(`❌ Failed:      ${failed}\n`);

  // Show details for each category
  if (successful > 0) {
    console.log('✅ Successfully migrated:');
    Object.entries(results)
      .filter(([_, r]) => r.success)
      .forEach(([name, r]) => console.log(`   - ${name} (${r.count} records)`));
    console.log('');
  }

  if (partial > 0) {
    console.log('⚠️  Partially migrated (some errors):');
    Object.entries(results)
      .filter(([_, r]) => r.partial)
      .forEach(([name, r]) => console.log(`   - ${name} (${r.count}/${r.count + r.errors} records)`));
    console.log('');
  }

  if (failed > 0) {
    console.log('❌ Failed to migrate:');
    Object.entries(results)
      .filter(([_, r]) => !r.success && !r.partial)
      .forEach(([name, r]) => console.log(`   - ${name}: ${r.reason || 'unknown error'}`));
    console.log('');
  }

  console.log('=' .repeat(70));
  console.log('\n🎉 Migration completed!\n');

  // Critical table check
  const criticalTables = syncPlan.filter(t => t.critical).map(t => t.name);
  const criticalFailed = Object.entries(results)
    .filter(([name, r]) => criticalTables.includes(name) && !r.success)
    .map(([name, _]) => name);

  if (criticalFailed.length > 0) {
    console.log('⚠️  WARNING: Some critical tables failed to migrate:');
    criticalFailed.forEach(name => console.log(`   - ${name}`));
    console.log('\nThese tables are essential for the application to work properly.');
    console.log('You may need to manually create these tables in production first.\n');
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
