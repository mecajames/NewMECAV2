import { Migration } from '@mikro-orm/migrations';

/**
 * Additive: bookkeeping for the assignee nag-email escalator (unanswered
 * ticket reminders at 48h, 96h, then every 8h).
 *   - assigned_at: when the CURRENT assignee got the ticket (re-stamped on
 *     reassignment; the reminder clock anchors on it).
 *   - assignee_reminder_count / assignee_reminded_at: how many nags the
 *     current cycle has sent and when the last one went out.
 * Backfills assigned_at with updated_at for already-assigned tickets so old
 * tickets don't all nag at once the moment this deploys.
 */
export class Migration20260721120000_ticket_assignee_reminders extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "assigned_at" timestamptz NULL;`);
    this.addSql(`ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "assignee_reminder_count" integer NOT NULL DEFAULT 0;`);
    this.addSql(`ALTER TABLE "public"."tickets" ADD COLUMN IF NOT EXISTS "assignee_reminded_at" timestamptz NULL;`);
    this.addSql(
      `UPDATE "public"."tickets" SET "assigned_at" = "updated_at" WHERE "assigned_to_id" IS NOT NULL AND "assigned_at" IS NULL;`,
    );
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."tickets" DROP COLUMN IF EXISTS "assignee_reminded_at";`);
    this.addSql(`ALTER TABLE "public"."tickets" DROP COLUMN IF EXISTS "assignee_reminder_count";`);
    this.addSql(`ALTER TABLE "public"."tickets" DROP COLUMN IF EXISTS "assigned_at";`);
  }
}
