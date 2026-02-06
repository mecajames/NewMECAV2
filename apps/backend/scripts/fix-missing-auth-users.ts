/**
 * Script to fix profiles that don't have corresponding Supabase Auth entries
 * Creates auth accounts for all profiles missing them
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as crypto from 'crypto';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const databaseUrl = process.env.DATABASE_URL!;

if (!supabaseUrl || !supabaseServiceKey || !databaseUrl) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Generate a secure random password
function generatePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }
  return password;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Fix Missing Auth Users Script');
  console.log('='.repeat(60));

  // Connect to database
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  console.log('Connected to database');

  try {
    // Get only profiles with active memberships (not expired, payment completed)
    const { rows: profiles } = await client.query(`
      SELECT DISTINCT p.id, p.email, p.first_name, p.last_name
      FROM profiles p
      INNER JOIN memberships m ON m.user_id = p.id
      WHERE p.email IS NOT NULL
        AND m.payment_status = 'paid'
        AND (m.end_date IS NULL OR m.end_date > NOW())
      ORDER BY p.email
    `);

    console.log(`Found ${profiles.length} active members (with paid, non-expired memberships)`);

    let missingCount = 0;
    let fixedCount = 0;
    let errorCount = 0;
    const results: { email: string; status: string; error?: string }[] = [];

    for (const profile of profiles) {
      // Check if user exists in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(profile.id);

      if (authError || !authUser.user) {
        missingCount++;
        console.log(`\nMissing auth for: ${profile.email} (${profile.id})`);

        // Try to create the auth user
        const password = generatePassword();

        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          id: profile.id, // Use the same ID as the profile
          email: profile.email,
          password: password,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            first_name: profile.first_name,
            last_name: profile.last_name,
          },
        });

        if (createError) {
          console.error(`  ERROR creating auth user: ${createError.message}`);
          errorCount++;
          results.push({ email: profile.email, status: 'ERROR', error: createError.message });
        } else {
          console.log(`  CREATED auth user: ${newUser.user?.id}`);
          fixedCount++;
          results.push({ email: profile.email, status: 'CREATED' });
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total profiles checked: ${profiles.length}`);
    console.log(`Missing auth accounts: ${missingCount}`);
    console.log(`Successfully created: ${fixedCount}`);
    console.log(`Errors: ${errorCount}`);

    if (results.length > 0) {
      console.log('\nDetails:');
      for (const r of results) {
        console.log(`  ${r.status}: ${r.email}${r.error ? ` - ${r.error}` : ''}`);
      }
    }

  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
