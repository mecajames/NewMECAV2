const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

async function backfillSeasonIds() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database');

    // Update all results with null season_id to use their event's season_id
    const result = await client.query(`
      UPDATE competition_results cr
      SET season_id = e.season_id
      FROM events e
      WHERE cr.event_id = e.id
        AND cr.season_id IS NULL
        AND e.season_id IS NOT NULL
    `);

    console.log(`✅ Updated ${result.rowCount} results with season_id from their events`);

    // Show summary
    const summary = await client.query(`
      SELECT
        e.title as event_title,
        s.name as season_name,
        COUNT(cr.id) as results_count
      FROM competition_results cr
      JOIN events e ON cr.event_id = e.id
      LEFT JOIN seasons s ON cr.season_id = s.id
      WHERE cr.season_id IS NOT NULL
      GROUP BY e.title, s.name
      ORDER BY e.title
    `);

    console.log('\nResults by Event and Season:');
    summary.rows.forEach(row => {
      console.log(`  ${row.event_title} (${row.season_name}): ${row.results_count} results`);
    });

    await client.end();
    console.log('\n✅ Backfill complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

backfillSeasonIds();
