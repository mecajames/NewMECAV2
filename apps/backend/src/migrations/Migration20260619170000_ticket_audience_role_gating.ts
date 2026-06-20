import { Migration } from '@mikro-orm/migrations';

/**
 * Audience + role gating for the support-ticket form.
 *
 * Adds two columns to BOTH ticket_departments and ticket_categories so the
 * public ticket form can show different options to guests vs logged-in members,
 * and reserve some departments/categories for specific roles (Event Director,
 * Judge):
 *   - audience       text  'all' | 'members' | 'guests'  (default 'all')
 *   - required_roles jsonb  array of role strings; when non-empty only members
 *                           whose role is in the list see the item (implies
 *                           members-only). NULL/empty = no role restriction.
 *
 * Purely additive with safe defaults, so existing rows keep their current
 * (everyone-visible) behavior. Idempotent — re-runnable.
 */
export class Migration20260619170000_ticket_audience_role_gating extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE ticket_departments
        ADD COLUMN IF NOT EXISTS audience varchar(20) NOT NULL DEFAULT 'all',
        ADD COLUMN IF NOT EXISTS required_roles jsonb NULL;
    `);
    this.addSql(`
      ALTER TABLE ticket_categories
        ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all',
        ADD COLUMN IF NOT EXISTS required_roles jsonb NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE ticket_departments
        DROP COLUMN IF EXISTS audience,
        DROP COLUMN IF EXISTS required_roles;
    `);
    this.addSql(`
      ALTER TABLE ticket_categories
        DROP COLUMN IF EXISTS audience,
        DROP COLUMN IF EXISTS required_roles;
    `);
  }
}
