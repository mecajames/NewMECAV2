import { Client } from 'pg';

const db = new Client({
  host: '127.0.0.1',
  port: 54622,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

const DELETED_USER_ID = '00000000-0000-0000-0000-000000999999';
const DELETED_USER_EMAIL = 'deleted-user@mecacaraudio.com';
const DELETED_USER_MECA_ID = 999999;

async function run() {
  await db.connect();

  try {
    // First create auth user for the placeholder
    console.log('Creating auth user...');
    await db.query(`
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
      VALUES ($1, '00000000-0000-0000-0000-000000000000', $2, '', NOW(), NOW(), NOW(), 'authenticated', 'authenticated')
    `, [DELETED_USER_ID, DELETED_USER_EMAIL]);
    console.log('✅ Auth user created');
  } catch (err) {
    console.log('Auth user error:', err instanceof Error ? err.message : err);
  }

  try {
    // Then create the profile
    console.log('Creating profile...');
    await db.query(`
      INSERT INTO profiles (id, email, first_name, last_name, full_name, meca_id, role, membership_status, is_secondary_account, can_login, can_apply_judge, can_apply_event_director, created_at, updated_at)
      VALUES ($1, $2, 'Deleted', 'User', 'Deleted User', $3, 'user', 'expired', false, false, false, false, NOW(), NOW())
    `, [DELETED_USER_ID, DELETED_USER_EMAIL, DELETED_USER_MECA_ID]);
    console.log('✅ Profile created');
  } catch (err) {
    console.log('Profile error:', err instanceof Error ? err.message : err);
  }

  // Verify
  const p = await db.query("SELECT id, email FROM profiles WHERE id = $1", [DELETED_USER_ID]);
  console.log('\nPlaceholder profile:', p.rows.length > 0 ? 'EXISTS' : 'NOT FOUND');

  await db.end();
}

run().catch(console.error);
