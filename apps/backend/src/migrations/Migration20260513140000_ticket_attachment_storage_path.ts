import { Migration } from '@mikro-orm/migrations';

/**
 * Decouples ticket attachments from the public Supabase URL by storing the
 * bucket + storage path explicitly. Powers the new proxy-download endpoint
 * (which masks the Supabase hostname and enforces per-ticket access
 * control). file_path is kept as-is during rollout for backward compat —
 * the proxy endpoint reads storage_path first and falls back to parsing
 * file_path if the new columns weren't filled in (e.g., legacy uploads
 * mid-deploy).
 *
 * Backfill parses the existing file_path with a regex that matches the
 * standard Supabase storage URL shape:
 *   .../storage/v1/object/public/<bucket>/<path>
 * Rows whose file_path doesn't match are left NULL — the runtime fallback
 * handles them.
 *
 * Idempotent: ADD COLUMN IF NOT EXISTS + WHERE-gated backfill.
 */
export class Migration20260513140000_ticket_attachment_storage_path extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE ticket_attachments
        ADD COLUMN IF NOT EXISTS bucket text NULL,
        ADD COLUMN IF NOT EXISTS storage_path text NULL;
    `);

    this.addSql(`
      UPDATE ticket_attachments
         SET bucket = substring(file_path FROM '/storage/v1/object/(?:public|sign)/([^/?]+)/'),
             storage_path = regexp_replace(
               substring(file_path FROM '/storage/v1/object/(?:public|sign)/[^/]+/([^?]+)'),
               '\\?.*$', ''
             )
       WHERE file_path IS NOT NULL
         AND bucket IS NULL
         AND file_path ~ '/storage/v1/object/(public|sign)/';
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE ticket_attachments
        DROP COLUMN IF EXISTS storage_path,
        DROP COLUMN IF EXISTS bucket;
    `);
  }
}
