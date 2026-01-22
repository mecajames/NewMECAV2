import { Migration } from '@mikro-orm/migrations';

export class Migration20260118000000_add_judge_ed_permissions extends Migration {
  async up(): Promise<void> {
    // Add permission fields to profiles table for Judge and Event Director features
    this.addSql(`
      ALTER TABLE "profiles"
      ADD COLUMN IF NOT EXISTS "can_apply_judge" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "can_apply_event_director" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "judge_permission_granted_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "judge_permission_granted_by" uuid REFERENCES "profiles"(id),
      ADD COLUMN IF NOT EXISTS "ed_permission_granted_at" timestamptz,
      ADD COLUMN IF NOT EXISTS "ed_permission_granted_by" uuid REFERENCES "profiles"(id),
      ADD COLUMN IF NOT EXISTS "judge_certification_expires" timestamptz,
      ADD COLUMN IF NOT EXISTS "ed_certification_expires" timestamptz;
    `);

    // Add index for quick lookup of members with permissions
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_profiles_can_apply_judge" ON "profiles" ("can_apply_judge") WHERE "can_apply_judge" = true;
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_profiles_can_apply_event_director" ON "profiles" ("can_apply_event_director") WHERE "can_apply_event_director" = true;
    `);

    // Note: No custom RLS policy needed - the profiles table already has working RLS policies
    // that handle read/write permissions. The new columns are covered by existing policies.
  }

  async down(): Promise<void> {
    // Remove indexes
    this.addSql(`DROP INDEX IF EXISTS "idx_profiles_can_apply_judge";`);
    this.addSql(`DROP INDEX IF EXISTS "idx_profiles_can_apply_event_director";`);

    // Remove columns
    this.addSql(`
      ALTER TABLE "profiles"
      DROP COLUMN IF EXISTS "can_apply_judge",
      DROP COLUMN IF EXISTS "can_apply_event_director",
      DROP COLUMN IF EXISTS "judge_permission_granted_at",
      DROP COLUMN IF EXISTS "judge_permission_granted_by",
      DROP COLUMN IF EXISTS "ed_permission_granted_at",
      DROP COLUMN IF EXISTS "ed_permission_granted_by",
      DROP COLUMN IF EXISTS "judge_certification_expires",
      DROP COLUMN IF EXISTS "ed_certification_expires";
    `);
  }
}
