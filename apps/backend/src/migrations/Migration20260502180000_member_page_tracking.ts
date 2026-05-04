import { Migration } from '@mikro-orm/migrations';

/**
 * Adds first-party per-member page-view tracking.
 *
 *   - `profiles.analytics_opt_out` — member-controlled toggle. When true, the
 *     tracking endpoint silently no-ops for that user. Default false (members
 *     are tracked unless they opt out via account settings).
 *
 *   - `member_page_views` — one row per page navigation by a logged-in member.
 *     Captures parsed user-agent (OS family/version, browser family/version,
 *     device type) so admins don't have to read raw UA strings. Sessions are
 *     keyed by the same session_id used in login_audit_log.
 *
 *     `duration_ms` is filled in by the next page-view from the same session
 *     (we know they spent X ms on the previous page when they navigated).
 *     The last page in a session never gets a duration — that's expected.
 *
 *   - Anonymous traffic continues to flow through Google Analytics 4. Only
 *     authenticated members are written here.
 */
export class Migration20260502180000_member_page_tracking extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."profiles"
        ADD COLUMN IF NOT EXISTS "analytics_opt_out" boolean NOT NULL DEFAULT false;
    `);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."member_page_views" (
        "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"          uuid NOT NULL REFERENCES "public"."profiles"(id) ON DELETE CASCADE,
        "session_id"       uuid,
        "page_path"        text NOT NULL,
        "page_title"       text,
        "referrer"         text,
        "user_agent"       text,
        "os_family"        text,
        "os_version"       text,
        "browser_family"   text,
        "browser_version"  text,
        "device_type"      text,
        "ip_country"       text,
        "viewed_at"        timestamptz NOT NULL DEFAULT now(),
        "duration_ms"      integer
      );
    `);

    // Per-user query (admin Activity tab) — most common access pattern.
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_member_page_views_user_viewed"
        ON "public"."member_page_views" ("user_id", "viewed_at" DESC);
    `);

    // Per-session query — needed when calculating duration for the previous
    // page in the same session.
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_member_page_views_session"
        ON "public"."member_page_views" ("session_id", "viewed_at" DESC)
        WHERE "session_id" IS NOT NULL;
    `);

    // Cross-member aggregation (top pages, etc.) — separate index because
    // the leading column differs from the per-user lookup.
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_member_page_views_path_viewed"
        ON "public"."member_page_views" ("page_path", "viewed_at" DESC);
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "public"."idx_member_page_views_path_viewed";`);
    this.addSql(`DROP INDEX IF EXISTS "public"."idx_member_page_views_session";`);
    this.addSql(`DROP INDEX IF EXISTS "public"."idx_member_page_views_user_viewed";`);
    this.addSql(`DROP TABLE IF EXISTS "public"."member_page_views";`);
    this.addSql(`ALTER TABLE "public"."profiles" DROP COLUMN IF EXISTS "analytics_opt_out";`);
  }
}
