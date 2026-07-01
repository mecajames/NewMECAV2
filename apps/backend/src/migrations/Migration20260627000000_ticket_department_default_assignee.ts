import { Migration } from '@mikro-orm/migrations';

/**
 * Additive: per-department default assignee for support tickets. When a new
 * ticket lands in a department and no routing rule has already assigned a staff
 * member, it auto-assigns to this profile. Nullable; ON DELETE SET NULL so
 * removing a profile never orphans a department. Touches no existing data.
 */
export class Migration20260627000000_ticket_department_default_assignee extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `ALTER TABLE "public"."ticket_departments" ADD COLUMN IF NOT EXISTS "default_assignee_id" uuid NULL;`,
    );
    // Guard the FK so a partial/re-applied migration can't error on a duplicate
    // constraint name (ADD CONSTRAINT has no IF NOT EXISTS in PostgreSQL).
    this.addSql(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ticket_departments_default_assignee_id_foreign'
      ) THEN
        ALTER TABLE "public"."ticket_departments"
          ADD CONSTRAINT "ticket_departments_default_assignee_id_foreign"
          FOREIGN KEY ("default_assignee_id") REFERENCES "public"."profiles" ("id")
          ON UPDATE CASCADE ON DELETE SET NULL;
      END IF;
    END $$;`);
  }

  override async down(): Promise<void> {
    this.addSql(
      `ALTER TABLE "public"."ticket_departments" DROP CONSTRAINT IF EXISTS "ticket_departments_default_assignee_id_foreign";`,
    );
    this.addSql(
      `ALTER TABLE "public"."ticket_departments" DROP COLUMN IF EXISTS "default_assignee_id";`,
    );
  }
}
