import { Migration } from '@mikro-orm/migrations';

export class Migration20260302000000_add_card_tracking extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."memberships" ADD COLUMN IF NOT EXISTS "card_created_at" TIMESTAMPTZ NULL;`);
    this.addSql(`ALTER TABLE "public"."memberships" ADD COLUMN IF NOT EXISTS "card_assigned_at" TIMESTAMPTZ NULL;`);
    this.addSql(`ALTER TABLE "public"."memberships" ADD COLUMN IF NOT EXISTS "card_shipped_at" TIMESTAMPTZ NULL;`);
    this.addSql(`ALTER TABLE "public"."memberships" ADD COLUMN IF NOT EXISTS "card_tracking_number" TEXT NULL;`);
    this.addSql(`ALTER TABLE "public"."memberships" ADD COLUMN IF NOT EXISTS "card_notes" TEXT NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."memberships" DROP COLUMN IF EXISTS "card_created_at";`);
    this.addSql(`ALTER TABLE "public"."memberships" DROP COLUMN IF EXISTS "card_assigned_at";`);
    this.addSql(`ALTER TABLE "public"."memberships" DROP COLUMN IF EXISTS "card_shipped_at";`);
    this.addSql(`ALTER TABLE "public"."memberships" DROP COLUMN IF EXISTS "card_tracking_number";`);
    this.addSql(`ALTER TABLE "public"."memberships" DROP COLUMN IF EXISTS "card_notes";`);
  }
}
