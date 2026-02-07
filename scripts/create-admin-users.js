import pkg from 'pg';
const { Client } = pkg;

const localClient = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
});

// The admin users from remote with their exact UUIDs
const adminUsers = [
  {
    id: '87101f9a-3089-4c65-8801-03c867a0f283',
    email: 'mmakhool6@gmail.com',
    password: 'Meca123!!',  // You'll need to set a password
  },
  {
    id: '6165dbce-d3fb-4d01-9dd7-ad0b4227a02a',
    email: 'james@mecacaraudio.com',
    password: 'Meca123!!',  // You'll need to set a password
  }
];

async function createAuthUsers() {
  try {
    await localClient.connect();

    console.log('🔐 Creating admin auth users in local database...\n');

    // Delete existing users from local auth.users
    console.log('🗑️  Clearing local auth.users...');
    await localClient.query('DELETE FROM auth.users');

    for (const user of adminUsers) {
      console.log(`📝 Creating user: ${user.email}`);

      // Use pgcrypto to hash the password the same way Supabase does
      const result = await localClient.query(`
        INSERT INTO auth.users (
          id,
          instance_id,
          email,
          encrypted_password,
          email_confirmed_at,
          created_at,
          updated_at,
          role,
          aud,
          confirmation_token,
          email_change,
          email_change_token_new,
          recovery_token,
          raw_app_meta_data,
          raw_user_meta_data
        ) VALUES (
          $1,
          '00000000-0000-0000-0000-000000000000',
          $2,
          crypt($3, gen_salt('bf')),
          NOW(),
          NOW(),
          NOW(),
          'authenticated',
          'authenticated',
          '',
          '',
          '',
          '',
          '{"provider":"email","providers":["email"]}',
          '{}'
        )
        RETURNING id, email
      `, [user.id, user.email, user.password]);

      console.log(`   ✅ Created: ${result.rows[0].email} (${result.rows[0].id})`);
    }

    // Also create entries in auth.identities
    console.log('\n📋 Creating auth.identities...');
    for (const user of adminUsers) {
      try {
        await localClient.query(`
          INSERT INTO auth.identities (
            id,
            user_id,
            provider,
            identity_data,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
          ) VALUES (
            $1::uuid,
            $1::uuid,
            'email',
            $2::jsonb,
            $3,
            NOW(),
            NOW(),
            NOW()
          )
          ON CONFLICT (provider, provider_id) DO NOTHING
        `, [user.id, JSON.stringify({ sub: user.id, email: user.email }), user.id]);

        console.log(`   ✅ Identity created for: ${user.email}`);
      } catch (err) {
        console.log(`   ⚠️  Identity error for ${user.email}: ${err.message}`);
      }
    }

    console.log('\n✅ All admin users created successfully!');
    console.log('\n🔑 You can now login with:');
    adminUsers.forEach(u => console.log(`   - ${u.email} / ${u.password}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await localClient.end();
  }
}

createAuthUsers();
