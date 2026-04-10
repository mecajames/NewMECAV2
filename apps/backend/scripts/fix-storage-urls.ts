/**
 * Fix Storage URLs in Database
 *
 * Rewrites Supabase storage URLs that use a raw HTTP IP address
 * to use the public-facing HTTPS proxy URL instead.
 *
 * This fixes mixed content errors where images stored with
 * http://IP:PORT/storage/v1/object/public/... URLs fail to load
 * on the HTTPS production site.
 *
 * Usage:
 *   npx ts-node scripts/fix-storage-urls.ts --dry-run
 *   npx ts-node scripts/fix-storage-urls.ts
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string
 *   OLD_STORAGE_BASE - The incorrect URL prefix to replace (e.g., http://3.209.7.224:3000)
 *   NEW_STORAGE_BASE - The correct URL prefix (e.g., https://mecacaraudio.com/supabase)
 */

import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const OLD_STORAGE_BASE = process.env.OLD_STORAGE_BASE || 'http://3.209.7.224:3000';
const NEW_STORAGE_BASE = process.env.NEW_STORAGE_BASE || 'https://mecacaraudio.com/supabase';
const DRY_RUN = process.argv.includes('--dry-run');

// Tables and columns that store Supabase storage URLs
const URL_COLUMNS = [
  { table: 'retailer_listings', column: 'profile_image_url' },
  { table: 'manufacturer_listings', column: 'profile_image_url' },
];

// Tables with JSON columns that may contain storage URLs
const JSON_COLUMNS = [
  { table: 'retailer_listings', column: 'gallery_images' },
  { table: 'manufacturer_listings', column: 'gallery_images' },
];

async function main() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }

  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`Replacing: ${OLD_STORAGE_BASE}`);
  console.log(`With:      ${NEW_STORAGE_BASE}\n`);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Fix text URL columns
    for (const { table, column } of URL_COLUMNS) {
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM ${table} WHERE ${column} LIKE $1`,
        [`${OLD_STORAGE_BASE}%`]
      );
      const count = parseInt(countResult.rows[0].count);
      console.log(`${table}.${column}: ${count} rows to fix`);

      if (count > 0 && !DRY_RUN) {
        const result = await client.query(
          `UPDATE ${table} SET ${column} = REPLACE(${column}, $1, $2) WHERE ${column} LIKE $3`,
          [OLD_STORAGE_BASE, NEW_STORAGE_BASE, `${OLD_STORAGE_BASE}%`]
        );
        console.log(`  -> Updated ${result.rowCount} rows`);
      }
    }

    // Fix JSON columns containing URLs
    for (const { table, column } of JSON_COLUMNS) {
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM ${table} WHERE ${column}::text LIKE $1`,
        [`%${OLD_STORAGE_BASE}%`]
      );
      const count = parseInt(countResult.rows[0].count);
      console.log(`${table}.${column} (JSON): ${count} rows to fix`);

      if (count > 0 && !DRY_RUN) {
        const result = await client.query(
          `UPDATE ${table} SET ${column} = REPLACE(${column}::text, $1, $2)::jsonb WHERE ${column}::text LIKE $3`,
          [OLD_STORAGE_BASE, NEW_STORAGE_BASE, `%${OLD_STORAGE_BASE}%`]
        );
        console.log(`  -> Updated ${result.rowCount} rows`);
      }
    }

    console.log('\nDone!');
    if (DRY_RUN) {
      console.log('(No changes made — run without --dry-run to apply)');
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
