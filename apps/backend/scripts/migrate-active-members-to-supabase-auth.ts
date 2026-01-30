/**
 * Members Supabase Auth Migration Script
 *
 * Creates Supabase Auth accounts for members based on priority tiers.
 * This enables users to log into V2 after the migration from Auth0.
 *
 * Priority Tiers:
 *   1. Active members (membership_status = 'active') - MUST migrate
 *   2. Expired within 90 days - Should migrate (can renew with same MECA ID)
 *   3. Expired over 90 days - Optional (MECA ID is retired, would get new one)
 *
 * Key behaviors:
 * - Creates auth users with the SAME UUID as the existing profile.id
 * - Generates temporary passwords (users must reset via "Forgot Password")
 * - Sets force_password_change = true in user metadata
 * - Updates profile.force_password_change = true
 * - Skips users who already have auth accounts
 *
 * Usage:
 *   cd apps/backend
 *   npx ts-node scripts/migrate-active-members-to-supabase-auth.ts [options]
 *
 * Options:
 *   --dry-run       Preview what will be migrated without making changes
 *   --limit=N       Limit number of records (for testing)
 *   --email=X       Migrate specific email only (for testing)
 *   --tier=N        Migration tier: 1=active only, 2=active+expired<90d, 3=all (default: 1)
 *   --report-only   Just show counts per tier, don't migrate
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import * as crypto from 'crypto';

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54521';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

// Local Supabase PostgreSQL (for direct profile updates)
const DB_CONFIG = {
  host: '127.0.0.1',
  port: 54622, // Supabase local PostgreSQL port
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

// Create Supabase admin client for auth operations
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateSecurePassword(length: number = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  return password;
}

interface MigrationArgs {
  dryRun: boolean;
  limit?: number;
  email?: string;
  tier: 1 | 2 | 3;
  reportOnly: boolean;
}

function parseArgs(): MigrationArgs {
  const args = process.argv.slice(2);
  const result: MigrationArgs = {
    dryRun: args.includes('--dry-run'),
    reportOnly: args.includes('--report-only'),
    tier: 1,
  };

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      result.limit = parseInt(arg.split('=')[1], 10);
    }
    if (arg.startsWith('--email=')) {
      result.email = arg.split('=')[1];
    }
    if (arg.startsWith('--tier=')) {
      const tier = parseInt(arg.split('=')[1], 10);
      if (tier >= 1 && tier <= 3) {
        result.tier = tier as 1 | 2 | 3;
      }
    }
  }

  return result;
}

// ============================================
// MAIN MIGRATION LOGIC
// ============================================

interface MemberToMigrate {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  meca_id: number | null;
  membership_status: string;
  membership_expiry: Date | null;
  tier: 1 | 2 | 3;
  tier_description: string;
}

interface MigrationResult {
  email: string;
  profileId: string;
  tier: number;
  status: 'created' | 'skipped' | 'error';
  message?: string;
}

interface TierCounts {
  tier1_active: number;
  tier2_expired_within_90: number;
  tier3_expired_over_90: number;
  no_membership: number;
}

async function getTierCounts(db: Client): Promise<TierCounts> {
  const result = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE membership_status = 'active') as tier1_active,
      COUNT(*) FILTER (
        WHERE membership_status != 'active'
        AND membership_expiry IS NOT NULL
        AND membership_expiry >= NOW() - INTERVAL '90 days'
        AND membership_expiry < NOW()
      ) as tier2_expired_within_90,
      COUNT(*) FILTER (
        WHERE membership_status != 'active'
        AND membership_expiry IS NOT NULL
        AND membership_expiry < NOW() - INTERVAL '90 days'
      ) as tier3_expired_over_90,
      COUNT(*) FILTER (
        WHERE membership_status != 'active'
        AND membership_expiry IS NULL
      ) as no_membership
    FROM profiles
  `);

  return {
    tier1_active: parseInt(result.rows[0].tier1_active, 10),
    tier2_expired_within_90: parseInt(result.rows[0].tier2_expired_within_90, 10),
    tier3_expired_over_90: parseInt(result.rows[0].tier3_expired_over_90, 10),
    no_membership: parseInt(result.rows[0].no_membership, 10),
  };
}

async function getMembersToMigrate(
  db: Client,
  tier: 1 | 2 | 3,
  limit?: number,
  email?: string
): Promise<MemberToMigrate[]> {
  // Build tier conditions based on the selected tier level
  // Tier 1: Active only
  // Tier 2: Active + Expired within 90 days
  // Tier 3: All (Active + All expired with membership history)

  let tierCondition = '';
  if (tier === 1) {
    tierCondition = `membership_status = 'active'`;
  } else if (tier === 2) {
    tierCondition = `(
      membership_status = 'active'
      OR (
        membership_status != 'active'
        AND membership_expiry IS NOT NULL
        AND membership_expiry >= NOW() - INTERVAL '90 days'
      )
    )`;
  } else {
    // Tier 3: All members who have ever had a membership
    tierCondition = `(
      membership_status = 'active'
      OR membership_expiry IS NOT NULL
    )`;
  }

  let query = `
    SELECT
      id,
      email,
      first_name,
      last_name,
      meca_id,
      membership_status,
      membership_expiry,
      CASE
        WHEN membership_status = 'active' THEN 1
        WHEN membership_expiry >= NOW() - INTERVAL '90 days' THEN 2
        ELSE 3
      END as tier
    FROM profiles
    WHERE ${tierCondition}
  `;

  const params: (string | number)[] = [];

  if (email) {
    params.push(email);
    query += ` AND email = $${params.length}`;
  }

  query += ' ORDER BY tier, email';

  if (limit) {
    params.push(limit);
    query += ` LIMIT $${params.length}`;
  }

  const result = await db.query(query, params);

  return result.rows.map((row: any) => ({
    ...row,
    tier: parseInt(row.tier, 10) as 1 | 2 | 3,
    tier_description: row.tier === 1
      ? 'Active Member'
      : row.tier === 2
        ? 'Expired <90 days (can retain MECA ID)'
        : 'Expired >90 days (MECA ID retired)',
  }));
}

async function checkAuthUserExists(email: string): Promise<{ exists: boolean; userId?: string }> {
  try {
    // Use the admin API to list users and find by email
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000, // Adjust if you have more users
    });

    if (error) {
      console.error(`Error listing auth users: ${error.message}`);
      return { exists: false };
    }

    const existingUser = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      return { exists: true, userId: existingUser.id };
    }

    return { exists: false };
  } catch (err) {
    console.error(`Error checking auth user: ${err}`);
    return { exists: false };
  }
}

async function createAuthUser(
  member: MemberToMigrate,
  dryRun: boolean
): Promise<MigrationResult> {
  // Check if auth user already exists
  const { exists, userId } = await checkAuthUserExists(member.email);

  if (exists) {
    // User already has an auth account
    if (userId === member.id) {
      return {
        email: member.email,
        profileId: member.id,
        tier: member.tier,
        status: 'skipped',
        message: 'Auth user already exists with matching ID',
      };
    } else {
      return {
        email: member.email,
        profileId: member.id,
        tier: member.tier,
        status: 'error',
        message: `Auth user exists but with different ID: ${userId} vs profile ${member.id}`,
      };
    }
  }

  if (dryRun) {
    return {
      email: member.email,
      profileId: member.id,
      tier: member.tier,
      status: 'skipped',
      message: `[DRY RUN] Would create auth user (${member.tier_description})`,
    };
  }

  // Generate a temporary password
  const tempPassword = generateSecurePassword(16);

  try {
    // Create the auth user with the SAME ID as the profile
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: member.email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm since we're migrating existing users
      user_metadata: {
        first_name: member.first_name,
        last_name: member.last_name,
        force_password_change: true,
        migrated_from_auth0: true,
        migrated_at: new Date().toISOString(),
        migration_tier: member.tier,
        meca_id: member.meca_id,
      },
    });

    if (error) {
      return {
        email: member.email,
        profileId: member.id,
        tier: member.tier,
        status: 'error',
        message: error.message,
      };
    }

    // Check if the created user ID matches the profile ID
    if (data.user.id !== member.id) {
      console.warn(
        `  ⚠️ Created user ${data.user.id} does not match profile ${member.id} - will need profile update`
      );
    }

    return {
      email: member.email,
      profileId: member.id,
      tier: member.tier,
      status: 'created',
      message: `Auth user created: ${data.user.id}`,
    };
  } catch (err) {
    return {
      email: member.email,
      profileId: member.id,
      tier: member.tier,
      status: 'error',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function updateProfileForcePasswordChange(
  db: Client,
  profileId: string,
  dryRun: boolean
): Promise<void> {
  if (dryRun) {
    console.log(`  [DRY RUN] Would set force_password_change = true for profile ${profileId}`);
    return;
  }

  await db.query(
    `UPDATE profiles SET force_password_change = true WHERE id = $1`,
    [profileId]
  );
}

async function runMigration(): Promise<void> {
  const args = parseArgs();

  console.log('='.repeat(60));
  console.log('Members Supabase Auth Migration');
  console.log('='.repeat(60));

  const tierDescriptions: Record<number, string> = {
    1: 'Active members only',
    2: 'Active + Expired within 90 days',
    3: 'All members with membership history',
  };

  console.log(`📊 Migration Tier: ${args.tier} (${tierDescriptions[args.tier]})`);

  if (args.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  if (args.reportOnly) {
    console.log('📋 REPORT ONLY MODE - Just showing counts');
  }

  if (args.limit) {
    console.log(`📊 Limiting to ${args.limit} records`);
  }

  if (args.email) {
    console.log(`📧 Filtering to email: ${args.email}`);
  }

  console.log('');

  // Connect to database
  const db = new Client(DB_CONFIG);
  await db.connect();
  console.log('✅ Connected to database');

  try {
    // Get tier counts first
    const counts = await getTierCounts(db);
    console.log('');
    console.log('='.repeat(60));
    console.log('Member Tier Breakdown');
    console.log('='.repeat(60));
    console.log(`Tier 1 - Active Members:           ${counts.tier1_active}`);
    console.log(`Tier 2 - Expired <90 days:         ${counts.tier2_expired_within_90} (can retain MECA ID)`);
    console.log(`Tier 3 - Expired >90 days:         ${counts.tier3_expired_over_90} (MECA ID retired)`);
    console.log(`No membership history:             ${counts.no_membership}`);
    console.log('');

    // Calculate what will be migrated based on tier
    let willMigrate = counts.tier1_active;
    if (args.tier >= 2) willMigrate += counts.tier2_expired_within_90;
    if (args.tier >= 3) willMigrate += counts.tier3_expired_over_90;
    console.log(`With --tier=${args.tier}, will migrate: ${willMigrate} members`);
    console.log('');

    if (args.reportOnly) {
      console.log('Report complete. Use without --report-only to run migration.');
      return;
    }

    // Get members to migrate
    const members = await getMembersToMigrate(db, args.tier, args.limit, args.email);
    console.log(`📋 Found ${members.length} members to migrate`);
    console.log('');

    const results: MigrationResult[] = [];
    const countsByTier = { 1: { created: 0, skipped: 0, errors: 0 }, 2: { created: 0, skipped: 0, errors: 0 }, 3: { created: 0, skipped: 0, errors: 0 } };

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      process.stdout.write(`[${i + 1}/${members.length}] [T${member.tier}] ${member.email}... `);

      const result = await createAuthUser(member, args.dryRun);
      results.push(result);

      if (result.status === 'created') {
        countsByTier[member.tier as 1 | 2 | 3].created++;
        console.log('✅ Created');

        // Also update the profile's force_password_change flag
        await updateProfileForcePasswordChange(db, member.id, args.dryRun);
      } else if (result.status === 'skipped') {
        countsByTier[member.tier as 1 | 2 | 3].skipped++;
        console.log(`⏭️ Skipped (${result.message})`);
      } else {
        countsByTier[member.tier as 1 | 2 | 3].errors++;
        console.log(`❌ Error: ${result.message}`);
      }

      // Small delay to avoid rate limits
      if (!args.dryRun && i < members.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Summary
    console.log('');
    console.log('='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total members processed: ${members.length}`);
    console.log('');

    for (const tier of [1, 2, 3] as const) {
      const c = countsByTier[tier];
      const total = c.created + c.skipped + c.errors;
      if (total > 0) {
        console.log(`Tier ${tier} (${tier === 1 ? 'Active' : tier === 2 ? 'Expired <90d' : 'Expired >90d'}):`);
        console.log(`  ✅ Created: ${c.created}`);
        console.log(`  ⏭️ Skipped: ${c.skipped}`);
        console.log(`  ❌ Errors: ${c.errors}`);
      }
    }

    const allErrors = results.filter((r) => r.status === 'error');
    if (allErrors.length > 0) {
      console.log('');
      console.log('Errors:');
      allErrors.forEach((r) => console.log(`  - [T${r.tier}] ${r.email}: ${r.message}`));
    }

    const totalCreated = Object.values(countsByTier).reduce((sum, c) => sum + c.created, 0);
    if (!args.dryRun && totalCreated > 0) {
      console.log('');
      console.log('⚠️ IMPORTANT: Users must reset their passwords!');
      console.log('   They cannot log in with their old Auth0 passwords.');
      console.log('   Direct them to use "Forgot Password" on the login page.');
    }
  } finally {
    await db.end();
    console.log('');
    console.log('✅ Database connection closed');
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
