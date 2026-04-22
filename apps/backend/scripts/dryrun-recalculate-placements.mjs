/**
 * READ-ONLY simulation of CompetitionResultsService.updateEventPoints placement
 * assignment (service.ts:1264-1313). For every event, groups rows by
 * (competition_class, format), sorts by score DESC, assigns placement = 1..N,
 * and reports the delta vs what's currently stored. Does NOT touch points_earned
 * (which depends on eligibility + points config) — placement only.
 *
 * USAGE: DATABASE_URL="..." node scripts/dryrun-recalculate-placements.mjs
 *   Optional flags:
 *     --limit=50      Limit to first N events (for quick preview)
 *     --sample=10     Print first N changed rows as examples
 */

import pg from 'pg';

const args = process.argv.slice(2);
const argVal = (name, def) => {
  const a = args.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=')[1] : def;
};
const LIMIT = parseInt(argVal('limit', '0'), 10) || 0;
const SAMPLE = parseInt(argVal('sample', '10'), 10) || 10;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('DATABASE_URL required'); process.exit(2); }

const client = new pg.Client({ connectionString });
await client.connect();

// Fetch event IDs with results
const { rows: eventRows } = await client.query(`
  SELECT DISTINCT cr.event_id
  FROM competition_results cr
  WHERE cr.event_id IS NOT NULL
  ORDER BY cr.event_id
`);
const eventIds = eventRows.map(r => r.event_id);
const totalEvents = eventIds.length;
const processEvents = LIMIT > 0 ? eventIds.slice(0, LIMIT) : eventIds;
console.log(`Events with results: ${totalEvents}${LIMIT > 0 ? `  (processing first ${processEvents.length})` : ''}`);

// Load format per class to match the service logic (competition_classes.format)
const { rows: classRows } = await client.query(`SELECT id, format FROM competition_classes`);
const classFormat = new Map(classRows.map(c => [c.id, c.format]));

let totalRows = 0;
let changedRows = 0;
let changedEvents = 0;
const byDelta = new Map(); // (before→after) counts — purely informational
const samples = [];
const eventChangeCounts = [];

for (const eventId of processEvents) {
  const { rows } = await client.query(`
    SELECT id, event_id, competition_class, class_id, format, score, placement
    FROM competition_results
    WHERE event_id = $1
  `, [eventId]);
  if (rows.length === 0) continue;

  // Group by (format, competition_class) — mirrors service.ts:1247
  const groups = new Map();
  for (const r of rows) {
    const fmt = classFormat.get(r.class_id) || r.format || null;
    const key = fmt ? `${fmt}-${r.competition_class}` : `UNKNOWN-${r.competition_class}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  let evtChanged = 0;
  for (const [, group] of groups) {
    // Sort by score DESC — matches service.ts:1270
    group.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    let newPlacement = 1;
    for (const r of group) {
      totalRows++;
      const oldP = r.placement;
      const newP = newPlacement;
      if (oldP !== newP) {
        changedRows++;
        evtChanged++;
        const k = `${oldP}→${newP}`;
        byDelta.set(k, (byDelta.get(k) || 0) + 1);
        if (samples.length < SAMPLE) {
          samples.push({ id: r.id, event_id: r.event_id, class: r.competition_class, fmt: r.format, score: r.score, old: oldP, new: newP });
        }
      }
      newPlacement++;
    }
  }
  if (evtChanged > 0) { changedEvents++; eventChangeCounts.push([eventId, evtChanged]); }
}

console.log(`\nRows scanned:       ${totalRows}`);
console.log(`Rows that would change placement: ${changedRows} (${(100*changedRows/Math.max(1,totalRows)).toFixed(1)}%)`);
console.log(`Events touched:     ${changedEvents} / ${processEvents.length}`);

console.log('\nTop placement transitions (old → new: count):');
const sortedDeltas = [...byDelta.entries()].sort((a,b) => b[1]-a[1]);
for (const [k, v] of sortedDeltas.slice(0, 15)) console.log(`  ${k}: ${v}`);

console.log('\nSample changes:');
for (const s of samples) {
  console.log(`  event=${s.event_id}  class=${s.class}  fmt=${s.fmt}  score=${s.score}  placement ${s.old} → ${s.new}`);
}

console.log('\nTop events by change volume:');
eventChangeCounts.sort((a,b) => b[1]-a[1]);
for (const [e, n] of eventChangeCounts.slice(0, 10)) console.log(`  ${e}: ${n} rows`);

await client.end();
