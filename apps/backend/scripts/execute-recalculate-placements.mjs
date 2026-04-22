/**
 * Placement-only recalc, matching service.ts:1264-1313 (sort score DESC within
 * event + format + class, assign 1..N). Snapshots placement + points_earned to
 * a timestamped backup table before touching anything. Does NOT update
 * points_earned — those are left as-is. World Finals qualifications untouched.
 *
 * USAGE (dry-run):  DATABASE_URL="..." node scripts/execute-recalculate-placements.mjs
 * USAGE (apply):    DATABASE_URL="..." node scripts/execute-recalculate-placements.mjs --execute
 */

import pg from 'pg';

const EXECUTE = process.argv.includes('--execute');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('DATABASE_URL required'); process.exit(2); }

const client = new pg.Client({ connectionString });
await client.connect();

const { rows: eventRows } = await client.query(`
  SELECT DISTINCT event_id FROM competition_results WHERE event_id IS NOT NULL ORDER BY event_id
`);
const eventIds = eventRows.map(r => r.event_id);
console.log(`Events with results: ${eventIds.length}`);

const { rows: classRows } = await client.query(`SELECT id, format FROM competition_classes`);
const classFormat = new Map(classRows.map(c => [c.id, c.format]));

let backupTable = null;
if (EXECUTE) {
  const ts = Date.now();
  backupTable = `competition_results_placement_backup_${ts}`;
  console.log(`\nCreating backup table: ${backupTable}`);
  await client.query(`
    CREATE TABLE ${backupTable} AS
    SELECT id, placement, points_earned, created_at, updated_at
    FROM competition_results
  `);
  const { rows: [{ c }] } = await client.query(`SELECT COUNT(*)::int c FROM ${backupTable}`);
  console.log(`Backup rows: ${c}`);
}

let totalRows = 0, changedRows = 0, changedEvents = 0, failedEvents = 0;
const samples = [];
const startTs = Date.now();

for (let i = 0; i < eventIds.length; i++) {
  const eventId = eventIds[i];
  const { rows } = await client.query(
    `SELECT id, event_id, competition_class, class_id, format, score, placement
     FROM competition_results WHERE event_id = $1`, [eventId]);
  if (rows.length === 0) continue;

  const groups = new Map();
  for (const r of rows) {
    const fmt = classFormat.get(r.class_id) || r.format || null;
    const key = fmt ? `${fmt}-${r.competition_class}` : `UNKNOWN-${r.competition_class}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const updates = [];
  for (const [, group] of groups) {
    group.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    let p = 1;
    for (const r of group) {
      totalRows++;
      if (r.placement !== p) {
        changedRows++;
        updates.push({ id: r.id, newP: p });
        if (samples.length < 5) samples.push({ id: r.id, old: r.placement, new: p, score: r.score, class: r.competition_class });
      }
      p++;
    }
  }

  if (updates.length === 0) continue;
  changedEvents++;

  if (EXECUTE) {
    try {
      await client.query('BEGIN');
      // Batch via unnest to keep per-event transaction tight
      const ids = updates.map(u => u.id);
      const placements = updates.map(u => u.newP);
      await client.query(
        `UPDATE competition_results cr
         SET placement = v.p, updated_at = NOW()
         FROM (SELECT UNNEST($1::uuid[]) AS id, UNNEST($2::int[]) AS p) v
         WHERE cr.id = v.id`,
        [ids, placements]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      failedEvents++;
      console.error(`  event ${eventId} FAILED: ${err.message}`);
    }
  }

  if ((i + 1) % 100 === 0) {
    const rate = (i + 1) / ((Date.now() - startTs) / 1000);
    console.log(`  progress: ${i + 1}/${eventIds.length} events  rows_changed=${changedRows}  (${rate.toFixed(1)} evt/s)`);
  }
}

console.log(`\nRows scanned:    ${totalRows}`);
console.log(`Rows ${EXECUTE ? 'UPDATED' : 'would change'}: ${changedRows}`);
console.log(`Events ${EXECUTE ? 'updated' : 'to update'}: ${changedEvents}`);
if (EXECUTE) console.log(`Events FAILED:   ${failedEvents}`);
if (backupTable) console.log(`\nBackup table: ${backupTable}`);
console.log(`\nSample updates:`);
for (const s of samples) console.log(`  ${s.id}  class=${s.class} score=${s.score}  ${s.old} -> ${s.new}`);

await client.end();
if (!EXECUTE) console.log('\nDRY RUN — re-run with --execute to apply.');
