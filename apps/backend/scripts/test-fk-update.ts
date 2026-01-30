import { Client } from 'pg';

const db = new Client({
  host: '127.0.0.1',
  port: 54622,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

const DELETED_USER_ID = '00000000-0000-0000-0000-000000999999';

async function run() {
  await db.connect();

  // Get one achievement_recipient to test
  const ar = await db.query('SELECT id, profile_id FROM achievement_recipients LIMIT 1');
  if (ar.rows.length === 0) {
    console.log('No achievement_recipients found');
    await db.end();
    return;
  }

  console.log('Test row:', ar.rows[0]);

  // Check if placeholder exists
  const p = await db.query('SELECT id FROM profiles WHERE id = $1', [DELETED_USER_ID]);
  console.log('Placeholder exists:', p.rows.length > 0);

  // Try to update
  try {
    await db.query('UPDATE achievement_recipients SET profile_id = $1 WHERE id = $2', [DELETED_USER_ID, ar.rows[0].id]);
    console.log('✅ Update successful!');
  } catch (err) {
    console.log('❌ Update failed:', err instanceof Error ? err.message : err);
  }

  // Revert
  await db.query('UPDATE achievement_recipients SET profile_id = $1 WHERE id = $2', [ar.rows[0].profile_id, ar.rows[0].id]);

  await db.end();
}

run().catch(console.error);
