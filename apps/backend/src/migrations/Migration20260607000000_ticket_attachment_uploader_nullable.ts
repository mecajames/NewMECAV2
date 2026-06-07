import { Migration } from '@mikro-orm/migrations';

/**
 * Make ticket_attachments.uploader_id nullable so guest (magic-link,
 * non-member) ticket users can attach screenshots — they have no profile to
 * reference as the uploader. Additive/idempotent: DROP NOT NULL is safe to
 * re-run.
 */
export class Migration20260607000000_ticket_attachment_uploader_nullable extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE ticket_attachments ALTER COLUMN uploader_id DROP NOT NULL;`);
  }

  override async down(): Promise<void> {
    // Only re-imposes NOT NULL if no guest (null-uploader) rows exist.
    this.addSql(`ALTER TABLE ticket_attachments ALTER COLUMN uploader_id SET NOT NULL;`);
  }
}
