/**
 * Purge and Migrate Auth Users Script
 *
 * 1. Deletes ALL existing Supabase Auth users (except preserved ones)
 * 2. Creates fresh auth accounts for eligible members:
 *    - Active members (membership_status = 'active')
 *    - Members expired within the last 90 days (can still retain MECA ID)
 *
 * Members expired MORE than 90 days ago are NOT included (their MECA ID is retired).
 *
 * Usage:
 *   cd apps/backend
 *   npx ts-node scripts/purge-and-migrate-auth.ts [options]
 *
 * Options:
 *   --dry-run              Preview without making changes
 *   --skip-purge           Skip the purge step (only create new users)
 *   --preserve=email       Preserve specific email(s) from deletion (comma-separated)
 *
 * Example:
 *   npx ts-node scripts/purge-and-migrate-auth.ts --preserve=mmakhool6@gmail.com
 */

import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import * as crypto from 'crypto';

// ============================================
// CONFIGURATION
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54521';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 54622,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================
// HELPERS
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

function parseArgs(): { dryRun: boolean; skipPurge: boolean; preserveEmails: string[] } {
  const args = process.argv.slice(2);
  const preserveEmails: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('--preserve=')) {
      preserveEmails.push(...arg.split('=')[1].split(',').map(e => e.trim().toLowerCase()));
    }
  }

  return {
    dryRun: args.includes('--dry-run'),
    skipPurge: args.includes('--skip-purge'),
    preserveEmails,
  };
}

// ============================================
// PURGE ALL AUTH USERS
// ============================================

async function purgeAllAuthUsers(dryRun: boolean, preserveEmails: string[]): Promise<{ deleted: number; preserved: number }> {
  console.log('🗑️  Fetching all auth users to purge...');
  if (preserveEmails.length > 0) {
    console.log(`   Preserving: ${preserveEmails.join(', ')}`);
  }

  let totalDeleted = 0;
  let totalPreserved = 0;
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error(`Error listing users: ${error.message}`);
      break;
    }

    if (!data.users || data.users.length === 0) {
      break;
    }

    console.log(`   Processing page ${page} (${data.users.length} users)...`);

    for (const user of data.users) {
      const userEmail = user.email?.toLowerCase() || '';

      // Skip preserved emails
      if (preserveEmails.includes(userEmail)) {
        console.log(`   🛡️ Preserving: ${user.email}`);
        totalPreserved++;
        continue;
      }

      if (dryRun) {
        // Don't log every single one in dry run, just count
        totalDeleted++;
      } else {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`   ❌ Failed to delete ${user.email}: ${deleteError.message}`);
        } else {
          totalDeleted++;
        }
      }
    }

    // If we got fewer than perPage, we're done
    if (data.users.length < perPage) {
      break;
    }

    page++;

    // Small delay to avoid rate limits
    if (!dryRun) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { deleted: totalDeleted, preserved: totalPreserved };
}

// ============================================
// CREATE AUTH FOR ACTIVE MEMBERS
// ============================================

interface EligibleMember {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  meca_id: number | null;
  membership_status: string;
  membership_expiry: Date | null;
  category: 'active' | 'expired_under_90_days';
}

async function getEligibleMembers(db: Client): Promise<EligibleMember[]> {
  // Get active members + members who expired less than 90 days ago
  // Members expired MORE than 90 days ago have their MECA ID retired - not included
  //
  // NOTE: profiles.membership_expiry is often NULL, so we JOIN with the memberships table
  // to get the actual end_date from the most recent membership for each user.
  const result = await db.query(`
    WITH latest_membership AS (
      SELECT DISTINCT ON (user_id)
        user_id,
        end_date,
        meca_id as membership_meca_id
      FROM memberships
      WHERE payment_status = 'paid'
      ORDER BY user_id, end_date DESC NULLS LAST
    )
    SELECT
      p.id,
      p.email,
      p.first_name,
      p.last_name,
      COALESCE(lm.membership_meca_id, p.meca_id) as meca_id,
      p.membership_status,
      COALESCE(lm.end_date, p.membership_expiry) as membership_expiry,
      CASE
        WHEN p.membership_status = 'active' THEN 'active'
        WHEN lm.end_date >= NOW() - INTERVAL '90 days' AND lm.end_date < NOW() THEN 'expired_under_90_days'
        ELSE 'expired_over_90_days'
      END as category
    FROM profiles p
    LEFT JOIN latest_membership lm ON p.id = lm.user_id
    WHERE
      p.membership_status = 'active'
      OR (
        p.membership_status != 'active'
        AND lm.end_date IS NOT NULL
        AND lm.end_date >= NOW() - INTERVAL '90 days'
        AND lm.end_date < NOW()
      )
    ORDER BY
      CASE WHEN p.membership_status = 'active' THEN 0 ELSE 1 END,
      p.email
  `);
  return result.rows;
}

