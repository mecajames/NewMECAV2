import { Migration } from '@mikro-orm/migrations';

/**
 * World Finals add-on format scoping: optional list of competition formats
 * (e.g. ["SPL"]) an add-on applies to. NULL/empty = offered to everyone.
 */
export class Migration20260818200000_wf_addon_formats extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE public.world_finals_addon_items ADD COLUMN IF NOT EXISTS formats jsonb NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE public.world_finals_addon_items DROP COLUMN IF EXISTS formats;`);
  }
}
