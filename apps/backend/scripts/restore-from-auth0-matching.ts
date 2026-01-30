/**
 * Restore orphaned profiles by matching Auth0 users to memberships
 *
 * Strategy:
 * 1. Get orphaned memberships with billing_first_name, billing_last_name
 * 2. Load Auth0 JSON export
 * 3. Match Auth0 users to memberships by name
 * 4. Create auth users and profiles
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import * as fs from 'fs';
import * as zlib from 'zlib';

const LOCAL_URL = 'http://127.0.0.1:54521';
const LOCAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const AUTH0_JSON_PATH = 'C:\\Users\\mmakh\\OneDrive\\Documents\\mecaevents.json.gz';

const localSupabase = createClient(LOCAL_URL, LOCAL_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const db = new Client({
  host: '127.0.0.1',
  port: 54622,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
});

interface Auth0User {
  email: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  email_verified: boolean;
}

interface OrphanedMembership {
  user_id: string;
  billing_first_name: string | null;
  billing_last_name: string | null;
  meca_id: string | null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
  };
}

function loadAuth0Json(): Auth0User[] {
  console.log(`Loading Auth0 JSON from: ${AUTH0_JSON_PATH}`);
  const gzBuffer = fs.readFileSync(AUTH0_JSON_PATH);
  const jsonBuffer = zlib.gunzipSync(gzBuffer);
  const content = jsonBuffer.toString();

  // Try JSON array first
  try {
    const users = JSON.parse(content);
    if (Array.isArray(users)) {
      console.log(`Loaded ${users.length} users (JSON array)`);
      return users;
    }
  } catch {}

  // Parse as NDJSON
  const lines = content.split('\n').filter(line => line.trim());
  const users: Auth0User[] = [];
  for (const line of lines) {
    try {
      users.push(JSON.parse(line));
    } catch {}
  }
  console.log(`Loaded ${users.length} users (NDJSON)`);
  return users;
}

function normalizeString(s: string | null | undefined): string {
  return (s || '').toLowerCase().trim();
}

function matchUser(membership: OrphanedMembership, auth0Users: Auth0User[]): Auth0User | null {
  const firstName = normalizeString(membership.billing_first_name);
  const lastName = normalizeString(membership.billing_last_name);

  if (!firstName && !lastName) return null;

  // Try exact match first
  for (const user of auth0Users) {
    const auth0First = normalizeString(user.given_name);
    const auth0Last = normalizeString(user.family_name);

    if (firstName && lastName && auth0First === firstName && auth0Last === lastName) {
      return user;
    }
  }

  // Try matching on full name
  for (const user of auth0Users) {
    if (user.name) {
      const fullName = normalizeString(user.name);
      const memberFullName = `${firstName} ${lastName}`.trim();
      if (fullName === memberFullName) {
        return user;
      }
    }
  }

  return null;
}

async function run() {
  const { dryRun } = parseArgs();

  console.log('='.repeat(60));
  console.log('Restore Orphaned Profiles via Auth0 Name Matching');
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Load Auth0 users
  const auth0Users = loadAuth0Json();

  // Build index of existing emails in local auth
  await db.connect();
  console.log('✅ Connected to database\n');

  // Get orphaned memberships
  const orphanedResult = await db.query<OrphanedMembership>(`
    SELECT DISTINCT ON (m.user_id)
      m.user_id, m.billing_first_name, m.billing_last_name, m.meca_id
    FROM memberships m
    LEFT JOIN profiles p ON m.user_id = p.id
    WHERE m.payment_status = 'paid' AND m.end_date >= NOW() AND p.id IS NULL
    ORDER BY m.user_id, m.end_date DESC
  `);

  console.log(`Found ${orphanedResult.rows.length} orphaned memberships\n`);

  // Get existing emails
  const existingEmails = new Set<string>();
  const authResult = await db.query('SELECT email FROM auth.users');
  authResult.rows.forEach(r => existingEmails.add(r.email.toLowerCase()));
  console.log(`Existing auth users: ${existingEmails.size}\n`);

  // Match and restore
  let matched = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const membership of orphanedResult.rows) {
    const auth0User = matchUser(membership, auth0Users);

    if (!auth0User) {
      console.log(`[${membership.user_id}] ${membership.billing_first_name} ${membership.billing_last_name} - ❌ No Auth0 match`);
      skipped++;
      continue;
    }

    matched++;
    const email = auth0User.email.toLowerCase();

    if (existingEmails.has(email)) {
      console.log(`[${membership.meca_id}] ${email} - ⏭️ Already exists`);
      skipped++;
      continue;
    }

    process.stdout.write(`[${membership.meca_id}] ${email}... `);

    if (dryRun) {
      console.log('[DRY RUN] Would create');
      created++;
      continue;
    }

    try {
      // Create auth user
      const { data: authData, error: authError } = await localSupabase.auth.admin.createUser({
        email: email,
        email_confirm: auth0User.email_verified,
        user_metadata: {
          first_name: auth0User.given_name || membership.billing_first_name,
          last_name: auth0User.family_name || membership.billing_last_name,
          force_password_change: true,
          restored_via_auth0_match: true,
        },
      });

      if (authError) {
        console.log(`❌ ${authError.message}`);
        errors++;
        continue;
      }

      const newUserId = authData.user.id;
      const oldUserId = membership.user_id;

      // Update membership to point to new user
      await db.query(
        'UPDATE memberships SET user_id = $1 WHERE user_id = $2',
        [newUserId, oldUserId]
      );

      // Create profile
      const { error: profileError } = await localSupabase
        .from('profiles')
        .insert({
          id: newUserId,
          email: email,
          first_name: auth0User.given_name || membership.billing_first_name,
          last_name: auth0User.family_name || membership.billing_last_name,
          meca_id: membership.meca_id,
          role: 'user',
          membership_status: 'active',
          force_password_change: true,
        });

      if (profileError) {
        console.log(`⚠️ Profile: ${profileError.message}`);
      } else {
        console.log(`✅ Created`);
        created++;
      }

      existingEmails.add(email);
      await new Promise(r => setTimeout(r, 50));

    } catch (err) {
      console.log(`❌ ${err instanceof Error ? err.message : 'Error'}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Orphaned memberships: ${orphanedResult.rows.length}`);
  console.log(`Matched to Auth0: ${matched}`);
  console.log(`✅ Created: ${created}`);
  console.log(`⏭️ Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);

  await db.end();
}

run().catch(console.error);
