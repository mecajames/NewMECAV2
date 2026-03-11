const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' });

async function run() {
  await client.connect();

  // Check total results count
  const total = await client.query(`SELECT COUNT(*) as total FROM competition_results`);
  console.log('Total competition results:', total.rows[0].total);

  // Check counts by event (top 20)
  const counts = await client.query(`
    SELECT cr.event_id, e.title, e.event_date, COUNT(*) as count
    FROM competition_results cr
    LEFT JOIN events e ON e.id = cr.event_id
    GROUP BY cr.event_id, e.title, e.event_date
    ORDER BY e.event_date DESC
    LIMIT 20
  `);
  console.log('\nTop 20 events with results:');
  counts.rows.forEach(r => console.log(`  ${r.event_date?.toISOString().split('T')[0] || '?'} | ${r.title || 'NO EVENT'} | ${r.count} results | id: ${r.event_id}`));

  // Check if any event_ids in competition_results don't exist in events table
  const orphans = await client.query(`
    SELECT cr.event_id, COUNT(*) as count
    FROM competition_results cr
    LEFT JOIN events e ON e.id = cr.event_id
    WHERE e.id IS NULL
    GROUP BY cr.event_id
  `);
  console.log('\nOrphaned results (event_id not in events table):', orphans.rows.length);
  if (orphans.rows.length > 0) {
    orphans.rows.forEach(r => console.log(`  event_id: ${r.event_id} (${r.count} results)`));
  }

  // Check what the API endpoint would return (first 10 entries)
  const apiResult = await client.query(`SELECT event_id, COUNT(*) as count FROM competition_results GROUP BY event_id ORDER BY count DESC LIMIT 10`);
  console.log('\nAPI result sample (top 10 by count):');
  apiResult.rows.forEach(r => console.log(`  ${r.event_id}: ${r.count}`));

  // Now check if event_id column type matches
  const colInfo = await client.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'competition_results' AND column_name = 'event_id'
  `);
  console.log('\nevent_id column type in competition_results:', JSON.stringify(colInfo.rows[0]));

  const evColInfo = await client.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'id'
  `);
  console.log('id column type in events:', JSON.stringify(evColInfo.rows[0]));

  await client.end();
}
run().catch(e => { console.error(e); process.exit(1); });
