import { Migration } from '@mikro-orm/migrations';

export class Migration20251218000000_enhance_event_registrations extends Migration {

  async up(): Promise<void> {
    // Make user_id nullable to allow guest registrations
    this.addSql(`
      ALTER TABLE public.event_registrations
      ALTER COLUMN user_id DROP NOT NULL;
    `);

    // Add contact information fields
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS first_name TEXT,
      ADD COLUMN IF NOT EXISTS last_name TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT;
    `);

    // Add address fields
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS address TEXT,
      ADD COLUMN IF NOT EXISTS city TEXT,
      ADD COLUMN IF NOT EXISTS state TEXT,
      ADD COLUMN IF NOT EXISTS postal_code TEXT,
      ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
    `);

    // Add vehicle information fields
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS vehicle_year TEXT,
      ADD COLUMN IF NOT EXISTS vehicle_make TEXT,
      ADD COLUMN IF NOT EXISTS vehicle_model TEXT,
      ADD COLUMN IF NOT EXISTS vehicle_info TEXT;
    `);

    // Add Stripe payment fields
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
      ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
    `);

    // Add membership upsell fields
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS membership_purchased_during_registration BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS membership_id UUID REFERENCES public.memberships(id);
    `);

    // Add notes field
    this.addSql(`
      ALTER TABLE public.event_registrations
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);

    // Create indexes for common queries
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_event_registrations_email ON public.event_registrations(email);
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_event_registrations_stripe_payment_intent ON public.event_registrations(stripe_payment_intent_id);
    `);
  }

  async down(): Promise<void> {
    // Remove indexes
    this.addSql(`DROP INDEX IF EXISTS idx_event_registrations_email;`);
    this.addSql(`DROP INDEX IF EXISTS idx_event_registrations_stripe_payment_intent;`);

    // Remove notes field
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS notes;`);

    // Remove membership upsell fields
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS membership_id;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS membership_purchased_during_registration;`);

    // Remove Stripe payment fields
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS stripe_customer_id;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS stripe_payment_intent_id;`);

    // Remove vehicle information fields
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS vehicle_info;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS vehicle_model;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS vehicle_make;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS vehicle_year;`);

    // Remove address fields
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS country;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS postal_code;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS state;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS city;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS address;`);

    // Remove contact information fields
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS phone;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS last_name;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS first_name;`);
    this.addSql(`ALTER TABLE public.event_registrations DROP COLUMN IF EXISTS email;`);

    // Note: We don't restore NOT NULL on user_id as it could fail if there's data
    // This should be handled carefully in production
  }
}
