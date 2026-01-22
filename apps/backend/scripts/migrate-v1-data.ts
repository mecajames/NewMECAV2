/**
 * V1 to V2 Data Migration Script
 *
 * Migrates data from V1 Hasura/Lightsail PostgreSQL to V2 Supabase PostgreSQL.
 *
 * Usage:
 *   npx ts-node scripts/migrate-v1-data.ts [options]
 *
 * Options:
 *   --dry-run     Preview what will be migrated without making changes
 *   --table=X     Migrate only specific table (seasons, classes, events, members, results)
 *   --limit=N     Limit number of records (for testing)
 */

import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION - Update V1 password before running
// ============================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

// Create Supabase admin client for user creation
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const V1_CONFIG = {
  host: 'ls-f9bb3cf7787cc3dce3cf1deef31e08dfa0f34c31.cexp2mtr0fvk.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'dbmecaevents',
  user: 'dbmasteruser',
  password: process.env.V1_DB_PASSWORD || 'YOUR_V1_PASSWORD_HERE', // Set via env or update here
  ssl: { rejectUnauthorized: false },
};

const V2_CONFIG = {
  host: '127.0.0.1',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

// ============================================
// MIGRATION MAPPINGS
// ============================================

interface IdMapping {
  v1Id: number;
  v2Id: string;
}

const seasonMappings: Map<number, string> = new Map();
const classMappings: Map<number, string> = new Map();
const eventMappings: Map<number, string> = new Map();
const memberMappings: Map<number, string> = new Map();

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

function mapInputMethod(inputter: string | null): string {
  if (!inputter) return 'manual';
  const lower = inputter.toLowerCase();
  if (lower.includes('upload') || lower.includes('excel')) return 'upload:excel';
  if (lower.includes('api') || lower.includes('meca-api')) return 'meca-api';
  if (lower.includes('hasura')) return 'hasura';
  return 'manual';
}

// ============================================
// MIGRATION FUNCTIONS
// ============================================

async function createMappingTables(v2: Client): Promise<void> {
  console.log('📋 Creating migration mapping tables...');

  await v2.query(`
    CREATE TABLE IF NOT EXISTS v1_migration_mappings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type VARCHAR(50) NOT NULL,
      v1_id INTEGER NOT NULL,
      v2_id UUID NOT NULL,
      migrated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(entity_type, v1_id)
    );
  `);

  console.log('✅ Mapping tables created');
}

async function migrateSeasons(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🗓️  Migrating seasons...');

  const { rows: v1Seasons } = await v1.query(`
    SELECT season, isdefault, enddate
    FROM seasons
    ORDER BY season
  `);

  console.log(`   Found ${v1Seasons.length} seasons in V1`);

  for (const s of v1Seasons) {
    // Check if already exists in V2
    const { rows: existing } = await v2.query(
      `SELECT id FROM seasons WHERE year = $1`,
      [s.season]
    );

    if (existing.length > 0) {
      seasonMappings.set(s.season, existing[0].id);
      console.log(`   ⏭️  Season ${s.season} already exists`);
      continue;
    }

    if (dryRun) {
      console.log(`   [DRY RUN] Would create season ${s.season}`);
      continue;
    }

    const newId = generateUUID();
    const startDate = new Date(`${s.season}-01-01`);
    const endDate = s.enddate ? new Date(s.enddate) : new Date(`${s.season}-12-31`);

    await v2.query(`
      INSERT INTO seasons (id, year, name, start_date, end_date, is_current, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (year) DO NOTHING
    `, [newId, s.season, `${s.season} Season`, startDate, endDate, s.isdefault || false]);

    seasonMappings.set(s.season, newId);

    // Record mapping
    await v2.query(`
      INSERT INTO v1_migration_mappings (entity_type, v1_id, v2_id)
      VALUES ('season', $1, $2)
      ON CONFLICT (entity_type, v1_id) DO NOTHING
    `, [s.season, newId]);

    console.log(`   ✅ Migrated season ${s.season} → ${newId}`);
  }
}

async function migrateClasses(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n📚 Migrating competition classes...');

  const { rows: v1Classes } = await v1.query(`
    SELECT classid, name, abbreviation, division, season, resultorder
    FROM classes
    WHERE season IS NOT NULL
    ORDER BY season, resultorder
  `);

  console.log(`   Found ${v1Classes.length} classes in V1`);

  for (const c of v1Classes) {
    const seasonId = seasonMappings.get(c.season);
    if (!seasonId) {
      console.log(`   ⚠️  Skipping class ${c.abbreviation} - no season mapping for ${c.season}`);
      continue;
    }

    const format = c.division === 'SQL' ? 'SQL' : 'SPL';
    const className = c.name || c.abbreviation;

    // Check if exists by abbreviation + season OR by name + format (unique constraint)
    const { rows: existing } = await v2.query(
      `SELECT id FROM competition_classes WHERE abbreviation = $1 AND season_id = $2`,
      [c.abbreviation, seasonId]
    );

    if (existing.length > 0) {
      classMappings.set(c.classid, existing[0].id);
      continue;
    }

    // Also check for name+format unique constraint
    const { rows: existingByName } = await v2.query(
      `SELECT id FROM competition_classes WHERE name = $1 AND format = $2`,
      [className, format]
    );

    if (existingByName.length > 0) {
      // Map to existing class with same name+format
      classMappings.set(c.classid, existingByName[0].id);
      continue;
    }

    if (dryRun) {
      console.log(`   [DRY RUN] Would create class ${c.abbreviation} for season ${c.season}`);
      continue;
    }

    const newId = generateUUID();

    try {
      await v2.query(`
        INSERT INTO competition_classes (id, name, abbreviation, format, season_id, is_active, display_order, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())
      `, [newId, className, c.abbreviation, format, seasonId, c.resultorder || 0]);

      classMappings.set(c.classid, newId);

      await v2.query(`
        INSERT INTO v1_migration_mappings (entity_type, v1_id, v2_id)
        VALUES ('class', $1, $2)
        ON CONFLICT (entity_type, v1_id) DO NOTHING
      `, [c.classid, newId]);
    } catch (err: any) {
      // If duplicate key error, try to find and map to existing
      if (err.code === '23505') {
        const { rows: fallback } = await v2.query(
          `SELECT id FROM competition_classes WHERE name = $1 AND format = $2`,
          [className, format]
        );
        if (fallback.length > 0) {
          classMappings.set(c.classid, fallback[0].id);
        }
      } else {
        throw err;
      }
    }
  }

  console.log(`   ✅ Migrated ${classMappings.size} classes`);
}

async function migrateEvents(v1: Client, v2: Client, dryRun: boolean, limit?: number): Promise<void> {
  console.log('\n📅 Migrating events...');

  let query = `
    SELECT eventid, eventname, season, startdate, enddate, city, state,
           zipcode, eventhost, eventdirector, eventemail, eventsite,
           multiplier, spl, sql as is_sql, flyerlink
    FROM events
    WHERE season IS NOT NULL
    ORDER BY season DESC, startdate DESC
  `;
  if (limit) query += ` LIMIT ${limit}`;

  const { rows: v1Events } = await v1.query(query);
  console.log(`   Found ${v1Events.length} events in V1`);

  let migrated = 0;
  for (const e of v1Events) {
    const seasonId = seasonMappings.get(e.season);
    if (!seasonId) {
      console.log(`   ⚠️  Skipping event ${e.eventid} - no season mapping`);
      continue;
    }

    // Check if exists (by name and date)
    const { rows: existing } = await v2.query(
      `SELECT id FROM events WHERE title = $1 AND season_id = $2`,
      [e.eventname, seasonId]
    );

    if (existing.length > 0) {
      eventMappings.set(e.eventid, existing[0].id);
      continue;
    }

    if (dryRun) {
      console.log(`   [DRY RUN] Would create event: ${e.eventname}`);
      continue;
    }

    const newId = generateUUID();
    const eventDate = e.startdate ? new Date(e.startdate) : new Date();

    // Determine formats from division flags
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
      newId,
      e.eventname,
      eventDate,
      e.eventhost || 'Unknown Venue',
      e.eventsite || 'N/A',
      e.city,
      e.state,
      e.zipcode,
      seasonId,
      e.multiplier || 2,
      JSON.stringify(formats),
      e.flyerlink
    ]);

    eventMappings.set(e.eventid, newId);
    migrated++;

    await v2.query(`
      INSERT INTO v1_migration_mappings (entity_type, v1_id, v2_id)
      VALUES ('event', $1, $2)
      ON CONFLICT (entity_type, v1_id) DO NOTHING
    `, [e.eventid, newId]);
  }

  console.log(`   ✅ Migrated ${migrated} events`);
}

