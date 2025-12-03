const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

console.log('🚀 Complete API Migration to qykahrgwtktqycfgxqep\n');
console.log('Using direct PostgreSQL connection with provided credentials\n');

// Local Supabase
const localClient = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

// Production Supabase (REST API for data)
const prodClient = createClient(
  'https://qykahrgwtktqycfgxqep.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A'
);

// PostgreSQL client for schema changes
const pgClient = new Client({
  host: 'db.qykahrgwtktqycfgxqep.supabase.co',
  port: 6543, // Try connection pooler port
  database: 'postgres',
  user: 'postgres.qykahrgwtktqycfgxqep',
  password: '9CN@Z4@unTyd33SG',
  ssl: {
    rejectUnauthorized: false
  }
});

// Schema creation statements
const schemaStatements = [
  {
    name: 'seasons table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.seasons (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        year integer NOT NULL,
        start_date date NOT NULL,
        end_date date NOT NULL,
        is_active boolean DEFAULT false NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS seasons_year_idx ON public.seasons(year);
    `
  },
  {
    name: 'competition_classes table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.competition_classes (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        name text NOT NULL,
        abbreviation text NOT NULL,
        format text NOT NULL,
        season_id uuid,
        is_active boolean DEFAULT true NOT NULL,
        display_order integer DEFAULT 0 NOT NULL,
        created_at timestamp without time zone DEFAULT now() NOT NULL,
        updated_at timestamp without time zone DEFAULT now() NOT NULL
      );
      CREATE INDEX IF NOT EXISTS classes_season_idx ON public.competition_classes(season_id);
    `
  },
  {
    name: 'events columns',
    sql: `
      ALTER TABLE public.events ADD COLUMN IF NOT EXISTS season_id uuid;
      ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_type text;
      ALTER TABLE public.events ADD COLUMN IF NOT EXISTS points_multiplier numeric(3,2);
      CREATE INDEX IF NOT EXISTS events_season_idx ON public.events(season_id);
    `
  },
  {
    name: 'competition_results columns',
    sql: `
      ALTER TABLE public.competition_results ADD COLUMN IF NOT EXISTS class_id uuid;
      ALTER TABLE public.competition_results ADD COLUMN IF NOT EXISTS format_id uuid;
      ALTER TABLE public.competition_results ADD COLUMN IF NOT EXISTS created_by uuid;
      CREATE INDEX IF NOT EXISTS results_class_idx ON public.competition_results(class_id);
    `
  },
  {
    name: 'rulebooks table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.rulebooks (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        title text NOT NULL,
        year integer NOT NULL,
        category text,
        description text,
        file_url text NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        display_order integer,
        summary_points jsonb,
        uploaded_by uuid,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `
  },
  {
    name: 'site_settings table',
    sql: `
      CREATE TABLE IF NOT EXISTS public.site_settings (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        key text NOT NULL UNIQUE,
        value jsonb NOT NULL,
        description text,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `
  },
  {
    name: 'other tables',
    sql: `
      CREATE TABLE IF NOT EXISTS public.event_hosting_requests (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        requester_name text NOT NULL,
        requester_email text NOT NULL,
        requester_phone text,
        organization_name text,
        event_name text NOT NULL,
        preferred_date date,
        venue_name text,
        venue_address text,
        city text NOT NULL,
        state text NOT NULL,
        zip_code text,
        country text DEFAULT 'US',
        expected_participants integer,
        event_description text,
        additional_info text,
        status text DEFAULT 'pending',
        admin_notes text,
        recaptcha_token text,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS public.mikro_orm_migrations (
        id integer PRIMARY KEY,
        name character varying(255),
        executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public.media_files (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        file_name text NOT NULL,
        file_url text NOT NULL,
        file_type text NOT NULL,
        file_size integer,
        uploaded_by uuid,
        entity_type text,
        entity_id uuid,
        created_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `
  }
];

async function createSchema() {
  console.log('📋 Step 1: Creating Schema\n');
  console.log('=' .repeat(70));

  try {
    console.log('\n🔌 Connecting to PostgreSQL...');
    await pgClient.connect();
    console.log('✅ Connected!\n');

    for (const statement of schemaStatements) {
      console.log(`📦 Creating ${statement.name}...`);
      try {
        await pgClient.query(statement.sql);
        console.log(`   ✅ Success`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`   ℹ️  Already exists (skipped)`);
        } else {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Schema creation completed!\n');
    return true;

  } catch (error) {
    console.log(`\n❌ Connection failed: ${error.message}`);
    console.log('⚠️  Will skip schema creation and proceed with data sync\n');
    return false;
  } finally {
    try {
      await pgClient.end();
    } catch (e) {
      // Ignore
    }
  }
}

async function syncTable(tableName, clearFirst = false) {
  console.log(`\n📦 Syncing ${tableName}...`);

  try {
    // Fetch local data
    const { data: localData, error: fetchError } = await localClient
      .from(tableName)
      .select('*');

    if (fetchError) {
      console.log(`   ⚠️  Can't fetch: ${fetchError.message}`);
      return { success: false };
    }

    if (!localData || localData.length === 0) {
      console.log(`   ℹ️  No data`);
      return { success: true, count: 0 };
    }

    console.log(`   Found ${localData.length} records`);

    // Clear if requested
    if (clearFirst) {
      const { error: delError } = await prodClient
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (delError && !delError.message.includes('schema cache')) {
        console.log(`   ⚠️  Clear warning: ${delError.message}`);
      }
    }

    // Insert data
    let successCount = 0;
    const batchSize = 50;

    for (let i = 0; i < localData.length; i += batchSize) {
      const batch = localData.slice(i, i + batchSize);

      const { error: insertError } = await prodClient
        .from(tableName)
        .insert(batch);

      if (insertError) {
        console.log(`   ❌ Batch ${Math.floor(i / batchSize) + 1} error: ${insertError.message}`);
      } else {
        successCount += batch.length;
        if (localData.length > batchSize) {
          process.stdout.write(`\r   ✅ Progress: ${successCount}/${localData.length}`);
        }
      }
    }

    if (localData.length > batchSize) console.log('');
    console.log(`   ${successCount > 0 ? '✅' : '❌'} Completed: ${successCount}/${localData.length}`);

    return { success: successCount > 0, count: successCount };

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false };
  }
}

async function syncData() {
  console.log('\n📋 Step 2: Syncing Data\n');
  console.log('=' .repeat(70));

  const tables = [
    { name: 'seasons', clear: true },
    { name: 'competition_formats', clear: true },
    { name: 'competition_classes', clear: true },
    { name: 'events', clear: false },
    { name: 'competition_results', clear: false },
    { name: 'championship_archives', clear: true },
    { name: 'rulebooks', clear: true },
    { name: 'site_settings', clear: false },
    { name: 'event_hosting_requests', clear: false },
    { name: 'mikro_orm_migrations', clear: true }
  ];

  const results = {};
  for (const table of tables) {
    results[table.name] = await syncTable(table.name, table.clear);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SYNC SUMMARY\n');

  const successful = Object.values(results).filter(r => r.success).length;
  const failed = Object.values(results).filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}\n`);

  if (successful > 0) {
    console.log('✅ Successfully synced:');
    Object.entries(results)
      .filter(([_, r]) => r.success)
      .forEach(([name, r]) => console.log(`   - ${name} (${r.count} records)`));
  }

  if (failed > 0) {
    console.log('\n❌ Failed to sync:');
    Object.entries(results)
      .filter(([_, r]) => !r.success)
      .forEach(([name, _]) => console.log(`   - ${name}`));
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n🎉 Migration completed!\n');
}

async function main() {
  await createSchema();

  console.log('⏸️  Waiting 3 seconds for schema cache refresh...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  await syncData();
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
