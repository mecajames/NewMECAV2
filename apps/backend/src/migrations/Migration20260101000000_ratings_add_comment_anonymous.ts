import { Migration } from '@mikro-orm/migrations';

export class Migration20260101000000_ratings_add_comment_anonymous extends Migration {
  async up(): Promise<void> {
    // Add comment and is_anonymous columns to ratings table
    this.addSql(`
      ALTER TABLE "ratings"
      ADD COLUMN IF NOT EXISTS "comment" text,
      ADD COLUMN IF NOT EXISTS "is_anonymous" boolean NOT NULL DEFAULT true;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "ratings"
      DROP COLUMN IF EXISTS "comment",
      DROP COLUMN IF EXISTS "is_anonymous";
    `);
  }
}
