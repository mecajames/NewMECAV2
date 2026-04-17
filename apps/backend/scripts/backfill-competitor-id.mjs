/**
 * Backfill competition_results.competitor_id from meca_id -> profiles.meca_id.
 *
 * Root cause: V1 migration populated competition_results.meca_id but left
 * competitor_id NULL on all 41,859 rows. That breaks the existing
 * AchievementsService.repairAchievementValues() which joins on competitor_id.
 * Once competitor_id is populated, the existing repair tool works unchanged.
 *
 * USAGE (dry-run, default):
 *   DATABASE_URL="postgresql://postgres:...@host:5433/postgres" \
 *     node apps/backend/scripts/backfill-competitor-id.mjs
 *
 * USAGE (apply changes):
 *   DATABASE_URL="..." node apps/backend/scripts/backfill-competitor-id.mjs --execute
 *
 * Safety:
 *   - Only touches rows WHERE competitor_id IS NULL (never overwrites).
 *   - Aborts if any meca_id maps to multiple profiles.
 *   - Aborts if any competition_result's meca_id maps to zero profiles (logged, not updated).
 *   - Single transaction; prints rollback SQL on apply.
 */

import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';

const EXECUTE = process.argv.includes('--execute');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL env var is required');
  process.exit(2);
}

const client = new pg.Client({ connectionString });
await client.connect();

// 1. Pre-flight: any meca_id mapping to multiple profiles?
const { rows: dupes } = await client.query(`
  SELECT meca_id, COUNT(*) AS profile_count, array_agg(id::text) AS profile_ids
  FROM profiles
  WHERE meca_id IS NOT NULL
  GROUP BY meca_id
  HAVING COUNT(*) > 1
`);
if (dupes.length > 0) {
  console.error(`\nABORT: ${dupes.length} meca_id values map to multiple profiles.`);
  console.error('This would cause ambiguous joins. Inspect and resolve before running.\n');
  for (const d of dupes.slice(0, 20)) {
    console.error(`  meca_id=${d.meca_id}: profile_ids=${d.profile_ids.join(', ')}`);
  }
  await client.end();
  process.exit(1);
}

// 2. Count what would be updated
const { rows: [stats] } = await client.query(`
  SELECT
    COUNT(*)                                                     AS total_null_rows,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM profiles p WHERE p.meca_id::text = cr.meca_id))     AS matchable,
    COUNT(*) FILTER (WHERE NOT EXISTS (
      SELECT 1 FROM profiles p WHERE p.meca_id::text = cr.meca_id))     AS unmatchable,
    COUNT(*) FILTER (WHERE cr.meca_id IS NULL)                    AS null_meca_id
  FROM competition_results cr
  WHERE cr.competitor_id IS NULL
`);

console.log('\ncompetition_results backfill plan:');
console.log(`  - Total rows with competitor_id NULL: ${stats.total_null_rows}`);
console.log(`  - Matchable via meca_id:              ${stats.matchable}`);
console.log(`  - Unmatchable (no profile w/ meca_id): ${stats.unmatchable}`);
console.log(`  - NULL meca_id (can never be matched): ${stats.null_meca_id}`);

// 3. Show the meca_ids that won't match (if any) — these are likely guest entries
//    or members whose profiles weren't imported.
const { rows: unmatchedMecaIds } = await client.query(`
  SELECT cr.meca_id, COUNT(*) AS result_count
  FROM competition_results cr
  WHERE cr.competitor_id IS NULL
    AND cr.meca_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.meca_id::text = cr.meca_id)
  GROUP BY cr.meca_id
  ORDER BY result_count DESC
  LIMIT 20
`);
if (unmatchedMecaIds.length > 0) {
  console.log('\nTop meca_ids that would remain unmatched:');
  for (const u of unmatchedMecaIds) {
    console.log(`  meca_id=${u.meca_id}: ${u.result_count} result row(s)`);
  }
  console.log('  (These stay NULL — not updated by this script.)');
}

if (!EXECUTE) {
  console.log('\nDRY RUN — nothing changed. Re-run with --execute to apply.');
  await client.end();
  process.exit(0);
}

// 4. Execute in one transaction; capture affected IDs for an exact-match rollback.
console.log('\nAPPLYING UPDATE in a single transaction...');
await client.query('BEGIN');
try {
  const res = await client.query(`
    UPDATE competition_results cr
       SET competitor_id = p.id
      FROM profiles p
     WHERE cr.competitor_id IS NULL
       AND cr.meca_id IS NOT NULL
       AND p.meca_id::text = cr.meca_id
    RETURNING cr.id
  `);

  // Write rollback BEFORE commit, so a crash between RETURNING and COMMIT still
  // leaves a usable rollback file on disk.
  const rollbackPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
    `backfill-competitor-id-rollback-${Date.now()}.sql`
  );
  const ids = res.rows.map(r => `'${r.id}'`);
  const rollbackSql = [
    '-- Auto-generated rollback script.',
    `-- Reverts competitor_id to NULL for the ${ids.length} rows this backfill run updated.`,
    '-- Uses explicit row IDs — safe regardless of how much time passes.',
    'BEGIN;',
    ids.length === 0
      ? '-- (no rows were updated; nothing to roll back)'
      : `UPDATE competition_results SET competitor_id = NULL WHERE id IN (\n  ${ids.join(',\n  ')}\n);`,
    'COMMIT;',
    '',
  ].join('\n');
  await fs.writeFile(rollbackPath, rollbackSql, 'utf8');
  console.log(`\nRollback SQL written to: ${rollbackPath}`);

  await client.query('COMMIT');
  console.log(`\nDone. Rows updated: ${res.rowCount}`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('\nTransaction ROLLED BACK due to error:', err);
  await client.end();
  process.exit(1);
}

await client.end();