/**
 * Migrate unmapped events - especially 2004-2006 events with 'Unknown' names
 * These events have city, state, eventhost, and date data that can be used to create meaningful titles
 */
async function migrateUnmappedEvents(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n📅 Migrating unmapped events (2004-2006 historical data)...');

  // Get all V1 event IDs that don't have a mapping in V2
  const { rows: mappedEventIds } = await v2.query(`
    SELECT v1_id FROM v1_migration_mappings WHERE entity_type = 'event'
  `);
  const mappedSet = new Set(mappedEventIds.map(r => Number(r.v1_id)));

  // Get V1 events that aren't mapped yet
  const { rows: v1Events } = await v1.query(`
    SELECT eventid, eventname, season, startdate, enddate, city, state,
           zipcode, eventhost, eventdirector, eventemail, eventsite,
           multiplier, spl, sql as is_sql, flyerlink
    FROM events
    WHERE season IS NOT NULL
    ORDER BY season, startdate
  `);

  const unmappedEvents = v1Events.filter(e => !mappedSet.has(e.eventid));
  console.log(`   Found ${unmappedEvents.length} unmapped events in V1`);

  let migrated = 0;
  for (const e of unmappedEvents) {
    const seasonId = seasonMappings.get(e.season);
    if (!seasonId) {
      console.log(`   ⚠️  Skipping event ${e.eventid} - no season mapping for ${e.season}`);
      continue;
    }

    // Generate event title from available data
    let eventTitle = e.eventname;
    if (!eventTitle || eventTitle === 'Unknown') {
      // Build title from city, eventhost, and date
      const datePart = e.startdate ? new Date(e.startdate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      const cityPart = e.city || '';
      const hostPart = e.eventhost || '';

      if (cityPart && hostPart) {
        eventTitle = `${cityPart} - ${hostPart}`;
      } else if (cityPart) {
        eventTitle = `${cityPart} ${e.state || ''} ${datePart}`.trim();
      } else if (hostPart) {
        eventTitle = `${hostPart} ${datePart}`.trim();
      } else {
        eventTitle = `Event ${e.eventid} (${e.season})`;
      }
    }

    // Check if an event with this title already exists for this season
    const { rows: existing } = await v2.query(
      `SELECT id FROM events WHERE title = $1 AND season_id = $2`,
      [eventTitle, seasonId]
    );

    if (existing.length > 0) {
      // Map to existing event
      eventMappings.set(e.eventid, existing[0].id);
      await v2.query(`
        INSERT INTO v1_migration_mappings (entity_type, v1_id, v2_id)
        VALUES ('event', $1, $2)
        ON CONFLICT (entity_type, v1_id) DO NOTHING
      `, [e.eventid, existing[0].id]);
      continue;
    }

    if (dryRun) {
      if (migrated < 10) {
        console.log(`   [DRY RUN] Would create event: ${eventTitle} (${e.season})`);
      }
      migrated++;
      continue;
    }

    const newId = generateUUID();
    const eventDate = e.startdate ? new Date(e.startdate) : new Date(`${e.season}-06-01`);

    // Determine formats from division flags
    const formats: string[] = [];
    if (e.spl) formats.push('SPL');
    if (e.is_sql) formats.push('SQL');
    if (formats.length === 0) formats.push('SPL'); // Default to SPL

    try {
      await v2.query(`
        INSERT INTO events (
          id, title, event_date, venue_name, venue_address, venue_city, venue_state,
          venue_postal_code, venue_country, season_id, status, points_multiplier,
          event_type, formats, flyer_url, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'US', $9, 'completed', $10, 'standard', $11, $12, NOW(), NOW())
      `, [
        newId,
        eventTitle,
        eventDate,
        e.eventhost || 'Unknown Venue',
        e.eventsite || '',
        e.city || '',
        e.state || '',
        e.zipcode || '',
        seasonId,
        e.multiplier || 2,
        JSON.stringify(formats),
        e.flyerlink
      ]);

      eventMappings.set(e.eventid, newId);
      migrated++;

      await v2.query(`
        INSERT INTO v1_migration_mappings (entity_type, v1_id, v2_id)
        VALUES ('event', $1, $2)
        ON CONFLICT (entity_type, v1_id) DO NOTHING
      `, [e.eventid, newId]);
    } catch (err: any) {
      console.log(`   ⚠️  Error migrating event ${e.eventid}: ${err.message}`);
    }
  }

  console.log(`   ✅ Migrated ${migrated} unmapped events`);
}

// System admin user for created_by in migrated records
const MIGRATION_USER_ID = '3ae12d0d-e446-470b-9683-0546a85bed93'; // james@mecacaraudio.com

async function migrateResults(v1: Client, v2: Client, dryRun: boolean, limit?: number): Promise<void> {
  console.log('\n🏆 Migrating competition results...');

  // V2 competition_results schema:
  // id, event_id, competitor_id, competitor_name, competition_class, score, placement,
  // points_earned, vehicle_info, notes, created_by, created_at, meca_id, season_id,
  // class_id, format, updated_by, updated_at, revision_count, modification_reason,
  // wattage, frequency

  let query = `
    SELECT rowid, eventid, memberno, name, class, classid, season,
           score, measured_wattage, peak_frequency,
           points, team, vehicle, manufacturer, state, country_code,
           inputter, created_at
    FROM results
    WHERE season IS NOT NULL
    ORDER BY season DESC, eventid, rowid
  `;
  if (limit) query += ` LIMIT ${limit}`;

  const { rows: v1Results } = await v1.query(query);
  console.log(`   Found ${v1Results.length} results in V1`);

  let migrated = 0;
  let skipped = 0;
  let alreadyExists = 0;

  for (const r of v1Results) {
    // Get mappings
    const seasonId = seasonMappings.get(r.season);
    const eventId = eventMappings.get(r.eventid);
    const classId = r.classid ? classMappings.get(r.classid) : null;

    if (!seasonId || !eventId) {
      skipped++;
      continue;
    }

    // Check if already migrated (by meca_id + event_id + competition_class + score)
    const { rows: existing } = await v2.query(
      `SELECT id FROM competition_results
       WHERE event_id = $1 AND meca_id = $2 AND competition_class = $3 AND score = $4`,
      [eventId, r.memberno?.toString() || '', r.class || 'Unknown', r.score]
    );

    if (existing.length > 0) {
      alreadyExists++;
      continue;
    }

    if (dryRun) {
      if (migrated < 5) {
        console.log(`   [DRY RUN] Would create result: ${r.name} - ${r.class} - ${r.score}`);
      }
      migrated++;
      continue;
    }

    const newId = generateUUID();

    // Determine format from class (SPL vs SQL classes)
    const format = r.class?.toUpperCase().includes('SQL') ? 'SQL' : 'SPL';

    // Build vehicle_info from vehicle + manufacturer + team
    const vehicleInfo = [r.vehicle, r.manufacturer, r.team].filter(Boolean).join(' - ') || null;

    // Build notes with migration info
    const notes = `Migrated from V1 (rowid: ${r.rowid})`;

    await v2.query(`
      INSERT INTO competition_results (
        id, event_id, competitor_id, competitor_name, competition_class, score,
        placement, points_earned, vehicle_info, notes, created_by, created_at,
        meca_id, season_id, class_id, format, updated_by, updated_at,
        revision_count, modification_reason, wattage, frequency
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), $18, $19, $20, $21)
    `, [
      newId,                                    // id
      eventId,                                  // event_id
      null,                                     // competitor_id (no member mapping yet)
      r.name || 'Unknown',                      // competitor_name
      r.class || 'Unknown',                     // competition_class
      r.score ?? 0,                             // score (default to 0 if null)
      0,                                        // placement (not in v1, default to 0)
      r.points || 0,                            // points_earned
      vehicleInfo,                              // vehicle_info
      notes,                                    // notes
      MIGRATION_USER_ID,                        // created_by (admin user for migration)
      r.created_at || new Date(),               // created_at
      r.memberno?.toString() || null,           // meca_id
      seasonId,                                 // season_id
      classId,                                  // class_id
      format,                                   // format
      null,                                     // updated_by
      0,                                        // revision_count
      'v1_migration',                           // modification_reason
      r.measured_wattage ? Math.round(r.measured_wattage) : null, // wattage (as integer)
      r.peak_frequency ? Math.round(r.peak_frequency) : null      // frequency (as integer)
    ]);

    migrated++;

    if (migrated % 1000 === 0) {
      console.log(`   ... migrated ${migrated} results`);
    }
  }

  console.log(`   ✅ Migrated ${migrated} results (skipped ${skipped} - missing mappings, ${alreadyExists} already exist)`);
}

// ============================================
// MEMBERS MIGRATION (with Auth User Creation)
// ============================================

async function migrateMembers(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n👤 Migrating members (creating auth users)...');

  const { rows: v1Members } = await v1.query(`
    SELECT memberid, name, email, phone, address, city, state, zip, state_code, country_code,
           bio, is_gallery_public, expdate, type, company, website, team
    FROM members
    WHERE memberid IS NOT NULL
    ORDER BY memberid
  `);

  console.log(`   Found ${v1Members.length} members in V1`);

  let updated = 0;
  let created = 0;
  let skipped = 0;
  let noEmail = 0;

  for (const m of v1Members) {
    // Skip members without email - can't create auth user
    if (!m.email || !m.email.includes('@')) {
      noEmail++;
      continue;
    }

    const email = m.email.toLowerCase().trim();

    // Try to find existing profile by meca_id or email
    const { rows: existing } = await v2.query(
      `SELECT id FROM profiles WHERE meca_id = $1 OR LOWER(email) = $2`,
      [m.memberid, email]
    );

    if (existing.length > 0) {
      // Update existing profile with V1 data
      memberMappings.set(m.memberid, existing[0].id);

      if (!dryRun) {
        await v2.query(`
          UPDATE profiles SET
            meca_id = COALESCE(meca_id, $2),
            bio = COALESCE(bio, $3),
            address = COALESCE(address, $4),
            city = COALESCE(city, $5),
            state = COALESCE(state, $6),
            postal_code = COALESCE(postal_code, $7),
            country = COALESCE(country, $8),
            is_public = COALESCE(is_public, $9),
            updated_at = NOW()
          WHERE id = $1
        `, [
          existing[0].id,
          m.memberid,
          m.bio,
          m.address,
          m.city,
          m.state_code || m.state,
          m.zip,
          m.country_code || 'US',
          m.is_gallery_public ?? true
        ]);
      }
      updated++;
      continue;
    }

    // No existing profile - create auth user and profile
    if (dryRun) {
      if (created < 5) {
        console.log(`   [DRY RUN] Would create user: ${m.name} (${email})`);
      }
      created++;
      continue;
    }

    // Parse name into first/last
    const nameParts = (m.name || 'Unknown Member').trim().split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'Member';

    try {
      // Create auth user via Supabase Admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true, // Skip email verification
        password: generateRandomPassword(), // Random password - they'll need to reset
        user_metadata: {
          full_name: m.name,
          meca_id: m.memberid,
          migrated_from_v1: true,
        },
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          // User exists in auth but not in profiles - find and update
          const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email);
          if (existingUser) {
            memberMappings.set(m.memberid, existingUser.id);
            updated++;
          } else {
            skipped++;
          }
        } else {
          console.log(`   ⚠️  Auth error for ${email}: ${authError.message}`);
          skipped++;
        }
        continue;
      }

      if (!authData.user) {
        skipped++;
        continue;
      }

      const userId = authData.user.id;

      // Create profile linked to auth user
      await v2.query(`
        INSERT INTO profiles (
          id, email, full_name, first_name, last_name, phone, role, membership_status,
          meca_id, bio, address, city, state, postal_code, country, is_public,
          force_password_change, created_at, updated_at, can_login, is_secondary_account
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'user', 'expired', $7, $8, $9, $10, $11, $12, $13, $14, true, NOW(), NOW(), true, false)
      `, [
        userId,
        email,
        m.name || 'Unknown Member',
        firstName,
        lastName,
        m.phone,
        m.memberid,
        m.bio,
        m.address,
        m.city,
        m.state_code || m.state,
        m.zip,
        m.country_code || 'US',
        m.is_gallery_public ?? true
      ]);

      memberMappings.set(m.memberid, userId);

      await v2.query(`
        INSERT INTO v1_migration_mappings (entity_type, v1_id, v2_id)
        VALUES ('member', $1, $2)
        ON CONFLICT (entity_type, v1_id) DO NOTHING
      `, [m.memberid, userId]);

      created++;

      if (created % 100 === 0) {
        console.log(`   ... created ${created} users`);
      }
    } catch (err: any) {
      console.log(`   ⚠️  Error creating user ${email}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Members: ${updated} updated, ${created} created, ${skipped} skipped, ${noEmail} no email`);
}

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ============================================
// TEAMS MIGRATION
// ============================================

