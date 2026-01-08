import { Migration } from '@mikro-orm/migrations';

export class Migration20260104140000_add_read_at_to_notifications extends Migration {
  async up(): Promise<void> {
    // Add read_at column to notifications table if it doesn't exist
    this.addSql(`
      ALTER TABLE "public"."notifications"
      ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMPTZ;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."notifications"
      DROP COLUMN IF EXISTS "read_at";
    `);
  }
}
