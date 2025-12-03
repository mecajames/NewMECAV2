const { createClient } = require('@supabase/supabase-js');

console.log('🏆 Syncing Championship Archives to Production...\n');

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

async function syncArchives() {
  try {
    // Fetch all championship archives from local
    console.log('📖 Fetching championship archives from local database...');
    const { data: archives, error: fetchError } = await localClient
      .from('championship_archives')
      .select('*')
      .order('year');

    if (fetchError) {
      throw new Error(`Failed to fetch archives: ${fetchError.message}`);
    }

    console.log(`✅ Found ${archives.length} championship archives\n`);

    // Insert each archive to production
    for (const archive of archives) {
      console.log(`📤 Uploading ${archive.year} - ${archive.title}...`);

      const { error: insertError } = await prodClient
        .from('championship_archives')
        .upsert(archive, {
          onConflict: 'id'
        });

      if (insertError) {
        console.error(`   ❌ Failed: ${insertError.message}`);
      } else {
        console.log(`   ✅ Success`);
      }
    }

    console.log('\n🎉 Championship archives sync completed!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

syncArchives();
