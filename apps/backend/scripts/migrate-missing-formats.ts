/**
 * Migrate Missing Formats (SQL, SSI, MK) from V1 to V2
 *
 * This script fixes the format issue where the original migration
 * mapped all non-SQL formats to SPL. It:
 * 1. Updates existing results that have the wrong format
 * 2. Migrates any missing SQL/SSI/MK results
 *
 * Usage:
 *   npx ts-node scripts/migrate-missing-formats.ts [options]
 *
 * Options:
 *   --dry-run     Preview what will be changed without making changes
 *   --fix-only    Only fix existing records, don't add new ones
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

// Target formats to migrate/fix
const TARGET_FORMATS = ['SQL', 'SSI', 'MK'];

// System admin user for created_by in migrated records
const MIGRATION_USER_ID = '3ae12d0d-e446-470b-9683-0546a85bed93';

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// MIGRATION FUNCTIONS
// ============================================

interface V1Result {
  rowid: number;
  eventid: number;
  memberno: number | null;
  name: string;
  class: string;
  classid: number;
  season: number;
  score: number;
  measured_wattage: number | null;
  peak_frequency: number | null;
  points: number | null;
  team: string | null;
  vehicle: string | null;
  manufacturer: string | null;
  state: string | null;
  state_code: string | null;
  created_at: Date;
  division: string; // From classes table join
}

async function loadMappings(v2: Client): Promise<{
  seasonMappings: Map<number, string>;
  eventMappings: Map<number, string>;
  classMappings: Map<number, string>;
}> {
  console.log('📋 Loading existing mappings...');

  const seasonMappings = new Map<number, string>();
  const eventMappings = new Map<number, string>();
  const classMappings = new Map<number, string>();

  // Load from migration mappings table
  const { rows: mappings } = await v2.query(`
    SELECT entity_type, v1_id, v2_id FROM v1_migration_mappings
  `).catch(() => ({ rows: [] }));

  for (const m of mappings) {
    const v1Id = Number(m.v1_id);
    if (m.entity_type === 'season') seasonMappings.set(v1Id, m.v2_id);
    if (m.entity_type === 'class') classMappings.set(v1Id, m.v2_id);
    if (m.entity_type === 'event') eventMappings.set(v1Id, m.v2_id);
  }

  // Also load seasons by year
  const { rows: seasons } = await v2.query(`SELECT id, year FROM seasons`);
  for (const s of seasons) {
    if (!seasonMappings.has(s.year)) {
      seasonMappings.set(s.year, s.id);
    }
  }

  console.log(`   Seasons: ${seasonMappings.size}, Events: ${eventMappings.size}, Classes: ${classMappings.size}`);
  return { seasonMappings, eventMappings, classMappings };
}

async function fixExistingFormats(v1: Client, v2: Client, dryRun: boolean): Promise<number> {
  console.log('\n🔧 Fixing incorrectly mapped formats in existing results...');

  // Get all V1 results with their correct format from classes table
  const { rows: v1Results } = await v1.query(`
    SELECT r.rowid, r.eventid, r.memberno, r.class, r.score, c.division
    FROM results r
    JOIN classes c ON r.classid = c.classid
    WHERE c.division IN ('SQL', 'SSI', 'MK')
    ORDER BY r.rowid
  `);

  console.log(`   Found ${v1Results.length} results in V1 with SQL/SSI/MK format`);

  // Load event mappings
  const { rows: eventMappings } = await v2.query(`
    SELECT v1_id, v2_id FROM v1_migration_mappings WHERE entity_type = 'event'
  `);
  const eventMap = new Map(eventMappings.map(m => [Number(m.v1_id), m.v2_id]));

  let fixed = 0;
  let notFound = 0;

  for (const r of v1Results) {
    const v2EventId = eventMap.get(r.eventid);
    if (!v2EventId) {
      notFound++;
      continue;
    }

    // Find the V2 result by matching event, meca_id, class, and score
    const { rows: v2Results } = await v2.query(`
      SELECT id, format FROM competition_results
      WHERE event_id = $1
        AND meca_id = $2
        AND competition_class = $3
        AND ABS(score - $4) < 0.01
    `, [v2EventId, r.memberno?.toString() || '', r.class, r.score]);

    if (v2Results.length === 0) {
      notFound++;
      continue;
    }

    const v2Result = v2Results[0];

    // Check if format needs fixing
    if (v2Result.format !== r.division) {
      if (dryRun) {
        if (fixed < 10) {
          console.log(`   [DRY RUN] Would fix ${v2Result.id}: ${v2Result.format} → ${r.division}`);
        }
      } else {
        await v2.query(`
          UPDATE competition_results SET format = $1, updated_at = NOW() WHERE id = $2
        `, [r.division, v2Result.id]);
      }
      fixed++;
    }
  }

  console.log(`   ✅ Fixed ${fixed} results (${notFound} not found in V2)`);
  return fixed;
}

async function migrateNewResults(
  v1: Client,
  v2: Client,
  mappings: { seasonMappings: Map<number, string>; eventMappings: Map<number, string>; classMappings: Map<number, string> },
  dryRun: boolean
): Promise<number> {
  console.log('\n📥 Migrating new SQL/SSI/MK results not yet in V2...');

  const { seasonMappings, eventMappings, classMappings } = mappings;

  // Get V1 results for target formats
  const { rows: v1Results } = await v1.query<V1Result>(`
    SELECT r.rowid, r.eventid, r.memberno, r.name, r.class, r.classid, r.season,
           r.score, r.measured_wattage, r.peak_frequency,
           r.points, r.team, r.vehicle, r.manufacturer, r.state, r.state_code,
           r.created_at, c.division
    FROM results r
    JOIN classes c ON r.classid = c.classid
    WHERE c.division IN ('SQL', 'SSI', 'MK')
    ORDER BY r.season DESC, r.eventid, r.rowid
  `);

  console.log(`   Found ${v1Results.length} SQL/SSI/MK results in V1`);

  // Build a set of existing results in V2 for quick lookup
  console.log('   Building V2 results index...');
  const { rows: v2Existing } = await v2.query(`
    SELECT event_id, meca_id, competition_class, score FROM competition_results
    WHERE format IN ('SQL', 'SSI', 'MK')
  `);

  const existingSet = new Set(
    v2Existing.map(r => `${r.event_id}:${r.meca_id}:${r.competition_class}:${parseFloat(r.score).toFixed(2)}`)
  );
  console.log(`   ${existingSet.size} existing SQL/SSI/MK results in V2`);

  let migrated = 0;
  let skipped = 0;
  let noMapping = 0;

  for (const r of v1Results) {
    const seasonId = seasonMappings.get(r.season);
    const eventId = eventMappings.get(r.eventid);
    const classId = r.classid ? classMappings.get(r.classid) : null;

    if (!seasonId || !eventId) {
      noMapping++;
      continue;
    }

    // Check if already exists
    const key = `${eventId}:${r.memberno?.toString() || ''}:${r.class}:${parseFloat(String(r.score)).toFixed(2)}`;
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    if (dryRun) {
      if (migrated < 10) {
        console.log(`   [DRY RUN] Would add: ${r.name} - ${r.class} (${r.division}) - ${r.score}`);
      }
      migrated++;
      continue;
    }

    const newId = generateUUID();
    const vehicleInfo = [r.vehicle, r.manufacturer, r.team].filter(Boolean).join(' - ') || null;
    const notes = `Migrated from V1 (rowid: ${r.rowid}) - Format fix migration`;

    try {
      await v2.query(`
        INSERT INTO competition_results (
          id, event_id, competitor_id, competitor_name, competition_class, score,
          placement, points_earned, vehicle_info, notes, created_by, created_at,
          meca_id, season_id, class_id, format, state_code, updated_by, updated_at,
          revision_count, modification_reason, wattage, frequency
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), $19, $20, $21, $22)
      `, [
        newId,                                    // id
        eventId,                                  // event_id
        null,                                     // competitor_id
        r.name || 'Unknown',                      // competitor_name
        r.class || 'Unknown',                     // competition_class
        r.score ?? 0,                             // score
        0,                                        // placement
        r.points || 0,                            // points_earned
        vehicleInfo,                              // vehicle_info
        notes,                                    // notes
        MIGRATION_USER_ID,                        // created_by
        r.created_at || new Date(),               // created_at
        r.memberno?.toString() || null,           // meca_id
        seasonId,                                 // season_id
        classId,                                  // class_id
        r.division,                               // format (CORRECT!)
        r.state_code || r.state || null,          // state_code
        null,                                     // updated_by
        0,                                        // revision_count
        'v1_format_fix_migration',                // modification_reason
        r.measured_wattage ? Math.round(r.measured_wattage) : null,
        r.peak_frequency ? Math.round(r.peak_frequency) : null
      ]);

      migrated++;
      existingSet.add(key); // Add to set to avoid duplicates

      if (migrated % 1000 === 0) {
        console.log(`   ... migrated ${migrated} results`);
      }
    } catch (err: any) {
      console.log(`   ⚠️  Error inserting result ${r.rowid}: ${err.message}`);
    }
  }

  console.log(`   ✅ Migrated ${migrated} new results (${skipped} already exist, ${noMapping} no mapping)`);
  return migrated;
}

async function updateCompetitionClasses(v1: Client, v2: Client, mappings: any, dryRun: boolean): Promise<void> {
  console.log('\n📚 Updating competition classes with correct formats...');

  const { rows: v1Classes } = await v1.query(`
    SELECT classid, name, abbreviation, division, season
    FROM classes
    WHERE division IN ('SQL', 'SSI', 'MK')
    ORDER BY season, classid
  `);

  console.log(`   Found ${v1Classes.length} SQL/SSI/MK classes in V1`);

  let updated = 0;
  let created = 0;

  for (const c of v1Classes) {
    const seasonId = mappings.seasonMappings.get(c.season);
    if (!seasonId) continue;

    // Check if class exists in V2
    const { rows: existing } = await v2.query(`
      SELECT id, format FROM competition_classes
      WHERE abbreviation = $1 AND season_id = $2
    `, [c.abbreviation, seasonId]);

    if (existing.length > 0) {
      // Update format if wrong
      if (existing[0].format !== c.division) {
        if (!dryRun) {
          await v2.query(`
            UPDATE competition_classes SET format = $1, updated_at = NOW() WHERE id = $2
          `, [c.division, existing[0].id]);
        }
        updated++;
      }
    } else {
      // Create new class
      if (!dryRun) {
        const newId = generateUUID();
        try {
          await v2.query(`
            INSERT INTO competition_classes (id, name, abbreviation, format, season_id, is_active, display_order, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, true, 0, NOW(), NOW())
          `, [newId, c.name || c.abbreviation, c.abbreviation, c.division, seasonId]);
          created++;
        } catch (err: any) {
          // Likely duplicate - ignore
        }
      } else {
        created++;
      }
    }
  }

  console.log(`   ✅ Updated ${updated} classes, created ${created} new classes`);
}

async function showSummary(v2: Client): Promise<void> {
  console.log('\n📊 Final V2 Format Distribution:');

  const { rows } = await v2.query(`
    SELECT format, COUNT(*) as count
    FROM competition_results
    GROUP BY format
    ORDER BY count DESC
  `);

  for (const r of rows) {
    console.log(`   ${r.format || '(null)'}: ${r.count}`);
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fixOnly = args.includes('--fix-only');

  console.log('🚀 MECA V1 → V2 Missing Formats Migration');
  console.log('==========================================');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN' : '⚡ LIVE'}`);
  console.log(`Target formats: ${TARGET_FORMATS.join(', ')}`);
  if (fixOnly) console.log('Fix-only mode: will not add new records');
  console.log('');

  const v1 = new Client(V1_CONFIG);
  const v2 = new Client(V2_CONFIG);

  try {
    await v1.connect();
    console.log('✅ Connected to V1 (Lightsail)');

    await v2.connect();
    console.log('✅ Connected to V2 (Supabase)');

    // Load mappings
    const mappings = await loadMappings(v2);

    // Update competition classes first
    await updateCompetitionClasses(v1, v2, mappings, dryRun);

    // Fix existing results with wrong format
    await fixExistingFormats(v1, v2, dryRun);

    // Migrate new results (unless fix-only mode)
    if (!fixOnly) {
      await migrateNewResults(v1, v2, mappings, dryRun);
    }

    // Show final summary
    if (!dryRun) {
      await showSummary(v2);
    }

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await v1.end();
    await v2.end();
  }
}

main();
