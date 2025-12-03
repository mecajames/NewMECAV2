const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Creating Production Schema via Direct PostgreSQL Connection\n');

// Production connection
const client = new Client({
  host: 'db.qykahrgwtktqycfgxqep.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '9CN@Z4@unTyd33SG',
  ssl: {
    rejectUnauthorized: false
  }
});

const schemas = {
  // Seasons table - CRITICAL
  seasons: `
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
    CREATE INDEX IF NOT EXISTS seasons_is_active_idx ON public.seasons(is_active);
  `,

  // Competition Classes table - CRITICAL
  competition_classes: `
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
    CREATE INDEX IF NOT EXISTS classes_format_idx ON public.competition_classes(format);
  `,

  // Events table - CRITICAL (add missing columns)
  events_columns: `
    DO $$
    BEGIN
      -- Check if events table exists first
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
        -- Add season_id if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'season_id') THEN
          ALTER TABLE public.events ADD COLUMN season_id uuid;
          CREATE INDEX IF NOT EXISTS events_season_idx ON public.events(season_id);
        END IF;
        -- Add event_type if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'event_type') THEN
          ALTER TABLE public.events ADD COLUMN event_type text DEFAULT 'standard';
        END IF;
        -- Add points_multiplier if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = 'events' AND column_name = 'points_multiplier') THEN
          ALTER TABLE public.events ADD COLUMN points_multiplier numeric(3,2) DEFAULT 1.0;
        END IF;
      ELSE
        -- Create events table if it doesn't exist
        CREATE TABLE public.events (
          id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
          title text NOT NULL,
          description text,
          event_date timestamp with time zone NOT NULL,
          registration_deadline timestamp with time zone,
          venue_name text NOT NULL,
          venue_address text NOT NULL,
          city text,
          state text,
          zip_code text,
          country text,
          latitude numeric(10,8),
          longitude numeric(11,8),
          flyer_url text,
          header_image_url text,
          event_director_id uuid,
          status text DEFAULT 'upcoming',
          event_type text DEFAULT 'standard',
          max_participants integer,
          registration_fee numeric(10,2),
          season_id uuid,
          points_multiplier numeric(3,2) DEFAULT 1.0,
          created_at timestamp with time zone DEFAULT now() NOT NULL,
          updated_at timestamp with time zone DEFAULT now() NOT NULL
        );
        CREATE INDEX IF NOT EXISTS events_date_idx ON public.events(event_date);
        CREATE INDEX IF NOT EXISTS events_season_idx ON public.events(season_id);
        CREATE INDEX IF NOT EXISTS events_status_idx ON public.events(status);
      END IF;
    END $$;
  `,

  // Competition Results table - CRITICAL (add missing columns)
  competition_results_columns: `
    DO $$
    BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'competition_results') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = 'competition_results' AND column_name = 'class_id') THEN
          ALTER TABLE public.competition_results ADD COLUMN class_id uuid;
          CREATE INDEX IF NOT EXISTS results_class_idx ON public.competition_results(class_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = 'competition_results' AND column_name = 'format_id') THEN
          ALTER TABLE public.competition_results ADD COLUMN format_id uuid;
          CREATE INDEX IF NOT EXISTS results_format_idx ON public.competition_results(format_id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = 'competition_results' AND column_name = 'created_by') THEN
          ALTER TABLE public.competition_results ADD COLUMN created_by uuid;
        END IF;
      END IF;
    END $$;
  `,

  // Rulebooks table
  rulebooks: `
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
    CREATE INDEX IF NOT EXISTS rulebooks_active_idx ON public.rulebooks(is_active);
    CREATE INDEX IF NOT EXISTS rulebooks_year_idx ON public.rulebooks(year);
  `,

  // Site Settings table
  site_settings: `
    CREATE TABLE IF NOT EXISTS public.site_settings (
      id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
      key text NOT NULL UNIQUE,
      value jsonb NOT NULL,
      description text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_site_settings_key ON public.site_settings(key);
  `,

  // Event Hosting Requests table
  event_hosting_requests: `
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
      country text DEFAULT 'US' NOT NULL,
      expected_participants integer,
      event_description text,
      additional_info text,
      status text DEFAULT 'pending' NOT NULL,
      admin_notes text,
      recaptcha_token text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `,

  // MikroORM Migrations table
  mikro_orm_migrations: `
    CREATE TABLE IF NOT EXISTS public.mikro_orm_migrations (
      id integer PRIMARY KEY,
      name character varying(255),
      executed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
    );
    CREATE SEQUENCE IF NOT EXISTS public.mikro_orm_migrations_id_seq AS integer;
  `,

  // Results Audit Log - fix column names
  results_audit_log_columns: `
    DO $$
    BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'results_audit_log') THEN
        -- Rename old_data to old_values
        IF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'results_audit_log' AND column_name = 'old_data')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_schema = 'public' AND table_name = 'results_audit_log' AND column_name = 'old_values') THEN
          ALTER TABLE public.results_audit_log RENAME COLUMN old_data TO old_values;
        END IF;
        -- Rename new_data to new_values
        IF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'results_audit_log' AND column_name = 'new_data')
           AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_schema = 'public' AND table_name = 'results_audit_log' AND column_name = 'new_values') THEN
          ALTER TABLE public.results_audit_log RENAME COLUMN new_data TO new_values;
        END IF;
      END IF;
    END $$;
  `,

  // Results Entry Sessions - add missing columns
  results_entry_sessions_columns: `
    DO $$
    BEGIN
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'results_entry_sessions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema = 'public' AND table_name = 'results_entry_sessions' AND column_name = 'created_at') THEN
          ALTER TABLE public.results_entry_sessions ADD COLUMN created_at timestamp with time zone DEFAULT now();
        END IF;
      END IF;
    END $$;
  `,

  // Media Files table
  media_files: `
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
};

async function executeSchema(name, sql) {
  console.log(`\n📋 ${name}...`);
  try {
    await client.query(sql);
    console.log(`   ✅ Success`);
    return { success: true };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  try {
    console.log('🔌 Connecting to production database...');
    await client.connect();
    console.log('✅ Connected!\n');

    console.log('=' .repeat(70));
    console.log('Creating missing tables and columns...\n');

    const results = {};

    // Execute in order
    const order = [
      'seasons',
      'competition_classes',
      'events_columns',
      'competition_results_columns',
      'rulebooks',
      'site_settings',
      'event_hosting_requests',
      'mikro_orm_migrations',
      'results_audit_log_columns',
      'results_entry_sessions_columns',
      'media_files'
    ];

    for (const key of order) {
      results[key] = await executeSchema(key, schemas[key]);
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n' + '=' .repeat(70));
    console.log('\n📊 SCHEMA CREATION SUMMARY\n');

    const successful = Object.values(results).filter(r => r.success).length;
    const failed = Object.values(results).filter(r => !r.success).length;

    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed:     ${failed}\n`);

    if (failed > 0) {
      console.log('Failed operations:');
      Object.entries(results)
        .filter(([_, r]) => !r.success)
        .forEach(([name, r]) => console.log(`   - ${name}: ${r.error}`));
      console.log('');
    }

    console.log('🎉 Schema creation completed!\n');
    console.log('💡 Next step: Run the intelligent migration script again to sync data:\n');
    console.log('   node scripts/intelligent-migration.js\n');

  } catch (error) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
