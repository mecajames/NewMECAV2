import { Migration } from '@mikro-orm/migrations';

/**
 * Field-to-field conditional visibility for custom ticket fields. A field with
 * a show_when rule is shown only when another field's value matches; when
 * hidden it is never required and its answer is dropped.
 * Shape: { field_id, operator: equals|one_of|is_checked|not_empty, values: [] }
 */
export class Migration20260616140000_ticket_field_show_when extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."ticket_custom_fields"
        ADD COLUMN IF NOT EXISTS "show_when" jsonb NULL;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."ticket_custom_fields" DROP COLUMN IF EXISTS "show_when";`);
  }
}
