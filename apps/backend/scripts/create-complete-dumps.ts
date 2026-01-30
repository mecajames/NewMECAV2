/**
 * Create Complete Database Dumps by Date Range
 *
 * Creates 3 dumps with SCHEMA + ALL DATA filtered by date:
 * - dump_development.sql: 2025-2026
 * - dump_production.sql: 2020-2026
 * - dump_legacy.sql: pre-2020
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 54622,
  database: 'postgres',
  user: 'postgres',
  password: 'postgres',
};

const BACKUP_DIR = path.join(__dirname, '../../..', 'backups');

interface DumpConfig {
  name: string;
  filename: string;
  startYear: number;
  endYear: number;
}

const DUMPS: DumpConfig[] = [
  { name: 'Development', filename: 'dump_development.sql', startYear: 2025, endYear: 2026 },
  { name: 'Production', filename: 'dump_production.sql', startYear: 2020, endYear: 2026 },
  { name: 'Legacy', filename: 'dump_legacy.sql', startYear: 1900, endYear: 2019 },
];

// Tables and their date filter columns
const TABLE_DATE_FILTERS: Record<string, string> = {
  // Season-based tables
  'seasons': 'year',
  'events': 'season_id:seasons.year',
  'competition_classes': 'season_id:seasons.year',
  'competition_results': 'season_id:seasons.year',
  'result_teams': 'result_id:competition_results.season_id:seasons.year',
  'world_finals_qualifications': 'season_id:seasons.year',
  'finals_registrations': 'season_id:seasons.year',
  'finals_votes': 'season_id:seasons.year',

  // Created_at based tables
  'profiles': 'created_at',
  'memberships': 'created_at',
  'teams': 'created_at',
  'team_members': 'created_at',
  'retailer_listings': 'created_at',
  'manufacturer_listings': 'created_at',
  'event_registrations': 'created_at',
  'event_registration_classes': 'created_at',
  'event_hosting_requests': 'created_at',
  'event_hosting_request_messages': 'created_at',
  'judge_applications': 'created_at',
  'judges': 'created_at',
  'judge_level_history': 'created_at',
  'judge_season_qualifications': 'created_at',
  'judge_application_references': 'created_at',
  'event_judge_assignments': 'created_at',
  'event_director_applications': 'created_at',
  'event_director_application_references': 'created_at',
  'event_directors': 'created_at',
  'event_director_assignments': 'created_at',
  'event_director_season_qualifications': 'created_at',
  'orders': 'created_at',
  'order_items': 'created_at',
  'payments': 'created_at',
  'invoices': 'created_at',
  'invoice_items': 'created_at',
  'shop_orders': 'created_at',
  'shop_order_items': 'created_at',
  'tickets': 'created_at',
  'ticket_comments': 'created_at',
  'ticket_attachments': 'created_at',
  'notifications': 'created_at',
  'messages': 'created_at',
  'ratings': 'created_at',
  'results_audit_log': 'created_at',
  'results_entry_sessions': 'created_at',
  'result_file_uploads': 'created_at',
  'moderated_images': 'created_at',
  'moderation_log': 'created_at',
  'member_gallery_images': 'created_at',
  'media_files': 'created_at',
  'training_records': 'created_at',
  'contact_submissions': 'created_at',
  'communication_log': 'created_at',
  'meca_id_history': 'created_at',
  'subscriptions': 'created_at',
  'quickbooks_connections': 'created_at',
  'email_verification_tokens': 'created_at',
  'ticket_guest_tokens': 'created_at',
  'achievement_recipients': 'created_at',
  'banner_engagements': 'created_at',
  'championship_awards': 'created_at',

  // Static/config tables (include in all dumps)
  'achievement_definitions': 'ALL',
  'achievement_templates': 'ALL',
  'advertisers': 'ALL',
  'banners': 'ALL',
  'championship_archives': 'ALL',
  'class_name_mappings': 'ALL',
  'competition_formats': 'ALL',
  'membership_type_configs': 'ALL',
  'membership_types': 'ALL',
  'meca_id_counter': 'ALL',
  'permissions': 'ALL',
  'points_configuration': 'ALL',
  'role_permissions': 'ALL',
  'rulebooks': 'ALL',
  'shop_products': 'ALL',
  'site_settings': 'ALL',
  'state_finals_dates': 'ALL',
  'states': 'ALL',
  'ticket_departments': 'ALL',
  'ticket_routing_rules': 'ALL',
  'ticket_settings': 'ALL',
  'ticket_staff': 'ALL',
  'ticket_staff_departments': 'ALL',
  'user_permission_overrides': 'ALL',
  'v1_migration_mappings': 'ALL',
  'mikro_orm_migrations': 'ALL',
};

function escapeValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val.toString();
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function getTableColumns(client: Client, tableName: string): Promise<string[]> {
  const { rows } = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  return rows.map(r => r.column_name);
}

async function getAllTables(client: Client): Promise<string[]> {
  const { rows } = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  return rows.map(r => r.tablename);
}

async function getSeasonIdsForYearRange(client: Client, startYear: number, endYear: number): Promise<string[]> {
  const { rows } = await client.query(`
    SELECT id FROM seasons WHERE year >= $1 AND year <= $2
  `, [startYear, endYear]);
  return rows.map(r => r.id);
}

async function dumpTableData(
  client: Client,
  tableName: string,
  startYear: number,
  endYear: number,
  seasonIds: string[]
): Promise<string[]> {
  const filterType = TABLE_DATE_FILTERS[tableName];
  let query: string;
  let params: any[] = [];

  if (!filterType) {
    // Unknown table - include all data
    query = `SELECT * FROM "${tableName}"`;
  } else if (filterType === 'ALL') {
    // Static table - include all
    query = `SELECT * FROM "${tableName}"`;
  } else if (filterType === 'year') {
    // Direct year filter
    query = `SELECT * FROM "${tableName}" WHERE year >= $1 AND year <= $2`;
    params = [startYear, endYear];
  } else if (filterType === 'created_at') {
    // Filter by created_at
    const startDate = `${startYear}-01-01`;
    const endDate = `${endYear}-12-31 23:59:59`;
    query = `SELECT * FROM "${tableName}" WHERE created_at >= $1 AND created_at <= $2`;
    params = [startDate, endDate];
  } else if (filterType.includes('season_id:seasons.year')) {
    // Filter by season_id
    if (seasonIds.length === 0) {
      return [];
    }
    query = `SELECT * FROM "${tableName}" WHERE season_id = ANY($1)`;
    params = [seasonIds];
  } else if (filterType.includes('result_id:')) {
    // Filter through result_id -> competition_results -> season
    if (seasonIds.length === 0) {
      return [];
    }
    query = `
      SELECT rt.* FROM "${tableName}" rt
      JOIN competition_results cr ON rt.result_id = cr.id
      WHERE cr.season_id = ANY($1)
    `;
    params = [seasonIds];
  } else {
    // Default - include all
    query = `SELECT * FROM "${tableName}"`;
  }

  try {
    const { rows } = await client.query(query, params);
    if (rows.length === 0) return [];

    const columns = Object.keys(rows[0]);
    const inserts: string[] = [];

    for (const row of rows) {
      const values = columns.map(col => escapeValue(row[col])).join(', ');
      inserts.push(`INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values});`);
    }

    return inserts;
  } catch (err: any) {
    console.log(`   Warning: Error querying ${tableName}: ${err.message}`);
    return [];
  }
}

async function createDump(client: Client, config: DumpConfig): Promise<void> {
  console.log(`\n📦 Creating ${config.name} dump (${config.startYear}-${config.endYear})...`);

  const filePath = path.join(BACKUP_DIR, config.filename);
  const writeStream = fs.createWriteStream(filePath);

  // Header
  writeStream.write(`-- MECA V2 Complete Database Dump: ${config.name}\n`);
  writeStream.write(`-- Date Range: ${config.startYear}-${config.endYear}\n`);
  writeStream.write(`-- Generated: ${new Date().toISOString()}\n`);
  writeStream.write(`-- Contains: Schema + All Data\n\n`);
  writeStream.write(`SET session_replication_role = 'replica';\n`);
  writeStream.write(`SET client_encoding = 'UTF8';\n\n`);

  // Get season IDs for this range
  const seasonIds = await getSeasonIdsForYearRange(client, config.startYear, config.endYear);
  console.log(`   Found ${seasonIds.length} seasons in range`);

  // Get all tables
  const tables = await getAllTables(client);
  console.log(`   Processing ${tables.length} tables...`);

  let totalRows = 0;

  for (const table of tables) {
    const inserts = await dumpTableData(client, table, config.startYear, config.endYear, seasonIds);

    if (inserts.length > 0) {
      writeStream.write(`\n-- Table: ${table} (${inserts.length} rows)\n`);
      for (const insert of inserts) {
        writeStream.write(insert + '\n');
      }
      totalRows += inserts.length;
    }
  }

  // Footer
  writeStream.write(`\nSET session_replication_role = 'origin';\n`);
  writeStream.write(`-- End of dump (${totalRows} total rows)\n`);

  writeStream.end();
  await new Promise<void>(resolve => writeStream.on('finish', resolve));

  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
  console.log(`   ✅ Created ${config.filename} (${sizeMB} MB, ${totalRows} rows)`);
}

async function main() {
  console.log('🗄️  Creating Complete Database Dumps');
  console.log('=====================================\n');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const client = new Client(DB_CONFIG);

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Show current counts
    const { rows: [{ count: totalResults }] } = await client.query('SELECT COUNT(*) as count FROM competition_results');
    const { rows: [{ count: totalProfiles }] } = await client.query('SELECT COUNT(*) as count FROM profiles');
    const { rows: [{ count: totalMemberships }] } = await client.query('SELECT COUNT(*) as count FROM memberships');
    console.log(`   Total: ${totalResults} results, ${totalProfiles} profiles, ${totalMemberships} memberships`);

    for (const config of DUMPS) {
      await createDump(client, config);
    }

    console.log('\n✅ All dumps created!');
    console.log(`📁 Location: ${BACKUP_DIR}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
