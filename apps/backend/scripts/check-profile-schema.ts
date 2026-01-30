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
  const result = await db.query(`
    SELECT column_name, is_nullable, column_default, data_type
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    ORDER BY ordinal_position
  `);

  console.log('Profiles table schema:');
  result.rows.forEach(r => {
    const nullable = r.is_nullable === 'YES' ? 'nullable' : 'NOT NULL';
    console.log(`  ${r.column_name}: ${r.data_type}, ${nullable}`);
  });

  await db.end();
}

run().catch(console.error);
