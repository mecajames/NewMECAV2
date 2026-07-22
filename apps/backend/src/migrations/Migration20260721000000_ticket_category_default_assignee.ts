import { Migration } from '@mikro-orm/migrations';

/**
 * Additive: per-category auto-assign override for support tickets. When a new
 * ticket's category has an assignee set, it wins over the department's default
 * assignee. Nullable; ON DELETE SET NULL so removing a profile never orphans a
 * category. Touches no existing data.
 */
export class Migration20260721000000_ticket_category_default_assignee extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `ALTER TABLE "public"."ticket_categories" ADD COLUMN IF NOT EXISTS "default_assignee_id" uuid NULL;`,
    );
    // Guard the FK so a partial/re-applied migration can't error on a duplicate
    // constraint name (ADD CONSTRAINT has no IF NOT EXISTS in PostgreSQL).
    this.addSql(`DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ticket_categories_default_assignee_id_foreign'
      ) THEN
        ALTER TABLE "public"."ticket_categories"
          ADD CONSTRAINT "ticket_categories_default_assignee_id_foreign"
          FOREIGN KEY ("default_assignee_id") REFERENCES "public"."profiles" ("id")
          ON UPDATE CASCADE ON DELETE SET NULL;
      END IF;
    END $$;`);
  }

  override async down(): Promise<void> {
    this.addSql(
      `ALTER TABLE "public"."ticket_categories" DROP CONSTRAINT IF EXISTS "ticket_categories_default_assignee_id_foreign";`,
    );
    this.addSql(
      `ALTER TABLE "public"."ticket_categories" DROP COLUMN IF EXISTS "default_assignee_id";`,
    );
  }
}
