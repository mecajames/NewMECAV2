import { Migration } from '@mikro-orm/migrations';

export class Migration20251219000002_fix_full_name_constraint extends Migration {

  async up(): Promise<void> {
    // Make full_name nullable since we now use first_name and last_name separately
    this.addSql(`
      ALTER TABLE public.event_registrations
      ALTER COLUMN full_name DROP NOT NULL;
    `);
  }

  async down(): Promise<void> {
    // Note: This could fail if there are null values
    this.addSql(`
      ALTER TABLE public.event_registrations
      ALTER COLUMN full_name SET NOT NULL;
    `);
  }
}
