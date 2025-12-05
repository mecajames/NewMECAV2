import { Migration } from '@mikro-orm/migrations';

export class Migration20251205000000_enhance_event_hosting_requests extends Migration {
  async up(): Promise<void> {
    // 1. Create event_hosting_request_messages table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS public.event_hosting_request_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_id UUID NOT NULL REFERENCES public.event_hosting_requests(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
        sender_role TEXT NOT NULL,
        message TEXT NOT NULL,
        is_private BOOLEAN NOT NULL DEFAULT false,
        recipient_type TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Add indexes for messages table
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ehr_messages_request_id ON public.event_hosting_request_messages(request_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ehr_messages_sender_id ON public.event_hosting_request_messages(sender_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ehr_messages_created_at ON public.event_hosting_request_messages(created_at DESC);`);

    // 3. Add Event Director assignment columns to event_hosting_requests
    this.addSql(`ALTER TABLE public.event_hosting_requests ADD COLUMN IF NOT EXISTS assigned_event_director_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests ADD COLUMN IF NOT EXISTS assignment_notes TEXT;`);

    // 4. Add ED status columns
    this.addSql(`ALTER TABLE public.event_hosting_requests ADD COLUMN IF NOT EXISTS ed_status TEXT;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests ADD COLUMN IF NOT EXISTS ed_response_date TIMESTAMPTZ;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests ADD COLUMN IF NOT EXISTS ed_rejection_reason TEXT;`);

    // 5. Add final status columns
    this.addSql(`ALTER TABLE public.event_hosting_requests ADD COLUMN IF NOT EXISTS final_status TEXT;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests ADD COLUMN IF NOT EXISTS final_status_reason TEXT;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests ADD COLUMN IF NOT EXISTS awaiting_requestor_response BOOLEAN DEFAULT false;`);

    // 6. Add link to created event
    this.addSql(`ALTER TABLE public.event_hosting_requests ADD COLUMN IF NOT EXISTS created_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;`);

    // 7. Add indexes for new columns
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ehr_assigned_ed ON public.event_hosting_requests(assigned_event_director_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ehr_ed_status ON public.event_hosting_requests(ed_status);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ehr_final_status ON public.event_hosting_requests(final_status);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ehr_created_event ON public.event_hosting_requests(created_event_id);`);

    // 8. Migrate existing admin_response data to messages table
    // Only migrate if there's data to migrate
    this.addSql(`
      INSERT INTO public.event_hosting_request_messages (request_id, sender_id, sender_role, message, is_private, created_at, updated_at)
      SELECT
        id,
        admin_responder_id,
        'admin',
        admin_response,
        false,
        COALESCE(admin_response_date, NOW()),
        COALESCE(admin_response_date, NOW())
      FROM public.event_hosting_requests
      WHERE admin_response IS NOT NULL
        AND admin_response != ''
        AND admin_responder_id IS NOT NULL;
    `);

    // 9. Enable RLS on messages table
    this.addSql(`ALTER TABLE public.event_hosting_request_messages ENABLE ROW LEVEL SECURITY;`);

    // 10. Create RLS policies for messages table using DO blocks for IF NOT EXISTS pattern
    // Users can view messages for their own requests (excluding private messages)
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Users can view non-private messages for their requests' AND tablename = 'event_hosting_request_messages'
        ) THEN
          CREATE POLICY "Users can view non-private messages for their requests" ON public.event_hosting_request_messages
          FOR SELECT
          USING (
            (is_private = false AND request_id IN (SELECT id FROM public.event_hosting_requests WHERE user_id = auth.uid()))
            OR
            (sender_id = auth.uid())
            OR
            (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'event_director')))
          );
        END IF;
      END $$;
    `);

    // Admins and Event Directors can insert messages
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Authorized users can insert messages' AND tablename = 'event_hosting_request_messages'
        ) THEN
          CREATE POLICY "Authorized users can insert messages" ON public.event_hosting_request_messages
          FOR INSERT
          WITH CHECK (
            sender_id = auth.uid()
            OR
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'event_director'))
          );
        END IF;
      END $$;
    `);
  }

  async down(): Promise<void> {
    // Drop RLS policies
    this.addSql(`DROP POLICY IF EXISTS "Users can view non-private messages for their requests" ON public.event_hosting_request_messages;`);
    this.addSql(`DROP POLICY IF EXISTS "Authorized users can insert messages" ON public.event_hosting_request_messages;`);

    // Drop indexes
    this.addSql(`DROP INDEX IF EXISTS idx_ehr_messages_request_id;`);
    this.addSql(`DROP INDEX IF EXISTS idx_ehr_messages_sender_id;`);
    this.addSql(`DROP INDEX IF EXISTS idx_ehr_messages_created_at;`);
    this.addSql(`DROP INDEX IF EXISTS idx_ehr_assigned_ed;`);
    this.addSql(`DROP INDEX IF EXISTS idx_ehr_ed_status;`);
    this.addSql(`DROP INDEX IF EXISTS idx_ehr_final_status;`);
    this.addSql(`DROP INDEX IF EXISTS idx_ehr_created_event;`);

    // Drop messages table
    this.addSql(`DROP TABLE IF EXISTS public.event_hosting_request_messages CASCADE;`);

    // Remove columns from event_hosting_requests
    this.addSql(`ALTER TABLE public.event_hosting_requests DROP COLUMN IF EXISTS assigned_event_director_id;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests DROP COLUMN IF EXISTS assigned_at;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests DROP COLUMN IF EXISTS assignment_notes;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests DROP COLUMN IF EXISTS ed_status;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests DROP COLUMN IF EXISTS ed_response_date;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests DROP COLUMN IF EXISTS ed_rejection_reason;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests DROP COLUMN IF EXISTS final_status;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests DROP COLUMN IF EXISTS final_status_reason;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests DROP COLUMN IF EXISTS awaiting_requestor_response;`);
    this.addSql(`ALTER TABLE public.event_hosting_requests DROP COLUMN IF EXISTS created_event_id;`);
  }
}
