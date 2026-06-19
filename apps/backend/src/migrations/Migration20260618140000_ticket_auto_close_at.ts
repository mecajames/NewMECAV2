import { Migration } from '@mikro-orm/migrations';

/**
 * Additive: adds the per-reply staff-set auto-close countdown timestamp to
 * tickets. Touches no existing data.
 */
export class Migration20260618140000_ticket_auto_close_at extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "auto_close_at" timestamptz NULL;`);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "tickets_auto_close_at_idx" ON "public"."tickets" ("auto_close_at") WHERE "auto_close_at" IS NOT NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."tickets" DROP COLUMN IF EXISTS "auto_close_at";`);
  }
}
