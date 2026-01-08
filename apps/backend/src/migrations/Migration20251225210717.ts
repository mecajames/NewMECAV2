import { Migration } from '@mikro-orm/migrations';

export class Migration20251225210717 extends Migration {

  override async up(): Promise<void> {
    // Create meca_id_history table if it doesn't exist
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "meca_id_history" (
        "id" uuid not null,
        "meca_id" int not null,
        "membership_id" uuid null,
        "profile_id" uuid null,
        "assigned_at" timestamptz not null,
        "expired_at" timestamptz null,
        "reactivated_at" timestamptz null,
        "previous_end_date" timestamptz null,
        "notes" text null,
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null,
        constraint "meca_id_history_pkey" primary key ("id")
      );
    `);

    // Add foreign keys for meca_id_history if not exist
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meca_id_history_membership_id_foreign') THEN
          ALTER TABLE "meca_id_history" ADD CONSTRAINT "meca_id_history_membership_id_foreign"
            FOREIGN KEY ("membership_id") REFERENCES "memberships" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meca_id_history_profile_id_foreign') THEN
          ALTER TABLE "meca_id_history" ADD CONSTRAINT "meca_id_history_profile_id_foreign"
            FOREIGN KEY ("profile_id") REFERENCES "profiles" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Add new columns to memberships table if they don't exist
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'meca_id') THEN
          ALTER TABLE "memberships" ADD COLUMN "meca_id" int null;
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'competitor_name') THEN
          -- Check if email column exists and rename it
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'email') THEN
            ALTER TABLE "memberships" RENAME COLUMN "email" TO "competitor_name";
          ELSE
            ALTER TABLE "memberships" ADD COLUMN "competitor_name" text null;
          END IF;
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'vehicle_license_plate') THEN
          ALTER TABLE "memberships" ADD COLUMN "vehicle_license_plate" text null;
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'vehicle_color') THEN
          ALTER TABLE "memberships" ADD COLUMN "vehicle_color" text null;
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'vehicle_make') THEN
          ALTER TABLE "memberships" ADD COLUMN "vehicle_make" text null;
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'vehicle_model') THEN
          ALTER TABLE "memberships" ADD COLUMN "vehicle_model" text null;
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'has_team_addon') THEN
          ALTER TABLE "memberships" ADD COLUMN "has_team_addon" boolean not null default false;
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'team_name_last_edited') THEN
          ALTER TABLE "memberships" ADD COLUMN "team_name_last_edited" timestamptz null;
        END IF;
      END $$;
    `);

    // Add unique constraint for meca_id if not exists
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memberships_meca_id_unique') THEN
          ALTER TABLE "memberships" ADD CONSTRAINT "memberships_meca_id_unique" UNIQUE ("meca_id");
        END IF;
      END $$;
    `);

    // Add meca_id to event_registrations if not exists
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'meca_id') THEN
          ALTER TABLE "event_registrations" ADD COLUMN "meca_id" int null;
        END IF;
      END $$;
    `);

    // Add membership_id to teams if not exists
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'membership_id') THEN
          ALTER TABLE "teams" ADD COLUMN "membership_id" uuid null;
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_membership_id_foreign') THEN
          ALTER TABLE "teams" ADD CONSTRAINT "teams_membership_id_foreign"
            FOREIGN KEY ("membership_id") REFERENCES "memberships" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Add membership_id to team_members if not exists
    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'membership_id') THEN
          ALTER TABLE "team_members" ADD COLUMN "membership_id" uuid null;
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_membership_id_foreign') THEN
          ALTER TABLE "team_members" ADD CONSTRAINT "team_members_membership_id_foreign"
            FOREIGN KEY ("membership_id") REFERENCES "memberships" ("id") ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Create the get_next_meca_id function for atomic MECA ID generation
    this.addSql(`
      CREATE OR REPLACE FUNCTION get_next_meca_id() RETURNS INTEGER AS $$
      DECLARE
        next_id INTEGER;
      BEGIN
        SELECT COALESCE(MAX(meca_id), 700499) + 1 INTO next_id FROM memberships;
        RETURN next_id;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  override async down(): Promise<void> {
    // Drop the function
    this.addSql(`DROP FUNCTION IF EXISTS get_next_meca_id();`);

    // Drop foreign keys
    this.addSql(`ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_membership_id_foreign";`);
    this.addSql(`ALTER TABLE "team_members" DROP CONSTRAINT IF EXISTS "team_members_membership_id_foreign";`);
    this.addSql(`ALTER TABLE "meca_id_history" DROP CONSTRAINT IF EXISTS "meca_id_history_membership_id_foreign";`);
    this.addSql(`ALTER TABLE "meca_id_history" DROP CONSTRAINT IF EXISTS "meca_id_history_profile_id_foreign";`);

    // Drop columns
    this.addSql(`ALTER TABLE "teams" DROP COLUMN IF EXISTS "membership_id";`);
    this.addSql(`ALTER TABLE "team_members" DROP COLUMN IF EXISTS "membership_id";`);
    this.addSql(`ALTER TABLE "event_registrations" DROP COLUMN IF EXISTS "meca_id";`);

    // Drop meca_id constraint and columns from memberships
    this.addSql(`ALTER TABLE "memberships" DROP CONSTRAINT IF EXISTS "memberships_meca_id_unique";`);
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "meca_id";`);
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "vehicle_license_plate";`);
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "vehicle_color";`);
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "vehicle_make";`);
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "vehicle_model";`);
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "has_team_addon";`);
    this.addSql(`ALTER TABLE "memberships" DROP COLUMN IF EXISTS "team_name_last_edited";`);

    // Rename competitor_name back to email
    this.addSql(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'memberships' AND column_name = 'competitor_name') THEN
          ALTER TABLE "memberships" RENAME COLUMN "competitor_name" TO "email";
        END IF;
      END $$;
    `);

    // Drop meca_id_history table
    this.addSql(`DROP TABLE IF EXISTS "meca_id_history";`);
  }

}
