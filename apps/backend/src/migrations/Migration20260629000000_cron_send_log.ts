import { Migration } from '@mikro-orm/migrations';

/**
 * Additive: idempotency log for scheduled (cron) sends. A PRIMARY KEY on
 * (job_key, range_id) lets a job claim a given run via a single INSERT — only
 * one row per key can exist, so when every app instance fires the same cron at
 * the same instant exactly one INSERT succeeds (the rest get a unique-violation)
 * and only that one sends. Replaces the advisory-lock approach that didn't
 * serialise across instances and caused the duplicate weekly-analytics emails.
 * Touches no existing data.
 */
export class Migration20260629000000_cron_send_log extends Migration {
  override async up(): Promise<void> {
    this.addSql(`CREATE TABLE IF NOT EXISTS "public"."cron_send_log" (
      "job_key" varchar(100) NOT NULL,
      "range_id" varchar(100) NOT NULL,
      "sent_at" timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "cron_send_log_pkey" PRIMARY KEY ("job_key", "range_id")
    );`);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."cron_send_log";`);
  }
}
