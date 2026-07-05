import { Migration } from '@mikro-orm/migrations';

/**
 * Remove the member activity-tracking opt-out (James, 2026-07-04).
 *
 * Activity tracking is part of the membership agreement — EVERY member is
 * tracked. The member-facing Privacy toggle has been removed from the
 * profile page, the backend tracker no longer consults the flag, and the
 * profile update endpoint strips it from any payload. This migration turns
 * tracking back ON for anyone who had opted out, so nobody stays untracked
 * after the deploy.
 *
 * The column itself is kept (harmless, always false) to avoid a breaking
 * schema change for anything still selecting it.
 */
export class Migration20260704020000_remove_analytics_opt_out extends Migration {
  async up(): Promise<void> {
    this.addSql(`UPDATE public.profiles SET analytics_opt_out = false WHERE analytics_opt_out = true;`);
    this.addSql(`COMMENT ON COLUMN public.profiles.analytics_opt_out IS 'DEPRECATED 2026-07-04: member opt-out removed — tracking is part of the membership agreement. Always false; not consulted by code.';`);
  }

  async down(): Promise<void> {
    // No-op: the opt-out choices were deliberately discarded and cannot be
    // restored.
  }
}
