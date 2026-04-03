import { Migration } from '@mikro-orm/migrations';

export class Migration20260402000000_add_paypal_support extends Migration {
  async up(): Promise<void> {
    // Add PayPal columns to payments table
    this.addSql(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paypal_order_id" text;`);
    this.addSql(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paypal_capture_id" text;`);

    // Create processed_paypal_webhooks table for idempotency
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "processed_paypal_webhooks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "paypal_event_id" text NOT NULL UNIQUE,
        "event_type" text NOT NULL,
        "paypal_order_id" text,
        "processing_result" text DEFAULT 'success',
        "error_message" text,
        "processed_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Add index on paypal_event_id for fast lookups
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_processed_paypal_webhooks_event_id" ON "processed_paypal_webhooks" ("paypal_event_id");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "processed_paypal_webhooks";`);
    this.addSql(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "paypal_order_id";`);
    this.addSql(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "paypal_capture_id";`);
  }
}
