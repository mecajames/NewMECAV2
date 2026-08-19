import { Migration } from '@mikro-orm/migrations';

/**
 * World Finals add-on class scoping: optional list of class names an add-on
 * applies to (narrower than the formats list). NULL/empty = all classes in
 * the allowed formats.
 */
export class Migration20260818210000_wf_addon_class_names extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE public.world_finals_addon_items ADD COLUMN IF NOT EXISTS class_names jsonb NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE public.world_finals_addon_items DROP COLUMN IF EXISTS class_names;`);
  }
}
