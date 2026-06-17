import { Migration } from '@mikro-orm/migrations';

/**
 * Managed, department-scoped ticket categories. The support form becomes
 * Department → Category. Seeds the existing 9 category KEYS (so current
 * tickets, routing rules, and custom-field bindings keep working) and maps
 * each under a sensible department. Admins can then add department-specific
 * categories (e.g. Events → Points / Results / Staff) from the admin UI.
 */
export class Migration20260616160000_ticket_categories extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."ticket_categories" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "key" text NOT NULL,
        "label" text NOT NULL,
        "department_id" uuid NULL,
        "description" text NULL,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ticket_categories_key_unique" UNIQUE ("key"),
        CONSTRAINT "ticket_categories_department_fk" FOREIGN KEY ("department_id")
          REFERENCES "public"."ticket_departments" ("id") ON DELETE SET NULL
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "ticket_categories_department_idx" ON "public"."ticket_categories" ("department_id");`);

    // Seed existing keys, mapped to departments by slug.
    const rows: Array<[string, string, string, number]> = [
      ['general', 'General', 'general_support', 1],
      ['membership', 'Membership', 'membership_services', 2],
      ['event_registration', 'Event Registration', 'event_operations', 3],
      ['payment', 'Payment', 'billing', 4],
      ['technical', 'Technical', 'technical_support', 5],
      ['competition_results', 'Competition Results', 'score_points', 6],
      ['event_hosting', 'Event Hosting', 'event_operations', 7],
      ['account', 'Account', 'technical_support', 8],
      ['other', 'Other', 'general_support', 9],
    ];
    for (const [key, label, deptSlug, order] of rows) {
      this.addSql(
        `INSERT INTO "public"."ticket_categories" ("id", "key", "label", "department_id", "display_order", "is_active")
         VALUES (gen_random_uuid(), '${key}', '${label}',
           (SELECT "id" FROM "public"."ticket_departments" WHERE "slug" = '${deptSlug}' LIMIT 1),
           ${order}, true)
         ON CONFLICT ("key") DO NOTHING;`,
      );
    }
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."ticket_categories";`);
  }
}
