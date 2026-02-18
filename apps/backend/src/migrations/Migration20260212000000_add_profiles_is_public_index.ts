import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Add partial index on profiles.is_public
 *
 * The Members Directory queries profiles WHERE is_public = true.
 * Without this index, every request does a full table scan.
 * The teams table already has a similar index (idx_teams_is_public).
 */
export class Migration20260212000000_add_profiles_is_public_index extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_profiles_is_public" ON "public"."profiles" USING "btree" ("is_public") WHERE "is_public" = true;`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "idx_profiles_is_public";`);
  }
}
