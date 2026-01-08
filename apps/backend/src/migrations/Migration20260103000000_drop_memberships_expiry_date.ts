import { Migration } from '@mikro-orm/migrations';

export class Migration20260103000000_drop_memberships_expiry_date extends Migration {
  async up(): Promise<void> {
    // Drop the legacy expiry_date column from memberships table
    // This column was replaced by end_date in Migration20251207000000_add_memberships_columns
    this.addSql('ALTER TABLE "memberships" DROP COLUMN IF EXISTS "expiry_date";');
  }

  async down(): Promise<void> {
    // Re-add the expiry_date column if needed to rollback
    this.addSql('ALTER TABLE "memberships" ADD COLUMN "expiry_date" TIMESTAMPTZ;');

    // Copy end_date values back to expiry_date
    this.addSql('UPDATE "memberships" SET "expiry_date" = "end_date" WHERE "end_date" IS NOT NULL;');
  }
}
