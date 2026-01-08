import { Migration } from '@mikro-orm/migrations';

export class Migration20251231000000 extends Migration {
  async up(): Promise<void> {
    // Create event_director_assignments table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS public.event_director_assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
        event_director_id UUID NOT NULL REFERENCES public.event_directors(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'requested',
        request_type VARCHAR(50) NOT NULL,
        requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        responded_at TIMESTAMPTZ,
        decline_reason TEXT,
        admin_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT event_director_assignments_unique UNIQUE (event_id, event_director_id)
      );
    `);

    // Add indexes for better query performance
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_ed_assignments_event
      ON public.event_director_assignments(event_id);
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_ed_assignments_director
      ON public.event_director_assignments(event_director_id);
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_ed_assignments_status
      ON public.event_director_assignments(status);
    `);

    // Add trigger for updated_at
    this.addSql(`
      CREATE TRIGGER update_ed_assignments_updated_at
        BEFORE UPDATE ON public.event_director_assignments
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TRIGGER IF EXISTS update_ed_assignments_updated_at ON public.event_director_assignments;`);
    this.addSql(`DROP TABLE IF EXISTS public.event_director_assignments;`);
  }
}