const teamMappings: Map<number, string> = new Map();

async function migrateTeams(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🏁 Migrating teams...');

  const { rows: v1Teams } = await v1.query(`
    SELECT id, team_name, logo_url, city, state_code, country_code,
           contact_name, contact_email, memberid, privacy, team_bio,
           team_link, open_membership, slug, created_at
    FROM teams
    ORDER BY id
  `);

  console.log(`   Found ${v1Teams.length} teams in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const t of v1Teams) {
    // Check if team already exists by name
    const { rows: existing } = await v2.query(
      `SELECT id FROM teams WHERE name = $1`,
      [t.team_name]
    );

    if (existing.length > 0) {
      teamMappings.set(t.id, existing[0].id);
      continue;
    }

    if (dryRun) {
      console.log(`   [DRY RUN] Would create team: ${t.team_name}`);
      migrated++;
      continue;
    }

    // Get captain from memberid mapping
    const captainId = t.memberid ? memberMappings.get(t.memberid) : null;
    if (!captainId) {
      // Use admin as captain if no member mapping
    }

    const newId = generateUUID();
    const location = [t.city, t.state_code].filter(Boolean).join(', ') || null;

    try {
      await v2.query(`
        INSERT INTO teams (
          id, name, description, logo_url, captain_id, is_active, is_public,
          requires_approval, bio, website, location, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9, $10, $11, NOW())
      `, [
        newId,
        t.team_name,
        t.team_bio,
        t.logo_url,
        captainId || MIGRATION_USER_ID, // Use admin if no captain
        t.privacy !== 'private',
        !t.open_membership,
        t.team_bio,
        t.team_link,
        location,
        t.created_at || new Date()
      ]);

      teamMappings.set(t.id, newId);

      await v2.query(`
        INSERT INTO v1_migration_mappings (entity_type, v1_id, v2_id)
        VALUES ('team', $1, $2)
        ON CONFLICT (entity_type, v1_id) DO NOTHING
      `, [t.id, newId]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating team ${t.team_name}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} teams (${skipped} skipped)`);
}

