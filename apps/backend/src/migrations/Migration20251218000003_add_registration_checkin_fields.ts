import { Migration } from '@mikro-orm/migrations';

export class Migration20251218000003_add_registration_checkin_fields extends Migration {

  async up(): Promise<void> {
    // Add QR code and check-in fields to event_registrations
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS check_in_code TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS qr_code_data TEXT,
      ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS checked_in_by UUID REFERENCES public.profiles(id);
    `);

    // Create index for fast check-in code lookups
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_event_reg_check_in_code
      ON public.event_registrations(check_in_code)
      WHERE check_in_code IS NOT NULL;
    `);

    // Create index for querying checked-in registrations
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_event_reg_checked_in
      ON public.event_registrations(event_id, checked_in)
      WHERE checked_in = TRUE;
    `);
  }

  async down(): Promise<void> {
    // Remove indexes
    this.addSql(`DROP INDEX IF EXISTS idx_event_reg_checked_in;`);
    this.addSql(`DROP INDEX IF EXISTS idx_event_reg_check_in_code;`);

    // Remove check-in fields
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS checked_in_by;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS checked_in_at;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS checked_in;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS qr_code_data;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS check_in_code;`);
  }
}
