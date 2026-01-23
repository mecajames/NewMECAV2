/**
 * Create Date-Range Database Dumps
 *
 * Creates three separate dumps matching the original structure:
 * - dump_development.sql: 2025-2026 (recent development data)
 * - dump_production.sql: 2020-2026 (6 years of production data)
 * - dump_legacy.sql: 2003-2019 (16 years of historical data)
 *
 * Usage:
 *   npx ts-node scripts/create-date-range-dumps.ts
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const V2_CONFIG = {
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
  { name: 'Legacy', filename: 'dump_legacy.sql', startYear: 2003, endYear: 2019 },
];

async function getSeasonIds(client: Client, startYear: number, endYear: number): Promise<string[]> {
  const { rows } = await client.query(`
    SELECT id FROM seasons WHERE year >= $1 AND year <= $2 ORDER BY year
  `, [startYear, endYear]);
  return rows.map(r => r.id);
}

async function createDump(client: Client, config: DumpConfig): Promise<void> {
  console.log(`\n📦 Creating ${config.name} dump (${config.startYear}-${config.endYear})...`);

  const seasonIds = await getSeasonIds(client, config.startYear, config.endYear);
  if (seasonIds.length === 0) {
    console.log(`   ⚠️ No seasons found for ${config.startYear}-${config.endYear}`);
    return;
  }

  console.log(`   Found ${seasonIds.length} seasons`);

  const filePath = path.join(BACKUP_DIR, config.filename);
  const writeStream = fs.createWriteStream(filePath);

  // Write header
  writeStream.write(`-- MECA V2 Database Dump: ${config.name}\n`);
  writeStream.write(`-- Date Range: ${config.startYear}-${config.endYear}\n`);
  writeStream.write(`-- Generated: ${new Date().toISOString()}\n`);
  writeStream.write(`-- Format: Corrected (SQL, SSI, MK properly mapped)\n\n`);
  writeStream.write(`SET session_replication_role = 'replica';\n\n`);

  // 1. Dump seasons for this range
  console.log('   Exporting seasons...');
  const { rows: seasons } = await client.query(`
    SELECT * FROM seasons WHERE year >= $1 AND year <= $2 ORDER BY year
  `, [config.startYear, config.endYear]);

  if (seasons.length > 0) {
    writeStream.write(`-- Seasons (${seasons.length} rows)\n`);
    writeStream.write(`DELETE FROM seasons WHERE year >= ${config.startYear} AND year <= ${config.endYear};\n`);
    for (const row of seasons) {
      const values = formatInsertValues(row);
      writeStream.write(`INSERT INTO seasons (${Object.keys(row).join(', ')}) VALUES (${values}) ON CONFLICT (id) DO NOTHING;\n`);
    }
    writeStream.write('\n');
  }

  // 2. Dump events for these seasons
  console.log('   Exporting events...');
  const seasonIdList = seasonIds.map(id => `'${id}'`).join(',');
  const { rows: events } = await client.query(`
    SELECT * FROM events WHERE season_id IN (${seasonIdList}) ORDER BY event_date
  `);

  if (events.length > 0) {
    writeStream.write(`-- Events (${events.length} rows)\n`);
    for (const row of events) {
      const values = formatInsertValues(row);
      writeStream.write(`INSERT INTO events (${Object.keys(row).join(', ')}) VALUES (${values}) ON CONFLICT (id) DO NOTHING;\n`);
    }
    writeStream.write('\n');
  }
  console.log(`   Events: ${events.length}`);

  // 3. Dump competition_classes for these seasons
  console.log('   Exporting competition classes...');
  const { rows: classes } = await client.query(`
    SELECT * FROM competition_classes WHERE season_id IN (${seasonIdList}) ORDER BY name
  `);

  if (classes.length > 0) {
    writeStream.write(`-- Competition Classes (${classes.length} rows)\n`);
    for (const row of classes) {
      const values = formatInsertValues(row);
      writeStream.write(`INSERT INTO competition_classes (${Object.keys(row).join(', ')}) VALUES (${values}) ON CONFLICT (id) DO NOTHING;\n`);
    }
    writeStream.write('\n');
  }
  console.log(`   Classes: ${classes.length}`);

  // 4. Dump competition_results for these seasons
  console.log('   Exporting competition results...');
  const { rows: results } = await client.query(`
    SELECT * FROM competition_results WHERE season_id IN (${seasonIdList}) ORDER BY created_at
  `);

  if (results.length > 0) {
    writeStream.write(`-- Competition Results (${results.length} rows)\n`);
    for (const row of results) {
      const values = formatInsertValues(row);
      writeStream.write(`INSERT INTO competition_results (${Object.keys(row).join(', ')}) VALUES (${values}) ON CONFLICT (id) DO NOTHING;\n`);
    }
    writeStream.write('\n');
  }
  console.log(`   Results: ${results.length}`);

  // 5. Dump result_teams for results in these seasons
  console.log('   Exporting result teams...');
  const { rows: resultTeams } = await client.query(`
    SELECT rt.* FROM result_teams rt
    JOIN competition_results cr ON rt.result_id = cr.id
    WHERE cr.season_id IN (${seasonIdList})
  `);

  if (resultTeams.length > 0) {
    writeStream.write(`-- Result Teams (${resultTeams.length} rows)\n`);
    for (const row of resultTeams) {
      const values = formatInsertValues(row);
      writeStream.write(`INSERT INTO result_teams (${Object.keys(row).join(', ')}) VALUES (${values}) ON CONFLICT (id) DO NOTHING;\n`);
    }
    writeStream.write('\n');
  }
  console.log(`   Result Teams: ${resultTeams.length}`);

  // Footer
  writeStream.write(`SET session_replication_role = 'origin';\n`);
  writeStream.write(`-- End of dump\n`);

  writeStream.end();

  // Wait for write to complete
  await new Promise<void>((resolve) => writeStream.on('finish', resolve));

  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
  console.log(`   ✅ Created ${config.filename} (${sizeMB} MB)`);
}

function formatInsertValues(row: Record<string, any>): string {
  return Object.values(row).map(val => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    if (typeof val === 'number') return val.toString();
    if (val instanceof Date) return `'${val.toISOString()}'`;
    if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
  }).join(', ');
}

async function main() {
  console.log('🗄️  Creating Date-Range Database Dumps');
  console.log('======================================\n');

  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const client = new Client(V2_CONFIG);

  try {
    await client.connect();
    console.log('✅ Connected to local database');

    // Get total counts first
    const { rows: [{ count: totalResults }] } = await client.query('SELECT COUNT(*) as count FROM competition_results');
    const { rows: [{ count: totalEvents }] } = await client.query('SELECT COUNT(*) as count FROM events');
    console.log(`   Total results: ${totalResults}, Total events: ${totalEvents}`);

    // Create each dump
    for (const config of DUMPS) {
      await createDump(client, config);
    }

    console.log('\n✅ All dumps created successfully!');
    console.log(`\n📁 Files saved to: ${BACKUP_DIR}`);

    // Show file sizes
    console.log('\n📊 Summary:');
    for (const config of DUMPS) {
      const filePath = path.join(BACKUP_DIR, config.filename);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
        console.log(`   ${config.filename}: ${sizeMB} MB (${config.startYear}-${config.endYear})`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
