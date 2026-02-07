const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function syncDatabase() {
  console.log('====================================');
  console.log('Syncing Database to Production');
  console.log('====================================\n');

  const dumpFile = path.join(__dirname, '..', 'temp-production-sync.sql');

  // Check if dump file exists
  if (!fs.existsSync(dumpFile)) {
    console.error('❌ Error: temp-production-sync.sql not found!');
    console.log('Please run: npx supabase db dump --local -f temp-production-sync.sql');
    process.exit(1);
  }

  console.log('✓ Found database dump file\n');

  // Read SQL dump
  const sql = fs.readFileSync(dumpFile, 'utf8');

  // Production database connection (using pooler on port 6543)
  const client = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    user: 'postgres',
    password: 'XWGCMaster123!',
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to production database...');
    await client.connect();
    console.log('✓ Connected to production\n');

    console.log('Importing database dump...');
    console.log('This may take a few minutes...\n');

    await client.query(sql);

    console.log('\n✓ Database successfully synced to production!\n');

    // Clean up
    console.log('Cleaning up temporary files...');
    fs.unlinkSync(dumpFile);
    console.log('✓ Cleanup complete\n');

    console.log('====================================');
    console.log('DEPLOYMENT COMPLETE!');
    console.log('====================================\n');
    console.log('Your production database is now updated with:');
    console.log('  - Latest events with auto-detection');
    console.log('  - Updated seasons and classes');
    console.log('  - All local data and settings\n');

  } catch (error) {
    console.error('\n❌ Error syncing database:');
    console.error(error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

syncDatabase();
