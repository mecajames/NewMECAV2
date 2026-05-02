import { Migration } from '@mikro-orm/migrations';

/**
 * Adds a `suspended` flag to qa_rounds so admins can pause an active round
 * (e.g. while developers ship fixes) without forcing it to COMPLETED.
 *
 * While suspended:
 *   - reviewers can still see the round but cannot submit responses
 *   - developers cannot submit fixes against responses in this round
 *   - the dashboard surfaces a "Paused" badge to reviewers
 *
 * Independent of `status` — a DRAFT round can also be suspended (rare, but
 * cheap to support and keeps the model consistent).
 */
export class Migration20260502140000_qa_round_suspend extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."qa_rounds"
        ADD COLUMN IF NOT EXISTS "suspended" boolean NOT NULL DEFAULT false;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."qa_rounds"
        DROP COLUMN IF EXISTS "suspended";
    `);
  }
}
