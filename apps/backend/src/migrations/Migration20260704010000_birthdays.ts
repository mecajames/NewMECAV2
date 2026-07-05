import { Migration } from '@mikro-orm/migrations';

/**
 * Member birthday emails (James, 2026-07-04).
 *
 * - profiles.birthday: PRIVATE date the member sets in their profile. Never
 *   shown publicly — only drives the automated birthday email.
 * - birthday_email_log: one row per (member, year) send attempt. The UNIQUE
 *   constraint doubles as the once-per-year claim (concurrent cron instances
 *   insert with ON CONFLICT DO NOTHING — only the winner sends), and the
 *   rows power the admin "sent / failed" indicators on the upcoming-
 *   birthdays list.
 */
export class Migration20260704010000_birthdays extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday date;`);
    this.addSql(`COMMENT ON COLUMN profiles.birthday IS 'Private member birthday — drives the automated birthday email only; never public.';`);

    this.addSql(`
      CREATE TABLE IF NOT EXISTS birthday_email_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        year integer NOT NULL,
        email text,
        status text NOT NULL DEFAULT 'pending',
        error text,
        sent_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT birthday_email_log_profile_year_unique UNIQUE (profile_id, year)
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_birthday_email_log_year ON birthday_email_log (year);`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS birthday_email_log;`);
    this.addSql(`ALTER TABLE profiles DROP COLUMN IF EXISTS birthday;`);
  }
}
