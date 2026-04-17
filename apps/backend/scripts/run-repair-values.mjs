/**
 * Standalone port of AchievementsService.repairAchievementValues (service.ts:726).
 * Walks each achievement_recipient, finds the best-scoring competition_result for
 * that profile+achievement (passing threshold + competition-type match), and snaps
 * achieved_value + competition_result_id + event_id + season_id onto it.
 *
 * The service's matchesCompetitionType and evaluateThreshold are ported line-for-line
 * (service.ts:1092-1176). Do NOT diverge without syncing.
 *
 * USAGE (dry-run):  DATABASE_URL="..." node scripts/run-repair-values.mjs
 * USAGE (apply):    DATABASE_URL="..." node scripts/run-repair-values.mjs --execute
 */

import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';

const EXECUTE = process.argv.includes('--execute');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('DATABASE_URL required'); process.exit(2); }

function matchesCompetitionType(result, definition) {
  if (definition.class_filter && definition.class_filter.length > 0) {
    const resultClass = (result.competition_class || '').toLowerCase().trim();
    const classMatches = definition.class_filter.some(
      (c) => resultClass === (c || '').toLowerCase().trim()
    );
    if (!classMatches) return false;
    if (definition.points_multiplier) {
      // V2 stores multiplier on the event, not the result. The service code
      // (service.ts:1107) reads result.pointsMultiplier which doesn't exist —
      // a latent bug. We read it from the joined event here.
      const resultMultiplier = Number(result.event_multiplier) || 1;
      if (resultMultiplier < Number(definition.points_multiplier)) return false;
    }
    return true;
  }
  // Legacy pattern matching fallback
  const classLower = (result.competition_class || '').toLowerCase();
  const competitionType = (definition.competition_type || '').toLowerCase();
  const formatLower = (result.format || '').toLowerCase();
  if (competitionType.includes('radical x') || competitionType.includes('radx')) return classLower.includes('radical');
  if (competitionType.includes('park and pound')) return classLower.includes('park') && classLower.includes('pound');
  if (competitionType.includes('certified 360 sound') || competitionType.includes('c360s')) return classLower.includes('360') || classLower.includes('c360');
  if (competitionType.includes('dueling demos')) {
    const is360 = classLower.includes('360') || classLower.includes('c360');
    return (classLower.includes('duel') || classLower.includes('demo')) && !is360;
  }
  if (competitionType.includes('certified sound')) return classLower.includes('install') || formatLower === 'sql';
  if (competitionType.includes('certified at the headrest')) {
    const isR = classLower.includes('radical');
    const isPP = classLower.includes('park') && classLower.includes('pound');
    const isDD = classLower.includes('duel') || classLower.includes('demo');
    const isSQL = classLower.includes('install') || formatLower === 'sql';
    const isKids = classLower.includes('kids');
    return !isR && !isPP && !isDD && !isSQL && !isKids;
  }
  return false;
}

function evaluateThreshold(value, operator, threshold) {
  switch (operator) {
    case '>':  return value >  threshold;
    case '>=': return value >= threshold;
    case '=':  return value === threshold;
    case '<':  return value <  threshold;
    case '<=': return value <= threshold;
    default:   return false;
  }
}

const client = new pg.Client({ connectionString });
await client.connect();

const { rows: recipients } = await client.query(`
  SELECT ar.id AS recipient_id, ar.profile_id,
         ar.achieved_value::numeric AS current_achieved_value,
         ar.competition_result_id AS current_cr_id,
         ar.event_id AS current_event_id, ar.season_id AS current_season_id,
         ad.id AS achievement_id, ad.name AS achievement_name,
         ad.competition_type, ad.class_filter, ad.points_multiplier,
         ad.threshold_value::numeric AS threshold_value,
         ad.threshold_operator
  FROM achievement_recipients ar
  JOIN achievement_definitions ad ON ad.id = ar.achievement_id
  ORDER BY ar.achieved_at DESC
`);
console.log(`Loaded ${recipients.length} recipients.`);

