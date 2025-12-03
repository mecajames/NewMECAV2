// Script to add multi-day event columns to events table
const { Client } = require('pg');
require('dotenv').config();

async function addMultiDayColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add multi_day_group_id column
    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS multi_day_group_id UUID;
    `);
    console.log('Added multi_day_group_id column');

    // Add day_number column
    await client.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS day_number INTEGER;
    `);
    console.log('Added day_number column');

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_events_multi_day_group
      ON events(multi_day_group_id);
    `);
    console.log('Created index idx_events_multi_day_group');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addMultiDayColumns();
