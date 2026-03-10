import { Migration } from '@mikro-orm/migrations';

export class Migration20260309000000_add_webhook_event_unique_constraint extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."processed_webhook_events"
      ADD CONSTRAINT "processed_webhook_events_stripe_event_id_unique"
      UNIQUE ("stripe_event_id");
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."processed_webhook_events"
      DROP CONSTRAINT IF EXISTS "processed_webhook_events_stripe_event_id_unique";
    `);
  }
}
