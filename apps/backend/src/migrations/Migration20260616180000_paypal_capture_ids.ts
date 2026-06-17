import { Migration } from '@mikro-orm/migrations';

/**
 * Persist the PayPal capture id on shop orders, event registrations and World
 * Finals pre-registrations at fulfillment time, so PayPal-funded purchases can
 * be refunded in-app (the gateway needs the capture id). Stripe purchases keep
 * using their payment-intent id.
 */
export class Migration20260616180000_paypal_capture_ids extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."shop_orders" ADD COLUMN IF NOT EXISTS "paypal_capture_id" text NULL;`);
    this.addSql(`ALTER TABLE "public"."event_registrations" ADD COLUMN IF NOT EXISTS "paypal_capture_id" text NULL;`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" ADD COLUMN IF NOT EXISTS "paypal_capture_id" text NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."shop_orders" DROP COLUMN IF EXISTS "paypal_capture_id";`);
    this.addSql(`ALTER TABLE "public"."event_registrations" DROP COLUMN IF EXISTS "paypal_capture_id";`);
    this.addSql(`ALTER TABLE "public"."finals_registrations" DROP COLUMN IF EXISTS "paypal_capture_id";`);
  }
}
