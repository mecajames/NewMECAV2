/**
 * Scans team_members for rows whose team_id does not exist in teams and removes
 * them. Orphans cause TeamsService.findByUserId → findById to throw 404 on
 * /api/teams/user/:userId (teams.service.ts:333).
 *
 * A backend guard was added so orphans no longer surface as 404s, but stale
 * rows still pollute queries — this script reconciles the table.
 *
 * USAGE (dry-run):  DATABASE_URL="..." node scripts/cleanup-orphaned-team-members.mjs
 * USAGE (apply):    DATABASE_URL="..." node scripts/cleanup-orphaned-team-members.mjs --execute
 */

import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';

const EXECUTE = process.argv.includes('--execute');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('DATABASE_URL required'); process.exit(2); }

const client = new pg.Client({ connectionString });
await client.connect();

const { rows: orphans } = await client.query(`
  SELECT tm.id, tm.team_id, tm.user_id, tm.membership_id, tm.role, tm.status,
         tm.joined_at, tm.requested_at, tm.request_message
  FROM team_members tm
  LEFT JOIN teams t ON t.id = tm.team_id
  WHERE t.id IS NULL
  ORDER BY tm.id
`);

console.log(`\nOrphaned team_members rows (team_id missing from teams): ${orphans.length}\n`);
if (orphans.length === 0) {
  console.log('Nothing to do.');
  await client.end();
  process.exit(0);
}

console.log('id | team_id | user_id | role | status');
console.log('-'.repeat(100));
for (const o of orphans) {
  console.log(`${o.id} | ${o.team_id} | ${o.user_id} | ${o.role} | ${o.status}`);
}

if (!EXECUTE) {
  console.log('\nDRY RUN — nothing changed. Re-run with --execute to delete.');
  await client.end();
  process.exit(0);
}

console.log('\nDELETING orphans in a single transaction...');
await client.query('BEGIN');
try {
  const ids = orphans.map(o => o.id);
  await client.query('DELETE FROM team_members WHERE id = ANY($1::uuid[])', [ids]);

  const quote = (v) => v === null || v === undefined ? 'NULL'
    : v instanceof Date ? `'${v.toISOString()}'`
    : typeof v === 'string' ? `'${v.replace(/'/g, "''")}'`
    : String(v);

  const rollbackPath = path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
    `cleanup-orphaned-team-members-rollback-${Date.now()}.sql`);
  const sql = [
    '-- Auto-generated rollback for cleanup-orphaned-team-members.mjs',
    '-- Re-inserts deleted team_members rows. Only useful if the referenced',
    '-- teams rows are restored first, otherwise the FK (if one exists) will fail.',
    'BEGIN;',
    ...orphans.map(o =>
      `INSERT INTO team_members (id, team_id, user_id, membership_id, role, status, joined_at, requested_at, request_message) VALUES (`
      + [o.id, o.team_id, o.user_id, o.membership_id, o.role, o.status, o.joined_at, o.requested_at, o.request_message].map(quote).join(', ')
      + ');'
    ),
    'COMMIT;', '',
  ].join('\n');
  await fs.writeFile(rollbackPath, sql, 'utf8');
  console.log(`Rollback SQL written to: ${rollbackPath}`);

  await client.query('COMMIT');
  console.log(`\nDone. ${orphans.length} orphaned team_members rows deleted.`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('\nTransaction ROLLED BACK:', err);
  await client.end();
  process.exit(1);
}
await client.end();
