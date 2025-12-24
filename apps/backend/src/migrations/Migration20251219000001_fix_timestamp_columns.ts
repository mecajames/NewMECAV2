import { Migration } from '@mikro-orm/migrations';

export class Migration20251219000001_fix_timestamp_columns extends Migration {

  async up(): Promise<void> {
    // Add created_at column
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    `);

    // Add updated_at column
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS updated_at;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS created_at;`);
  }
}
