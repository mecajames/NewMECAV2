import { Client } from 'pg';

const db = new Client({
  host: '127.0.0.1',
  port: 54622,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

async function run() {
  await db.connect();

  const profiles = await db.query('SELECT COUNT(*) as count FROM profiles');
  const auth = await db.query('SELECT COUNT(*) as count FROM auth.users');
  const active = await db.query("SELECT COUNT(*) as count FROM profiles WHERE membership_status = 'active'");

  console.log('Total Profiles:', profiles.rows[0].count);
  console.log('Active Profiles:', active.rows[0].count);
  console.log('Auth Users:', auth.rows[0].count);

  await db.end();
}

run();