async function createAuthUsers(
  members: EligibleMember[],
  dryRun: boolean,
  preserveEmails: string[]
): Promise<{ created: number; skipped: number; errors: number }> {
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < members.length; i++) {
    const member = members[i];
    process.stdout.write(`[${i + 1}/${members.length}] ${member.email}... `);

    // Skip preserved emails (they already exist)
    if (preserveEmails.includes(member.email.toLowerCase())) {
      console.log('⏭️ Skipped (preserved)');
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log('[DRY RUN] Would create');
      created++;
      continue;
    }

    const tempPassword = generateSecurePassword(16);

    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: member.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          first_name: member.first_name,
          last_name: member.last_name,
          force_password_change: true,
          migrated_from_auth0: true,
          migrated_at: new Date().toISOString(),
          meca_id: member.meca_id,
        },
      });

      if (error) {
        // Check if user already exists
        if (error.message.includes('already been registered')) {
          console.log('⏭️ Already exists');
          skipped++;
        } else {
          console.log(`❌ ${error.message}`);
          errors++;
        }
      } else {
        // Check ID mismatch
        if (data.user.id !== member.id) {
          console.log(`⚠️ Created (ID mismatch: auth=${data.user.id} vs profile=${member.id})`);
        } else {
          console.log('✅ Created');
        }
        created++;
      }
    } catch (err) {
      console.log(`❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
      errors++;
    }

    // Small delay
    if (!dryRun && i < members.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  return { created, skipped, errors };
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('='.repeat(60));
  console.log('Purge and Migrate Auth Users');
  console.log('='.repeat(60));

  if (args.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }

  console.log('');

  // Connect to database
  const db = new Client(DB_CONFIG);
  await db.connect();
  console.log('✅ Connected to database');

  try {
    // Step 1: Purge existing auth users
    if (!args.skipPurge) {
      console.log('');
      console.log('='.repeat(60));
      console.log('Step 1: Purge All Existing Auth Users');
      console.log('='.repeat(60));

      const { deleted, preserved } = await purgeAllAuthUsers(args.dryRun, args.preserveEmails);
      console.log(`${args.dryRun ? '[DRY RUN] Would purge' : 'Purged'}: ${deleted} auth users`);
      if (preserved > 0) {
        console.log(`🛡️ Preserved: ${preserved} auth users`);
      }
    } else {
      console.log('');
      console.log('⏭️ Skipping purge step (--skip-purge)');
    }

    // Step 2: Get eligible members (active + expired < 90 days)
    console.log('');
    console.log('='.repeat(60));
    console.log('Step 2: Create Auth for Eligible Members');
    console.log('='.repeat(60));

    const eligibleMembers = await getEligibleMembers(db);
    const activeCount = eligibleMembers.filter(m => m.category === 'active').length;
    const expiredCount = eligibleMembers.filter(m => m.category === 'expired_under_90_days').length;
    console.log(`Found ${eligibleMembers.length} eligible members:`);
    console.log(`  - Active: ${activeCount}`);
    console.log(`  - Expired < 90 days: ${expiredCount}`);
    console.log('');

    // Step 3: Create auth users
    const { created, skipped, errors } = await createAuthUsers(eligibleMembers, args.dryRun, args.preserveEmails);

    // Summary
    console.log('');
    console.log('='.repeat(60));
    console.log('Summary');
    console.log('='.repeat(60));
    console.log(`Eligible members: ${eligibleMembers.length}`);
    console.log(`✅ Created: ${created}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors}`);

    if (!args.dryRun && created > 0) {
      console.log('');
      console.log('⚠️ IMPORTANT: All users must reset their passwords!');
      console.log('   Direct them to use "Forgot Password" on the login page.');
    }

  } finally {
    await db.end();
    console.log('');
    console.log('✅ Database connection closed');
  }
}

main()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed:', err);
    process.exit(1);
  });
