import { Migration } from '@mikro-orm/migrations';

/**
 * Fix: the Postgres `payment_status` ENUM was missing the `failed` and
 * `cancelled` values that the application code (Membership, Payment,
 * EventRegistration entities + Stripe webhook fulfillment) expects.
 *
 * Symptoms before the fix:
 *   - `GET /api/billing/failed-payments` returned HTTP 500 with
 *     "invalid input value for enum payment_status: \"failed\""
 *     (Postgres rejects the WHERE comparison literal).
 *   - `recordOneTimeFailure()` in stripe.controller.ts caught and logged
 *     the insert error silently, so no Payment row was ever recorded for
 *     a card-declined attempt — admins got the email but the page was
 *     empty.
 *
 * Why this happened: the baseline schema declared `payment_status` as a
 * Postgres ENUM with only {pending, paid, refunded, inactive}, but the
 * shared `PaymentStatus` enum in TypeScript includes FAILED and CANCELLED.
 *
 * Affected columns (USER-DEFINED type `payment_status`):
 *   - payments.payment_status
 *   - event_registrations.payment_status
 *
 * Both `memberships.payment_status` and `orders.payment_status` are
 * already declared as `text`, so they accept any string — they were not
 * broken. Only the two enum-typed columns triggered the 500.
 *
 * Postgres requires ALTER TYPE ... ADD VALUE to be run outside a
 * transaction. MikroORM's migrator wraps migrations in transactions by
 * default; override via the per-migration `disabled` flag below.
 */
export class Migration20260514220000_add_failed_cancelled_to_payment_status_enum extends Migration {
  // Per-migration override: ALTER TYPE ... ADD VALUE must run outside a
  // transaction in Postgres.
  isTransactional(): boolean {
    return false;
  }

  async up(): Promise<void> {
    // IF NOT EXISTS makes this idempotent against environments that may
    // have already been hot-patched manually.
    this.addSql(`ALTER TYPE "public"."payment_status" ADD VALUE IF NOT EXISTS 'failed';`);
    this.addSql(`ALTER TYPE "public"."payment_status" ADD VALUE IF NOT EXISTS 'cancelled';`);
  }

  async down(): Promise<void> {
    // Postgres does NOT support DROP VALUE on enums. Down-migration is a
    // no-op; once these values exist they stay. If you truly need to
    // remove them, rename the type, create a new one without them, and
    // migrate the columns — a heavy operation not worth automating.
  }
}
