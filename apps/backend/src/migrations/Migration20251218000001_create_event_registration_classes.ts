import { Migration } from '@mikro-orm/migrations';

export class Migration20251218000001_create_event_registration_classes extends Migration {

  async up(): Promise<void> {
    // Create the event_registration_classes junction table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS public.event_registration_classes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE,
        competition_class_id UUID NOT NULL,
        format TEXT NOT NULL,
        class_name TEXT NOT NULL,
        fee_charged DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes for efficient queries
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_event_reg_classes_registration
      ON public.event_registration_classes(event_registration_id);
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_event_reg_classes_class
      ON public.event_registration_classes(competition_class_id);
    `);
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_event_reg_classes_format
      ON public.event_registration_classes(format);
    `);

    // Prevent duplicate class registrations for the same registration
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_event_reg_classes_unique
      ON public.event_registration_classes(event_registration_id, competition_class_id);
    `);
  }

  async down(): Promise<void> {
    // Drop indexes first
    this.addSql(`DROP INDEX IF EXISTS idx_event_reg_classes_unique;`);
    this.addSql(`DROP INDEX IF EXISTS idx_event_reg_classes_format;`);
    this.addSql(`DROP INDEX IF EXISTS idx_event_reg_classes_class;`);
    this.addSql(`DROP INDEX IF EXISTS idx_event_reg_classes_registration;`);

    // Drop the table
    this.addSql(`DROP TABLE IF EXISTS public.event_registration_classes;`);
  }
}
