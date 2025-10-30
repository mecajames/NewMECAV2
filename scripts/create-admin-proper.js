/**
 * Create admin user using Supabase Auth API
 * This uses the service role key to bypass email confirmation
 */

import http from 'http';

const LOCAL_URL = '127.0.0.1';
const LOCAL_PORT = 54321;
const SERVICE_KEY = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const adminUser = {
  email: 'james@mecacaraudio.com',
  password: 'Admin123!',
  email_confirm: true,
  user_metadata: {
    full_name: 'James Ryan'
  }
};

function createUser() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(adminUser);

    const options = {
      hostname: LOCAL_URL,
      port: LOCAL_PORT,
      path: '/auth/v1/admin/users',
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
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
    req.write(postData);
    req.end();
  });
}

function updateProfile(userId) {
  return new Promise((resolve, reject) => {
    const profileData = JSON.stringify({
      id: userId,
      email: 'james@mecacaraudio.com',
      full_name: 'James Ryan',
      role: 'admin',
      membership_status: 'active'
    });

    const options = {
      hostname: LOCAL_URL,
      port: LOCAL_PORT,
      path: '/rest/v1/profiles',
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
        'Content-Length': Buffer.byteLength(profileData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(profileData);
    req.end();
  });
}

async function main() {
  console.log('🚀 Creating admin user via Supabase Auth API...\n');

  try {
    console.log('📧 Creating user account...');
    const user = await createUser();
    console.log('✅ User created:', user.email);
    console.log('   User ID:', user.id);

    console.log('\n👤 Creating admin profile...');
    await updateProfile(user.id);
    console.log('✅ Profile created with admin role');

    console.log('\n🎉 Success! You can now login with:');
    console.log('   Email:', adminUser.email);
    console.log('   Password:', adminUser.password);
    console.log('\n🌐 Login at: http://localhost:5176/');

  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('\nℹ️  User already exists. You can try:');
      console.log('   1. Login with existing credentials');
      console.log('   2. Use password reset if you forgot the password');
      console.log('   3. Delete the user from Supabase Studio and run this script again');
    }
  }
}

main().catch(console.error);
