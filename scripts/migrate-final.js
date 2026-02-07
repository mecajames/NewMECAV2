/**
 * Final migration script - uses service role key to bypass RLS
 */

import https from 'https';
import http from 'http';

const REMOTE_URL = 'qykahrgwtktqycfgxqep.supabase.co';
const REMOTE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTEzNzIsImV4cCI6MjA3NDgyNzM3Mn0.Us_keU5fImeM6NSGTo_CMgVBiA62W2uomXrew5_EDRE';

const LOCAL_URL = '127.0.0.1';
const LOCAL_PORT = 54321;
// Use service role key to bypass RLS
const LOCAL_SERVICE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const TABLES = [
  'profiles',
  'events',
  'rulebooks',
  'media_files',
  'site_settings',
  'hero_settings',
  'event_registrations',
  'competition_results',
  'memberships'
];

function httpsGet(hostname, path, apiKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${data}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

function httpPost(hostname, port, path, apiKey, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const options = {
      hostname,
      port,
      path,
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, statusCode: res.statusCode });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function migrateTable(tableName) {
  console.log(`\n📦 Migrating table: ${tableName}`);

  try {
    // Fetch from remote
    console.log(`   Fetching from remote...`);
    const data = await httpsGet(REMOTE_URL, `/rest/v1/${tableName}?select=*`, REMOTE_KEY);

    if (!data || data.length === 0) {
      console.log(`ℹ️  No data in ${tableName}`);
      return;
    }

    console.log(`   Found ${data.length} rows`);
    console.log(`   Inserting into local database...`);

    // Insert to local using service role key (bypasses RLS)
    await httpPost(LOCAL_URL, LOCAL_PORT, `/rest/v1/${tableName}`, LOCAL_SERVICE_KEY, data);

    console.log(`✅ Successfully migrated ${data.length} rows`);

  } catch (error) {
    console.error(`❌ Error with ${tableName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting data migration from remote to local Supabase...\n');
  console.log(`📍 Remote: https://${REMOTE_URL}`);
  console.log(`📍 Local: http://${LOCAL_URL}:${LOCAL_PORT}`);
  console.log(`🔑 Using service role key to bypass RLS\n`);

  for (const table of TABLES) {
    await migrateTable(table);
    // Small delay between tables
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n✨ Migration complete!');
  console.log('\n📊 You can now view your data at:');
  console.log(`   - Local Supabase Studio: http://127.0.0.1:54323`);
  console.log(`   - Frontend: http://localhost:5174`);
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
