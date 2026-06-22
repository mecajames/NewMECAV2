import { Migration } from '@mikro-orm/migrations';

/**
 * Billing hardening — foundation for the unified refund/ledger model:
 *   - `refunds` table: a first-class refund ledger (gateway, amount, partial,
 *     links to the payment + source entity, who issued it). Every refund path
 *     writes a row here so partials and PayPal refunds are first-class.
 *   - payments.amount_refunded: running refunded total (so partial refunds are
 *     tracked on the payment, not just a refunded_at flag).
 *   - payments.order_id: lets an Order own MANY payments (failed attempt +
 *     retry, multiple captures) instead of a single payment_id — so the admin
 *     order view can show the full payment history.
 *   - memberships.failed_at / suspended_at: dunning lifecycle anchors that no
 *     longer overload updated_at (which the cron itself bumps) or CANCELLED.
 *   - memberships.paypal_capture_id: so a PayPal-paid membership can actually be
 *     refunded through PayPal (the refund code previously had only a Stripe path).
 *
 * Purely additive + idempotent.
 */
export class Migration20260620180000_billing_refunds_and_ledger extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."refunds" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "payment_id" uuid NULL,
        "source_type" varchar(40) NOT NULL,
        "source_id" uuid NULL,
        "gateway" varchar(20) NULL,
        "gateway_refund_id" text NULL,
        "amount" numeric(10,2) NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'USD',
        "reason" text NULL,
        "is_partial" boolean NOT NULL DEFAULT false,
        "status" varchar(20) NOT NULL DEFAULT 'succeeded',
        "created_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_refunds_payment_id" ON "public"."refunds" ("payment_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_refunds_source" ON "public"."refunds" ("source_type", "source_id");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_refunds_gateway_refund_id" ON "public"."refunds" ("gateway_refund_id");`);

    this.addSql(`ALTER TABLE "public"."payments" ADD COLUMN IF NOT EXISTS "amount_refunded" numeric(10,2) NOT NULL DEFAULT 0;`);
    this.addSql(`ALTER TABLE "public"."payments" ADD COLUMN IF NOT EXISTS "order_id" uuid NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_payments_order_id" ON "public"."payments" ("order_id");`);

    this.addSql(`ALTER TABLE "public"."memberships" ADD COLUMN IF NOT EXISTS "failed_at" timestamptz NULL;`);
    this.addSql(`ALTER TABLE "public"."memberships" ADD COLUMN IF NOT EXISTS "suspended_at" timestamptz NULL;`);
    this.addSql(`ALTER TABLE "public"."memberships" ADD COLUMN IF NOT EXISTS "paypal_capture_id" text NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."memberships" DROP COLUMN IF EXISTS "paypal_capture_id";`);
    this.addSql(`ALTER TABLE "public"."memberships" DROP COLUMN IF EXISTS "suspended_at";`);
    this.addSql(`ALTER TABLE "public"."memberships" DROP COLUMN IF EXISTS "failed_at";`);
    this.addSql(`ALTER TABLE "public"."payments" DROP COLUMN IF EXISTS "order_id";`);
    this.addSql(`ALTER TABLE "public"."payments" DROP COLUMN IF EXISTS "amount_refunded";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."refunds";`);
  }
}
