/**
 * Backfill threshold_value (and render_value) on achievement_definitions where
 * threshold_value = 0, by parsing the numeric threshold out of the definition name.
 *
 * Root cause: migrate-v1-data.ts used `def.conditions?.threshold || 0` during V1
 * import. V1 rows without a numeric `threshold` in their conditions JSONB landed
 * as 0 in V2. 61 such definitions exist in prod as of 2026-04-16.
 *
 * USAGE (dry-run, default):
 *   DATABASE_URL="postgresql://postgres:...@host:5433/postgres" \
 *     node apps/backend/scripts/fix-definition-thresholds.mjs
 *
 * USAGE (apply changes):
 *   DATABASE_URL="..." node apps/backend/scripts/fix-definition-thresholds.mjs --execute
 *
 * Skips: definitions whose name has no numeric threshold (e.g. "World Champion 2023").
 * Those need manual admin correction if they should have a threshold at all.
 *
 * Rollback: a paired fix-definition-thresholds-rollback.sql is emitted alongside
 * execution so you can restore prior zero values if anything looks wrong.
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

// Parse "... 125+dB Club", "... 90+ Points Club", "… 155+dB Club" etc.
// Capture the leading number; accept optional whitespace around "+" and before unit.
const THRESHOLD_RE = /(\d+)\s*\+?\s*(dB|Points)\b/i;

const { rows: bad } = await client.query(`
  SELECT id, name, group_name, metric_type, threshold_value, render_value
  FROM achievement_definitions
  WHERE threshold_value = 0
  ORDER BY group_name NULLS LAST, name
`);

const proposed = [];
const skipped = [];

for (const def of bad) {
  const match = def.name.match(THRESHOLD_RE);
  if (!match) {
    skipped.push(def);
    continue;
  }
  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    skipped.push(def);
    continue;
  }
  const oldRender = def.render_value === null ? null : Number(def.render_value);
  // Only overwrite render_value if it's currently zero or null. If someone
  // already set a custom render_value, preserve it.
  const newRender = (oldRender === null || oldRender === 0) ? parsed : oldRender;
  proposed.push({
    id: def.id,
    name: def.name,
    group_name: def.group_name,
    metric_type: def.metric_type,
    old_threshold: Number(def.threshold_value),
    old_render: oldRender,
    new_threshold: parsed,
    new_render: newRender,
    render_touched: newRender !== oldRender,
  });
}

console.log(`\nFound ${bad.length} definitions with threshold_value = 0`);
console.log(`  - Parseable from name: ${proposed.length}`);
console.log(`  - Skipped (no numeric threshold in name): ${skipped.length}`);

if (skipped.length > 0) {
  console.log('\nSkipped (need manual admin correction):');
  for (const s of skipped) {
    console.log(`  [${s.id}] "${s.name}"  (group=${s.group_name ?? 'null'})`);
  }
}

console.log('\nProposed updates:');
for (const p of proposed) {
  const renderLine = p.render_touched
    ? `      render_value:    ${p.old_render} -> ${p.new_render}`
    : `      render_value:    ${p.old_render} (preserved — already non-zero)`;
  console.log(
    `  [${p.id}] "${p.name}"\n` +
    `      threshold_value: ${p.old_threshold} -> ${p.new_threshold}\n` +
    renderLine
  );
}

if (!EXECUTE) {
  console.log('\nDRY RUN — nothing changed. Re-run with --execute to apply.');
  await client.end();
  process.exit(0);
}

console.log('\nAPPLYING CHANGES in a single transaction...');

// Write rollback script BEFORE executing, next to this file.
const rollbackPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  `fix-definition-thresholds-rollback-${Date.now()}.sql`
);
const rollbackSql = [
  '-- Auto-generated rollback script.',
  '-- Restores threshold_value and render_value to values that existed before the backfill.',
  'BEGIN;',
  ...proposed.map(p =>
    `UPDATE achievement_definitions SET threshold_value = ${p.old_threshold}, render_value = ${p.old_render === null ? 'NULL' : p.old_render} WHERE id = '${p.id}';`
  ),
  'COMMIT;',
  '',
].join('\n');
await fs.writeFile(rollbackPath, rollbackSql, 'utf8');
console.log(`Rollback SQL written to: ${rollbackPath}`);

await client.query('BEGIN');
try {
  let updated = 0;
  for (const p of proposed) {
    const res = await client.query(
      `UPDATE achievement_definitions
         SET threshold_value = $1, render_value = $2, updated_at = NOW()
       WHERE id = $3 AND threshold_value = 0`,
      [p.new_threshold, p.new_render, p.id]
    );
    updated += res.rowCount;
  }
  await client.query('COMMIT');
  console.log(`\nDone. Rows updated: ${updated}`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('\nTransaction ROLLED BACK due to error:', err);
  await client.end();
  process.exit(1);
}

await client.end();
