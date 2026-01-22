import { Migration } from '@mikro-orm/migrations';

/**
 * Remove duplicate index on orders.member_id
 *
 * The orders table has two identical indexes on member_id:
 * - idx_orders_member
 * - idx_orders_member_id
 *
 * This removes the duplicate to fix the "Duplicate Index" performance warning.
 */
export class Migration20260121600000_remove_duplicate_index extends Migration {
  async up(): Promise<void> {
    // Drop the duplicate index (keeping idx_orders_member_id which follows standard naming)
    this.addSql('DROP INDEX IF EXISTS "idx_orders_member";');
  }

  async down(): Promise<void> {
    // Recreate the index if needed
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_orders_member" ON "orders" ("member_id");');
  }
}
