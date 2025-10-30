/**
 * Database Analyzer Script
 * Analyzes both Supabase production database and local Docker database
 */

const { createClient } = require('@supabase/supabase-js');
const pg = require('pg');
const fs = require('fs');
const path = require('path');

const { Pool } = pg;

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const LOCAL_DB_URL = process.env.LOCAL_DB_URL;

const OUTPUT_DIR = '/app/output';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Initialize Supabase client
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Initialize local database client
const localPool = LOCAL_DB_URL
  ? new Pool({ connectionString: LOCAL_DB_URL })
  : null;

async function analyzeSupabaseDatabase() {
  if (!supabase) {
    console.log('⚠️  Supabase connection not configured');
    return null;
  }

  console.log('🔍 Analyzing Supabase database...');
  
  const analysis = {
    timestamp: new Date().toISOString(),
    database: 'supabase',
    tables: {}
  };

  try {
    // Analyze each table
    const tables = ['profiles', 'events', 'event_registrations', 'competition_results', 'memberships', 'rulebooks'];
    
    for (const table of tables) {
      console.log(`  Analyzing table: ${table}`);
      
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: false });
        
        if (error) {
          analysis.tables[table] = {
            error: error.message,
            accessible: false
          };
        } else {
          analysis.tables[table] = {
            accessible: true,
            row_count: count || 0,
            sample_data: data?.slice(0, 3) || [],
            columns: data && data.length > 0 ? Object.keys(data[0]) : []
          };
        }
      } catch (err) {
        analysis.tables[table] = {
          error: err.message,
          accessible: false
        };
      }
    }

    // Save analysis
    const outputPath = path.join(OUTPUT_DIR, 'supabase-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`✅ Supabase analysis saved to: ${outputPath}`);
    
    return analysis;
  } catch (error) {
    console.error('❌ Error analyzing Supabase:', error.message);
    return { error: error.message };
  }
}

