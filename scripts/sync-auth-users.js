import pkg from 'pg';
const { Client } = pkg;

const remoteClient = new Client({
  connectionString: 'postgresql://postgres.qykahrgwtktqycfgxqep:Meca123!!@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
});

const localClient = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
});

async function syncAuthUsers() {
  try {
    await remoteClient.connect();
    await localClient.connect();

    console.log('🔐 Fetching auth users from remote...');

    // Get auth users from remote
    const result = await remoteClient.query(`
      SELECT
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role,
        aud,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      FROM auth.users
      ORDER BY created_at DESC
    `);

    console.log(`   Found ${result.rows.length} auth user(s)`);

    if (result.rows.length === 0) {
      console.log('   No users to sync');
      return;
    }

    // Delete existing users from local auth.users
    console.log('🗑️  Clearing local auth.users...');
    await localClient.query('DELETE FROM auth.users');

    // Insert users into local auth.users
    console.log('📥 Inserting auth users into local...');

    for (const user of result.rows) {
      await localClient.query(`
        INSERT INTO auth.users (
          id,
          email,
          encrypted_password,
          email_confirmed_at,
          created_at,
          updated_at,
          raw_app_meta_data,
          raw_user_meta_data,
          is_super_admin,
          role,
          aud,
          confirmation_token,
          email_change,
          email_change_token_new,
          recovery_token
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        user.id,
        user.email,
        user.encrypted_password,
        user.email_confirmed_at,
        user.created_at,
        user.updated_at,
        user.raw_app_meta_data,
        user.raw_user_meta_data,
        user.is_super_admin,
        user.role,
        user.aud,
        user.confirmation_token,
        user.email_change,
        user.email_change_token_new,
        user.recovery_token
      ]);

      console.log(`   ✅ Synced: ${user.email} (${user.id})`);
    }

    console.log('\n✅ Auth users synced successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await remoteClient.end();
    await localClient.end();
  }
}

syncAuthUsers();
