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

  // Get active memberships (end_date in future, paid)
  const activeMemberships = await db.query(`
    SELECT DISTINCT m.user_id, m.end_date, p.email, p.id as profile_id
    FROM memberships m
    LEFT JOIN profiles p ON m.user_id = p.id
    WHERE m.payment_status = 'paid'
      AND m.end_date >= NOW()
  `);

  console.log('Active memberships (end_date >= now):', activeMemberships.rows.length);

  // How many have profiles?
  const withProfiles = activeMemberships.rows.filter(r => r.profile_id !== null);
  const withoutProfiles = activeMemberships.rows.filter(r => r.profile_id === null);

  console.log('  - With profile:', withProfiles.length);
  console.log('  - WITHOUT profile (missing):', withoutProfiles.length);

  if (withoutProfiles.length > 0) {
    console.log('\nMissing profile user_ids:');
    withoutProfiles.slice(0, 10).forEach(r => {
      console.log(`  ${r.user_id}`);
    });
  }

  // Check auth users
  const authUsers = await db.query(`SELECT id, email FROM auth.users`);
  console.log('\nTotal auth users:', authUsers.rows.length);

  const authIds = new Set(authUsers.rows.map(r => r.id));

  // Which active members don't have auth?
  const missingAuth = withProfiles.filter(r => !authIds.has(r.profile_id));
  console.log('Active members missing auth:', missingAuth.length);

  if (missingAuth.length > 0) {
    console.log('\nSample missing auth:');
    missingAuth.slice(0, 10).forEach(r => {
      console.log(`  ${r.email} (${r.profile_id})`);
    });
  }

  await db.end();
}

run().catch(console.error);
