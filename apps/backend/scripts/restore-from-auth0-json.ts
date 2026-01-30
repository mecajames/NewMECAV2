/**
 * Restore Missing Profiles from Auth0 JSON Export
 *
 * Compares Auth0 export with current profiles and restores missing ones.
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import * as fs from 'fs';
import * as zlib from 'zlib';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54521';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 54622,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

const AUTH0_JSON_PATH = 'C:\\Users\\mmakh\\OneDrive\\Documents\\mecaevents.json.gz';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface Auth0User {
  user_id: string;
  email: string;
  email_verified: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  nickname?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  logins_count?: number;
  app_metadata?: any;
  user_metadata?: any;
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    analyze: args.includes('--analyze'),
  };
}

async function loadAuth0Json(): Promise<Auth0User[]> {
  console.log(`Loading Auth0 JSON from: ${AUTH0_JSON_PATH}`);

  const gzBuffer = fs.readFileSync(AUTH0_JSON_PATH);
  const jsonBuffer = zlib.gunzipSync(gzBuffer);
  const content = jsonBuffer.toString();

  // Try parsing as JSON array first
  try {
    const users = JSON.parse(content);
    if (Array.isArray(users)) {
      console.log(`Loaded ${users.length} users from Auth0 export (JSON array)`);
      return users;
    }
  } catch {
    // Not a JSON array, try NDJSON
  }

  // Parse as NDJSON (newline-delimited JSON)
  const lines = content.split('\n').filter(line => line.trim());
  const users: Auth0User[] = [];

  for (const line of lines) {
    try {
      users.push(JSON.parse(line));
    } catch {
      // Skip invalid lines
    }
  }

  console.log(`Loaded ${users.length} users from Auth0 export (NDJSON)`);
  return users;
}

async function getCurrentProfiles(db: Client): Promise<Set<string>> {
  const result = await db.query('SELECT email FROM profiles');
  const emails = new Set<string>();
  for (const row of result.rows) {
    emails.add(row.email.toLowerCase());
  }
  console.log(`Found ${emails.size} current profiles in database`);
  return emails;
}

async function run() {
  const args = parseArgs();

  console.log('='.repeat(60));
  console.log('Restore Missing Profiles from Auth0 JSON');
  console.log('='.repeat(60));

  if (args.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Load Auth0 JSON
  const auth0Users = await loadAuth0Json();

  // Connect to database
  const db = new Client(DB_CONFIG);
  await db.connect();
  console.log('✅ Connected to database\n');

  try {
    // Get current profiles
    const currentEmails = await getCurrentProfiles(db);

    // Find missing profiles
    const missingUsers = auth0Users.filter(u =>
      u.email && !currentEmails.has(u.email.toLowerCase())
    );

    console.log(`\nFound ${missingUsers.length} missing profiles to restore\n`);

    if (args.analyze) {
      // Just show stats
      console.log('Missing users by verification status:');
      const verified = missingUsers.filter(u => u.email_verified).length;
      const unverified = missingUsers.filter(u => !u.email_verified).length;
      console.log(`  - Verified: ${verified}`);
      console.log(`  - Unverified: ${unverified}`);

      console.log('\nSample of missing users:');
      missingUsers.slice(0, 10).forEach(u => {
        console.log(`  - ${u.email} (${u.given_name || ''} ${u.family_name || ''})`.trim());
      });
      return;
    }

    // Restore missing profiles
    let created = 0;
    let errors = 0;

    for (let i = 0; i < missingUsers.length; i++) {
      const user = missingUsers[i];
      process.stdout.write(`[${i + 1}/${missingUsers.length}] ${user.email}... `);

      if (args.dryRun) {
        console.log('[DRY RUN] Would create');
        created++;
        continue;
      }

      try {
        // First create the auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          email_confirm: user.email_verified,
          user_metadata: {
            first_name: user.given_name,
            last_name: user.family_name,
            force_password_change: true,
            migrated_from_auth0: true,
            migrated_at: new Date().toISOString(),
          },
        });

        if (authError) {
          if (authError.message.includes('already been registered')) {
            console.log('⏭️ Auth user already exists');
          } else {
            console.log(`❌ Auth error: ${authError.message}`);
            errors++;
          }
          continue;
        }

        // Profile should be created automatically by trigger, but let's verify
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .single();

        if (!profile) {
          // Create profile manually if trigger didn't
          const { error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: user.email,
              first_name: user.given_name || null,
              last_name: user.family_name || null,
              membership_status: 'expired',
              role: 'user',
            });

          if (insertError) {
            console.log(`⚠️ Auth created, profile insert failed: ${insertError.message}`);
          } else {
            console.log('✅ Created (auth + profile)');
          }
        } else {
          console.log('✅ Created');
        }

        created++;

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (err) {
        console.log(`❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Missing profiles found: ${missingUsers.length}`);
    console.log(`✅ Created: ${created}`);
    console.log(`❌ Errors: ${errors}`);

  } finally {
    await db.end();
    console.log('\n✅ Database connection closed');
  }
}

run().catch(console.error);