async function analyzeLocalDatabase() {
  if (!localPool) {
    console.log('⚠️  Local database connection not configured');
    return null;
  }

  console.log('🔍 Analyzing local database...');
  
  const analysis = {
    timestamp: new Date().toISOString(),
    database: 'local',
    schemas: {},
    tables: {}
  };

  try {
    const client = await localPool.connect();
    
    // Get all schemas
    const schemaResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schema_name;
    `);
    
    analysis.schemas = schemaResult.rows.map(r => r.schema_name);
    console.log(`  Found schemas: ${analysis.schemas.join(', ')}`);

    // Get all tables in public schema
    const tablesResult = await client.query(`
      SELECT 
        table_name,
        table_schema
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      console.log(`  Analyzing table: ${tableName}`);

      try {
        // Get column information
        const columnsResult = await client.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position;
        `, [tableName]);

        // Get row count
        const countResult = await client.query(`SELECT COUNT(*) FROM public."${tableName}";`);
        
        // Get sample data
        const sampleResult = await client.query(`SELECT * FROM public."${tableName}" LIMIT 3;`);

        // Get indexes
        const indexResult = await client.query(`
          SELECT 
            indexname,
            indexdef
          FROM pg_indexes 
          WHERE schemaname = 'public' AND tablename = $1;
        `, [tableName]);

        analysis.tables[tableName] = {
          row_count: parseInt(countResult.rows[0].count),
          columns: columnsResult.rows,
          indexes: indexResult.rows,
          sample_data: sampleResult.rows
        };
      } catch (err) {
        analysis.tables[tableName] = {
          error: err.message
        };
      }
    }

    // Get database statistics
    const statsResult = await client.query(`
      SELECT 
        pg_database.datname as database_name,
        pg_size_pretty(pg_database_size(pg_database.datname)) as size
      FROM pg_database
      WHERE datname = current_database();
    `);
    
    analysis.database_stats = statsResult.rows[0];

    client.release();

    // Save analysis
    const outputPath = path.join(OUTPUT_DIR, 'local-db-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));
    console.log(`✅ Local database analysis saved to: ${outputPath}`);
    
    return analysis;
  } catch (error) {
    console.error('❌ Error analyzing local database:', error.message);
    return { error: error.message };
  } finally {
    if (localPool) {
      await localPool.end();
    }
  }
}

async function generateComparisonReport(supabaseAnalysis, localAnalysis) {
  console.log('📊 Generating comparison report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    comparison: {
      supabase_tables: supabaseAnalysis ? Object.keys(supabaseAnalysis.tables) : [],
      local_tables: localAnalysis ? Object.keys(localAnalysis.tables) : [],
      missing_in_local: [],
      missing_in_supabase: [],
      table_comparisons: {}
    }
  };

  if (supabaseAnalysis && localAnalysis) {
    const supabaseTables = new Set(Object.keys(supabaseAnalysis.tables));
    const localTables = new Set(Object.keys(localAnalysis.tables));

    // Find missing tables
    report.comparison.missing_in_local = [...supabaseTables].filter(t => !localTables.has(t));
    report.comparison.missing_in_supabase = [...localTables].filter(t => !supabaseTables.has(t));

    // Compare common tables
    for (const table of [...supabaseTables].filter(t => localTables.has(t))) {
      const supabaseTable = supabaseAnalysis.tables[table];
      const localTable = localAnalysis.tables[table];

      report.comparison.table_comparisons[table] = {
        supabase_rows: supabaseTable.row_count,
        local_rows: localTable.row_count,
        supabase_columns: supabaseTable.columns?.length || 0,
        local_columns: localTable.columns?.length || 0,
        row_difference: (supabaseTable.row_count || 0) - (localTable.row_count || 0)
      };
    }
  }

  // Save report
  const outputPath = path.join(OUTPUT_DIR, 'comparison-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  
  // Generate human-readable report
  const readableReport = generateReadableReport(report, supabaseAnalysis, localAnalysis);
  const readablePath = path.join(OUTPUT_DIR, 'analysis-report.md');
  fs.writeFileSync(readablePath, readableReport);
  
  console.log(`✅ Comparison report saved to: ${outputPath}`);
  console.log(`✅ Readable report saved to: ${readablePath}`);
}

function generateReadableReport(comparison, supabaseAnalysis, localAnalysis) {
  let report = '# NewMECA Database Analysis Report\n\n';
  report += `Generated: ${new Date().toISOString()}\n\n`;
  
  report += '## Summary\n\n';
  
  if (supabaseAnalysis) {
    report += '### Supabase Database\n\n';
    report += `- Total Tables: ${Object.keys(supabaseAnalysis.tables).length}\n`;
    const totalRows = Object.values(supabaseAnalysis.tables).reduce((sum, t) => sum + (t.row_count || 0), 0);
    report += `- Total Rows: ${totalRows}\n\n`;
    
    report += '#### Table Details\n\n';
    for (const [table, info] of Object.entries(supabaseAnalysis.tables)) {
      report += `**${table}**\n`;
      report += `- Rows: ${info.row_count || 0}\n`;
      report += `- Columns: ${info.columns?.length || 0}\n`;
      report += `- Accessible: ${info.accessible ? '✅' : '❌'}\n`;
      if (info.error) {
        report += `- Error: ${info.error}\n`;
      }
      report += '\n';
    }
  }
  
  if (localAnalysis) {
    report += '### Local Database\n\n';
    report += `- Total Tables: ${Object.keys(localAnalysis.tables).length}\n`;
    report += `- Schemas: ${localAnalysis.schemas?.join(', ')}\n`;
    if (localAnalysis.database_stats) {
      report += `- Database Size: ${localAnalysis.database_stats.size}\n`;
    }
    report += '\n';
    
    report += '#### Table Details\n\n';
    for (const [table, info] of Object.entries(localAnalysis.tables)) {
      report += `**${table}**\n`;
      report += `- Rows: ${info.row_count || 0}\n`;
      report += `- Columns: ${info.columns?.length || 0}\n`;
      report += `- Indexes: ${info.indexes?.length || 0}\n`;
      if (info.error) {
        report += `- Error: ${info.error}\n`;
      }
      report += '\n';
    }
  }
  
  if (comparison.comparison) {
    report += '## Comparison\n\n';
    
    if (comparison.comparison.missing_in_local.length > 0) {
      report += '### Tables in Supabase but not in Local\n\n';
      comparison.comparison.missing_in_local.forEach(t => {
        report += `- ${t}\n`;
      });
      report += '\n';
    }
    
    if (comparison.comparison.missing_in_supabase.length > 0) {
      report += '### Tables in Local but not in Supabase\n\n';
      comparison.comparison.missing_in_supabase.forEach(t => {
        report += `- ${t}\n`;
      });
      report += '\n';
    }
    
    report += '### Table Row Count Comparison\n\n';
    report += '| Table | Supabase | Local | Difference |\n';
    report += '|-------|----------|-------|------------|\n';
    for (const [table, info] of Object.entries(comparison.comparison.table_comparisons)) {
      report += `| ${table} | ${info.supabase_rows} | ${info.local_rows} | ${info.row_difference} |\n`;
    }
  }
  
  return report;
}

// Main execution
async function main() {
  console.log('🚀 Starting database analysis...\n');
  
  const supabaseAnalysis = await analyzeSupabaseDatabase();
  console.log('');
  
  const localAnalysis = await analyzeLocalDatabase();
  console.log('');
  
  await generateComparisonReport(supabaseAnalysis, localAnalysis);
  
  console.log('\n✨ Analysis complete!');
  console.log(`📁 Results saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
