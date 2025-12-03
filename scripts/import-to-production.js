const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function importDatabase() {
  console.log('🚀 Starting production database import...\n');

  // Production connection details
  // Force IPv4 by using specific DNS settings
  const dns = require('dns');
  dns.setDefaultResultOrder('ipv4first');

  const prodClient = new Client({
    host: 'db.qykahrgwtktqycfgxqep.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '9CN@Z4@unTyd33SG',
    ssl: { rejectUnauthorized: false },
    keepAlive: true,
    connectionTimeoutMillis: 30000
  });

  try {
    // Test connection
    console.log('📡 Connecting to production database...');
    await prodClient.connect();
    console.log('✅ Connected successfully!\n');

    // Get PostgreSQL version
    const versionResult = await prodClient.query('SELECT version();');
    console.log('📊 Database version:', versionResult.rows[0].version.split(',')[0]);
    console.log('');

    // Check existing tables
    console.log('📋 Checking existing tables...');
    const tablesResult = await prodClient.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    if (tablesResult.rows.length > 0) {
      console.log(`⚠️  Found ${tablesResult.rows.length} existing tables:`);
      tablesResult.rows.forEach(row => console.log(`   - ${row.table_name}`));
      console.log('');
    } else {
      console.log('✅ No existing tables found (fresh database)\n');
    }

    // Read the SQL backup file
    console.log('📖 Reading backup file...');
    const backupPath = path.join(__dirname, '..', 'November_18_2025D_Datbase_NO_Profiles_Backup', 'backup_no_profiles_20251118.sql');
    const sqlContent = fs.readFileSync(backupPath, 'utf8');
    console.log(`✅ Loaded backup file (${Math.round(sqlContent.length / 1024)}KB)\n`);

    // Ask for confirmation
    console.log('⚠️  WARNING: This will import the database and may overwrite existing data!');
    console.log('');
    console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');

    // Execute the SQL
    console.log('⏳ Importing database... This may take a few minutes...');
    const startTime = Date.now();

    await prodClient.query(sqlContent);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Import completed in ${duration} seconds!\n`);

    // Verify import
    console.log('🔍 Verifying import...');
    const verifyResult = await prodClient.query(`
      SELECT
        'events' as table_name, COUNT(*) as count FROM events
      UNION ALL
      SELECT 'competition_results', COUNT(*) FROM competition_results
      UNION ALL
      SELECT 'championship_archives', COUNT(*) FROM championship_archives
      UNION ALL
      SELECT 'competition_classes', COUNT(*) FROM competition_classes
      UNION ALL
      SELECT 'site_settings', COUNT(*) FROM site_settings
      ORDER BY table_name;
    `);

    console.log('\n📊 Table counts:');
    verifyResult.rows.forEach(row => {
      console.log(`   ${row.table_name}: ${row.count} records`);
    });
    console.log('');

    console.log('✅ Database import completed successfully!');
    console.log('');
    console.log('🎉 Your production database is now ready!');

  } catch (error) {
    console.error('❌ Error during import:');
    console.error(error.message);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await prodClient.end();
  }
}

// Run the import
importDatabase();
