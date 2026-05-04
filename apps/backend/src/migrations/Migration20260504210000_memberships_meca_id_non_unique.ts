import { Migration } from '@mikro-orm/migrations';

/**
 * `memberships.meca_id` was incorrectly UNIQUE.
 *
 * MECA IDs identify a *person* across years, and renewals create new
 * membership rows that share the same MECA ID — that's the whole point of
 * the grace-period reactivation logic in MecaIdService.assignMecaIdToMembership
 * and the new admin manual-renewal flow. The unique constraint blocked any
 * second insert with the same MECA ID, breaking renewals (500 with
 * "duplicate key value violates unique constraint memberships_meca_id_key").
 *
 * The source of truth for unique identification per person lives on
 * `profiles.meca_id` (which keeps its own unique constraint). On the
 * memberships table, MECA ID is a per-year snapshot — multiple rows with
 * the same value is correct and expected.
 *
 * Replaces the unique index with a plain btree index so MECA-ID lookups
 * (findByMecaId, getUserMecaIds, etc.) stay fast.
 */
export class Migration20260504210000_memberships_meca_id_non_unique extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."memberships" DROP CONSTRAINT IF EXISTS "memberships_meca_id_key";`);
    this.addSql(`DROP INDEX IF EXISTS "public"."memberships_meca_id_key";`);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_memberships_meca_id"
        ON "public"."memberships" ("meca_id")
        WHERE "meca_id" IS NOT NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "public"."idx_memberships_meca_id";`);
    // Re-adding the unique constraint can fail if duplicate meca_ids now exist
    // (which is the whole point of removing it). We don't try to clean up
    // duplicates on rollback — admins should resolve them manually.
    this.addSql(`ALTER TABLE "public"."memberships" ADD CONSTRAINT "memberships_meca_id_key" UNIQUE ("meca_id");`);
  }
}
