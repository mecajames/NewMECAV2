/**
 * Reset admin user password
 * This uses the service role key to update the password without needing the old one
 */

import http from 'http';

const LOCAL_URL = '127.0.0.1';
const LOCAL_PORT = 54321;
const SERVICE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const adminEmail = 'james@mecacaraudio.com';
const newPassword = 'Admin123!';

function getUserByEmail() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: LOCAL_URL,
      port: LOCAL_PORT,
      path: `/auth/v1/admin/users?email=${encodeURIComponent(adminEmail)}`,
      method: 'GET',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const users = JSON.parse(data);
          if (users && users.users && users.users.length > 0) {
            resolve(users.users[0]);
          } else {
            reject(new Error('User not found'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function updateUserPassword(userId) {
  return new Promise((resolve, reject) => {
    const updateData = JSON.stringify({
      password: newPassword,
    });

    const options = {
      hostname: LOCAL_URL,
      port: LOCAL_PORT,
      path: `/auth/v1/admin/users/${userId}`,
      method: 'PUT',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(updateData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(updateData);
    req.end();
  });
}

async function main() {
  console.log('🔐 Resetting admin password...\n');

  try {
    console.log('📧 Finding user:', adminEmail);
    const user = await getUserByEmail();
    console.log('✅ User found:', user.id);

    console.log('\n🔄 Updating password...');
    await updateUserPassword(user.id);
    console.log('✅ Password updated successfully!');

    console.log('\n🎉 Password Reset Complete!');
    console.log('   Email:', adminEmail);
    console.log('   New Password:', newPassword);
    console.log('\n🌐 Login at: http://localhost:5173/');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

main().catch(console.error);
