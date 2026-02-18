/**
 * Stage Database Migration Script
 *
 * Applies all missing schema changes to the stage database.
 * Safe to run multiple times - uses IF NOT EXISTS / IF EXISTS everywhere.
 *
 * Usage:
 *   Set DATABASE_URL to the stage database connection string, then run:
 *   npx ts-node scripts/apply-stage-migrations.ts
 *
 *   Or pass it directly:
 *   DATABASE_URL="postgresql://..." npx ts-node scripts/apply-stage-migrations.ts
 */

import { Client } from 'pg';

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    console.error('Usage: DATABASE_URL="postgresql://..." npx ts-node scripts/apply-stage-migrations.ts');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  console.log('Connected.\n');

  const statements: { label: string; sql: string }[] = [];

  // =========================================================================
  // 1. ENUM TYPE ADDITIONS
  // =========================================================================

  statements.push({
    label: "Add 'judge' to user_role enum",
    sql: `
      DO $$ BEGIN
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'judge';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `,
  });

  statements.push({
    label: 'Create multi_day_results_mode_enum',
    sql: `
      DO $$ BEGIN
        CREATE TYPE "multi_day_results_mode_enum" AS ENUM ('separate', 'combined_score', 'combined_points');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `,
  });

  statements.push({
    label: 'Create training enum types',
    sql: `
      DO $$ BEGIN
        CREATE TYPE "training_type" AS ENUM ('judge', 'event_director', 'competitor', 'general');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE "trainee_type" AS ENUM ('new', 'refresher', 'advanced');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE "training_result" AS ENUM ('passed', 'failed', 'incomplete', 'pending');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `,
  });

  statements.push({
    label: 'Create banner enum types',
    sql: `
      DO $$ BEGIN
        CREATE TYPE "banner_position" AS ENUM ('header', 'sidebar', 'footer', 'inline', 'popup');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE "banner_status" AS ENUM ('draft', 'active', 'paused', 'expired', 'archived');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `,
  });

  // =========================================================================
  // 2. PROFILES TABLE - Missing Columns
  // =========================================================================

  statements.push({
    label: 'Add is_trainer to profiles',
    sql: `ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "is_trainer" boolean DEFAULT false;`,
  });

  statements.push({
    label: 'Add judge/ED permission columns to profiles',
    sql: `
      ALTER TABLE "profiles"
        ADD COLUMN IF NOT EXISTS "can_apply_judge" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "can_apply_event_director" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "judge_permission_granted_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "judge_permission_granted_by" uuid REFERENCES "profiles"(id),
        ADD COLUMN IF NOT EXISTS "ed_permission_granted_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "ed_permission_granted_by" uuid REFERENCES "profiles"(id),
        ADD COLUMN IF NOT EXISTS "judge_certification_expires" timestamptz,
        ADD COLUMN IF NOT EXISTS "ed_certification_expires" timestamptz;
    `,
  });

  statements.push({
    label: 'Add profile indexes for permissions',
    sql: `
      CREATE INDEX IF NOT EXISTS "idx_profiles_is_trainer" ON "profiles"("is_trainer") WHERE "is_trainer" = true;
      CREATE INDEX IF NOT EXISTS "idx_profiles_can_apply_judge" ON "profiles"("can_apply_judge") WHERE "can_apply_judge" = true;
      CREATE INDEX IF NOT EXISTS "idx_profiles_can_apply_event_director" ON "profiles"("can_apply_event_director") WHERE "can_apply_event_director" = true;
    `,
  });

  statements.push({
    label: 'Add master/secondary account columns to profiles',
    sql: `
      ALTER TABLE "profiles"
        ADD COLUMN IF NOT EXISTS "account_type" character varying(30) DEFAULT 'member',
        ADD COLUMN IF NOT EXISTS "is_secondary_account" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "can_login" boolean DEFAULT true,
        ADD COLUMN IF NOT EXISTS "master_profile_id" uuid REFERENCES "profiles"(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "force_password_change" boolean DEFAULT false;
    `,
  });

  // =========================================================================
  // 3. EVENTS TABLE - Missing Columns
  // =========================================================================

  statements.push({
    label: 'Add multi_day_results_mode to events',
    sql: `
      ALTER TABLE "events"
        ADD COLUMN IF NOT EXISTS "multi_day_results_mode" "multi_day_results_mode_enum";
    `,
  });

  // =========================================================================
  // 4. MEMBERSHIPS TABLE - Missing Columns
  // =========================================================================

  statements.push({
    label: 'Add cancellation columns to memberships',
    sql: `
      ALTER TABLE "memberships"
        ADD COLUMN IF NOT EXISTS "cancel_at_period_end" boolean DEFAULT false,
        ADD COLUMN IF NOT EXISTS "cancelled_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "cancellation_reason" text,
        ADD COLUMN IF NOT EXISTS "cancelled_by" varchar(50);
    `,
  });

  statements.push({
    label: 'Add subscription columns to memberships',
    sql: `
      ALTER TABLE "memberships"
        ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text,
        ADD COLUMN IF NOT EXISTS "had_legacy_subscription" boolean DEFAULT false;
    `,
  });

  statements.push({
    label: 'Add subscription index to memberships',
    sql: `
      CREATE INDEX IF NOT EXISTS "idx_memberships_stripe_subscription_id"
        ON "memberships"("stripe_subscription_id")
        WHERE "stripe_subscription_id" IS NOT NULL;
    `,
  });

  // =========================================================================
  // 5. COMPETITION CLASSES - Fix unique constraint (includes season_id)
  // =========================================================================

  statements.push({
    label: 'Fix competition_classes unique constraint (safe)',
    sql: `
      DO $$ BEGIN
        -- Only drop old constraint if it exists
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'competition_classes_name_format_unique'
        ) THEN
          ALTER TABLE "competition_classes" DROP CONSTRAINT "competition_classes_name_format_unique";
        END IF;
        -- Add new constraint if it doesn't exist
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'competition_classes_name_format_season_unique'
        ) THEN
          ALTER TABLE "competition_classes"
            ADD CONSTRAINT "competition_classes_name_format_season_unique"
            UNIQUE (name, format, season_id);
        END IF;
      END $$;
    `,
  });

  // =========================================================================
  // 6. NEW TABLES
  // =========================================================================

  statements.push({
    label: 'Create training_records table',
    sql: `
      CREATE TABLE IF NOT EXISTS "training_records" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "trainer_id" uuid REFERENCES "profiles"(id),
        "trainee_name" text NOT NULL,
        "trainee_meca_id" text,
        "trainee_email" text,
        "trainee_type" text DEFAULT 'new',
        "training_type" text DEFAULT 'general',
        "training_date" timestamptz DEFAULT now(),
        "location" text,
        "notes" text,
        "result" text DEFAULT 'pending',
        "score" integer,
        "certificate_issued" boolean DEFAULT false,
        "created_at" timestamptz DEFAULT now(),
        "updated_at" timestamptz DEFAULT now()
      );
    `,
  });

  statements.push({
    label: 'Create advertisers table',
    sql: `
      CREATE TABLE IF NOT EXISTS "advertisers" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "contact_name" text,
        "contact_email" text,
        "contact_phone" text,
        "website" text,
        "notes" text,
        "is_active" boolean DEFAULT true,
        "created_at" timestamptz DEFAULT now(),
        "updated_at" timestamptz DEFAULT now()
      );
    `,
  });

  statements.push({
    label: 'Create banners table',
    sql: `
      CREATE TABLE IF NOT EXISTS "banners" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "advertiser_id" uuid REFERENCES "advertisers"(id) ON DELETE SET NULL,
        "name" text NOT NULL,
        "image_url" text,
        "link_url" text,
        "position" text DEFAULT 'inline',
        "status" text DEFAULT 'draft',
        "start_date" timestamptz,
        "end_date" timestamptz,
        "priority" integer DEFAULT 0,
        "max_impressions_per_user" integer,
        "max_total_impressions" integer,
        "rotation_weight" integer DEFAULT 1,
        "created_at" timestamptz DEFAULT now(),
        "updated_at" timestamptz DEFAULT now()
      );
    `,
  });

  statements.push({
    label: 'Create banner_engagements table',
    sql: `
      CREATE TABLE IF NOT EXISTS "banner_engagements" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "banner_id" uuid REFERENCES "banners"(id) ON DELETE CASCADE,
        "date" date NOT NULL DEFAULT CURRENT_DATE,
        "impressions" integer DEFAULT 0,
        "clicks" integer DEFAULT 0,
        "unique_impressions" integer DEFAULT 0,
        "unique_clicks" integer DEFAULT 0,
        "created_at" timestamptz DEFAULT now(),
        "updated_at" timestamptz DEFAULT now(),
        UNIQUE("banner_id", "date")
      );
    `,
  });

  statements.push({
    label: 'Create points_configuration table',
    sql: `
      CREATE TABLE IF NOT EXISTS "points_configuration" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "season_id" uuid REFERENCES "seasons"(id) ON DELETE CASCADE,
        "name" text DEFAULT 'Default',
        "is_active" boolean DEFAULT true,
        "first_place_points" integer DEFAULT 10,
        "second_place_points" integer DEFAULT 8,
        "third_place_points" integer DEFAULT 6,
        "fourth_place_points" integer DEFAULT 5,
        "fifth_place_points" integer DEFAULT 4,
        "sixth_place_points" integer DEFAULT 3,
        "seventh_place_points" integer DEFAULT 2,
        "eighth_place_points" integer DEFAULT 1,
        "ninth_place_points" integer DEFAULT 0,
        "tenth_place_points" integer DEFAULT 0,
        "participation_points" integer DEFAULT 1,
        "four_x_first_place_points" integer DEFAULT 40,
        "four_x_second_place_points" integer DEFAULT 32,
        "four_x_third_place_points" integer DEFAULT 24,
        "four_x_fourth_place_points" integer DEFAULT 20,
        "four_x_fifth_place_points" integer DEFAULT 16,
        "four_x_sixth_place_points" integer DEFAULT 12,
        "four_x_seventh_place_points" integer DEFAULT 8,
        "four_x_eighth_place_points" integer DEFAULT 4,
        "four_x_ninth_place_points" integer DEFAULT 0,
        "four_x_tenth_place_points" integer DEFAULT 0,
        "four_x_participation_points" integer DEFAULT 4,
        "created_at" timestamptz DEFAULT now(),
        "updated_at" timestamptz DEFAULT now(),
        UNIQUE("season_id")
      );
    `,
  });

  statements.push({
    label: 'Create processed_webhook_events table',
    sql: `
      CREATE TABLE IF NOT EXISTS "processed_webhook_events" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "stripe_event_id" text NOT NULL,
        "event_type" text NOT NULL,
        "payment_intent_id" text,
        "payment_type" text,
        "metadata" jsonb,
        "processing_result" text,
        "error_message" text,
        "processed_at" timestamptz DEFAULT now(),
        UNIQUE("stripe_event_id")
      );
      CREATE INDEX IF NOT EXISTS "idx_processed_webhook_stripe_event_id"
        ON "processed_webhook_events"("stripe_event_id");
    `,
  });

  // =========================================================================
  // 7. Insert default points_configuration for existing seasons (if missing)
  // =========================================================================

  statements.push({
    label: 'Insert default points_configuration for existing seasons',
    sql: `
      INSERT INTO "points_configuration" ("season_id")
      SELECT s.id FROM "seasons" s
      WHERE NOT EXISTS (
        SELECT 1 FROM "points_configuration" pc WHERE pc.season_id = s.id
      );
    `,
  });

  // =========================================================================
  // 8. RLS helper functions (used by multiple policies)
  // =========================================================================

  statements.push({
    label: 'Create/update RLS helper functions',
    sql: `
      CREATE OR REPLACE FUNCTION rls_current_uid() RETURNS uuid
        LANGUAGE sql STABLE
        SET search_path = ''
      AS $$
        SELECT COALESCE(
          (SELECT auth.uid()),
          '00000000-0000-0000-0000-000000000000'::uuid
        )
      $$;

      CREATE OR REPLACE FUNCTION rls_is_admin() RETURNS boolean
        LANGUAGE sql STABLE
        SET search_path = ''
      AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = (SELECT auth.uid())
          AND role = 'admin'
        )
      $$;

      CREATE OR REPLACE FUNCTION rls_is_owner(row_user_id uuid) RETURNS boolean
        LANGUAGE sql STABLE
        SET search_path = ''
      AS $$
        SELECT row_user_id = (SELECT auth.uid())
      $$;

      CREATE OR REPLACE FUNCTION rls_is_owner_or_admin(row_user_id uuid) RETURNS boolean
        LANGUAGE sql STABLE
        SET search_path = ''
      AS $$
        SELECT row_user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = (SELECT auth.uid())
            AND role = 'admin'
          )
      $$;

      CREATE OR REPLACE FUNCTION rls_is_admin_or_event_director() RETURNS boolean
        LANGUAGE sql STABLE
        SET search_path = ''
      AS $$
        WITH current_profile AS (
          SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1
        )
        SELECT EXISTS (
          SELECT 1 FROM current_profile WHERE role IN ('admin', 'event_director')
        )
      $$;
    `,
  });

  // =========================================================================
  // EXECUTE ALL STATEMENTS
  // =========================================================================

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const stmt of statements) {
    try {
      process.stdout.write(`  ${stmt.label}... `);
      await client.query(stmt.sql);
      console.log('OK');
      success++;
    } catch (err: any) {
      // Some errors are expected (e.g., duplicate enum values, existing constraints)
      if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
        console.log('SKIPPED (already exists)');
        skipped++;
      } else {
        console.log(`FAILED: ${err.message}`);
        failed++;
      }
    }
  }

  console.log(`\nDone! ${success} applied, ${skipped} skipped, ${failed} failed.`);

  await client.end();
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
