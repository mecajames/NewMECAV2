const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

console.log('🚀 Complete Migration to Production\n');
console.log('This will:');
console.log('1. Create missing tables and columns');
console.log('2. Sync all data from local to production\n');

// Local Supabase
const localClient = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

// Production Supabase
const prodClient = createClient(
  'https://qykahrgwtktqycfgxqep.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A'
);

// Schema migration SQL chunks (split into smaller pieces to avoid errors)
const schemaMigrations = [
  // Part 1: Create seasons table
  `
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'seasons') THEN
      CREATE TABLE public.seasons (
        id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
        year integer NOT NULL,
        start_date date NOT NULL,
        end_date date NOT NULL,
        is_active boolean DEFAULT false NOT NULL,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
    END IF;
  END $$;
  `,

  // Part 2: Add missing columns to competition_classes
  `
  DO $$
  BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'competition_classes') THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'competition_classes' AND column_name = 'season_id') THEN
        ALTER TABLE public.competition_classes ADD COLUMN season_id uuid;
      END IF;
    END IF;
  END $$;
  `,

  // Part 3: Add missing columns to events
  `
  DO $$
  BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'season_id') THEN
        ALTER TABLE public.events ADD COLUMN season_id uuid;
      END IF;
    END IF;
  END $$;
  `,

  // Part 4: Add missing columns to competition_results
  `
  DO $$
  BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'competition_results') THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'competition_results' AND column_name = 'class_id') THEN
        ALTER TABLE public.competition_results ADD COLUMN class_id uuid;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'competition_results' AND column_name = 'format_id') THEN
        ALTER TABLE public.competition_results ADD COLUMN format_id uuid;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'competition_results' AND column_name = 'created_by') THEN
        ALTER TABLE public.competition_results ADD COLUMN created_by uuid;
      END IF;
    END IF;
  END $$;
  `,

  // Part 5: Create mikro_orm_migrations table
  `
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mikro_orm_migrations') THEN
      CREATE TABLE public.mikro_orm_migrations (
        id integer NOT NULL PRIMARY KEY,
        name character varying(255),
        executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
      );
      CREATE SEQUENCE IF NOT EXISTS public.mikro_orm_migrations_id_seq AS integer;
    END IF;
  END $$;
  `,

  // Part 6: Create event_hosting_requests table
  `
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_hosting_requests') THEN
      CREATE TABLE public.event_hosting_requests (
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
        country text DEFAULT 'US'::text NOT NULL,
        expected_participants integer,
        event_description text,
        additional_info text,
        status text DEFAULT 'pending'::text NOT NULL,
        admin_notes text,
        recaptcha_token text,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
    END IF;
  END $$;
  `,

  // Part 7: Add missing columns to rulebooks
  `
  DO $$
  BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rulebooks') THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'rulebooks' AND column_name = 'description') THEN
        ALTER TABLE public.rulebooks ADD COLUMN description text;
      END IF;
    END IF;
  END $$;
  `,

  // Part 8: Fix results_audit_log columns
  `
  DO $$
  BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'results_audit_log') THEN
      -- Check if old_data exists and old_values doesn't, then rename
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'results_audit_log' AND column_name = 'old_data')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'results_audit_log' AND column_name = 'old_values') THEN
        ALTER TABLE public.results_audit_log RENAME COLUMN old_data TO old_values;
      END IF;

      -- Check if new_data exists and new_values doesn't, then rename
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'results_audit_log' AND column_name = 'new_data')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'results_audit_log' AND column_name = 'new_values') THEN
        ALTER TABLE public.results_audit_log RENAME COLUMN new_data TO new_values;
      END IF;
    END IF;
  END $$;
  `,

  // Part 9: Create indexes
  `
  CREATE INDEX IF NOT EXISTS classes_season_idx ON public.competition_classes USING btree (season_id);
  CREATE INDEX IF NOT EXISTS events_season_idx ON public.events USING btree (season_id);
  CREATE INDEX IF NOT EXISTS results_class_idx ON public.competition_results USING btree (class_id);
  `
];

