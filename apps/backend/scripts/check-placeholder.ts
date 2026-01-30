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

  const p = await db.query("SELECT id, email, full_name FROM profiles WHERE id = '00000000-0000-0000-0000-000000999999'");
  console.log('Placeholder profile:', p.rows.length > 0 ? 'EXISTS' : 'NOT FOUND');
  if (p.rows.length > 0) console.log(p.rows[0]);

  const a = await db.query("SELECT id, email FROM auth.users WHERE id = '00000000-0000-0000-0000-000000999999'");
  console.log('Placeholder auth:', a.rows.length > 0 ? 'EXISTS' : 'NOT FOUND');
  if (a.rows.length > 0) console.log(a.rows[0]);

  await db.end();
}

run().catch(console.error);
