import { Migration } from '@mikro-orm/migrations';

export class Migration20251117000000_add_championship_archives extends Migration {

  async up(): Promise<void> {
    // Add event_type enum type
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE event_type AS ENUM ('standard', 'state_finals', 'world_finals', 'judges_point');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add event_type column to events table
    this.addSql(`
      ALTER TABLE "events"
      ADD COLUMN IF NOT EXISTS "event_type" event_type NOT NULL DEFAULT 'standard';
    `);

    // Create championship_archives table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "championship_archives" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "season_id" uuid NOT NULL REFERENCES "seasons"("id") ON DELETE CASCADE,
        "year" integer NOT NULL,
        "title" text NOT NULL,
        "hero_image_url" text,
        "world_finals_event_id" uuid REFERENCES "events"("id") ON DELETE SET NULL,
        "published" boolean NOT NULL DEFAULT false,
        "special_awards_content" jsonb,
        "club_awards_content" jsonb,
        "additional_content" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create index on championship_archives
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_championship_archives_season" ON "championship_archives"("season_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_championship_archives_year" ON "championship_archives"("year");');
    this.addSql('CREATE UNIQUE INDEX IF NOT EXISTS "idx_championship_archives_unique_year" ON "championship_archives"("year");');

    // Create award_section enum type
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE award_section AS ENUM ('special_awards', 'club_awards');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create championship_awards table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "championship_awards" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "archive_id" uuid NOT NULL REFERENCES "championship_archives"("id") ON DELETE CASCADE,
        "section" award_section NOT NULL,
        "award_name" text NOT NULL,
        "recipient_name" text NOT NULL,
        "recipient_team" text,
        "recipient_state" text,
        "description" text,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create index on championship_awards
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_championship_awards_archive" ON "championship_awards"("archive_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_championship_awards_section" ON "championship_awards"("section");');
  }

  async down(): Promise<void> {
    // Drop championship_awards table
    this.addSql('DROP TABLE IF EXISTS "championship_awards" CASCADE;');

    // Drop award_section enum
    this.addSql('DROP TYPE IF EXISTS award_section CASCADE;');

    // Drop championship_archives table
    this.addSql('DROP TABLE IF EXISTS "championship_archives" CASCADE;');

    // Drop event_type column from events
    this.addSql('ALTER TABLE "events" DROP COLUMN IF EXISTS "event_type";');

    // Drop event_type enum
    this.addSql('DROP TYPE IF EXISTS event_type CASCADE;');
  }

}
