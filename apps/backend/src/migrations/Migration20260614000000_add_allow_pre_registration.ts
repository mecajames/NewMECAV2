import { Migration } from '@mikro-orm/migrations';

/**
 * Per-event pre-registration toggle. When false (the default), the public
 * event page shows only the "I'm Interested" button; when true, it also
 * offers paid pre-registration + checkout. Not every event takes
 * pre-registrations, so this defaults OFF.
 */
export class Migration20260614000000_add_allow_pre_registration extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."events"
        ADD COLUMN IF NOT EXISTS "allow_pre_registration" boolean NOT NULL DEFAULT false;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."events" DROP COLUMN IF EXISTS "allow_pre_registration";`);
  }
}
