/**
 * Populates team_members from two sources:
 *   1. teams.captain_id   → one row per team as role='owner' (if captain profile exists)
 *   2. result_teams (team_id, member_id) unique pairs → role='member'
 *      (skipped if member_id matches the team's captain_id — the owner row covers it)
 *
 * Only inserts rows that don't already exist. Status defaults to 'active'.
 * joined_at uses the earliest result_teams.created_at for the pair, or now() for owners.
 *
 * USAGE (dry-run):  DATABASE_URL="..." node scripts/populate-team-members.mjs
 * USAGE (apply):    DATABASE_URL="..." node scripts/populate-team-members.mjs --execute
 */

import pg from 'pg';

const EXECUTE = process.argv.includes('--execute');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('DATABASE_URL required'); process.exit(2); }

const client = new pg.Client({ connectionString });
await client.connect();

// Gather teams + valid captain profiles
const { rows: teams } = await client.query(`
  SELECT t.id AS team_id, t.captain_id, p.id AS profile_id
  FROM teams t
  LEFT JOIN profiles p ON p.id = t.captain_id
  WHERE t.is_active = true
`);
const captainByTeam = new Map();
let teamsWithBadCaptain = 0;
for (const t of teams) {
  if (t.profile_id) captainByTeam.set(t.team_id, t.captain_id);
  else teamsWithBadCaptain++;
}
console.log(`Teams: ${teams.length}, with valid captain profile: ${captainByTeam.size}, with missing captain profile: ${teamsWithBadCaptain}`);

// Gather (team_id, member_id) pairs from result_teams + earliest created_at
const { rows: pairs } = await client.query(`
  SELECT rt.team_id, rt.member_id, MIN(rt.created_at) AS joined_at
  FROM result_teams rt
  JOIN teams t ON t.id = rt.team_id
  JOIN profiles p ON p.id = rt.member_id
  WHERE rt.member_id IS NOT NULL
  GROUP BY rt.team_id, rt.member_id
`);
console.log(`Unique valid (team, member) pairs from result_teams: ${pairs.length}`);

// Existing team_members rows (so we skip duplicates)
const { rows: existing } = await client.query(`SELECT team_id, user_id FROM team_members`);
const existingSet = new Set(existing.map(r => `${r.team_id}|${r.user_id}`));
console.log(`Existing team_members rows: ${existing.length}`);

// Build insert plan
const owners = [];
const members = [];
for (const [teamId, captainId] of captainByTeam) {
  if (!existingSet.has(`${teamId}|${captainId}`)) {
    owners.push({ team_id: teamId, user_id: captainId });
  }
}
for (const p of pairs) {
  const captainId = captainByTeam.get(p.team_id);
  if (p.member_id === captainId) continue; // owner row already covers this
  if (existingSet.has(`${p.team_id}|${p.member_id}`)) continue;
  members.push({ team_id: p.team_id, user_id: p.member_id, joined_at: p.joined_at });
}
console.log(`\nPlan:`);
console.log(`  owner rows to insert:  ${owners.length}`);
console.log(`  member rows to insert: ${members.length}`);
console.log(`  total:                 ${owners.length + members.length}`);

if (!EXECUTE) {
  console.log('\nSample owner row:', owners[0]);
  console.log('Sample member row:', members[0]);
  console.log('\nDRY RUN — re-run with --execute to apply.');
  await client.end();
  process.exit(0);
}

console.log('\nInserting in a single transaction...');
await client.query('BEGIN');
try {
  let inserted = 0;
  // Owners
  if (owners.length) {
    await client.query(
      `INSERT INTO team_members (id, team_id, user_id, role, status, joined_at)
       SELECT gen_random_uuid(), t_id, u_id, 'owner', 'active', NOW()
       FROM UNNEST($1::uuid[], $2::uuid[]) AS v(t_id, u_id)`,
      [owners.map(o => o.team_id), owners.map(o => o.user_id)]
    );
    inserted += owners.length;
  }
  // Members
  if (members.length) {
    await client.query(
      `INSERT INTO team_members (id, team_id, user_id, role, status, joined_at)
       SELECT gen_random_uuid(), t_id, u_id, 'member', 'active', COALESCE(j_at, NOW())
       FROM UNNEST($1::uuid[], $2::uuid[], $3::timestamptz[]) AS v(t_id, u_id, j_at)`,
      [members.map(m => m.team_id), members.map(m => m.user_id), members.map(m => m.joined_at)]
    );
    inserted += members.length;
  }
  await client.query('COMMIT');
  console.log(`Done. ${inserted} rows inserted into team_members.`);
} catch (err) {
  await client.query('ROLLBACK');
  console.error('Transaction ROLLED BACK:', err.message);
  process.exit(1);
}
await client.end();
