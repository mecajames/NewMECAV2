import { Migration } from '@mikro-orm/migrations';

/**
 * Adds 'competitor' and 'manufacturer' to the user_role PostgreSQL enum.
 *
 * ALTER TYPE ... ADD VALUE cannot run inside a transaction in PostgreSQL,
 * so this migration is non-transactional. The data migration happens
 * in the next migration (Migration20260414150000).
 */
export class Migration20260414100000_add_competitor_manufacturer_roles extends Migration {
  // ALTER TYPE ADD VALUE cannot run inside a transaction
  override isTransactional(): boolean {
    return false;
  }

  async up(): Promise<void> {
    this.addSql(`ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'competitor';`);
    this.addSql(`ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'manufacturer';`);
  }

  async down(): Promise<void> {
    // Cannot remove enum values in PostgreSQL without recreating the type
  }
}
