import { Migration } from '@mikro-orm/migrations';

export class Migration20260103000000_world_finals_qualification extends Migration {
  async up(): Promise<void> {
    // Add qualification_points_threshold to seasons table
    this.addSql(`
      ALTER TABLE "public"."seasons"
      ADD COLUMN IF NOT EXISTS "qualification_points_threshold" INTEGER DEFAULT NULL;
    `);

    // Add comment explaining the column
    this.addSql(`
      COMMENT ON COLUMN "public"."seasons"."qualification_points_threshold" IS
      'Minimum points required for a competitor to qualify for World Finals. NULL means no qualification threshold set.';
    `);

    // Create world_finals_qualifications table to track who has qualified
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."world_finals_qualifications" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "season_id" UUID NOT NULL REFERENCES "public"."seasons"("id") ON DELETE CASCADE,
        "meca_id" INTEGER NOT NULL,
        "competitor_name" TEXT NOT NULL,
        "user_id" UUID REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
        "total_points" INTEGER NOT NULL DEFAULT 0,
        "qualified_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "notification_sent" BOOLEAN NOT NULL DEFAULT FALSE,
        "notification_sent_at" TIMESTAMPTZ,
        "email_sent" BOOLEAN NOT NULL DEFAULT FALSE,
        "email_sent_at" TIMESTAMPTZ,
        "invitation_sent" BOOLEAN NOT NULL DEFAULT FALSE,
        "invitation_sent_at" TIMESTAMPTZ,
        "invitation_token" TEXT,
        "invitation_redeemed" BOOLEAN NOT NULL DEFAULT FALSE,
        "invitation_redeemed_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE("season_id", "meca_id")
      );
    `);

    // Create indexes
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_world_finals_qualifications_season"
      ON "public"."world_finals_qualifications"("season_id");
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_world_finals_qualifications_meca_id"
      ON "public"."world_finals_qualifications"("meca_id");
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_world_finals_qualifications_user"
      ON "public"."world_finals_qualifications"("user_id");
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_world_finals_qualifications_token"
      ON "public"."world_finals_qualifications"("invitation_token");
    `);

    // Add comment explaining the table
    this.addSql(`
      COMMENT ON TABLE "public"."world_finals_qualifications" IS
      'Tracks competitors who have qualified for World Finals based on meeting the season qualification points threshold';
    `);

    // Enable RLS on the new table
    this.addSql(`
      ALTER TABLE "public"."world_finals_qualifications" ENABLE ROW LEVEL SECURITY;
    `);

    // RLS policies: Users can view their own qualifications, admins can view all
    this.addSql(`
      DROP POLICY IF EXISTS "world_finals_qualifications_select_own" ON "public"."world_finals_qualifications";
      CREATE POLICY "world_finals_qualifications_select_own" ON "public"."world_finals_qualifications"
        FOR SELECT
        USING (
          user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'event_director')
          )
        );
    `);

    // Admin can insert/update/delete
    this.addSql(`
      DROP POLICY IF EXISTS "world_finals_qualifications_admin_all" ON "public"."world_finals_qualifications";
      CREATE POLICY "world_finals_qualifications_admin_all" ON "public"."world_finals_qualifications"
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        );
    `);
  }

  async down(): Promise<void> {
    // Drop RLS policies
    this.addSql(`
      DROP POLICY IF EXISTS "world_finals_qualifications_select_own" ON "public"."world_finals_qualifications";
    `);
    this.addSql(`
      DROP POLICY IF EXISTS "world_finals_qualifications_admin_all" ON "public"."world_finals_qualifications";
    `);

    // Drop the qualifications table
    this.addSql(`
      DROP TABLE IF EXISTS "public"."world_finals_qualifications";
    `);

    // Remove the column from seasons
    this.addSql(`
      ALTER TABLE "public"."seasons"
      DROP COLUMN IF EXISTS "qualification_points_threshold";
    `);
  }
}
