/**
 * Full Production to Local Database Sync Script
 *
 * This script ensures LOCAL database matches PRODUCTION exactly:
 * 1. Syncs missing events
 * 2. Syncs missing teams
 * 3. Resets and re-syncs all competition_results with CORRECT formats
 * 4. Syncs other missing entities
 *
 * Usage:
 *   npx ts-node scripts/full-sync-from-production.ts [options]
 *
 * Options:
 *   --dry-run           Preview changes without applying
 *   --results-only      Only sync competition_results
 *   --skip-results      Skip competition_results sync
 */

import { Client } from 'pg';

// ============================================
// CONFIGURATION
// ============================================

const V1_CONFIG = {
  host: 'ls-f9bb3cf7787cc3dce3cf1deef31e08dfa0f34c31.cexp2mtr0fvk.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'dbmecaevents',
  user: 'dbmasteruser',
  password: process.env.V1_DB_PASSWORD || 'gQNyCDu4Wz9L94Nn4gKaBnjH',
  ssl: { rejectUnauthorized: false },
};

const V2_CONFIG = {
  host: '127.0.0.1',
  port: 54622,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

const MIGRATION_USER_ID = '3ae12d0d-e446-470b-9683-0546a85bed93';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// SYNC FUNCTIONS
// ============================================

async function loadMappings(v2: Client): Promise<{
  seasonMappings: Map<number, string>;
  eventMappings: Map<number, string>;
  classMappings: Map<number, string>;
  teamMappings: Map<number, string>;
}> {
  console.log('📋 Loading existing mappings...');

  const seasonMappings = new Map<number, string>();
  const eventMappings = new Map<number, string>();
  const classMappings = new Map<number, string>();
  const teamMappings = new Map<number, string>();

  const { rows: mappings } = await v2.query(`
    SELECT entity_type, v1_id, v2_id FROM v1_migration_mappings
  `).catch(() => ({ rows: [] }));

  for (const m of mappings) {
    const v1Id = Number(m.v1_id);
    if (m.entity_type === 'season') seasonMappings.set(v1Id, m.v2_id);
    if (m.entity_type === 'class') classMappings.set(v1Id, m.v2_id);
    if (m.entity_type === 'event') eventMappings.set(v1Id, m.v2_id);
    if (m.entity_type === 'team') teamMappings.set(v1Id, m.v2_id);
  }

  // Also load seasons by year
  const { rows: seasons } = await v2.query(`SELECT id, year FROM seasons`);
  for (const s of seasons) {
    if (!seasonMappings.has(s.year)) {
      seasonMappings.set(s.year, s.id);
    }
  }

  console.log(`   Seasons: ${seasonMappings.size}, Events: ${eventMappings.size}, Classes: ${classMappings.size}, Teams: ${teamMappings.size}`);
  return { seasonMappings, eventMappings, classMappings, teamMappings };
}

async function syncMissingEvents(
  v1: Client,
  v2: Client,
  mappings: { seasonMappings: Map<number, string>; eventMappings: Map<number, string> },
  dryRun: boolean
): Promise<void> {
  console.log('\n📅 Syncing missing events...');

  const { rows: v1Events } = await v1.query(`
    SELECT eventid, eventname, season, startdate, enddate, city, state,
           zipcode, eventhost, eventdirector, multiplier, spl, sql as is_sql, flyerlink
    FROM events
    WHERE season IS NOT NULL
    ORDER BY eventid
  `);

  let added = 0;
  for (const e of v1Events) {
    if (mappings.eventMappings.has(e.eventid)) continue;

    const seasonId = mappings.seasonMappings.get(e.season);
    if (!seasonId) continue;

    if (dryRun) {
      console.log(`   [DRY RUN] Would add event: ${e.eventname} (${e.season})`);
      added++;
      continue;
    }

    const newId = generateUUID();
    const formats: string[] = [];
    if (e.spl) formats.push('SPL');
    if (e.is_sql) formats.push('SQL');

    await v2.query(`
      INSERT INTO events (
        id, title, event_date, venue_name, venue_address, venue_city, venue_state,
        venue_postal_code, venue_country, season_id, status, points_multiplier,
        event_type, formats, flyer_url, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'US', $9, 'completed', $10, 'standard', $11, $12, NOW(), NOW())
    `, [
      newId, e.eventname, e.startdate || new Date(`${e.season}-06-01`),
      e.eventhost || 'Unknown Venue', '', // venue_address (empty string)
      e.city, e.state, e.zipcode,
      seasonId, e.multiplier || 2, JSON.stringify(formats), e.flyerlink
    ]);

    await v2.query(`
      INSERT INTO v1_migration_mappings (entity_type, v1_id, v2_id)
      VALUES ('event', $1, $2) ON CONFLICT (entity_type, v1_id) DO NOTHING
    `, [e.eventid, newId]);

    mappings.eventMappings.set(e.eventid, newId);
    added++;
  }

  console.log(`   ✅ Added ${added} missing events`);
}

async function syncMissingTeams(
  v1: Client,
  v2: Client,
  mappings: { teamMappings: Map<number, string> },
  dryRun: boolean
): Promise<void> {
  console.log('\n🏁 Syncing missing teams...');

  const { rows: v1Teams } = await v1.query(`
    SELECT id, team_name, logo_url, city, state_code, team_bio, team_link, open_membership, created_at
    FROM teams ORDER BY id
  `);

  // Get existing team names in V2
  const { rows: v2Teams } = await v2.query(`SELECT name FROM teams`);
  const existingNames = new Set(v2Teams.map(t => t.name));

  let added = 0;
  for (const t of v1Teams) {
    if (existingNames.has(t.team_name)) continue;

    if (dryRun) {
      console.log(`   [DRY RUN] Would add team: ${t.team_name}`);
      added++;
      continue;
    }

    const newId = generateUUID();
    const location = [t.city, t.state_code].filter(Boolean).join(', ') || null;

    try {
      await v2.query(`
        INSERT INTO teams (
          id, name, description, logo_url, captain_id, is_active, is_public,
          requires_approval, bio, website, location, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, true, true, false, $6, $7, $8, $9, NOW())
      `, [
        newId, t.team_name, t.team_bio, t.logo_url, MIGRATION_USER_ID,
        t.team_bio, t.team_link, location, t.created_at || new Date()
      ]);

      await v2.query(`
        INSERT INTO v1_migration_mappings (entity_type, v1_id, v2_id)
        VALUES ('team', $1, $2) ON CONFLICT (entity_type, v1_id) DO NOTHING
      `, [t.id, newId]);

      mappings.teamMappings.set(t.id, newId);
      existingNames.add(t.team_name);
      added++;
    } catch (err: any) {
      console.log(`   ⚠️  Error adding team ${t.team_name}: ${err.message}`);
    }
  }

  console.log(`   ✅ Added ${added} missing teams`);
}

async function syncMissingRetailers(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🏪 Syncing missing retailers...');

  const { rows: v1Retailers } = await v1.query(`
    SELECT DISTINCT ON (COALESCE(display_name, name))
      id, name, display_name, address, city, state_code, zip,
      contact_phone, website, contact_email, intro_text, offer_text,
      in_directory, logo_url, expires_at, created_at
    FROM retailers ORDER BY COALESCE(display_name, name), id
  `);

  const { rows: v2Retailers } = await v2.query(`SELECT business_name FROM retailer_listings`);
  const existingNames = new Set(v2Retailers.map(r => r.business_name));

  let added = 0;
  for (const r of v1Retailers) {
    const businessName = r.display_name || r.name;
    if (existingNames.has(businessName)) continue;

    if (dryRun) {
      console.log(`   [DRY RUN] Would add retailer: ${businessName}`);
      added++;
      continue;
    }

    const newId = generateUUID();
    try {
      await v2.query(`
        INSERT INTO retailer_listings (
          id, business_name, description, website, business_phone, business_email,
          street_address, city, state, postal_code, country, is_active, is_approved,
          profile_image_url, offer_text, end_date, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'US', $11, true, $12, $13, $14, $15, NOW())
      `, [
        newId, businessName, r.intro_text, r.website, r.contact_phone, r.contact_email,
        r.address, r.city, r.state_code, r.zip, r.in_directory ?? true,
        r.logo_url, r.offer_text, r.expires_at, r.created_at || new Date()
      ]);
      existingNames.add(businessName);
      added++;
    } catch (err: any) {
      // Likely duplicate - ignore
    }
  }

  console.log(`   ✅ Added ${added} missing retailers`);
}

async function syncMissingManufacturers(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🏭 Syncing missing manufacturers...');

  const { rows: v1Manufacturers } = await v1.query(`
    SELECT DISTINCT ON (COALESCE(display_name, name))
      id, name, display_name, logo_url, website, description, address, city, zip,
      state_code, contact_phone, contact_email, in_directory, expires_at, created_at
    FROM manufacturers ORDER BY COALESCE(display_name, name), id
  `);

  const { rows: v2Manufacturers } = await v2.query(`SELECT business_name FROM manufacturer_listings`);
  const existingNames = new Set(v2Manufacturers.map(m => m.business_name));

  let added = 0;
  for (const m of v1Manufacturers) {
    const businessName = m.display_name || m.name;
    if (existingNames.has(businessName)) continue;

    if (dryRun) {
      console.log(`   [DRY RUN] Would add manufacturer: ${businessName}`);
      added++;
      continue;
    }

    const newId = generateUUID();
    try {
      await v2.query(`
        INSERT INTO manufacturer_listings (
          id, business_name, description, website, business_phone, business_email,
          street_address, city, state, postal_code, country, is_active, is_approved,
          profile_image_url, end_date, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'US', $11, true, $12, $13, $14, NOW())
      `, [
        newId, businessName, m.description, m.website, m.contact_phone, m.contact_email,
        m.address, m.city, m.state_code, m.zip, m.in_directory ?? true,
        m.logo_url, m.expires_at, m.created_at || new Date()
      ]);
      existingNames.add(businessName);
      added++;
    } catch (err: any) {
      // Likely duplicate - ignore
    }
  }

  console.log(`   ✅ Added ${added} missing manufacturers`);
}

async function resetAndSyncResults(
  v1: Client,
  v2: Client,
  mappings: { seasonMappings: Map<number, string>; eventMappings: Map<number, string>; classMappings: Map<number, string> },
  dryRun: boolean
): Promise<void> {
  console.log('\n🏆 Resetting and syncing competition results...');

  // Get current count
  const { rows: [{ count: currentCount }] } = await v2.query(`SELECT COUNT(*) as count FROM competition_results`);
  console.log(`   Current local results: ${currentCount}`);

  // Get production count
  const { rows: [{ count: prodCount }] } = await v1.query(`SELECT COUNT(*) as count FROM results WHERE season IS NOT NULL`);
  console.log(`   Production results: ${prodCount}`);

  if (dryRun) {
    console.log(`   [DRY RUN] Would delete all ${currentCount} local results and re-import ${prodCount} from production`);
    return;
  }

  // Delete all existing results
  console.log('   Deleting existing results...');
  await v2.query(`DELETE FROM competition_results`);
  console.log('   ✅ Deleted existing results');

  // Get all production results with correct format from classes
  console.log('   Fetching production results...');
  const { rows: v1Results } = await v1.query(`
    SELECT r.rowid, r.eventid, r.memberno, r.name, r.class, r.classid, r.season,
           r.score, r.measured_wattage, r.peak_frequency,
           r.points, r.team, r.vehicle, r.manufacturer, r.state, r.state_code,
           r.created_at, c.division as format
    FROM results r
    JOIN classes c ON r.classid = c.classid
    WHERE r.season IS NOT NULL
    ORDER BY r.season, r.eventid, r.rowid
  `);

  console.log(`   Importing ${v1Results.length} results...`);

  let imported = 0;
  let skipped = 0;
  const batchSize = 1000;

  for (let i = 0; i < v1Results.length; i += batchSize) {
    const batch = v1Results.slice(i, i + batchSize);

    for (const r of batch) {
      const seasonId = mappings.seasonMappings.get(r.season);
      const eventId = mappings.eventMappings.get(r.eventid);
      const classId = r.classid ? mappings.classMappings.get(r.classid) : null;

      if (!seasonId || !eventId) {
        skipped++;
        continue;
      }

      const newId = generateUUID();
      const vehicleInfo = [r.vehicle, r.manufacturer, r.team].filter(Boolean).join(' - ') || null;

      try {
        await v2.query(`
          INSERT INTO competition_results (
            id, event_id, competitor_id, competitor_name, competition_class, score,
            placement, points_earned, vehicle_info, notes, created_by, created_at,
            meca_id, season_id, class_id, format, state_code, updated_at,
            revision_count, modification_reason, wattage, frequency
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), $18, $19, $20, $21)
        `, [
          newId, eventId, null, r.name || 'Unknown', r.class || 'Unknown',
          r.score ?? 0, 0, r.points || 0, vehicleInfo,
          `Synced from production (rowid: ${r.rowid})`, MIGRATION_USER_ID,
          r.created_at || new Date(), r.memberno?.toString() || null,
          seasonId, classId, r.format, // CORRECT FORMAT FROM CLASSES TABLE
          r.state_code || r.state || null, 0, 'production_sync',
          r.measured_wattage ? Math.round(r.measured_wattage) : null,
          r.peak_frequency ? Math.round(r.peak_frequency) : null
        ]);
        imported++;
      } catch (err: any) {
        console.log(`   ⚠️  Error importing result ${r.rowid}: ${err.message}`);
        skipped++;
      }
    }

    if ((i + batchSize) % 10000 === 0 || i + batchSize >= v1Results.length) {
      console.log(`   ... imported ${Math.min(i + batchSize, v1Results.length)} / ${v1Results.length}`);
    }
  }

  console.log(`   ✅ Imported ${imported} results (${skipped} skipped)`);
}

async function removeExtraLocalData(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🧹 Checking for extra local data to remove...');

  // Check for events that don't exist in production
  const { rows: extraEvents } = await v2.query(`
    SELECT e.id, e.title, s.year
    FROM events e
    JOIN seasons s ON e.season_id = s.id
    WHERE NOT EXISTS (
      SELECT 1 FROM v1_migration_mappings m WHERE m.v2_id = e.id AND m.entity_type = 'event'
    )
    AND s.year <= 2026
  `);

  if (extraEvents.length > 0) {
    console.log(`   Found ${extraEvents.length} extra events in local`);
    if (dryRun) {
      extraEvents.slice(0, 5).forEach(e => console.log(`   [DRY RUN] Would remove: ${e.title} (${e.year})`));
    } else {
      for (const e of extraEvents) {
        await v2.query(`DELETE FROM events WHERE id = $1`, [e.id]);
      }
      console.log(`   ✅ Removed ${extraEvents.length} extra events`);
    }
  } else {
    console.log('   ✅ No extra events found');
  }

  // Check for teams that don't exist in production
  const { rows: v1Teams } = await v1.query(`SELECT team_name FROM teams`);
  const prodTeamNames = new Set(v1Teams.map(t => t.team_name));

  const { rows: localTeams } = await v2.query(`SELECT id, name FROM teams`);
  const extraTeams = localTeams.filter(t => !prodTeamNames.has(t.name));

  if (extraTeams.length > 0) {
    console.log(`   Found ${extraTeams.length} extra teams in local`);
    if (dryRun) {
      extraTeams.slice(0, 5).forEach(t => console.log(`   [DRY RUN] Would remove team: ${t.name}`));
    } else {
      for (const t of extraTeams) {
        try {
          await v2.query(`DELETE FROM team_members WHERE team_id = $1`, [t.id]);
          await v2.query(`DELETE FROM teams WHERE id = $1`, [t.id]);
        } catch (err: any) {
          console.log(`   ⚠️  Error removing team ${t.name}: ${err.message}`);
        }
      }
      console.log(`   ✅ Removed ${extraTeams.length} extra teams`);
    }
  } else {
    console.log('   ✅ No extra teams found');
  }
}

async function showFinalComparison(v1: Client, v2: Client): Promise<void> {
  console.log('\n📊 Final Comparison:');

  const { rows: prodCounts } = await v1.query(`
    SELECT 'results' as entity, COUNT(*) as count FROM results WHERE season IS NOT NULL
    UNION ALL SELECT 'events', COUNT(*) FROM events WHERE season IS NOT NULL
    UNION ALL SELECT 'teams', COUNT(*) FROM teams
    UNION ALL SELECT 'retailers', COUNT(DISTINCT COALESCE(display_name, name)) FROM retailers
    UNION ALL SELECT 'manufacturers', COUNT(DISTINCT COALESCE(display_name, name)) FROM manufacturers
  `);

  const { rows: localCounts } = await v2.query(`
    SELECT 'competition_results' as entity, COUNT(*) as count FROM competition_results
    UNION ALL SELECT 'events', COUNT(*) FROM events
    UNION ALL SELECT 'teams', COUNT(*) FROM teams
    UNION ALL SELECT 'retailer_listings', COUNT(*) FROM retailer_listings
    UNION ALL SELECT 'manufacturer_listings', COUNT(*) FROM manufacturer_listings
  `);

  console.log('\n   | Entity       | Production | Local    | Match |');
  console.log('   |--------------|------------|----------|-------|');

  const prodMap = new Map(prodCounts.map(r => [r.entity, parseInt(r.count)]));
  const localMap = new Map(localCounts.map(r => [r.entity, parseInt(r.count)]));

  const comparisons = [
    ['results', 'competition_results'],
    ['events', 'events'],
    ['teams', 'teams'],
    ['retailers', 'retailer_listings'],
    ['manufacturers', 'manufacturer_listings'],
  ];

  for (const [prodKey, localKey] of comparisons) {
    const prodVal = prodMap.get(prodKey) || 0;
    const localVal = localMap.get(localKey) || 0;
    const match = prodVal === localVal ? '✅' : (Math.abs(prodVal - localVal) <= 5 ? '≈' : '❌');
    console.log(`   | ${prodKey.padEnd(12)} | ${String(prodVal).padEnd(10)} | ${String(localVal).padEnd(8)} | ${match}     |`);
  }

  // Format distribution
  console.log('\n   Format Distribution:');
  const { rows: prodFormats } = await v1.query(`
    SELECT c.division as format, COUNT(*) as count
    FROM results r JOIN classes c ON r.classid = c.classid
    WHERE r.season IS NOT NULL
    GROUP BY c.division ORDER BY count DESC
  `);
  const { rows: localFormats } = await v2.query(`
    SELECT format, COUNT(*) as count FROM competition_results GROUP BY format ORDER BY count DESC
  `);

  console.log('   Production:', prodFormats.map(f => `${f.format}:${f.count}`).join(', '));
  console.log('   Local:     ', localFormats.map(f => `${f.format}:${f.count}`).join(', '));
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const resultsOnly = args.includes('--results-only');
  const skipResults = args.includes('--skip-results');
  const removeExtra = args.includes('--remove-extra');

  console.log('🚀 Full Production → Local Database Sync');
  console.log('=========================================');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN' : '⚡ LIVE'}`);
  if (resultsOnly) console.log('Results only mode');
  if (skipResults) console.log('Skipping results sync');
  if (removeExtra) console.log('⚠️  Will remove extra local events/teams');
  console.log('');

  const v1 = new Client(V1_CONFIG);
  const v2 = new Client(V2_CONFIG);

  try {
    await v1.connect();
    console.log('✅ Connected to Production (V1)');

    await v2.connect();
    console.log('✅ Connected to Local (V2)');

    const mappings = await loadMappings(v2);

    if (!resultsOnly) {
      // Sync missing entities
      await syncMissingEvents(v1, v2, mappings, dryRun);
      await syncMissingTeams(v1, v2, mappings, dryRun);
      await syncMissingRetailers(v1, v2, dryRun);
      await syncMissingManufacturers(v1, v2, dryRun);

      // Remove extra local data (only if explicitly requested)
      if (removeExtra) {
        await removeExtraLocalData(v1, v2, dryRun);
      } else {
        console.log('\n🧹 Skipping extra data removal (use --remove-extra to enable)');
      }
    }

    if (!skipResults) {
      // Reset and sync results
      await resetAndSyncResults(v1, v2, mappings, dryRun);
    }

    // Show final comparison
    if (!dryRun) {
      await showFinalComparison(v1, v2);
    }

    console.log('\n✅ Sync complete!');

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  } finally {
    await v1.end();
    await v2.end();
  }
}

main();
