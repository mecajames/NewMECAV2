/**
 * Update V2 achievement_definitions' competition_type, class_filter, and
 * points_multiplier using authoritative V1 config extracted from
 * C:/Users/mmakh/Documents/v1_full_backup.sql (pg_dump plain SQL format).
 *
 * V1 awards worked correctly. V2's migrate script dropped competition_type to
 * 'competition' and never copied the class_filter. This restores both from V1.
 *
 * Join key: V1 award_definitions.name == V2 achievement_definitions.name
 * (this is how the original migrate-v1-data.ts linked them at migration time).
 *
 * Updates applied per def:
 *   - competition_type := V1 "group" column
 *   - class_filter     := V1 conditions.class.value (array of short codes)
 *   - points_multiplier:= 3 for "Dueling Demos - Certified 360 Sound" (V1 says >=3)
 *                        NULL otherwise (V2 can't express V1's "<=2" regular-DD bound)
 *
 * Skips: definitions whose V1 conditions have no class field (e.g. "World Champion 2023").
 *
 * USAGE (dry-run):   DATABASE_URL="..." node scripts/fix-defs-from-v1.mjs
 * USAGE (apply):     DATABASE_URL="..." node scripts/fix-defs-from-v1.mjs --execute
 */

import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';

const DUMP_PATH = 'C:/Users/mmakh/Documents/v1_full_backup.sql';
const EXECUTE = process.argv.includes('--execute');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('ERROR: DATABASE_URL env var is required');
  process.exit(2);
}

// === Parse V1 award_definitions section out of the dump ===

const dump = await fs.readFile(DUMP_PATH, 'utf8');
const startMarker = 'COPY public.award_definitions (id, name, asset_type, asset_url, asset, conditions, created_at, updated_at, status, "group", achievement) FROM stdin;';
const startIdx = dump.indexOf(startMarker);
if (startIdx < 0) throw new Error('award_definitions COPY section not found in dump');
const afterHeader = dump.indexOf('\n', startIdx) + 1;
const endIdx = dump.indexOf('\n\\.\n', afterHeader);
if (endIdx < 0) throw new Error('end-of-data marker not found for award_definitions');
const section = dump.slice(afterHeader, endIdx);

const v1Defs = [];
for (const line of section.split('\n')) {
  if (!line) continue;
  const cols = line.split('\t');
  if (cols.length < 11) {
    console.warn('Skipping short line:', line.slice(0, 80));
    continue;
  }
  const [, name, , , , conditionsRaw, , , , group] = cols;
  let conditions = null;
  try {
    conditions = conditionsRaw === '\\N' || conditionsRaw === '' ? [] : JSON.parse(conditionsRaw);
  } catch (e) {
    console.warn(`Failed to parse conditions for "${name}": ${e.message}`);
    continue;
  }

  // Pull out class + multiplier conditions
  const classCond = Array.isArray(conditions) ? conditions.find(c => c.field === 'class') : null;
  const multCond  = Array.isArray(conditions) ? conditions.find(c => c.field === 'multiplier') : null;
  const classFilter = classCond?.value || null;

  // V2 can only express "multiplier >= N". So only use it if V1 says gte.
  let pointsMultiplier = null;
  if (multCond) {
    if (multCond.operator === 'gte') {
      pointsMultiplier = Number(multCond.value);
    } else {
      // V1 says lte — V2 can't express this. Skip (NULL means "no filter").
      // This makes regular Dueling Demos defs match any multiplier, which is
      // slightly wrong but only matters for 102 recipients and only when they
      // also have a higher 360 Sound score.
    }
  }

  const groupValue = group === '\\N' ? null : group;

  v1Defs.push({
    v1_name: name,
    v1_group: groupValue,
    v1_class_filter: classFilter,
    v1_points_multiplier: pointsMultiplier,
    v1_conditions_empty: !Array.isArray(conditions) || conditions.length === 0,
  });
}

console.log(`Parsed ${v1Defs.length} V1 award_definitions from dump.`);

// === Connect to V2 and build the update plan ===

const client = new pg.Client({ connectionString });
await client.connect();

const { rows: v2Defs } = await client.query(`
  SELECT id, name, competition_type, class_filter, points_multiplier,
         threshold_value, group_name
  FROM achievement_definitions
`);
const v2ByName = new Map(v2Defs.map(d => [d.name, d]));

const plan = [];
const skipped = [];
const noMatch = [];

