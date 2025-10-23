/**
 * Migrate data using direct REST API calls instead of Supabase client
 * This bypasses the fetch() issues by using node's native https module
 */

import https from 'https';
import http from 'http';

const REMOTE_URL = 'garsyqgdjpryqleufrev.supabase.co';
const REMOTE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcnN5cWdkanByeXFsZXVmcmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMDM1MTMsImV4cCI6MjA2OTU3OTUxM30.rujg_T4723OyWwYi3fMMWZLun2AMQXS_T2aSKpYg9Rw';

const LOCAL_URL = '127.0.0.1';
const LOCAL_PORT = 54321;
const LOCAL_KEY = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';

const TABLES = [
  'profiles',
  'events',
  'event_registrations',
  'competition_results',
  'memberships',
  'rulebooks',
  'media_files',
  'site_settings',
  'hero_settings'
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
          resolve(JSON.parse(data));
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
        'Prefer': 'resolution=merge-duplicates',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : {});
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
    const data = await httpsGet(REMOTE_URL, `/rest/v1/${tableName}?select=*`, REMOTE_KEY);

    if (!data || data.length === 0) {
      console.log(`ℹ️  No data in ${tableName}`);
      return;
    }

    console.log(`   Found ${data.length} rows`);

    // Insert to local (batch insert)
    await httpPost(LOCAL_URL, LOCAL_PORT, `/rest/v1/${tableName}`, LOCAL_KEY, data);

    console.log(`✅ Migrated ${data.length} rows to ${tableName}`);

  } catch (error) {
    console.error(`❌ Error with ${tableName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting data migration...\n');

  for (const table of TABLES) {
    await migrateTable(table);
  }

  console.log('\n✨ Migration complete!');
}

main().catch(console.error);
