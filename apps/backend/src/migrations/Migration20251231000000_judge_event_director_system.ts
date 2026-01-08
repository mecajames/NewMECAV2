import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Judge & Event Director Management System
 *
 * This migration creates the complete infrastructure for managing:
 * - Judge applications and approved judges
 * - Event Director applications and approved EDs
 * - Seasonal qualifications
 * - Event assignments
 * - Ratings system
 * - Email verification tokens
 */
export class Migration20251231000000 extends Migration {
  async up(): Promise<void> {
    // =============================================================================
    // STEP 1: Create ENUM types
    // =============================================================================

    // Judge/ED Application Status
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_status') THEN
          CREATE TYPE application_status AS ENUM ('pending', 'under_review', 'approved', 'rejected');
        END IF;
      END$$;
    `);

    // Judge Level
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'judge_level') THEN
          CREATE TYPE judge_level AS ENUM ('in_training', 'certified', 'head_judge', 'master_judge');
        END IF;
      END$$;
    `);

    // Judge/ED Specialty
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'judge_specialty') THEN
          CREATE TYPE judge_specialty AS ENUM ('sql', 'spl', 'both');
        END IF;
      END$$;
    `);

    // Season Qualification Status
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'season_qualification_status') THEN
          CREATE TYPE season_qualification_status AS ENUM ('qualified', 'pending', 'inactive', 'suspended');
        END IF;
      END$$;
    `);

    // Event Assignment Role
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_assignment_role') THEN
          CREATE TYPE event_assignment_role AS ENUM ('primary', 'supporting', 'trainee');
        END IF;
      END$$;
    `);

    // Event Assignment Status
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_assignment_status') THEN
          CREATE TYPE event_assignment_status AS ENUM ('requested', 'accepted', 'declined', 'confirmed', 'completed', 'no_show');
        END IF;
      END$$;
    `);

    // Event Assignment Request Type
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_request_type') THEN
          CREATE TYPE assignment_request_type AS ENUM ('ed_request', 'judge_volunteer', 'admin_assign');
        END IF;
      END$$;
    `);

    // Rating Entity Type
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rating_entity_type') THEN
          CREATE TYPE rating_entity_type AS ENUM ('judge', 'event_director');
        END IF;
      END$$;
    `);

    // Application Entry Method
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'application_entry_method') THEN
          CREATE TYPE application_entry_method AS ENUM ('self', 'admin_application', 'admin_direct');
        END IF;
      END$$;
    `);

    // Verification Token Purpose
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_purpose') THEN
          CREATE TYPE verification_purpose AS ENUM ('judge_application', 'ed_application', 'other');
        END IF;
      END$$;
    `);

    // Weekend Availability
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'weekend_availability') THEN
          CREATE TYPE weekend_availability AS ENUM ('saturday', 'sunday', 'both');
        END IF;
      END$$;
    `);

    // =============================================================================
    // STEP 2: Create Judge Applications Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "judge_applications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
        "status" application_status NOT NULL DEFAULT 'pending',
        "application_date" timestamptz NOT NULL DEFAULT NOW(),
        "reviewed_date" timestamptz,
        "reviewed_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "entered_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "entry_method" application_entry_method NOT NULL DEFAULT 'self',

        -- Personal Information
        "full_name" text NOT NULL,
        "preferred_name" text,
        "date_of_birth" date NOT NULL,
        "phone" text NOT NULL,
        "secondary_phone" text,
        "headshot_url" text,

        -- Location Information
        "country" text NOT NULL,
        "state" text NOT NULL,
        "city" text NOT NULL,
        "zip" text NOT NULL,
        "travel_radius" text NOT NULL,
        "additional_regions" jsonb DEFAULT '[]',

        -- Availability
        "weekend_availability" weekend_availability NOT NULL,
        "availability_notes" text,

        -- Experience
        "years_in_industry" integer NOT NULL,
        "industry_positions" text NOT NULL,
        "company_names" text,
        "education_training" text,
        "competition_history" text,
        "judging_experience" text,

        -- Specialties
        "specialty" judge_specialty NOT NULL,
        "sub_specialties" jsonb DEFAULT '[]',
        "additional_skills" text,

        -- Essays
        "essay_why_judge" text NOT NULL,
        "essay_qualifications" text NOT NULL,
        "essay_additional" text,

        -- Acknowledgments
        "ack_independent_contractor" boolean NOT NULL DEFAULT false,
        "ack_code_of_conduct" boolean NOT NULL DEFAULT false,
        "ack_background_check" boolean NOT NULL DEFAULT false,
        "ack_terms_conditions" boolean NOT NULL DEFAULT false,

        -- Admin
        "admin_notes" text,

        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    // Indexes for judge_applications
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_judge_applications_user_id" ON "judge_applications"("user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_judge_applications_status" ON "judge_applications"("status");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_judge_applications_application_date" ON "judge_applications"("application_date" DESC);`);

    // =============================================================================
    // STEP 3: Create Judge Application References Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "judge_application_references" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL REFERENCES "judge_applications"("id") ON DELETE CASCADE,
        "full_name" text NOT NULL,
        "relationship" text,
        "company" text,
        "phone" text,
        "email" text,
        "years_known" integer,
        "reference_checked" boolean NOT NULL DEFAULT false,
        "reference_notes" text,
        "checked_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "checked_date" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_judge_app_refs_application_id" ON "judge_application_references"("application_id");`);

    // =============================================================================
    // STEP 4: Create Approved Judges Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "judges" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "profiles"("id") ON DELETE CASCADE,
        "application_id" uuid REFERENCES "judge_applications"("id") ON DELETE SET NULL,
        "level" judge_level NOT NULL DEFAULT 'in_training',
        "specialty" judge_specialty NOT NULL,
        "sub_specialties" jsonb DEFAULT '[]',
        "headshot_url" text,
        "bio" text,
        "preferred_name" text,
        "location_country" text NOT NULL,
        "location_state" text NOT NULL,
        "location_city" text NOT NULL,
        "travel_radius" text,
        "additional_regions" jsonb DEFAULT '[]',
        "is_active" boolean NOT NULL DEFAULT true,
        "approved_date" timestamptz,
        "approved_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "created_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "creation_method" application_entry_method NOT NULL DEFAULT 'self',
        "admin_notes" text,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_judges_user_id" ON "judges"("user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_judges_level" ON "judges"("level");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_judges_is_active" ON "judges"("is_active");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_judges_location" ON "judges"("location_state", "location_city");`);

    // =============================================================================
    // STEP 5: Create Judge Level History Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "judge_level_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "judge_id" uuid NOT NULL REFERENCES "judges"("id") ON DELETE CASCADE,
        "previous_level" judge_level,
        "new_level" judge_level NOT NULL,
        "changed_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "reason" text,
        "created_at" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_judge_level_history_judge_id" ON "judge_level_history"("judge_id");`);

    // =============================================================================
    // STEP 6: Create Judge Season Qualifications Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "judge_season_qualifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "judge_id" uuid NOT NULL REFERENCES "judges"("id") ON DELETE CASCADE,
        "season_id" uuid NOT NULL REFERENCES "seasons"("id") ON DELETE CASCADE,
        "status" season_qualification_status NOT NULL DEFAULT 'pending',
        "qualified_date" timestamptz,
        "qualified_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE("judge_id", "season_id")
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_judge_season_quals_judge_id" ON "judge_season_qualifications"("judge_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_judge_season_quals_season_id" ON "judge_season_qualifications"("season_id");`);

    // =============================================================================
    // STEP 7: Create Event Director Applications Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "event_director_applications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
        "status" application_status NOT NULL DEFAULT 'pending',
        "application_date" timestamptz NOT NULL DEFAULT NOW(),
        "reviewed_date" timestamptz,
        "reviewed_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "entered_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "entry_method" application_entry_method NOT NULL DEFAULT 'self',

        -- Personal Information
        "full_name" text NOT NULL,
        "preferred_name" text,
        "date_of_birth" date NOT NULL,
        "phone" text NOT NULL,
        "secondary_phone" text,
        "headshot_url" text,

        -- Location Information
        "country" text NOT NULL,
        "state" text NOT NULL,
        "city" text NOT NULL,
        "zip" text NOT NULL,
        "travel_radius" text NOT NULL,
        "additional_regions" jsonb DEFAULT '[]',

        -- Availability
        "weekend_availability" weekend_availability NOT NULL,
        "availability_notes" text,

        -- ED-Specific Experience
        "years_in_industry" integer NOT NULL,
        "event_management_experience" text NOT NULL,
        "team_management_experience" text NOT NULL,
        "equipment_resources" text,
        "specialized_formats" jsonb DEFAULT '[]',

        -- Essays
        "essay_why_ed" text NOT NULL,
        "essay_qualifications" text NOT NULL,
        "essay_additional" text,

        -- Acknowledgments
        "ack_independent_contractor" boolean NOT NULL DEFAULT false,
        "ack_code_of_conduct" boolean NOT NULL DEFAULT false,
        "ack_background_check" boolean NOT NULL DEFAULT false,
        "ack_terms_conditions" boolean NOT NULL DEFAULT false,

        -- Admin
        "admin_notes" text,

        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_ed_applications_user_id" ON "event_director_applications"("user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_ed_applications_status" ON "event_director_applications"("status");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_ed_applications_application_date" ON "event_director_applications"("application_date" DESC);`);

    // =============================================================================
    // STEP 8: Create Event Director Application References Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "event_director_application_references" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "application_id" uuid NOT NULL REFERENCES "event_director_applications"("id") ON DELETE CASCADE,
        "full_name" text NOT NULL,
        "relationship" text,
        "company" text,
        "phone" text,
        "email" text,
        "years_known" integer,
        "reference_checked" boolean NOT NULL DEFAULT false,
        "reference_notes" text,
        "checked_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "checked_date" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_ed_app_refs_application_id" ON "event_director_application_references"("application_id");`);

    // =============================================================================
    // STEP 9: Create Approved Event Directors Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "event_directors" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL UNIQUE REFERENCES "profiles"("id") ON DELETE CASCADE,
        "application_id" uuid REFERENCES "event_director_applications"("id") ON DELETE SET NULL,
        "headshot_url" text,
        "bio" text,
        "preferred_name" text,
        "location_country" text NOT NULL,
        "location_state" text NOT NULL,
        "location_city" text NOT NULL,
        "specialized_formats" jsonb DEFAULT '[]',
        "is_active" boolean NOT NULL DEFAULT true,
        "approved_date" timestamptz,
        "approved_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "created_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "creation_method" application_entry_method NOT NULL DEFAULT 'self',
        "admin_notes" text,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_event_directors_user_id" ON "event_directors"("user_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_event_directors_is_active" ON "event_directors"("is_active");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_event_directors_location" ON "event_directors"("location_state", "location_city");`);

    // =============================================================================
    // STEP 10: Create Event Director Season Qualifications Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "event_director_season_qualifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "event_director_id" uuid NOT NULL REFERENCES "event_directors"("id") ON DELETE CASCADE,
        "season_id" uuid NOT NULL REFERENCES "seasons"("id") ON DELETE CASCADE,
        "status" season_qualification_status NOT NULL DEFAULT 'pending',
        "qualified_date" timestamptz,
        "qualified_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE("event_director_id", "season_id")
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_ed_season_quals_ed_id" ON "event_director_season_qualifications"("event_director_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_ed_season_quals_season_id" ON "event_director_season_qualifications"("season_id");`);

    // =============================================================================
    // STEP 11: Create Event Judge Assignments Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "event_judge_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
        "judge_id" uuid NOT NULL REFERENCES "judges"("id") ON DELETE CASCADE,
        "role" event_assignment_role NOT NULL DEFAULT 'supporting',
        "status" event_assignment_status NOT NULL DEFAULT 'requested',
        "requested_by" uuid REFERENCES "profiles"("id") ON DELETE SET NULL,
        "request_type" assignment_request_type NOT NULL DEFAULT 'admin_assign',
        "request_date" timestamptz NOT NULL DEFAULT NOW(),
        "response_date" timestamptz,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        "updated_at" timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE("event_id", "judge_id")
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_event_judge_assignments_event_id" ON "event_judge_assignments"("event_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_event_judge_assignments_judge_id" ON "event_judge_assignments"("judge_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_event_judge_assignments_status" ON "event_judge_assignments"("status");`);

    // =============================================================================
    // STEP 12: Create Ratings Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "ratings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "rater_user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
        "entity_type" rating_entity_type NOT NULL,
        "entity_id" uuid NOT NULL,
        "event_id" uuid NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
        "rating" integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
        "created_at" timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE("rater_user_id", "entity_type", "entity_id", "event_id")
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_ratings_entity" ON "ratings"("entity_type", "entity_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_ratings_event_id" ON "ratings"("event_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_ratings_rater_user_id" ON "ratings"("rater_user_id");`);

    // =============================================================================
    // STEP 13: Create Email Verification Tokens Table
    // =============================================================================

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
        "token" text NOT NULL UNIQUE,
        "purpose" verification_purpose NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT NOW()
      );
    `);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_verification_tokens_token" ON "email_verification_tokens"("token");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_verification_tokens_user_id" ON "email_verification_tokens"("user_id");`);

    // =============================================================================
    // STEP 14: Add computed rating columns to judges and event_directors
    // These will be updated via triggers or application logic
    // =============================================================================

    this.addSql(`
      ALTER TABLE "judges"
      ADD COLUMN IF NOT EXISTS "average_rating" decimal(3,2),
      ADD COLUMN IF NOT EXISTS "total_ratings" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "total_events_judged" integer NOT NULL DEFAULT 0;
    `);

    this.addSql(`
      ALTER TABLE "event_directors"
      ADD COLUMN IF NOT EXISTS "average_rating" decimal(3,2),
      ADD COLUMN IF NOT EXISTS "total_ratings" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "total_events_directed" integer NOT NULL DEFAULT 0;
    `);
  }

  async down(): Promise<void> {
    // Drop tables in reverse order of creation (respecting foreign keys)
    this.addSql(`DROP TABLE IF EXISTS "email_verification_tokens";`);
    this.addSql(`DROP TABLE IF EXISTS "ratings";`);
    this.addSql(`DROP TABLE IF EXISTS "event_judge_assignments";`);
    this.addSql(`DROP TABLE IF EXISTS "event_director_season_qualifications";`);
    this.addSql(`DROP TABLE IF EXISTS "event_directors";`);
    this.addSql(`DROP TABLE IF EXISTS "event_director_application_references";`);
    this.addSql(`DROP TABLE IF EXISTS "event_director_applications";`);
    this.addSql(`DROP TABLE IF EXISTS "judge_season_qualifications";`);
    this.addSql(`DROP TABLE IF EXISTS "judge_level_history";`);
    this.addSql(`DROP TABLE IF EXISTS "judges";`);
    this.addSql(`DROP TABLE IF EXISTS "judge_application_references";`);
    this.addSql(`DROP TABLE IF EXISTS "judge_applications";`);

    // Drop enum types
    this.addSql(`DROP TYPE IF EXISTS weekend_availability;`);
    this.addSql(`DROP TYPE IF EXISTS verification_purpose;`);
    this.addSql(`DROP TYPE IF EXISTS application_entry_method;`);
    this.addSql(`DROP TYPE IF EXISTS rating_entity_type;`);
    this.addSql(`DROP TYPE IF EXISTS assignment_request_type;`);
    this.addSql(`DROP TYPE IF EXISTS event_assignment_status;`);
    this.addSql(`DROP TYPE IF EXISTS event_assignment_role;`);
    this.addSql(`DROP TYPE IF EXISTS season_qualification_status;`);
    this.addSql(`DROP TYPE IF EXISTS judge_specialty;`);
    this.addSql(`DROP TYPE IF EXISTS judge_level;`);
    this.addSql(`DROP TYPE IF EXISTS application_status;`);
  }
}
