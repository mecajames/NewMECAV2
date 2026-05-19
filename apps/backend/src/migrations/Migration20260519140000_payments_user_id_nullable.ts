import { Migration } from '@mikro-orm/migrations';

/**
 * Make payments.user_id nullable.
 *
 * Why: Stripe sends payment_intent.payment_failed for recurring subscription
 * auto-charges where the PaymentIntent has no `metadata.userId` / no email
 * we can match against a local Profile (subscription was set up before we
 * had per-user metadata, or via a flow that didn't propagate it). Without
 * the ability to write a Payment row for these orphan failures, they
 * vanished — admins got the alert email but the failure never appeared in
 * /admin/billing/failed-payments, leaving no auditable trail.
 *
 * After this migration, recordOneTimeFailure always persists a Payment row
 * (user can be null when we can't resolve it via metadata, prior Payment by
 * stripe_customer_id, or a Stripe API lookup of the customer email).
 */
export class Migration20260519140000_payments_user_id_nullable extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."payments" ALTER COLUMN "user_id" DROP NOT NULL;`);
  }

  async down(): Promise<void> {
    // Restoring NOT NULL requires that no orphan rows exist. We delete any
    // null-user rows on rollback to keep the down() idempotent in dev — in
    // production this rollback should only be run after manually backfilling
    // or deleting orphan failures.
    this.addSql(`DELETE FROM "public"."payments" WHERE "user_id" IS NULL;`);
    this.addSql(`ALTER TABLE "public"."payments" ALTER COLUMN "user_id" SET NOT NULL;`);
  }
}
