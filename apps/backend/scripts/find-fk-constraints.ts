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
    SELECT
      tc.table_name as referencing_table,
      kcu.column_name as referencing_column,
      ccu.table_name as referenced_table,
      ccu.column_name as referenced_column
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'profiles'
    ORDER BY tc.table_name
  `);

  console.log('Tables referencing profiles:');
  result.rows.forEach(r => {
    console.log(`  ${r.referencing_table}.${r.referencing_column} -> profiles.${r.referenced_column}`);
  });

  await db.end();
}

run().catch(console.error);
