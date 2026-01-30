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

  // Get all columns in memberships table
  const cols = await db.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'memberships'
    ORDER BY ordinal_position
  `);

  console.log('Memberships table columns:');
  cols.rows.forEach(r => {
    console.log(`  ${r.column_name}: ${r.data_type}`);
  });

  // Get a sample row
  console.log('\nSample membership row (first orphaned):');
  const sample = await db.query(`
    SELECT m.*
    FROM memberships m
    LEFT JOIN profiles p ON m.user_id = p.id
    WHERE m.payment_status = 'paid' AND m.end_date >= NOW() AND p.id IS NULL
    LIMIT 1
  `);

  if (sample.rows[0]) {
    Object.entries(sample.rows[0]).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }

  await db.end();
}

run().catch(console.error);