async function runSchemaMigration() {
  console.log('📋 Step 1: Running Schema Migrations\n');
  console.log('=' .repeat(60));

  for (let i = 0; i < schemaMigrations.length; i++) {
    const migration = schemaMigrations[i].trim();
    if (!migration) continue;

    console.log(`\n📦 Running migration ${i + 1}/${schemaMigrations.length}...`);

    try {
      const { error } = await prodClient.rpc('exec_sql', { sql_query: migration });

      if (error) {
        // Try alternative method - direct query
        const response = await fetch('https://qykahrgwtktqycfgxqep.supabase.co/rest/v1/rpc/exec_sql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5a2Focmd3dGt0cXljZmd4cWVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTI1MTM3MiwiZXhwIjoyMDc0ODI3MzcyfQ.7-XkekQjm_bo0Ta2Mq2lDiRumG7pIEIMGSFPfqmRG9A'
          },
          body: JSON.stringify({ sql_query: migration })
        });

        if (!response.ok) {
          console.log(`   ⚠️  Could not execute via RPC (this is expected)`);
          console.log(`   ℹ️  You may need to run this migration manually in SQL Editor`);
        } else {
          console.log(`   ✅ Success`);
        }
      } else {
        console.log(`   ✅ Success`);
      }
    } catch (err) {
      console.log(`   ⚠️  Error: ${err.message}`);
      console.log(`   ℹ️  Continuing with next migration...`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Schema migrations completed (some may need manual execution)\n');
}

async function syncTable(tableName, batchSize = 100) {
  console.log(`\n📦 Syncing ${tableName}...`);

  try {
    // Fetch all data from local
    const { data: localData, error: fetchError } = await localClient
      .from(tableName)
      .select('*');

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        console.log(`   ⚠️  Table doesn't exist in local, skipping`);
        return;
      }
      throw fetchError;
    }

    if (!localData || localData.length === 0) {
      console.log(`   ℹ️  No data to sync`);
      return;
    }

    console.log(`   Found ${localData.length} records`);

    // Delete existing data in production (for clean sync)
    console.log(`   🗑️  Clearing existing production data...`);
    const { error: deleteError } = await prodClient
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError && deleteError.code !== 'PGRST116') {
      console.log(`   ⚠️  Could not clear table: ${deleteError.message}`);
    }

    // Insert in batches
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < localData.length; i += batchSize) {
      const batch = localData.slice(i, i + batchSize);

      const { error: insertError } = await prodClient
        .from(tableName)
        .insert(batch);

      if (insertError) {
        console.log(`   ❌ Batch ${Math.floor(i / batchSize) + 1} failed: ${insertError.message}`);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        if (localData.length > batchSize) {
          console.log(`   ✅ Progress: ${successCount}/${localData.length}`);
        }
      }
    }

    console.log(`   ✅ Synced ${successCount} records` + (errorCount > 0 ? ` (${errorCount} errors)` : ''));

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function syncAllData() {
  console.log('\n📋 Step 2: Syncing Data\n');
  console.log('=' .repeat(60));

  // Tables to sync (in dependency order)
  const tables = [
    'seasons',
    'competition_formats',
    'competition_classes',
    'events',
    'competition_results',
    'championship_archives',
    'event_hosting_requests',
    'media_files',
    'mikro_orm_migrations',
    'rulebooks',
    'site_settings',
    'results_audit_log',
    'results_entry_sessions'
  ];

  for (const table of tables) {
    await syncTable(table);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n🎉 Data sync completed!\n');
}

async function main() {
  try {
    console.log('⚠️  NOTE: Schema migrations via API may not work.');
    console.log('   If schema step fails, manually run the SQL files in Supabase SQL Editor.\n');

    await runSchemaMigration();

    console.log('\n⏸️  Waiting 5 seconds for schema cache to refresh...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    await syncAllData();

    console.log('✅ All done! Check the output above for any errors.\n');
  } catch (error) {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  }
}

main();
