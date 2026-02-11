import { Migration } from '@mikro-orm/migrations';

/**
 * Migration: Fix remaining duplicate indexes on orders and profiles
 *
 * - orders: idx_orders_member_id duplicates idx_orders_member (both btree on member_id)
 * - profiles: profiles_meca_id_key duplicates profiles_meca_id_unique (both unique btree on meca_id)
 */
export class Migration20260211010000_fix_remaining_duplicate_indexes extends Migration {
  async up(): Promise<void> {
    // Drop duplicate index on orders (keep idx_orders_member, drop idx_orders_member_id)
    this.addSql(`DROP INDEX IF EXISTS "idx_orders_member_id";`);

    // Drop duplicate unique constraint on profiles (keep profiles_meca_id_unique, drop profiles_meca_id_key)
    // profiles_meca_id_key is a constraint-backed index, so we must drop the constraint
    this.addSql(`ALTER TABLE "public"."profiles" DROP CONSTRAINT IF EXISTS "profiles_meca_id_key";`);
  }

  async down(): Promise<void> {
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_orders_member_id" ON "public"."orders" USING "btree" ("member_id");`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "profiles_meca_id_key" ON "public"."profiles" USING "btree" ("meca_id");`);
  }
}
