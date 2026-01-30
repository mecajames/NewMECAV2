import { Migration } from '@mikro-orm/migrations';

export class Migration20260128010000_create_processed_webhook_events extends Migration {

  override async up(): Promise<void> {
    // Create processed webhook events table for Stripe idempotency
    this.addSql(`
      create table if not exists "public"."processed_webhook_events" (
        "id" uuid not null,
        "stripe_event_id" text not null,
        "event_type" text not null,
        "payment_intent_id" text null,
        "payment_type" text null,
        "metadata" jsonb null,
        "processing_result" text null,
        "error_message" text null,
        "processed_at" timestamptz not null,
        constraint "processed_webhook_events_pkey" primary key ("id")
      );
    `);

    // Create index for fast lookups on stripe_event_id
    this.addSql(`
      create index if not exists "processed_webhook_events_stripe_event_id_index"
      on "public"."processed_webhook_events" ("stripe_event_id");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "public"."processed_webhook_events";`);
  }

}
