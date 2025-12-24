import { Migration } from '@mikro-orm/migrations';

export class Migration20251211000000_create_tickets_tables extends Migration {

  async up(): Promise<void> {
    // Create tickets table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS public.tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_number TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        department TEXT NOT NULL DEFAULT 'general_support',
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'open',
        reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        assigned_to_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes for tickets
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_tickets_ticket_number ON public.tickets(ticket_number);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_tickets_reporter_id ON public.tickets(reporter_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to_id ON public.tickets(assigned_to_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_tickets_category ON public.tickets(category);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_tickets_department ON public.tickets(department);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at DESC);`);

    // Create ticket_comments table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS public.ticket_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
        author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_internal BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes for ticket_comments
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON public.ticket_comments(ticket_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ticket_comments_author_id ON public.ticket_comments(author_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ticket_comments_created_at ON public.ticket_comments(created_at ASC);`);

    // Create ticket_attachments table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS public.ticket_attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
        comment_id UUID REFERENCES public.ticket_comments(id) ON DELETE CASCADE,
        uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes for ticket_attachments
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON public.ticket_attachments(ticket_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ticket_attachments_comment_id ON public.ticket_attachments(comment_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ticket_attachments_uploader_id ON public.ticket_attachments(uploader_id);`);

    // Enable RLS
    this.addSql(`ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;`);
    this.addSql(`ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;`);
    this.addSql(`ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;`);

    // RLS policies for tickets
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own tickets' AND tablename = 'tickets'
        ) THEN
          CREATE POLICY "Users can view their own tickets"
          ON public.tickets FOR SELECT
          USING (
            reporter_id = auth.uid() OR
            assigned_to_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'event_director')
            )
          );
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create tickets' AND tablename = 'tickets'
        ) THEN
          CREATE POLICY "Authenticated users can create tickets"
          ON public.tickets FOR INSERT
          WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = auth.uid());
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Ticket owners and staff can update tickets' AND tablename = 'tickets'
        ) THEN
          CREATE POLICY "Ticket owners and staff can update tickets"
          ON public.tickets FOR UPDATE
          USING (
            reporter_id = auth.uid() OR
            assigned_to_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role IN ('admin', 'event_director')
            )
          );
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Only admins can delete tickets' AND tablename = 'tickets'
        ) THEN
          CREATE POLICY "Only admins can delete tickets"
          ON public.tickets FOR DELETE
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );
        END IF;
      END $$;
    `);

    // RLS policies for ticket_comments
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Users can view comments on accessible tickets' AND tablename = 'ticket_comments'
        ) THEN
          CREATE POLICY "Users can view comments on accessible tickets"
          ON public.ticket_comments FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.tickets t
              WHERE t.id = ticket_id
              AND (
                t.reporter_id = auth.uid() OR
                t.assigned_to_id = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM public.profiles
                  WHERE profiles.id = auth.uid()
                  AND profiles.role IN ('admin', 'event_director')
                )
              )
            )
            AND (
              is_internal = false OR
              EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'event_director')
              )
            )
          );
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Users can create comments on accessible tickets' AND tablename = 'ticket_comments'
        ) THEN
          CREATE POLICY "Users can create comments on accessible tickets"
          ON public.ticket_comments FOR INSERT
          WITH CHECK (
            auth.uid() IS NOT NULL AND
            author_id = auth.uid() AND
            EXISTS (
              SELECT 1 FROM public.tickets t
              WHERE t.id = ticket_id
              AND (
                t.reporter_id = auth.uid() OR
                t.assigned_to_id = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM public.profiles
                  WHERE profiles.id = auth.uid()
                  AND profiles.role IN ('admin', 'event_director')
                )
              )
            )
          );
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own comments' AND tablename = 'ticket_comments'
        ) THEN
          CREATE POLICY "Users can update their own comments"
          ON public.ticket_comments FOR UPDATE
          USING (
            author_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own comments' AND tablename = 'ticket_comments'
        ) THEN
          CREATE POLICY "Users can delete their own comments"
          ON public.ticket_comments FOR DELETE
          USING (
            author_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );
        END IF;
      END $$;
    `);

    // RLS policies for ticket_attachments
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Users can view attachments on accessible tickets' AND tablename = 'ticket_attachments'
        ) THEN
          CREATE POLICY "Users can view attachments on accessible tickets"
          ON public.ticket_attachments FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.tickets t
              WHERE t.id = ticket_id
              AND (
                t.reporter_id = auth.uid() OR
                t.assigned_to_id = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM public.profiles
                  WHERE profiles.id = auth.uid()
                  AND profiles.role IN ('admin', 'event_director')
                )
              )
            )
          );
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Users can add attachments to accessible tickets' AND tablename = 'ticket_attachments'
        ) THEN
          CREATE POLICY "Users can add attachments to accessible tickets"
          ON public.ticket_attachments FOR INSERT
          WITH CHECK (
            auth.uid() IS NOT NULL AND
            uploader_id = auth.uid() AND
            EXISTS (
              SELECT 1 FROM public.tickets t
              WHERE t.id = ticket_id
              AND (
                t.reporter_id = auth.uid() OR
                t.assigned_to_id = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM public.profiles
                  WHERE profiles.id = auth.uid()
                  AND profiles.role IN ('admin', 'event_director')
                )
              )
            )
          );
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own attachments' AND tablename = 'ticket_attachments'
        ) THEN
          CREATE POLICY "Users can delete their own attachments"
          ON public.ticket_attachments FOR DELETE
          USING (
            uploader_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );
        END IF;
      END $$;
    `);

    // Create storage bucket for ticket attachments
    this.addSql(`
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'ticket-attachments',
        'ticket-attachments',
        false,
        10485760,
        ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      )
      ON CONFLICT (id) DO NOTHING;
    `);
  }

  async down(): Promise<void> {
    // Drop RLS policies
    this.addSql(`DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.ticket_attachments;`);
    this.addSql(`DROP POLICY IF EXISTS "Users can add attachments to accessible tickets" ON public.ticket_attachments;`);
    this.addSql(`DROP POLICY IF EXISTS "Users can view attachments on accessible tickets" ON public.ticket_attachments;`);
    this.addSql(`DROP POLICY IF EXISTS "Users can delete their own comments" ON public.ticket_comments;`);
    this.addSql(`DROP POLICY IF EXISTS "Users can update their own comments" ON public.ticket_comments;`);
    this.addSql(`DROP POLICY IF EXISTS "Users can create comments on accessible tickets" ON public.ticket_comments;`);
    this.addSql(`DROP POLICY IF EXISTS "Users can view comments on accessible tickets" ON public.ticket_comments;`);
    this.addSql(`DROP POLICY IF EXISTS "Only admins can delete tickets" ON public.tickets;`);
    this.addSql(`DROP POLICY IF EXISTS "Ticket owners and staff can update tickets" ON public.tickets;`);
    this.addSql(`DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;`);
    this.addSql(`DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;`);

    // Drop tables
    this.addSql(`DROP TABLE IF EXISTS public.ticket_attachments CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS public.ticket_comments CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS public.tickets CASCADE;`);

    // Remove storage bucket
    this.addSql(`DELETE FROM storage.buckets WHERE id = 'ticket-attachments';`);
  }
}
