import { Migration } from '@mikro-orm/migrations';

/**
 * Round 3 of the feature-request system: categories + support-ticket
 * conversion (needs-details draft loop).
 *
 * - feature_requests.category: fixed set (website/events/awards/formats/classes).
 *   Defaulted to 'website' — safe: the base tables shipped in the same release,
 *   so prod has no rows yet.
 * - feature_requests.source_ticket_id: the support ticket this idea was
 *   converted from (traceability, one-conversion-per-ticket guard).
 * - feature_requests.details_deadline_at + revision_used: the one-time,
 *   72h-default completion window for too-thin conversions (needs_details).
 * - tickets.converted_feature_request_id: marks a ticket as converted — such a
 *   ticket is hard-closed and can never be reopened by the member.
 *
 * Additive + idempotent.
 */
export class Migration20260812100000_feature_request_conversion extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."feature_requests" ADD COLUMN IF NOT EXISTS "category" text NOT NULL DEFAULT 'website';`);
    this.addSql(`ALTER TABLE "public"."feature_requests" ADD COLUMN IF NOT EXISTS "source_ticket_id" uuid NULL;`);
    this.addSql(`ALTER TABLE "public"."feature_requests" ADD COLUMN IF NOT EXISTS "details_deadline_at" timestamptz NULL;`);
    this.addSql(`ALTER TABLE "public"."feature_requests" ADD COLUMN IF NOT EXISTS "revision_used" boolean NOT NULL DEFAULT false;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_feature_requests_category" ON "public"."feature_requests" ("category");`);
    this.addSql(`ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "converted_feature_request_id" uuid NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."tickets" DROP COLUMN IF EXISTS "converted_feature_request_id";`);
    this.addSql(`ALTER TABLE "public"."feature_requests" DROP COLUMN IF EXISTS "revision_used";`);
    this.addSql(`ALTER TABLE "public"."feature_requests" DROP COLUMN IF EXISTS "details_deadline_at";`);
    this.addSql(`ALTER TABLE "public"."feature_requests" DROP COLUMN IF EXISTS "source_ticket_id";`);
    this.addSql(`ALTER TABLE "public"."feature_requests" DROP COLUMN IF EXISTS "category";`);
  }
}
