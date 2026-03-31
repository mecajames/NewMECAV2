import { Migration } from '@mikro-orm/migrations';

export class Migration20260327000000_meca_id_invalidation extends Migration {
  override async up(): Promise<void> {
    // Add meca_id_invalidated_at to profiles to track when a MECA ID was permanently invalidated
    this.addSql(`ALTER TABLE "public"."profiles" ADD COLUMN IF NOT EXISTS "meca_id_invalidated_at" timestamptz;`);
    // Add meca_id_invalidated to memberships to track which MECA IDs have been retired
    this.addSql(`ALTER TABLE "public"."memberships" ADD COLUMN IF NOT EXISTS "meca_id_invalidated_at" timestamptz;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."profiles" DROP COLUMN IF EXISTS "meca_id_invalidated_at";`);
    this.addSql(`ALTER TABLE "public"."memberships" DROP COLUMN IF EXISTS "meca_id_invalidated_at";`);
  }
}
