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

  // Get orphaned memberships with all available data
  const result = await db.query(`
    SELECT m.user_id, m.billing_first_name, m.billing_last_name, m.meca_id, m.end_date
    FROM memberships m
    LEFT JOIN profiles p ON m.user_id = p.id
    WHERE m.payment_status = 'paid' AND m.end_date >= NOW() AND p.id IS NULL
    ORDER BY m.end_date DESC
  `);

  console.log(`\nOrphaned memberships (active, no profile): ${result.rows.length}\n`);

  // Check what data is available
  const withBillingName = result.rows.filter(r => r.billing_first_name || r.billing_last_name);
  const withMecaId = result.rows.filter(r => r.meca_id);

  console.log(`With billing name: ${withBillingName.length}`);
  console.log(`With MECA ID: ${withMecaId.length}`);

  console.log('\nSample of orphaned memberships:');
  console.log('user_id | billing_first_name | billing_last_name | meca_id');
  console.log('-'.repeat(80));
  result.rows.slice(0, 15).forEach(r => {
    console.log(`${r.user_id} | ${r.billing_first_name || 'NULL'} | ${r.billing_last_name || 'NULL'} | ${r.meca_id || 'NULL'}`);
  });

  // The problem: memberships doesn't have email!
  // We need to get emails from somewhere else
  console.log('\n⚠️  NOTE: memberships table does NOT have email column!');
  console.log('   We need to get emails from another source to restore profiles.\n');

  // Check if we can get emails from remote Supabase
  console.log('Options to get emails:');
  console.log('1. Remote Supabase (production) - has all original profiles');
  console.log('2. Auth0 JSON export - has all Auth0 users');
  console.log('3. Any backup files');

  await db.end();
}

run().catch(console.error);
