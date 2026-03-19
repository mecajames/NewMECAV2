import { Migration } from '@mikro-orm/migrations';

export class Migration20260318100000_add_is_staff extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."profiles"
      ADD COLUMN IF NOT EXISTS "is_staff" boolean NOT NULL DEFAULT false;
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "profiles_is_staff_idx" ON "public"."profiles" ("is_staff") WHERE "is_staff" = true;`);

    // Backfill: any existing admin-role users should also be marked as staff
    this.addSql(`UPDATE "public"."profiles" SET "is_staff" = true WHERE "role" = 'admin';`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."profiles" DROP COLUMN IF EXISTS "is_staff";`);
  }
}
