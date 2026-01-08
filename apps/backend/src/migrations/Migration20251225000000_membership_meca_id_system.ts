import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Membership/MECA ID System Overhaul
 *
 * This migration implements the new membership system where:
 * 1. MECA IDs are assigned per-membership, not per-user
 * 2. Users can have multiple memberships (each with own MECA ID)
 * 3. Teams are add-ons linked to specific memberships
 * 4. Vehicle info is required for competitor memberships
 * 5. 90-day reactivation window for MECA IDs
 * 6. 30-day team name edit window after renewal
 */
export class Migration20251225000000_membership_meca_id_system extends Migration {

  async up(): Promise<void> {
    // =========================================================================
    // 1. Add MECA ID and vehicle fields to memberships table
    // =========================================================================
    this.addSql(`
      ALTER TABLE "memberships"
      ADD COLUMN IF NOT EXISTS "meca_id" INTEGER UNIQUE,
      ADD COLUMN IF NOT EXISTS "competitor_name" TEXT,
      ADD COLUMN IF NOT EXISTS "vehicle_license_plate" TEXT,
      ADD COLUMN IF NOT EXISTS "vehicle_color" TEXT,
      ADD COLUMN IF NOT EXISTS "vehicle_make" TEXT,
      ADD COLUMN IF NOT EXISTS "vehicle_model" TEXT,
      ADD COLUMN IF NOT EXISTS "has_team_addon" BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "team_name_last_edited" TIMESTAMPTZ;
    `);

    // =========================================================================
    // 2. Add membership_id to teams table (linking team to owning membership)
    // =========================================================================
    this.addSql(`
      ALTER TABLE "teams"
      ADD COLUMN IF NOT EXISTS "membership_id" UUID REFERENCES "memberships"("id") ON DELETE SET NULL;
    `);

    // Create index for faster lookups
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_teams_membership_id" ON "teams"("membership_id");
    `);

    // =========================================================================
    // 3. Create MECA ID history table for tracking ID assignments
    // =========================================================================
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "meca_id_history" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "meca_id" INTEGER NOT NULL,
        "membership_id" UUID REFERENCES "memberships"("id") ON DELETE SET NULL,
        "profile_id" UUID REFERENCES "profiles"("id") ON DELETE SET NULL,
        "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "expired_at" TIMESTAMPTZ,
        "reactivated_at" TIMESTAMPTZ,
        "previous_end_date" TIMESTAMPTZ,
        "notes" TEXT,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Index for looking up history by meca_id
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_meca_id_history_meca_id" ON "meca_id_history"("meca_id");
    `);