const profileIds = [...new Set(recipients.map(r => r.profile_id).filter(Boolean))];
const resultsByProfile = new Map();
const BATCH = 300;
for (let i = 0; i < profileIds.length; i += BATCH) {
  const { rows } = await client.query(`
    SELECT cr.id, cr.competitor_id, cr.competition_class, cr.format, cr.score::numeric AS score,
           cr.event_id, cr.season_id, e.points_multiplier::numeric AS event_multiplier
    FROM competition_results cr
    LEFT JOIN events e ON e.id = cr.event_id
    WHERE cr.competitor_id = ANY($1::uuid[])
  `, [profileIds.slice(i, i + BATCH)]);
  for (const r of rows) {
    const list = resultsByProfile.get(r.competitor_id);
    if (list) list.push(r); else resultsByProfile.set(r.competitor_id, [r]);
  }
}
console.log(`Fetched competition_results for ${resultsByProfile.size} of ${profileIds.length} profiles.`);

const updates = [];
let unmatched = 0, noChange = 0;
for (const r of recipients) {
  const profileResults = resultsByProfile.get(r.profile_id) || [];
  const threshold = Number(r.threshold_value);
  const operator = r.threshold_operator;

  let best = null, bestScore = -Infinity;
  for (const result of profileResults) {
    const score = Number(result.score);
    if (!Number.isFinite(score)) continue;
    if (!evaluateThreshold(score, operator, threshold)) continue;
    if (!matchesCompetitionType(result, r)) continue;
    if (score > bestScore) { bestScore = score; best = result; }
  }
  if (!best) { unmatched++; continue; }

  const currentScore = Number(r.current_achieved_value);
  const needsUpdate =
    currentScore !== bestScore ||
    r.current_cr_id !== best.id ||
    r.current_event_id !== best.event_id ||
    r.current_season_id !== best.season_id;
  if (!needsUpdate) { noChange++; continue; }

  updates.push({
    recipient_id: r.recipient_id, achievement_name: r.achievement_name,
    threshold, old_value: currentScore, new_value: bestScore,
    old_cr_id: r.current_cr_id, new_cr_id: best.id,
    new_event_id: best.event_id, new_season_id: best.season_id,
  });
}

console.log(`\nResult: updates=${updates.length}  no-change=${noChange}  unmatched=${unmatched}`);

// Breakdown by achievement group
const byAch = new Map();
for (const u of updates) {
  byAch.set(u.achievement_name, (byAch.get(u.achievement_name) || 0) + 1);
}
console.log('\nUpdates by achievement (top 15):');
const sorted = [...byAch.entries()].sort((a, b) => b[1] - a[1]);
for (const [n, c] of sorted.slice(0, 15)) console.log(`  ${c.toString().padStart(4)}  ${n}`);

if (!EXECUTE) {
  console.log('\nDRY RUN — nothing changed. Re-run with --execute to apply.');
  await client.end();
  process.exit(0);
}

console.log('\nAPPLYING UPDATES in a single transaction...');
await client.query('BEGIN');
try {
  const rollbackRows = [];
  for (const u of updates) {
    const { rows: [prev] } = await client.query(
      `SELECT achieved_value, competition_result_id, event_id, season_id
         FROM achievement_recipients WHERE id = $1`, [u.recipient_id]);
    rollbackRows.push({ id: u.recipient_id, prev });
    await client.query(
      `UPDATE achievement_recipients
          SET achieved_value = $1, competition_result_id = $2, event_id = $3, season_id = $4
        WHERE id = $5`,
      [u.new_value, u.new_cr_id, u.new_event_id, u.new_season_id, u.recipient_id]);
  }
  const rollbackPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
    `run-repair-values-rollback-${Date.now()}.sql`);
  const sql = [
    '-- Auto-generated rollback for run-repair-values.mjs',
    'BEGIN;',
    ...rollbackRows.map(r =>
      `UPDATE achievement_recipients SET ` +
      `achieved_value = ${r.prev.achieved_value}, ` +
      `competition_result_id = ${r.prev.competition_result_id === null ? 'NULL' : `'${r.prev.competition_result_id}'`}, ` +
      `event_id = ${r.prev.event_id === null ? 'NULL' : `'${r.prev.event_id}'`}, ` +
      `season_id = ${r.prev.season_id === null ? 'NULL' : `'${r.prev.season_id}'`} ` +
      `WHERE id = '${r.id}';`
    ),
    'COMMIT;', '',
  ].join('\n');
  await fs.writeFile(rollbackPath, sql, 'utf8');
  console.log(`Rollback SQL written to: ${rollbackPath}`);
  await client.query('COMMIT');
  console.log(`\nDone. ${updates.length} recipients updated.`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('\nTransaction ROLLED BACK:', err);
  await client.end();
  process.exit(1);
}
await client.end();
