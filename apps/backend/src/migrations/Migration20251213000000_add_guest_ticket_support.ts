import { Migration } from '@mikro-orm/migrations';

export class Migration20251213000000_add_guest_ticket_support extends Migration {

  async up(): Promise<void> {
    // Create ticket_guest_tokens table for email verification
    this.addSql(`
      CREATE TABLE IF NOT EXISTS public.ticket_guest_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        purpose TEXT NOT NULL DEFAULT 'create_ticket',
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes for guest tokens
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ticket_guest_tokens_email ON public.ticket_guest_tokens(email);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ticket_guest_tokens_token ON public.ticket_guest_tokens(token);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_ticket_guest_tokens_expires_at ON public.ticket_guest_tokens(expires_at);`);

    // Add guest-related columns to tickets table
    this.addSql(`ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS guest_email TEXT;`);
    this.addSql(`ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS guest_name TEXT;`);
    this.addSql(`ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE;`);
    this.addSql(`ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS is_guest_ticket BOOLEAN NOT NULL DEFAULT false;`);

    // Make reporter_id nullable for guest tickets
    this.addSql(`ALTER TABLE public.tickets ALTER COLUMN reporter_id DROP NOT NULL;`);

    // Create indexes for guest ticket access
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_tickets_guest_email ON public.tickets(guest_email) WHERE guest_email IS NOT NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_tickets_access_token ON public.tickets(access_token) WHERE access_token IS NOT NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_tickets_is_guest ON public.tickets(is_guest_ticket) WHERE is_guest_ticket = true;`);

    // Add guest-related columns to ticket_comments for guest responses
    this.addSql(`ALTER TABLE public.ticket_comments ADD COLUMN IF NOT EXISTS guest_author_name TEXT;`);
    this.addSql(`ALTER TABLE public.ticket_comments ADD COLUMN IF NOT EXISTS is_guest_comment BOOLEAN NOT NULL DEFAULT false;`);

    // Make author_id nullable for guest comments
    this.addSql(`ALTER TABLE public.ticket_comments ALTER COLUMN author_id DROP NOT NULL;`);

    // Update RLS policy for guest ticket viewing
    this.addSql(`
      DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
      CREATE POLICY "Users can view their own tickets"
      ON public.tickets FOR SELECT
      USING (
        reporter_id = auth.uid() OR
        assigned_to_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role IN ('admin', 'event_director')
        ) OR
        (is_guest_ticket = true AND access_token IS NOT NULL)
      );
    `);

    // Update insert policy to allow guest tickets (they'll be inserted via service role)
    this.addSql(`
      DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
      CREATE POLICY "Authenticated users can create tickets"
      ON public.tickets FOR INSERT
      WITH CHECK (
        (auth.uid() IS NOT NULL AND reporter_id = auth.uid()) OR
        (is_guest_ticket = true AND guest_email IS NOT NULL)
      );
    `);

    // Add policy for guest comment viewing
    this.addSql(`
      DROP POLICY IF EXISTS "Users can view comments on accessible tickets" ON public.ticket_comments;
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
            ) OR
            (t.is_guest_ticket = true AND t.access_token IS NOT NULL)
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
    `);

    // Add policy for guest comments
    this.addSql(`
      DROP POLICY IF EXISTS "Users can create comments on accessible tickets" ON public.ticket_comments;
      CREATE POLICY "Users can create comments on accessible tickets"
      ON public.ticket_comments FOR INSERT
      WITH CHECK (
        (
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
        ) OR
        (
          is_guest_comment = true AND
          guest_author_name IS NOT NULL AND
          EXISTS (
            SELECT 1 FROM public.tickets t
            WHERE t.id = ticket_id
            AND t.is_guest_ticket = true
          )
        )
      );
    `);

    // Enable RLS on guest tokens table (will be accessed via service role only)
    this.addSql(`ALTER TABLE public.ticket_guest_tokens ENABLE ROW LEVEL SECURITY;`);

    // No public policies for guest tokens - only service role can access
    this.addSql(`
      CREATE POLICY "Service role only for guest tokens"
      ON public.ticket_guest_tokens FOR ALL
      USING (false)
      WITH CHECK (false);
    `);
  }

  async down(): Promise<void> {
    // Restore original RLS policies
    this.addSql(`
      DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
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
    `);

    this.addSql(`
      DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
      CREATE POLICY "Authenticated users can create tickets"
      ON public.tickets FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = auth.uid());
    `);

    // Remove guest columns from ticket_comments
    this.addSql(`ALTER TABLE public.ticket_comments DROP COLUMN IF EXISTS guest_author_name;`);
    this.addSql(`ALTER TABLE public.ticket_comments DROP COLUMN IF EXISTS is_guest_comment;`);
    this.addSql(`ALTER TABLE public.ticket_comments ALTER COLUMN author_id SET NOT NULL;`);

    // Remove guest columns from tickets
    this.addSql(`ALTER TABLE public.tickets DROP COLUMN IF EXISTS guest_email;`);
    this.addSql(`ALTER TABLE public.tickets DROP COLUMN IF EXISTS guest_name;`);
    this.addSql(`ALTER TABLE public.tickets DROP COLUMN IF EXISTS access_token;`);
    this.addSql(`ALTER TABLE public.tickets DROP COLUMN IF EXISTS is_guest_ticket;`);
    this.addSql(`ALTER TABLE public.tickets ALTER COLUMN reporter_id SET NOT NULL;`);

    // Drop guest tokens table
    this.addSql(`DROP POLICY IF EXISTS "Service role only for guest tokens" ON public.ticket_guest_tokens;`);
    this.addSql(`DROP TABLE IF EXISTS public.ticket_guest_tokens;`);
  }
}
