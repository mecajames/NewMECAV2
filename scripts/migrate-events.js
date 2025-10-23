/**
 * Migrate events from remote to local Supabase
 */

import https from 'https';
import http from 'http';

const REMOTE_URL = 'qykahrgwtktqycfgxqep.supabase.co';
const REMOTE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTEzNzIsImV4cCI6MjA3NDgyNzM3Mn0.Us_keU5fImeM6NSGTo_CMgVBiA62W2uomXrew5_EDRE';

const LOCAL_URL = '127.0.0.1';
const LOCAL_PORT = 54321;
const LOCAL_SERVICE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

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

async function main() {
  console.log('🚀 Migrating events from remote to local...\n');

  try {
    console.log('📥 Fetching events from remote...');
    const events = await httpsGet(REMOTE_URL, '/rest/v1/events?select=*', REMOTE_KEY);

    if (!events || events.length === 0) {
      console.log('⚠️  No events found in remote database');
      return;
    }

    console.log(`   Found ${events.length} event(s):`);
    events.forEach(e => console.log(`   - ${e.title} (${e.event_date})`));

    console.log('\n📤 Inserting into local database...');
    await httpPost(LOCAL_URL, LOCAL_PORT, '/rest/v1/events', LOCAL_SERVICE_KEY, events);

    console.log('✅ Successfully migrated events!');
    console.log('\n🌐 View events at: http://localhost:5176/events');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
