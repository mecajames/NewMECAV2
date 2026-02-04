/**
 * Populate Legacy Subscription Data
 *
 * This script identifies members who had recurring billing enabled in the old
 * WordPress PMPro system and marks them with `had_legacy_subscription = true`.
 *
 * These members will see "Legacy" in the Auto-Renew column and will need to
 * re-setup their subscription once Stripe Subscriptions are implemented.
 *
 * Usage:
 *   npx tsx scripts/populate-legacy-subscriptions.ts [options]
 *
 * Options:
 *   --dry-run     Preview what will be updated without making changes
 *   --pmpro-file  Path to extracted PMPro memberships data (optional)
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Database configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '54322'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

// PMPro WordPress User IDs that had recurring billing (billing_amount > 0 AND cycle_number > 0)
// This list was extracted from wp_pmpro_memberships_users table
const LEGACY_SUBSCRIPTION_WP_USER_IDS = new Set([
  // From the analysis: 318 users had recurring billing, 115 were active
  // Active users with auto-renewal from PMPro analysis:
  34501, 34661, 34725, 34765, 34902, 34919, 34964, 35078, 35100, 35107,
  35108, 35120, 35254, 34568, 34488, 254, 35347, 35361, 233, 34701,
  35385, 35386, 35396, 34708, 35000, 35442, 35448, 35451, 35453, 35454,
  35465, 35482, 35492, 35496, 35497, 35023, 35150, 35223, 35547, 35548,
  35163, 35587, 35183, 35623, 35650, 35421, 7, 34635, 35400, 34951,
  34486, 35679, 35474, 35705, 34463, 192, 35725, 35727, 260, 35184,
  35517, 35541, 35804, 35805, 35286, 35813, 34483, 35817, 35820, 35620,
  35086, 35829, 35350, 35833, 35417, 35843, 35846, 35604, 35722, 35858,
  35069, 35504, 34485, 35342, 35480, 35883, 35525, 35010, 35899, 35902,
  35909, 35915, 35916, 35920, 35922, 35923, 35927, 35639, 35195, 35782,
  35828, 34880, 35942, 35793, 247, 35348, 35020, 35298, 35977, 35980,
  35958, 35984, 35992, 35997,
  // Additional users from cancelled/changed/expired statuses that had recurring:
  34444, 34460, 34504, 34505, 34506,
]);

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔄 Populate Legacy Subscription Data');
  console.log('=====================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Legacy user IDs to match: ${LEGACY_SUBSCRIPTION_WP_USER_IDS.size}`);
  console.log('');

  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Step 1: Find orders with PMPro metadata and extract user mappings
    console.log('\n📋 Finding orders with PMPro user IDs...');

    const { rows: ordersWithPmpro } = await client.query(`
      SELECT
        o.id,
        o.member_id,
        o.metadata->>'pmpro_user_id' as pmpro_user_id,
        o.metadata->>'subscription_id' as subscription_id,
        p.email,
        p.full_name
      FROM orders o
      JOIN profiles p ON p.id = o.member_id
      WHERE o.metadata->>'pmpro_user_id' IS NOT NULL
      ORDER BY o.created_at DESC
    `);

    console.log(`   Found ${ordersWithPmpro.length} orders with PMPro user IDs`);

    // Step 2: Build a map of profile IDs to their PMPro user IDs
    const profileToPmpro = new Map<string, number>();
    const pmproToProfile = new Map<number, { profileId: string; email: string; name: string }>();

    for (const order of ordersWithPmpro) {
      const pmproUserId = parseInt(order.pmpro_user_id);
      if (!isNaN(pmproUserId) && order.member_id) {
        profileToPmpro.set(order.member_id, pmproUserId);
        pmproToProfile.set(pmproUserId, {
          profileId: order.member_id,
          email: order.email,
          name: order.full_name,
        });
      }
    }

    console.log(`   Mapped ${profileToPmpro.size} unique profiles to PMPro user IDs`);

    // Step 3: Find which profiles had legacy subscriptions
    const profilesWithLegacySub: Array<{ profileId: string; email: string; name: string; pmproId: number }> = [];

    for (const [pmproId, profile] of pmproToProfile.entries()) {
      if (LEGACY_SUBSCRIPTION_WP_USER_IDS.has(pmproId)) {
        profilesWithLegacySub.push({
          ...profile,
          pmproId,
        });
      }
    }

    console.log(`\n📊 Found ${profilesWithLegacySub.length} profiles that had legacy subscriptions`);

    if (profilesWithLegacySub.length === 0) {
      console.log('\n⚠️  No matching profiles found. This could mean:');
      console.log('   - The PMPro orders migration was not run');
      console.log('   - The order metadata does not contain pmpro_user_id');
      console.log('   - The PMPro user IDs don\'t match any current orders');
      return;
    }

    // Step 4: Update memberships for these profiles
    console.log('\n🔄 Updating memberships...');

    let updated = 0;
    let notFound = 0;

    for (const profile of profilesWithLegacySub) {
      // Find active membership for this profile
      const { rows: memberships } = await client.query(`
        SELECT id, user_id, payment_status, had_legacy_subscription
        FROM memberships
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [profile.profileId]);

      if (memberships.length === 0) {
        notFound++;
        continue;
      }

      const membership = memberships[0];

      if (membership.had_legacy_subscription) {
        // Already marked
        continue;
      }

      if (dryRun) {
        console.log(`   [DRY RUN] Would update membership for ${profile.name} (${profile.email}) - PMPro ID: ${profile.pmproId}`);
        updated++;
      } else {
        await client.query(`
          UPDATE memberships
          SET had_legacy_subscription = true, updated_at = NOW()
          WHERE id = $1
        `, [membership.id]);

        console.log(`   ✅ Updated: ${profile.name} (${profile.email})`);
        updated++;
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Profiles with legacy subscriptions: ${profilesWithLegacySub.length}`);
    console.log(`   Memberships updated: ${updated}`);
    console.log(`   Memberships not found: ${notFound}`);

    if (dryRun) {
      console.log('\n⚠️  This was a dry run. No changes were made.');
      console.log('   Run without --dry-run to apply changes.');
    } else {
      console.log('\n✅ Legacy subscription data populated successfully!');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
