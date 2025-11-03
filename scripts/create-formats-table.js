#!/usr/bin/env node

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
});

async function createTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS competition_formats (
        id uuid NOT NULL PRIMARY KEY,
        name text NOT NULL UNIQUE,
        description text NULL,
        is_active boolean NOT NULL DEFAULT true,
        display_order int NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );
    `);

    console.log('✓ competition_formats table created successfully');
  } catch (error) {
    console.error('Error creating table:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTable();
