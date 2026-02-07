const fs = require('fs');
const path = require('path');
const https = require('https');

async function importViaSupabaseAPI() {
  console.log('🚀 Starting production database import via Supabase Management API...\n');

  const SUPABASE_URL = 'https://qykahrgwtktqycfgxqep.supabase.co';
  const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A';

  console.log('📖 Reading backup file...');
  const backupPath = path.join(__dirname, '..', 'November_18_2025D_Datbase_NO_Profiles_Backup', 'backup_no_profiles_20251118.sql');
  const sqlContent = fs.readFileSync(backupPath, 'utf8');
  console.log(`✅ Loaded backup file (${Math.round(sqlContent.length / 1024)}KB)\n`);

  // Split SQL into statements
  console.log('🔨 Parsing SQL statements...');
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements\n`);

  console.log('⚠️  NOTE: This method executes SQL statements one by one and may be slow.');
  console.log('⚠️  For large imports, using the Supabase SQL Editor is recommended.');
  console.log('');
  console.log('Press Ctrl+C to cancel or wait 5 seconds to continue...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  console.log('');

  let successCount = 0;
  let errorCount = 0;

  console.log('⏳ Executing SQL statements...');

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Show progress every 100 statements
    if (i % 100 === 0) {
      console.log(`Progress: ${i}/${statements.length} (${Math.round((i/statements.length)*100)}%)`);
    }

    try {
      await executeSQL(SUPABASE_URL, SERVICE_ROLE_KEY, statement + ';');
      successCount++;
    } catch (error) {
      errorCount++;
      if (errorCount < 10) { // Only show first 10 errors
        console.error(`Error on statement ${i}:`, error.message);
      }
    }
  }

  console.log('');
  console.log('✅ Import completed!');
  console.log(`   Success: ${successCount} statements`);
  console.log(`   Errors: ${errorCount} statements`);
}

function executeSQL(baseUrl, apiKey, sql) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}/rest/v1/rpc/exec_sql`;
    const data = JSON.stringify({ sql });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

importViaSupabaseAPI().catch(console.error);
