import { Migration } from '@mikro-orm/migrations';

export class Migration20260306000000_create_spl_world_records extends Migration {
  async up(): Promise<void> {
    // Main table: one row per SPL class (current world record holder)
    this.addSql(`
      CREATE TABLE IF NOT EXISTS public.spl_world_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        class_id UUID NOT NULL UNIQUE,
        class_name TEXT NOT NULL,
        event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
        event_name TEXT,
        season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
        competitor_name TEXT NOT NULL,
        meca_id TEXT,
        competitor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        score DECIMAL(10,2) NOT NULL,
        wattage INTEGER,
        frequency INTEGER,
        notes TEXT,
        record_date TIMESTAMPTZ,
        created_by UUID NOT NULL REFERENCES public.profiles(id),
        updated_by UUID REFERENCES public.profiles(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
      );
    `);

    // History table: archives old records when replaced
    this.addSql(`
      CREATE TABLE IF NOT EXISTS public.spl_world_records_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        record_id UUID NOT NULL REFERENCES public.spl_world_records(id) ON DELETE CASCADE,
        class_id UUID NOT NULL,
        class_name TEXT NOT NULL,
        event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
        event_name TEXT,
        season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
        competitor_name TEXT NOT NULL,
        meca_id TEXT,
        competitor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        score DECIMAL(10,2) NOT NULL,
        wattage INTEGER,
        frequency INTEGER,
        notes TEXT,
        record_date TIMESTAMPTZ,
        created_by UUID NOT NULL REFERENCES public.profiles(id),
        updated_by UUID REFERENCES public.profiles(id),
        replaced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ
      );
    `);

    // Index for fast lookups on history by class
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_spl_world_records_history_class_id ON public.spl_world_records_history(class_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_spl_world_records_history_record_id ON public.spl_world_records_history(record_id);`);

    // RLS policies
    this.addSql(`ALTER TABLE public.spl_world_records ENABLE ROW LEVEL SECURITY;`);
    this.addSql(`ALTER TABLE public.spl_world_records_history ENABLE ROW LEVEL SECURITY;`);

    // Public read access
    this.addSql(`
      CREATE POLICY spl_world_records_select ON public.spl_world_records
        FOR SELECT USING (true);
    `);
    this.addSql(`
      CREATE POLICY spl_world_records_history_select ON public.spl_world_records_history
        FOR SELECT USING (true);
    `);

    // Service role full access
    this.addSql(`
      CREATE POLICY spl_world_records_service ON public.spl_world_records
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    `);
    this.addSql(`
      CREATE POLICY spl_world_records_history_service ON public.spl_world_records_history
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS public.spl_world_records_history;`);
    this.addSql(`DROP TABLE IF EXISTS public.spl_world_records;`);
  }
}
