import { Migration } from '@mikro-orm/migrations';

/**
 * Lets the reporter rate their support experience when they close their
 * own ticket on reply. Both columns are nullable so existing rows and
 * admin-closed tickets stay valid (rating is reporter-driven only).
 *
 * customer_rating uses a smallint + CHECK constraint instead of a Postgres
 * enum so future rating-scale tweaks don't require an enum migration.
 * Idempotent: ADD COLUMN IF NOT EXISTS + a guarded ADD CONSTRAINT lets the
 * migration re-run after a hot-fix path.
 */
export class Migration20260513100000_ticket_customer_rating extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE tickets
        ADD COLUMN IF NOT EXISTS customer_rating smallint NULL,
        ADD COLUMN IF NOT EXISTS customer_feedback text NULL;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
           WHERE conname = 'tickets_customer_rating_range'
        ) THEN
          ALTER TABLE tickets
            ADD CONSTRAINT tickets_customer_rating_range
            CHECK (customer_rating IS NULL OR (customer_rating BETWEEN 1 AND 5));
        END IF;
      END $$;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE tickets
        DROP CONSTRAINT IF EXISTS tickets_customer_rating_range;
    `);
    this.addSql(`
      ALTER TABLE tickets
        DROP COLUMN IF EXISTS customer_feedback,
        DROP COLUMN IF EXISTS customer_rating;
    `);
  }
}