    // Index for looking up history by membership
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_meca_id_history_membership_id" ON "meca_id_history"("membership_id");
    `);

    // Index for looking up history by profile (for role-based IDs)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_meca_id_history_profile_id" ON "meca_id_history"("profile_id");
    `);

    // =========================================================================
    // 4. Create meca_id_counter table for atomic ID generation
    // =========================================================================
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "meca_id_counter" (
        "id" INTEGER PRIMARY KEY DEFAULT 1,
        "last_meca_id" INTEGER NOT NULL DEFAULT 700499,
        "updated_at" TIMESTAMPTZ DEFAULT NOW(),
        CHECK ("id" = 1)
      );
    `);

    // Initialize the counter if not exists
    this.addSql(`
      INSERT INTO "meca_id_counter" ("id", "last_meca_id")
      VALUES (1, 700499)
      ON CONFLICT ("id") DO NOTHING;
    `);

    // =========================================================================
    // 5. Create function to get next MECA ID atomically
    // =========================================================================
    this.addSql(`
      CREATE OR REPLACE FUNCTION get_next_meca_id()
      RETURNS INTEGER AS $$
      DECLARE
        next_id INTEGER;
      BEGIN
        UPDATE "meca_id_counter"
        SET "last_meca_id" = "last_meca_id" + 1, "updated_at" = NOW()
        WHERE "id" = 1
        RETURNING "last_meca_id" INTO next_id;

        RETURN next_id;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // =========================================================================
    // 6. Add constraint to ensure either membership_id or profile_id is set
    // =========================================================================
    this.addSql(`
      ALTER TABLE "meca_id_history"
      ADD CONSTRAINT "chk_meca_id_owner"
      CHECK (
        ("membership_id" IS NOT NULL AND "profile_id" IS NULL) OR
        ("membership_id" IS NULL AND "profile_id" IS NOT NULL)
      );
    `);

    // =========================================================================
    // 7. Migrate existing profile MECA IDs to memberships (if any)
    // =========================================================================
    // This is a complex migration that handles users with multiple memberships.
    // For each user, we assign their profile's MECA ID to their first (oldest) paid membership.
    // Other memberships will get new MECA IDs assigned by the service layer later.

    // First, update only the first membership per user to have their profile's MECA ID
    // Use a CTE to find the first membership for each user
    this.addSql(`
      WITH first_memberships AS (
        SELECT DISTINCT ON (m."user_id")
          m."id" as membership_id,
          p."meca_id" as profile_meca_id
        FROM "memberships" m
        JOIN "profiles" p ON m."user_id" = p."id"
        WHERE p."meca_id" IS NOT NULL
          AND p."meca_id" ~ '^[0-9]+$'
          AND m."payment_status" = 'paid'
        ORDER BY m."user_id", m."created_at" ASC
      )
      UPDATE "memberships" m
      SET "meca_id" = CAST(fm.profile_meca_id AS INTEGER)
      FROM first_memberships fm
      WHERE m."id" = fm.membership_id
        AND m."meca_id" IS NULL;
    `);

    // Create history records for migrated MECA IDs
    this.addSql(`
      INSERT INTO "meca_id_history" ("meca_id", "membership_id", "assigned_at", "notes")
      SELECT
        m."meca_id",
        m."id",
        COALESCE(m."created_at", NOW()),
        'Migrated from profile during system upgrade'
      FROM "memberships" m
      WHERE m."meca_id" IS NOT NULL
      ON CONFLICT DO NOTHING;
    `);

    // Update the counter to be at least as high as existing MECA IDs
    this.addSql(`
      UPDATE "meca_id_counter"
      SET "last_meca_id" = GREATEST("last_meca_id",
        COALESCE(
          (SELECT MAX("meca_id") FROM "memberships" WHERE "meca_id" IS NOT NULL),
          (SELECT MAX(CAST("meca_id" AS INTEGER)) FROM "profiles" WHERE "meca_id" IS NOT NULL AND "meca_id" ~ '^[0-9]+$'),
          700499
        )
      )
      WHERE "id" = 1;
    `);

    // =========================================================================
    // 8. Add team_members reference for MECA ID based membership tracking
    // =========================================================================
    this.addSql(`
      ALTER TABLE "team_members"
      ADD COLUMN IF NOT EXISTS "membership_id" UUID REFERENCES "memberships"("id") ON DELETE SET NULL;
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_team_members_membership_id" ON "team_members"("membership_id");
    `);
  }

  async down(): Promise<void> {
    // Remove team_members membership_id
    this.addSql(`ALTER TABLE "team_members" DROP COLUMN IF EXISTS "membership_id";`);

    // Remove check constraint
    this.addSql(`ALTER TABLE "meca_id_history" DROP CONSTRAINT IF EXISTS "chk_meca_id_owner";`);

    // Drop function
    this.addSql(`DROP FUNCTION IF EXISTS get_next_meca_id();`);

    // Drop meca_id_counter table
    this.addSql(`DROP TABLE IF EXISTS "meca_id_counter";`);

    // Drop meca_id_history table
    this.addSql(`DROP TABLE IF EXISTS "meca_id_history";`);

    // Remove teams membership_id
    this.addSql(`DROP INDEX IF EXISTS "idx_teams_membership_id";`);
    this.addSql(`ALTER TABLE "teams" DROP COLUMN IF EXISTS "membership_id";`);

    // Remove memberships new columns
    this.addSql(`
      ALTER TABLE "memberships"
      DROP COLUMN IF EXISTS "meca_id",
      DROP COLUMN IF EXISTS "competitor_name",
      DROP COLUMN IF EXISTS "vehicle_license_plate",
      DROP COLUMN IF EXISTS "vehicle_color",
      DROP COLUMN IF EXISTS "vehicle_make",
      DROP COLUMN IF EXISTS "vehicle_model",
      DROP COLUMN IF EXISTS "has_team_addon",
      DROP COLUMN IF EXISTS "team_name_last_edited";
    `);
  }
}
