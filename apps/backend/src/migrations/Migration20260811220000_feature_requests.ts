import { Migration } from '@mikro-orm/migrations';

/**
 * Member feature-request & voting system (My MECA "Feature Ideas").
 *
 * - feature_requests: member-submitted ideas with a 3-month voting window and a
 *   HIDDEN per-request interest threshold (% of active members).
 * - feature_request_votes: one vote per member per request (👍 carries a 1–10
 *   usage-likelihood rating + optional admin-only comment).
 * - feature_request_messages: turn-based, private admin ↔ single-member threads.
 *
 * Additive + idempotent.
 */
export class Migration20260811220000_feature_requests extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."feature_requests" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
        "title" text NOT NULL,
        "description" text NOT NULL,
        "status" text NOT NULL DEFAULT 'gathering_interest',
        "voting_ends_at" timestamptz NOT NULL,
        "threshold_pct" numeric(5,2) NOT NULL DEFAULT 10,
        "resubmitted_from_id" uuid NULL REFERENCES "public"."feature_requests"("id") ON DELETE SET NULL,
        "planned_release" text NULL,
        "admin_note_public" text NULL,
        "decline_public" boolean NOT NULL DEFAULT false,
        "upvotes" integer NOT NULL DEFAULT 0,
        "downvotes" integer NOT NULL DEFAULT 0,
        "avg_rating" numeric(4,2) NULL,
        "status_changed_at" timestamptz NULL,
        "status_changed_by" uuid NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_feature_requests_status" ON "public"."feature_requests" ("status");`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_feature_requests_user" ON "public"."feature_requests" ("user_id");`);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."feature_request_votes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" uuid NOT NULL REFERENCES "public"."feature_requests"("id") ON DELETE CASCADE,
        "user_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
        "vote" text NOT NULL,
        "rating" integer NULL CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 10)),
        "comment" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_feature_vote_member" UNIQUE ("request_id", "user_id")
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_feature_votes_request" ON "public"."feature_request_votes" ("request_id");`);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."feature_request_messages" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "request_id" uuid NOT NULL REFERENCES "public"."feature_requests"("id") ON DELETE CASCADE,
        "member_user_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
        "author_role" text NOT NULL,
        "author_id" uuid NOT NULL,
        "body" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_feature_messages_thread" ON "public"."feature_request_messages" ("request_id", "member_user_id", "created_at");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."feature_request_messages";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."feature_request_votes";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."feature_requests";`);
  }
}