// ============================================
// TEAM MEMBERS MIGRATION
// ============================================

async function migrateTeamMembers(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n👥 Migrating team members...');

  const { rows: v1TeamMembers } = await v1.query(`
    SELECT id, team_id, member_id, status, created_at
    FROM team_member
    ORDER BY team_id, member_id
  `);

  console.log(`   Found ${v1TeamMembers.length} team memberships in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const tm of v1TeamMembers) {
    const teamId = teamMappings.get(Number(tm.team_id));
    const userId = memberMappings.get(Number(tm.member_id));

    if (!teamId || !userId) {
      skipped++;
      continue;
    }

    // Check if already exists
    const { rows: existing } = await v2.query(
      `SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [teamId, userId]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();
    const status = tm.status === 'approved' ? 'active' : (tm.status || 'active');

    try {
      await v2.query(`
        INSERT INTO team_members (id, team_id, user_id, role, status, joined_at)
        VALUES ($1, $2, $3, 'member', $4, $5)
      `, [newId, teamId, userId, status, tm.created_at || new Date()]);

      migrated++;
    } catch (err: any) {
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} team memberships (${skipped} skipped)`);
}

// ============================================
// RETAILERS MIGRATION
// ============================================

async function migrateRetailers(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🏪 Migrating retailers...');

  // V1 schema: id, memberid, name, description_old, logo_url, website, address, city, zip,
  //            state_code, country_code, contact_name, contact_email, contact_phone,
  //            sales_email, sales_phone, expires_at, created_at, updated_at, in_directory,
  //            associated_team_id, intro_text, offer_text, display_name
  const { rows: v1Retailers } = await v1.query(`
    SELECT id, name, display_name, address, city, state_code, zip,
           contact_phone, website, contact_email, intro_text, offer_text,
           in_directory, logo_url, expires_at, created_at
    FROM retailers
    ORDER BY id
  `);

  console.log(`   Found ${v1Retailers.length} retailers in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const r of v1Retailers) {
    const businessName = r.display_name || r.name;

    // Check if exists by name
    const { rows: existing } = await v2.query(
      `SELECT id FROM retailer_listings WHERE business_name = $1`,
      [businessName]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      console.log(`   [DRY RUN] Would create retailer: ${businessName}`);
      migrated++;
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
        newId,
        businessName,
        r.intro_text, // description
        r.website,
        r.contact_phone,
        r.contact_email,
        r.address,
        r.city,
        r.state_code,
        r.zip,
        r.in_directory ?? true,
        r.logo_url,
        r.offer_text,
        r.expires_at,
        r.created_at || new Date()
      ]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating retailer ${businessName}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} retailers (${skipped} skipped)`);
}

// ============================================
// MANUFACTURERS MIGRATION
// ============================================

async function migrateManufacturers(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🏭 Migrating manufacturers...');

  // V1 schema: id, name, logo_url, website, address, city, zip, state_code, country_code,
  //            contact_name, contact_email, contact_phone, expires_at, created_at, updated_at,
  //            description, sales_phone, sales_email, level, memberid, in_directory,
  //            associated_team_id, display_name
  const { rows: v1Manufacturers } = await v1.query(`
    SELECT id, name, display_name, logo_url, website, description, address, city, zip,
           state_code, contact_phone, contact_email, in_directory, expires_at, created_at
    FROM manufacturers
    ORDER BY id
  `);

  console.log(`   Found ${v1Manufacturers.length} manufacturers in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const m of v1Manufacturers) {
    const businessName = m.display_name || m.name;

    // Check if exists by name
    const { rows: existing } = await v2.query(
      `SELECT id FROM manufacturer_listings WHERE business_name = $1`,
      [businessName]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      console.log(`   [DRY RUN] Would create manufacturer: ${businessName}`);
      migrated++;
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
        newId,
        businessName,
        m.description,
        m.website,
        m.contact_phone,
        m.contact_email,
        m.address,
        m.city,
        m.state_code,
        m.zip,
        m.in_directory ?? true,
        m.logo_url,
        m.expires_at,
        m.created_at || new Date()
      ]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating manufacturer ${businessName}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} manufacturers (${skipped} skipped)`);
}

// ============================================
// MEMBER GALLERY IMAGES MIGRATION
// ============================================

async function migrateMemberImages(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🖼️  Migrating member gallery images...');

  const { rows: v1Images } = await v1.query(`
    SELECT id, member_id, url, created_at, is_flagged, is_profile_pic
    FROM member_images
    WHERE url IS NOT NULL
    ORDER BY member_id, created_at
  `);

  console.log(`   Found ${v1Images.length} images in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const img of v1Images) {
    const memberId = memberMappings.get(Number(img.member_id));

    if (!memberId) {
      skipped++;
      continue;
    }

    // Check if already exists
    const { rows: existing } = await v2.query(
      `SELECT id FROM member_gallery_images WHERE member_id = $1 AND image_url = $2`,
      [memberId, img.url]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();

    try {
      await v2.query(`
        INSERT INTO member_gallery_images (
          id, member_id, image_url, is_public, uploaded_at, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $5)
      `, [
        newId,
        memberId,
        img.url,
        !img.is_flagged,
        img.created_at || new Date()
      ]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating image: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} images (${skipped} skipped)`);
}

// ============================================
// EVENT REGISTRATIONS MIGRATION
// ============================================

async function migrateEventRegistrations(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n📋 Migrating event registrations...');

  // V1 event_registration uses event slugs/names (like 'freeze-fest'), not IDs
  // We need to join with events table to get the event ID by matching event name
  const { rows: v1Regs } = await v1.query(`
    SELECT er.id, er.member_id, er.season, er.event as event_slug, e.eventid,
           er.division, er.class, er.created_at
    FROM event_registration er
    LEFT JOIN events e ON (
      LOWER(REPLACE(e.eventname, ' ', '-')) = LOWER(er.event)
      OR LOWER(REPLACE(REPLACE(e.eventname, ' ', ''), '-', '')) LIKE '%' || LOWER(REPLACE(er.event, '-', '')) || '%'
    ) AND e.season = er.season
    ORDER BY er.created_at
  `);

  console.log(`   Found ${v1Regs.length} registrations in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const reg of v1Regs) {
    const userId = memberMappings.get(Number(reg.member_id));
    // Use eventid from join if available, otherwise skip
    const eventId = reg.eventid ? eventMappings.get(Number(reg.eventid)) : null;

    if (!userId || !eventId) {
      skipped++;
      continue;
    }

    // Check if already exists
    const { rows: existing } = await v2.query(
      `SELECT id FROM event_registrations WHERE user_id = $1 AND event_id = $2`,
      [userId, eventId]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();

    try {
      // Get member info for registration
      const { rows: memberInfo } = await v2.query(
        `SELECT full_name, email, phone, meca_id FROM profiles WHERE id = $1`,
        [userId]
      );
      const member = memberInfo[0] || {};

      await v2.query(`
        INSERT INTO event_registrations (
          id, event_id, user_id, full_name, email, phone, competition_class,
          registration_date, payment_status, status, registered_at, created_at, meca_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid', 'confirmed', $8, $8, $9)
      `, [
        newId,
        eventId,
        userId,
        member.full_name || 'Unknown',
        member.email || '',
        member.phone,
        reg.class || reg.division || 'Unknown',
        reg.created_at || new Date(),
        member.meca_id
      ]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating registration: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} registrations (${skipped} skipped)`);
}

// ============================================
// JUDGES MIGRATION (Legacy data - creates judge records)
// ============================================

async function migrateJudges(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n⚖️  Migrating judges...');

  const { rows: v1Judges } = await v1.query(`
    SELECT id, name, url, email, active
    FROM judges
    ORDER BY id
  `);

  console.log(`   Found ${v1Judges.length} judges in V1`);

  let migrated = 0;
  let skipped = 0;
  let linked = 0;

  for (const j of v1Judges) {
    // Try to find existing profile by email
    let userId: string | null = null;

    if (j.email) {
      const { rows: existingProfile } = await v2.query(
        `SELECT id FROM profiles WHERE LOWER(email) = $1`,
        [j.email.toLowerCase().trim()]
      );
      if (existingProfile.length > 0) {
        userId = existingProfile[0].id;
        linked++;
      }
    }

    // Check if judge already exists
    if (userId) {
      const { rows: existingJudge } = await v2.query(
        `SELECT id FROM judges WHERE user_id = $1`,
        [userId]
      );
      if (existingJudge.length > 0) {
        continue;
      }
    } else {
      // Can't create judge without a user profile
      skipped++;
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();

    try {
      await v2.query(`
        INSERT INTO judges (
          id, user_id, level, specialty, location_country, location_state, location_city,
          is_active, creation_method, created_at, updated_at, total_ratings, total_events_judged
        )
        VALUES ($1, $2, 'certified', 'both', 'US', 'Unknown', 'Unknown', $3, 'admin_direct', NOW(), NOW(), 0, 0)
      `, [
        newId,
        userId,
        j.active ?? true
      ]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating judge ${j.name}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} judges (${linked} linked to profiles, ${skipped} skipped)`);
}

// ============================================
// AWARDS/ACHIEVEMENTS MIGRATION
// ============================================

const awardDefinitionMappings: Map<number, string> = new Map();

async function migrateAwardDefinitions(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🏅 Migrating award definitions...');

  const { rows: v1Defs } = await v1.query(`
    SELECT id, name, asset_type, asset_url, conditions, status, "group", achievement
    FROM award_definitions
    ORDER BY id
  `);

  console.log(`   Found ${v1Defs.length} award definitions in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const def of v1Defs) {
    // Check if exists by name
    const { rows: existing } = await v2.query(
      `SELECT id FROM achievement_definitions WHERE name = $1`,
      [def.name]
    );

    if (existing.length > 0) {
      awardDefinitionMappings.set(def.id, existing[0].id);
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();

    // Map V1 conditions to V2 metric type and threshold
    // Valid metric_type values: 'score', 'points'
    const metricType = def.achievement ? 'score' : 'points';
    const thresholdValue = def.conditions?.threshold || 0;

    try {
      await v2.query(`
        INSERT INTO achievement_definitions (
          id, name, description, template_key, competition_type, metric_type,
          threshold_value, threshold_operator, is_active, display_order,
          group_name, achievement_type, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 'competition', $5, $6, '>=', $7, 0, $8, 'static', NOW(), NOW())
      `, [
        newId,
        def.name,
        def.conditions?.description || def.name,
        def.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        metricType,
        thresholdValue,
        def.status === 'active',
        def.group
      ]);

      awardDefinitionMappings.set(def.id, newId);
      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating award definition ${def.name}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} award definitions (${skipped} skipped)`);
}

async function migrateAwards(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🏆 Migrating member awards...');

  // First, load award definition mappings by matching V1 and V2 by name
  if (awardDefinitionMappings.size === 0) {
    console.log('   Loading award definition mappings...');
    const { rows: v1Defs } = await v1.query(`SELECT id, name FROM award_definitions`);
    const { rows: v2Defs } = await v2.query(`SELECT id, name FROM achievement_definitions`);

    const v2DefsByName = new Map(v2Defs.map(d => [d.name, d.id]));
    for (const def of v1Defs) {
      const v2Id = v2DefsByName.get(def.name);
      if (v2Id) {
        awardDefinitionMappings.set(def.id, v2Id);
      }
    }
    console.log(`   Loaded ${awardDefinitionMappings.size} award definition mappings`);
  }

  const { rows: v1Awards } = await v1.query(`
    SELECT id, member_id, award_definition_id, created_at, result_id, comment, status
    FROM awards
    WHERE status = 'active' OR status = 'approved' OR status IS NULL
    ORDER BY created_at
  `);

  console.log(`   Found ${v1Awards.length} awards in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const award of v1Awards) {
    const profileId = memberMappings.get(Number(award.member_id));
    const achievementId = awardDefinitionMappings.get(Number(award.award_definition_id));

    if (!profileId || !achievementId) {
      skipped++;
      continue;
    }

    // Check if already exists
    const { rows: existing } = await v2.query(
      `SELECT id FROM achievement_recipients WHERE profile_id = $1 AND achievement_id = $2`,
      [profileId, achievementId]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();

    try {
      // Get member's meca_id
      const { rows: memberInfo } = await v2.query(
        `SELECT meca_id FROM profiles WHERE id = $1`,
        [profileId]
      );

      await v2.query(`
        INSERT INTO achievement_recipients (
          id, achievement_id, profile_id, meca_id, achieved_value, achieved_at, created_at
        )
        VALUES ($1, $2, $3, $4, 1, $5, $5)
      `, [
        newId,
        achievementId,
        profileId,
        memberInfo[0]?.meca_id,
        award.created_at || new Date()
      ]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating award: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} awards (${skipped} skipped)`);
}

// ============================================
// RESULT FILE UPLOADS MIGRATION
// ============================================

async function migrateResultFileUploads(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n📤 Migrating result file uploads...');

  const { rows: v1Uploads } = await v1.query(`
    SELECT id, event_id, source, username, created_at
    FROM result_file_uploads
    ORDER BY created_at
  `);

  console.log(`   Found ${v1Uploads.length} uploads in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const upload of v1Uploads) {
    const eventId = eventMappings.get(Number(upload.event_id));

    if (!eventId) {
      skipped++;
      continue;
    }

    // Look up user by username
    let uploadedById: string | null = null;
    if (upload.username) {
      const { rows: users } = await v2.query(
        `SELECT id FROM profiles WHERE LOWER(full_name) LIKE $1 OR LOWER(email) LIKE $1`,
        [`%${upload.username.toLowerCase()}%`]
      );
      if (users.length > 0) {
        uploadedById = users[0].id;
      }
    }

    // Default to admin user if not found
    if (!uploadedById) {
      uploadedById = MIGRATION_USER_ID;
    }

    // Check if already exists
    const { rows: existing } = await v2.query(
      `SELECT id FROM result_file_uploads WHERE event_id = $1 AND uploaded_at = $2`,
      [eventId, upload.created_at]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();
    const filename = `v1_upload_${upload.source}_${upload.id}`;

    try {
      await v2.query(`
        INSERT INTO result_file_uploads (
          id, event_id, uploaded_by_id, filename, records_count, error_count, uploaded_at
        )
        VALUES ($1, $2, $3, $4, 0, 0, $5)
      `, [
        newId,
        eventId,
        uploadedById,
        filename,
        upload.created_at || new Date()
      ]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating upload record: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} upload records (${skipped} skipped)`);
}

// ============================================
// FINALS REGISTRATION MIGRATION
// ============================================

async function migrateFinalsRegistrations(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🏆 Migrating finals registrations...');

  // Check if finals_registrations table exists in V2
  const { rows: tableExists } = await v2.query(`
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'finals_registrations')
  `);

  if (!tableExists[0].exists) {
    // Create the table
    console.log('   Creating finals_registrations table...');
    await v2.query(`
      CREATE TABLE IF NOT EXISTS finals_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES profiles(id),
        season_id UUID REFERENCES seasons(id),
        division VARCHAR(50),
        competition_class VARCHAR(100),
        registered_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  const { rows: v1Regs } = await v1.query(`
    SELECT id, member_id, season, division, class, created_at
    FROM finals_registration
    ORDER BY created_at
  `);

  console.log(`   Found ${v1Regs.length} finals registrations in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const reg of v1Regs) {
    const userId = memberMappings.get(Number(reg.member_id));
    const seasonId = seasonMappings.get(Number(reg.season));

    if (!userId || !seasonId) {
      skipped++;
      continue;
    }

    // Check if already exists
    const { rows: existing } = await v2.query(
      `SELECT id FROM finals_registrations WHERE user_id = $1 AND season_id = $2 AND competition_class = $3`,
      [userId, seasonId, reg.class]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();

    try {
      await v2.query(`
        INSERT INTO finals_registrations (
          id, user_id, season_id, division, competition_class, registered_at, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $6)
      `, [
        newId,
        userId,
        seasonId,
        reg.division,
        reg.class,
        reg.created_at || new Date()
      ]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating finals registration: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} finals registrations (${skipped} skipped)`);
}

// ============================================
// FINALS VOTING MIGRATION
// ============================================

async function migrateFinalsVoting(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🗳️  Migrating finals voting...');

  // Check if finals_votes table exists in V2
  const { rows: tableExists } = await v2.query(`
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'finals_votes')
  `);

  if (!tableExists[0].exists) {
    // Create the table
    console.log('   Creating finals_votes table...');
    await v2.query(`
      CREATE TABLE IF NOT EXISTS finals_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        voter_id UUID REFERENCES profiles(id),
        category VARCHAR(50) NOT NULL,
        vote_value TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  const { rows: v1Votes } = await v1.query(`
    SELECT id, member_id, category, value, details, created_at
    FROM finals_voting
    ORDER BY created_at
  `);

  console.log(`   Found ${v1Votes.length} votes in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const vote of v1Votes) {
    const voterId = memberMappings.get(Number(vote.member_id));

    if (!voterId) {
      skipped++;
      continue;
    }

    // Check if already exists
    const { rows: existing } = await v2.query(
      `SELECT id FROM finals_votes WHERE voter_id = $1 AND category = $2 AND vote_value = $3`,
      [voterId, vote.category, vote.value]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();

    // Handle details - ensure it's valid JSON or null
    let details = null;
    if (vote.details) {
      try {
        // If it's already an object, stringify it
        details = typeof vote.details === 'object' ? JSON.stringify(vote.details) : vote.details;
        // Validate it's valid JSON
        JSON.parse(details);
      } catch {
        details = null;
      }
    }

    try {
      await v2.query(`
        INSERT INTO finals_votes (
          id, voter_id, category, vote_value, details, created_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)
      `, [
        newId,
        voterId,
        vote.category,
        vote.value,
        details,
        vote.created_at || new Date()
      ]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating vote: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} votes (${skipped} skipped)`);
}

// ============================================
// STATE FINALS DATES MIGRATION
// ============================================

async function migrateStateFinalsDates(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🗓️  Migrating state finals dates...');

  // Check if state_finals_dates table exists in V2
  const { rows: tableExists } = await v2.query(`
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'state_finals_dates')
  `);

  if (!tableExists[0].exists) {
    // Create the table
    console.log('   Creating state_finals_dates table...');
    await v2.query(`
      CREATE TABLE IF NOT EXISTS state_finals_dates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID REFERENCES events(id),
        state_code VARCHAR(10) NOT NULL,
        season_id UUID REFERENCES seasons(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  const { rows: v1Dates } = await v1.query(`
    SELECT id, eventid, state, season
    FROM statefinalsdates
    ORDER BY season, state
  `);

  console.log(`   Found ${v1Dates.length} state finals dates in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const sfd of v1Dates) {
    const eventId = eventMappings.get(Number(sfd.eventid));
    const seasonId = seasonMappings.get(Number(sfd.season));

    if (!eventId) {
      skipped++;
      continue;
    }

    // Check if already exists
    const { rows: existing } = await v2.query(
      `SELECT id FROM state_finals_dates WHERE event_id = $1 AND state_code = $2`,
      [eventId, sfd.state?.trim()]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();

    try {
      await v2.query(`
        INSERT INTO state_finals_dates (id, event_id, state_code, season_id)
        VALUES ($1, $2, $3, $4)
      `, [newId, eventId, sfd.state?.trim(), seasonId]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating state finals date: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} state finals dates (${skipped} skipped)`);
}

// ============================================
// FINALS 2021 LEGACY DATA MIGRATION
// ============================================

async function migrateFinals2021(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🏆 Migrating finals 2021 legacy data...');

  const { rows: v1Finals } = await v1.query(`
    SELECT id, created_at, memberid, name, "qualifiedClasses", email,
           "registeredEvents", "totalPaid", "paymentType", "paymentCompleted"
    FROM finals2021
    ORDER BY created_at
  `);

  console.log(`   Found ${v1Finals.length} finals 2021 registrations in V1`);

  // Get the 2021 season
  const { rows: season2021 } = await v2.query(
    `SELECT id FROM seasons WHERE year = 2021 LIMIT 1`
  );

  const seasonId = season2021[0]?.id || seasonMappings.get(2021);

  if (!seasonId) {
    console.log('   ⚠️  Could not find 2021 season in V2, skipping finals2021 migration');
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const f21 of v1Finals) {
    // Try to find the member by member ID
    const memberId = memberMappings.get(Number(f21.memberid));

    if (!memberId) {
      skipped++;
      continue;
    }

    // Check if already exists in finals_registrations
    const { rows: existing } = await v2.query(
      `SELECT id FROM finals_registrations WHERE user_id = $1 AND season_id = $2`,
      [memberId, seasonId]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();

    try {
      await v2.query(`
        INSERT INTO finals_registrations (
          id, user_id, season_id, competition_class, registered_at, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $5)
      `, [
        newId,
        memberId,
        seasonId,
        f21.qualifiedClasses,
        f21.created_at || new Date()
      ]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating finals 2021 record: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} finals 2021 records (${skipped} skipped)`);
}

// ============================================
// STATES LOOKUP TABLE MIGRATION
// ============================================

async function migrateStates(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🌎 Migrating states lookup table...');

  // Check if states table exists in V2
  const { rows: tableExists } = await v2.query(`
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'states')
  `);

  if (!tableExists[0].exists) {
    // Create the table
    console.log('   Creating states table...');
    await v2.query(`
      CREATE TABLE IF NOT EXISTS states (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        v1_id INTEGER UNIQUE,
        name VARCHAR(100) NOT NULL,
        abbreviation VARCHAR(10) NOT NULL,
        is_international BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  const { rows: v1States } = await v1.query(`
    SELECT stateid, name, abbreviation, international
    FROM states
    ORDER BY name
  `);

  console.log(`   Found ${v1States.length} states in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const state of v1States) {
    // Check if already exists
    const { rows: existing } = await v2.query(
      `SELECT id FROM states WHERE abbreviation = $1 OR v1_id = $2`,
      [state.abbreviation?.trim(), state.stateid]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();

    try {
      await v2.query(`
        INSERT INTO states (id, v1_id, name, abbreviation, is_international)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        newId,
        state.stateid,
        state.name,
        state.abbreviation?.trim(),
        state.international || false
      ]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating state: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} states (${skipped} skipped)`);
}

// ============================================
// RESULT TEAMS JUNCTION TABLE MIGRATION
// ============================================

async function migrateResultTeams(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n👥 Migrating result teams junction table...');

  // Check if result_teams table exists in V2
  const { rows: tableExists } = await v2.query(`
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'result_teams')
  `);

  if (!tableExists[0].exists) {
    // Create the junction table
    console.log('   Creating result_teams table...');
    await v2.query(`
      CREATE TABLE IF NOT EXISTS result_teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        result_id UUID REFERENCES competition_results(id) ON DELETE CASCADE,
        team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
        member_id UUID REFERENCES profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(result_id, team_id)
      )
    `);
  }

  // Get V1 result_teams with result details for matching
  const { rows: v1ResultTeams } = await v1.query(`
    SELECT rt.result_id, rt.team_id, rt.member_id,
           r.eventid, r.memberno, r.class, r.score
    FROM result_teams rt
    JOIN results r ON rt.result_id = r.rowid
    ORDER BY rt.result_id
  `);

  console.log(`   Found ${v1ResultTeams.length} result_teams in V1`);

  // Build a cache of V2 results for efficient lookup
  console.log('   Building V2 results cache for matching...');
  const { rows: v2Results } = await v2.query(`
    SELECT cr.id, cr.event_id, cr.meca_id, cr.competition_class, cr.score
    FROM competition_results cr
  `);

  // Create a lookup map: eventId:mecaId:class:score -> resultId
  const resultLookup = new Map<string, string>();
  for (const r of v2Results) {
    const key = `${r.event_id}:${r.meca_id}:${r.competition_class}:${parseFloat(r.score).toFixed(2)}`;
    resultLookup.set(key, r.id);
  }
  console.log(`   Built lookup map with ${resultLookup.size} entries`);

  let migrated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const rt of v1ResultTeams) {
    const v2EventId = eventMappings.get(Number(rt.eventid));
    const v2TeamId = teamMappings.get(Number(rt.team_id));
    const v2MemberId = memberMappings.get(Number(rt.member_id));

    if (!v2EventId || !v2TeamId) {
      skipped++;
      continue;
    }

    // Build the lookup key
    const memberMecaId = rt.memberno?.toString();
    const lookupKey = `${v2EventId}:${memberMecaId}:${rt.class}:${parseFloat(rt.score).toFixed(2)}`;
    const v2ResultId = resultLookup.get(lookupKey);

    if (!v2ResultId) {
      // Try without score precision
      const altKey = `${v2EventId}:${memberMecaId}:${rt.class}:${parseFloat(rt.score).toFixed(0)}`;
      const v2ResultIdAlt = resultLookup.get(altKey);
      if (!v2ResultIdAlt) {
        notFound++;
        continue;
      }
    }

    const finalResultId = v2ResultId || resultLookup.get(`${v2EventId}:${memberMecaId}:${rt.class}:${parseFloat(rt.score).toFixed(0)}`);

    if (!finalResultId) {
      notFound++;
      continue;
    }

    // Check if already exists
    const { rows: existing } = await v2.query(
      `SELECT id FROM result_teams WHERE result_id = $1 AND team_id = $2`,
      [finalResultId, v2TeamId]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();

    try {
      await v2.query(`
        INSERT INTO result_teams (id, result_id, team_id, member_id)
        VALUES ($1, $2, $3, $4)
      `, [newId, finalResultId, v2TeamId, v2MemberId]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating result_team: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} result_teams (${skipped} skipped, ${notFound} results not found)`);
}

// ============================================
// MEMBERSHIPS MIGRATION
// ============================================

// V1 member type to V2 membership_type_config_id mapping
const MEMBERSHIP_TYPE_CONFIGS: Record<string, string> = {
  'Competitor': '854d992c-4f6f-452b-8f81-649eb10425f0',  // Competitor Membership $40
  'Retail': '9ad7c4ee-f3d8-45f5-94c2-5259d032314b',       // Retailer Membership $100
  'Manufacturer': '5313e581-d978-4f54-ba4a-6dec8923a023', // Manufacturer Bronze $1000
  'Team': '65f8b5f4-14e8-4e21-b265-256fdc8f7b7e',         // Team Membership $60
};

async function migrateMemberships(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n💳 Migrating memberships...');

  // Get V1 members with membership data
  const { rows: v1Members } = await v1.query(`
    SELECT memberid, name, email, type, expdate, address, city, state_code, zip, phone
    FROM members
    WHERE type IS NOT NULL AND expdate IS NOT NULL
    ORDER BY memberid
  `);

  console.log(`   Found ${v1Members.length} members with membership data in V1`);

  let migrated = 0;
  let skipped = 0;

  for (const m of v1Members) {
    const userId = memberMappings.get(Number(m.memberid));
    const configId = MEMBERSHIP_TYPE_CONFIGS[m.type];

    if (!userId || !configId) {
      skipped++;
      continue;
    }

    // Check if membership already exists for this user
    const { rows: existing } = await v2.query(
      `SELECT id FROM memberships WHERE user_id = $1`,
      [userId]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();
    const expDate = new Date(m.expdate);
    const isActive = expDate > new Date();
    const status = isActive ? 'active' : 'expired';

    // Calculate start date (1 year before expiry for competitors, varies for others)
    const startDate = new Date(expDate);
    startDate.setFullYear(startDate.getFullYear() - 1);

    // Parse name for billing
    const nameParts = (m.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      await v2.query(`
        INSERT INTO memberships (
          id, user_id, membership_type_config_id, status, account_type, has_own_login,
          purchase_date, start_date, end_date, amount_paid, payment_status,
          billing_first_name, billing_last_name, billing_phone,
          billing_address, billing_city, billing_state, billing_postal_code, billing_country,
          meca_id, competitor_name, email, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, 'independent', true, $5, $5, $6, 0, 'paid',
                $7, $8, $9, $10, $11, $12, $13, 'US', $14, $15, $16, NOW(), NOW())
      `, [
        newId,
        userId,
        configId,
        status,
        startDate,
        expDate,
        firstName,
        lastName,
        m.phone,
        m.address,
        m.city,
        m.state_code,
        m.zip,
        m.memberid,
        m.name,
        m.email
      ]);

      migrated++;

      if (migrated % 500 === 0) {
        console.log(`   ... migrated ${migrated} memberships`);
      }
    } catch (err: any) {
      console.log(`   ⚠️  Error creating membership for ${m.memberid}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} memberships (${skipped} skipped)`);
}

// ============================================
// EVENT DIRECTORS MIGRATION
// ============================================

async function migrateEventDirectors(v1: Client, v2: Client, dryRun: boolean): Promise<void> {
  console.log('\n🎬 Migrating event directors...');

  // Get distinct event directors from V1 events
  const { rows: v1Directors } = await v1.query(`
    SELECT DISTINCT
      TRIM(REGEXP_REPLACE(eventdirector, '\\s+[0-9-]+$', '')) as director_name,
      COUNT(*) as event_count
    FROM events
    WHERE eventdirector IS NOT NULL
      AND eventdirector != ''
      AND LENGTH(eventdirector) > 2
    GROUP BY TRIM(REGEXP_REPLACE(eventdirector, '\\s+[0-9-]+$', ''))
    HAVING COUNT(*) >= 3
    ORDER BY COUNT(*) DESC
  `);

  console.log(`   Found ${v1Directors.length} distinct event directors in V1 (with 3+ events)`);

  let migrated = 0;
  let skipped = 0;
  let linked = 0;

  for (const dir of v1Directors) {
    const dirName = dir.director_name?.trim();
    if (!dirName || dirName.length < 3) {
      skipped++;
      continue;
    }

    // Try to find matching profile by name
    const { rows: profiles } = await v2.query(
      `SELECT id, full_name, city, state FROM profiles
       WHERE LOWER(full_name) = $1 OR full_name ILIKE $2`,
      [dirName.toLowerCase(), `%${dirName}%`]
    );

    let userId: string | null = null;
    let location = { city: 'Unknown', state: 'Unknown', country: 'US' };

    if (profiles.length === 1) {
      userId = profiles[0].id;
      location.city = profiles[0].city || 'Unknown';
      location.state = profiles[0].state || 'Unknown';
      linked++;
    } else if (profiles.length > 1) {
      // Multiple matches - try exact match
      const exactMatch = profiles.find(p => p.full_name?.toLowerCase() === dirName.toLowerCase());
      if (exactMatch) {
        userId = exactMatch.id;
        location.city = exactMatch.city || 'Unknown';
        location.state = exactMatch.state || 'Unknown';
        linked++;
      } else {
        skipped++;
        continue;
      }
    } else {
      // No profile match - skip
      skipped++;
      continue;
    }

    // Check if event director already exists
    const { rows: existing } = await v2.query(
      `SELECT id FROM event_directors WHERE user_id = $1`,
      [userId]
    );

    if (existing.length > 0) {
      continue;
    }

    if (dryRun) {
      migrated++;
      continue;
    }

    const newId = generateUUID();

    try {
      await v2.query(`
        INSERT INTO event_directors (
          id, user_id, location_country, location_state, location_city,
          is_active, creation_method, total_ratings, total_events_directed,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, true, 'admin_direct', 0, $6, NOW(), NOW())
      `, [
        newId,
        userId,
        location.country,
        location.state,
        location.city,
        dir.event_count
      ]);

      migrated++;
    } catch (err: any) {
      console.log(`   ⚠️  Error creating event director ${dirName}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`   ✅ Migrated ${migrated} event directors (${linked} linked to profiles, ${skipped} skipped)`);
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const tableArg = args.find(a => a.startsWith('--table='));
  const table = tableArg ? tableArg.split('=')[1] : 'all';

  console.log('🚀 MECA V1 → V2 Data Migration');
  console.log('================================');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN' : '⚡ LIVE'}`);
  console.log(`Table: ${table}`);
  if (limit) console.log(`Limit: ${limit} records`);
  console.log('');

  // Connect to databases
  console.log('📡 Connecting to databases...');

  const v1 = new Client(V1_CONFIG);
  const v2 = new Client(V2_CONFIG);

  try {
    await v1.connect();
    console.log('   ✅ Connected to V1 (Lightsail)');

    await v2.connect();
    console.log('   ✅ Connected to V2 (Supabase)');

    // Create mapping tables
    if (!dryRun) {
      await createMappingTables(v2);
    }

    // Load existing mappings from V2
    const { rows: existingMappings } = await v2.query(`
      SELECT entity_type, v1_id, v2_id FROM v1_migration_mappings
    `).catch(() => ({ rows: [] }));

    for (const m of existingMappings) {
      const v1Id = Number(m.v1_id); // Ensure consistent number type
      if (m.entity_type === 'season') seasonMappings.set(v1Id, m.v2_id);
      if (m.entity_type === 'class') classMappings.set(v1Id, m.v2_id);
      if (m.entity_type === 'event') eventMappings.set(v1Id, m.v2_id);
      if (m.entity_type === 'member') memberMappings.set(v1Id, m.v2_id);
      if (m.entity_type === 'team') teamMappings.set(v1Id, m.v2_id);
    }
    console.log(`   📋 Loaded ${existingMappings.length} existing mappings`);

    // Also load ALL seasons from V2 by year (since V2 seasons may have been created directly)
    const { rows: v2Seasons } = await v2.query(`SELECT id, year FROM seasons`);
    for (const s of v2Seasons) {
      if (!seasonMappings.has(s.year)) {
        seasonMappings.set(s.year, s.id);
      }
    }
    console.log(`   📅 Season mappings available for ${seasonMappings.size} years`);

    // Run migrations in order
    if (table === 'all' || table === 'seasons') {
      await migrateSeasons(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'classes') {
      await migrateClasses(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'events') {
      await migrateEvents(v1, v2, dryRun, limit);
    }

    if (table === 'all' || table === 'unmapped_events') {
      await migrateUnmappedEvents(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'results') {
      await migrateResults(v1, v2, dryRun, limit);
    }

    if (table === 'all' || table === 'members') {
      await migrateMembers(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'teams') {
      await migrateTeams(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'team_members') {
      await migrateTeamMembers(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'retailers') {
      await migrateRetailers(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'manufacturers') {
      await migrateManufacturers(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'member_images') {
      await migrateMemberImages(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'event_registrations') {
      await migrateEventRegistrations(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'judges') {
      await migrateJudges(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'award_definitions') {
      await migrateAwardDefinitions(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'awards') {
      await migrateAwards(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'result_file_uploads') {
      await migrateResultFileUploads(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'finals_registrations') {
      await migrateFinalsRegistrations(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'finals_voting') {
      await migrateFinalsVoting(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'state_finals_dates') {
      await migrateStateFinalsDates(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'finals2021') {
      await migrateFinals2021(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'states') {
      await migrateStates(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'result_teams') {
      await migrateResultTeams(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'memberships') {
      await migrateMemberships(v1, v2, dryRun);
    }

    if (table === 'all' || table === 'event_directors') {
      await migrateEventDirectors(v1, v2, dryRun);
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
