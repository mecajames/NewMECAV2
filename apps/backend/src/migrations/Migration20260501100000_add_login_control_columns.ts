import { Migration } from '@mikro-orm/migrations';

/**
 * Adds per-profile login control fields used by the admin Members page:
 *   - maintenance_login_allowed: lets a non-admin member sign in while the
 *     site is in maintenance mode (otherwise only admins are exempt).
 *   - login_banned (+ at/by/reason): hard-blocks the user from accessing the
 *     API. Mirrored to Supabase auth.users.banned_until via ban_duration so
 *     active sessions are kicked and future sign-ins fail.
 */
export class Migration20260501100000_add_login_control_columns extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."profiles"
        ADD COLUMN IF NOT EXISTS "maintenance_login_allowed" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "login_banned"              boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "login_banned_at"           timestamptz,
        ADD COLUMN IF NOT EXISTS "login_banned_by"           uuid REFERENCES "public"."profiles"(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS "login_banned_reason"       text;
    `);

    // Partial index — most users are not banned, so this stays tiny while
    // making the global ban-status lookup on every authed request fast.
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_profiles_login_banned"
        ON "public"."profiles" (id)
        WHERE "login_banned" = true;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "public"."idx_profiles_login_banned";`);
    this.addSql(`
      ALTER TABLE "public"."profiles"
        DROP COLUMN IF EXISTS "login_banned_reason",
        DROP COLUMN IF EXISTS "login_banned_by",
        DROP COLUMN IF EXISTS "login_banned_at",
        DROP COLUMN IF EXISTS "login_banned",
        DROP COLUMN IF EXISTS "maintenance_login_allowed";
    `);
  }
}
