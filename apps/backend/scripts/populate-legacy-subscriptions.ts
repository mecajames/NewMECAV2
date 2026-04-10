/**
 * Populate Legacy Subscription Data
 *
 * Identifies members who had recurring billing in the old WordPress PMPro system
 * and marks them with `had_legacy_subscription = true`.
 *
 * Uses two sources to identify legacy subscribers:
 *   1. Hardcoded PMPro user IDs extracted from wp_pmpro_memberships_users
 *      (billing_amount > 0 AND cycle_number > 0)
 *   2. Order metadata: members with multiple orders under the same subscription_id
 *      (confirmed recurring billing from Stripe sub_* or PayPal I-* subscriptions)
 *
 * Usage:
 *   npx tsx scripts/populate-legacy-subscriptions.ts [options]
 *
 * Options:
 *   --dry-run     Preview what will be updated without making changes
 */

import { Client } from 'pg';

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

  console.log('Populate Legacy Subscription Data');
  console.log('=====================================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('Connected to database');

    // =========================================================================
    // Source 1: Hardcoded PMPro user IDs -> V2 profile mapping via order metadata
    // =========================================================================
    console.log('\n--- Source 1: Hardcoded PMPro user IDs ---');
    console.log(`Hardcoded PMPro IDs: ${LEGACY_SUBSCRIPTION_WP_USER_IDS.size}`);

    const { rows: ordersWithPmpro } = await client.query(`
      SELECT DISTINCT ON (metadata->>'pmpro_user_id')
        member_id,
        metadata->>'pmpro_user_id' as pmpro_user_id,
        p.email,
        p.full_name
      FROM orders o
      JOIN profiles p ON p.id = o.member_id
      WHERE o.metadata->>'pmpro_user_id' IS NOT NULL
      ORDER BY metadata->>'pmpro_user_id', o.created_at DESC
    `);

    const hardcodedProfileIds = new Set<string>();
    for (const order of ordersWithPmpro) {
      const pmproUserId = parseInt(order.pmpro_user_id);
      if (!isNaN(pmproUserId) && LEGACY_SUBSCRIPTION_WP_USER_IDS.has(pmproUserId)) {
        hardcodedProfileIds.add(order.member_id);
      }
    }
    console.log(`Matched to V2 profiles: ${hardcodedProfileIds.size}`);

    // =========================================================================
    // Source 2: Members with multiple orders under the same subscription_id
    // =========================================================================
    console.log('\n--- Source 2: Multi-order subscription members ---');

    const { rows: multiOrderSubs } = await client.query(`
      SELECT member_id
      FROM orders
      WHERE metadata->>'subscription_id' IS NOT NULL
        AND metadata->>'subscription_id' != ''
      GROUP BY member_id, metadata->>'subscription_id'
      HAVING count(*) > 1
    `);

    const multiOrderProfileIds = new Set<string>(multiOrderSubs.map(r => r.member_id));
    console.log(`Members with multiple orders on same subscription: ${multiOrderProfileIds.size}`);

    // =========================================================================
    // Union of both sources
    // =========================================================================
    const allLegacyProfileIds = new Set([...hardcodedProfileIds, ...multiOrderProfileIds]);
    const inBoth = [...hardcodedProfileIds].filter(id => multiOrderProfileIds.has(id)).length;
    const hardcodedOnly = hardcodedProfileIds.size - inBoth;
    const multiOrderOnly = multiOrderProfileIds.size - inBoth;

    console.log('\n--- Combined ---');
    console.log(`In both sources: ${inBoth}`);
    console.log(`Hardcoded only: ${hardcodedOnly}`);
    console.log(`Multi-order only: ${multiOrderOnly}`);
    console.log(`Total unique members to flag: ${allLegacyProfileIds.size}`);

    // =========================================================================
    // Update memberships
    // =========================================================================
    console.log('\nUpdating memberships...');

    let updated = 0;
    let alreadyFlagged = 0;
    let notFound = 0;

    for (const profileId of allLegacyProfileIds) {
      const { rows: memberships } = await client.query(`
        SELECT id, had_legacy_subscription
        FROM memberships
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `, [profileId]);

      if (memberships.length === 0) {
        notFound++;
        continue;
      }

      if (memberships[0].had_legacy_subscription) {
        alreadyFlagged++;
        continue;
      }

      if (dryRun) {
        // Look up name/email for logging
        const { rows: profiles } = await client.query(
          'SELECT email, full_name FROM profiles WHERE id = $1', [profileId]
        );
        const name = profiles[0]?.full_name || 'Unknown';
        const email = profiles[0]?.email || 'Unknown';
        console.log(`  [DRY RUN] Would flag: ${name} (${email})`);
        updated++;
      } else {
        await client.query(`
          UPDATE memberships
          SET had_legacy_subscription = true, updated_at = NOW()
          WHERE id = $1
        `, [memberships[0].id]);
        updated++;
      }
    }

    console.log('\n=====================================');
    console.log('Summary:');
    console.log(`  Total legacy members identified: ${allLegacyProfileIds.size}`);
    console.log(`  Memberships updated: ${updated}`);
    console.log(`  Already flagged: ${alreadyFlagged}`);
    console.log(`  No membership found: ${notFound}`);

    if (dryRun) {
      console.log('\nThis was a dry run. No changes were made.');
      console.log('Run without --dry-run to apply changes.');
    } else {
      console.log('\nLegacy subscription data populated successfully!');
    }

  } catch (error: any) {
    console.error('\nError:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

main().catch(console.error);