for (const v1 of v1Defs) {
  const v2 = v2ByName.get(v1.v1_name);
  if (!v2) {
    noMatch.push(v1.v1_name);
    continue;
  }
  // If the V1 def is a static award with no class condition, skip — nothing
  // mechanical to repair. Requires admin handling.
  if (v1.v1_conditions_empty || !v1.v1_class_filter) {
    skipped.push({ reason: 'no V1 class condition', v1_name: v1.v1_name, v2 });
    continue;
  }

  const update = {};
  if (v2.competition_type !== v1.v1_group) {
    update.competition_type = v1.v1_group;
  }
  const currentFilter = v2.class_filter || [];
  const sameFilter =
    currentFilter.length === v1.v1_class_filter.length &&
    currentFilter.every((c, i) => c === v1.v1_class_filter[i]);
  if (!sameFilter) {
    update.class_filter = v1.v1_class_filter;
  }
  const currentMult = v2.points_multiplier === null ? null : Number(v2.points_multiplier);
  if (currentMult !== v1.v1_points_multiplier) {
    update.points_multiplier = v1.v1_points_multiplier;
  }

  if (Object.keys(update).length === 0) continue;

  plan.push({
    v2_id: v2.id,
    name: v2.name,
    current: {
      competition_type: v2.competition_type,
      class_filter: v2.class_filter,
      points_multiplier: v2.points_multiplier === null ? null : Number(v2.points_multiplier),
    },
    proposed: update,
  });
}

console.log(`\nPlan:`);
console.log(`  Defs to update:        ${plan.length}`);
console.log(`  Skipped (no V1 class): ${skipped.length}`);
console.log(`  V1 defs with no V2 match (unexpected): ${noMatch.length}`);

if (noMatch.length) {
  console.log('\n  Unmatched V1 defs:');
  for (const n of noMatch) console.log(`    - ${n}`);
}
if (skipped.length) {
  console.log('\n  Skipped (need manual handling):');
  for (const s of skipped) console.log(`    - "${s.v1_name}" (${s.reason})`);
}

console.log('\nSample proposed updates (first 10):');
for (const p of plan.slice(0, 10)) {
  console.log(`  [${p.v2_id}] "${p.name}"`);
  for (const [k, v] of Object.entries(p.proposed)) {
    const cur = p.current[k];
    const curStr = Array.isArray(cur) ? JSON.stringify(cur) : String(cur);
    const newStr = Array.isArray(v) ? JSON.stringify(v) : String(v);
    console.log(`      ${k}: ${curStr} -> ${newStr}`);
  }
}
if (plan.length > 10) console.log(`  ...and ${plan.length - 10} more`);

if (!EXECUTE) {
  console.log('\nDRY RUN — nothing changed. Re-run with --execute to apply.');
  await client.end();
  process.exit(0);
}

// === Apply ===

console.log('\nAPPLYING UPDATES in a single transaction...');
await client.query('BEGIN');
try {
  const rollbackRows = [];
  for (const p of plan) {
    // capture prior state
    const { rows: [prev] } = await client.query(
      `SELECT competition_type, class_filter, points_multiplier
         FROM achievement_definitions WHERE id = $1`,
      [p.v2_id]
    );
    rollbackRows.push({ id: p.v2_id, prev });

    // build dynamic UPDATE
    const sets = [];
    const params = [];
    if ('competition_type' in p.proposed) {
      params.push(p.proposed.competition_type);
      sets.push(`competition_type = $${params.length}`);
    }
    if ('class_filter' in p.proposed) {
      params.push(p.proposed.class_filter);
      sets.push(`class_filter = $${params.length}`);
    }
    if ('points_multiplier' in p.proposed) {
      params.push(p.proposed.points_multiplier);
      sets.push(`points_multiplier = $${params.length}`);
    }
    sets.push(`updated_at = NOW()`);
    params.push(p.v2_id);

    await client.query(
      `UPDATE achievement_definitions SET ${sets.join(', ')} WHERE id = $${params.length}`,
      params
    );
  }

  // write rollback before commit
  const rollbackPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
    `fix-defs-from-v1-rollback-${Date.now()}.sql`
  );
  const sqlLines = ['-- Auto-generated rollback for fix-defs-from-v1.mjs', 'BEGIN;'];
  for (const r of rollbackRows) {
    const prev = r.prev;
    const ctLit = prev.competition_type === null ? 'NULL' : `'${prev.competition_type.replace(/'/g, "''")}'`;
    const cfLit = prev.class_filter === null
      ? 'NULL'
      : `ARRAY[${prev.class_filter.map(s => `'${String(s).replace(/'/g, "''")}'`).join(',')}]::text[]`;
    const pmLit = prev.points_multiplier === null ? 'NULL' : String(Number(prev.points_multiplier));
    sqlLines.push(
      `UPDATE achievement_definitions SET ` +
      `competition_type = ${ctLit}, ` +
      `class_filter = ${cfLit}, ` +
      `points_multiplier = ${pmLit} ` +
      `WHERE id = '${r.id}';`
    );
  }
  sqlLines.push('COMMIT;', '');
  await fs.writeFile(rollbackPath, sqlLines.join('\n'), 'utf8');
  console.log(`Rollback SQL written to: ${rollbackPath}`);

  await client.query('COMMIT');
  console.log(`\nDone. ${plan.length} definition rows updated.`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('\nTransaction ROLLED BACK:', err);
  await client.end();
  process.exit(1);
}

await client.end();
