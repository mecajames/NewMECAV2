const fs = require('fs');
const path = require('path');
const https = require('https');

// Supabase connection details
const SUPABASE_PROJECT_REF = 'qykahrgwtktqycfgxqep';
const SUPABASE_DB_PASSWORD = '9CN@Z4@unTyd33SG';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`postgres:${SUPABASE_DB_PASSWORD}`).toString('base64');

    const postData = JSON.stringify({
      query: sql
    });

    const options = {
      hostname: `${SUPABASE_PROJECT_REF}.supabase.co`,
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Basic ${auth}`,
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTEzNzIsImV4cCI6MjA3NDgyNzM3Mn0.Us_keU5fImeM6NSGTo_CMgVBiA62W2uomXrew5_EDRE'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function importDatabase() {
  console.log('🚀 Starting database import via Supabase REST API...\n');

  // Read the backup file
  console.log('📖 Reading backup file...');
  const backupPath = path.join(__dirname, '..', 'November_18_2025D_Datbase_NO_Profiles_Backup', 'backup_no_profiles_20251118.sql');

  if (!fs.existsSync(backupPath)) {
    console.error('❌ Backup file not found:', backupPath);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(backupPath, 'utf8');
  console.log(`✅ Loaded ${Math.round(sqlContent.length / 1024)}KB of SQL\n`);

  console.log('⚠️  This method may not work for all SQL commands.');
  console.log('⚠️  If this fails, please use the Supabase SQL Editor manually.\n');

  console.log('Press Ctrl+C to cancel or wait 3 seconds to continue...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log('');

  try {
    console.log('⏳ Executing SQL import...');
    const result = await executeSQL(sqlContent);
    console.log('✅ Import successful!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.log('\n📝 Alternative: Use Supabase SQL Editor');
    console.log(`   1. Open: https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/sql/new`);
    console.log(`   2. Copy contents from: ${backupPath}`);
    console.log('   3. Paste into SQL Editor');
    console.log('   4. Click RUN');
    process.exit(1);
  }
}

importDatabase();
