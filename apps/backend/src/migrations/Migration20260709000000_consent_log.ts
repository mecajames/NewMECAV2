import { Migration } from '@mikro-orm/migrations';

/**
 * Cookie-consent audit log (James, 2026-07-09) — backs the site's consent
 * banner (CMP). One row per explicit banner choice, proving when a visitor
 * granted/declined analytics cookies (GDPR/CIPA/CCPA audit trail).
 *
 * Deliberately minimal PII: anonymous visitor_id (random uuid minted in the
 * visitor's browser) + user agent. No IP address. user_id kept nullable for
 * possible future member linkage — unused today.
 */
export class Migration20260709000000_consent_log extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS consent_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        visitor_id text NOT NULL,
        user_id uuid,
        choice text NOT NULL,
        analytics boolean NOT NULL DEFAULT false,
        functional boolean NOT NULL DEFAULT false,
        user_agent text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_consent_log_created_at ON consent_log (created_at);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_consent_log_visitor ON consent_log (visitor_id);`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS consent_log;`);
  }
}
