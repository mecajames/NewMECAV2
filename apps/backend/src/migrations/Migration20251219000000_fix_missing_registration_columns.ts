import { Migration } from '@mikro-orm/migrations';

export class Migration20251219000000_fix_missing_registration_columns extends Migration {

  async up(): Promise<void> {
    // Add registration_status column
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'pending';
    `);

    // Add payment_status column
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
    `);

    // Add amount_paid column
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10, 2);
    `);

    // Add transaction_id column
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS transaction_id TEXT;
    `);

    // Add registered_at column
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS registered_at;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS transaction_id;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS amount_paid;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS payment_status;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS registration_status;`);
  }
}
