import { Migration } from '@mikro-orm/migrations';

/**
 * Add linked_profile_hint to tickets. This is a staff-only context pointer used
 * when a guest ticket was actually submitted by someone we recognise — e.g. an
 * expired member routed through the guest support flow. Those tickets must NOT
 * link the person as the reporter (that would risk granting them My MECA
 * access), so this nullable column holds the profile id purely so staff can pull
 * up full account context from the admin ticket view.
 *
 * Idempotent: ADD COLUMN IF NOT EXISTS lets the migration re-run safely.
 */
export class Migration20260605000000_ticket_linked_profile_hint extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS linked_profile_hint uuid NULL;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE tickets DROP COLUMN IF EXISTS linked_profile_hint;`);
  }
}
