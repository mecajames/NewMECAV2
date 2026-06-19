import { Migration } from '@mikro-orm/migrations';

/**
 * Additive: per-comment content format. 'text' (default/legacy plain) or 'html'
 * (sanitized rich-text staff replies). Touches no existing data.
 */
export class Migration20260618150000_ticket_comment_content_format extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."ticket_comments" ADD COLUMN IF NOT EXISTS "content_format" text;`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."ticket_comments" DROP COLUMN IF EXISTS "content_format";`);
  }
}
