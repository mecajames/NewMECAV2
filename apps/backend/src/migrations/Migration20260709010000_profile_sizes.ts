import { Migration } from '@mikro-orm/migrations';

/**
 * Member merch/award sizes (James, 2026-07-09).
 *
 * - profiles.tshirt_size: for event merch planning (which sizes to stock at
 *   which events) and World Finals packages.
 * - profiles.ring_size: for World Finals championship rings (awarded to
 *   qualifiers — having the size on file means no chasing winners later).
 *
 * Both are PRIVATE: collected at membership checkout (optional) and editable
 * in the member's own profile; visible to admins on the member page. Never
 * shown on any public page.
 */
export class Migration20260709010000_profile_sizes extends Migration {
  async up(): Promise<void> {
    this.addSql(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tshirt_size text;`);
    this.addSql(`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ring_size text;`);
    this.addSql(`COMMENT ON COLUMN profiles.tshirt_size IS 'Private member t-shirt size — event merch planning + World Finals packages; never public.';`);
    this.addSql(`COMMENT ON COLUMN profiles.ring_size IS 'Private member ring size — World Finals championship rings; never public.';`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE profiles DROP COLUMN IF EXISTS tshirt_size;`);
    this.addSql(`ALTER TABLE profiles DROP COLUMN IF EXISTS ring_size;`);
  }
}
