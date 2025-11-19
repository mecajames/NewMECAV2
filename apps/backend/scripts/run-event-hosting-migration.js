const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create event_hosting_requests table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.event_hosting_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        business_name TEXT,
        user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        event_name TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_type_other TEXT,
        event_description TEXT NOT NULL,
        event_start_date TIMESTAMPTZ,
        event_start_time TEXT,
        event_end_date TIMESTAMPTZ,
        event_end_time TEXT,
        address_line_1 TEXT,
        address_line_2 TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT DEFAULT 'United States',
        venue_type TEXT,
        expected_participants INTEGER,
        has_hosted_before BOOLEAN,
        additional_services JSONB,
        other_services_details TEXT,
        other_requests TEXT,
        additional_info TEXT,
        estimated_budget TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_response TEXT,
        admin_response_date TIMESTAMPTZ,
        admin_responder_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Created event_hosting_requests table');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_hosting_requests_user_id ON public.event_hosting_requests(user_id);
    `);
    console.log('✓ Created index on user_id');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_hosting_requests_status ON public.event_hosting_requests(status);
    `);
    console.log('✓ Created index on status');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_hosting_requests_created_at ON public.event_hosting_requests(created_at DESC);
    `);
    console.log('✓ Created index on created_at');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_event_hosting_requests_email ON public.event_hosting_requests(email);
    `);
    console.log('✓ Created index on email');

    // Enable RLS
    await client.query(`ALTER TABLE public.event_hosting_requests ENABLE ROW LEVEL SECURITY;`);
    console.log('✓ Enabled Row Level Security');

    // Drop existing policies if they exist
    await client.query(`DROP POLICY IF EXISTS "Users can view their own event hosting requests" ON public.event_hosting_requests;`);
    await client.query(`DROP POLICY IF EXISTS "Admins can insert event hosting requests" ON public.event_hosting_requests;`);
    await client.query(`DROP POLICY IF EXISTS "Admins and users can update their own requests" ON public.event_hosting_requests;`);
    await client.query(`DROP POLICY IF EXISTS "Admins can delete event hosting requests" ON public.event_hosting_requests;`);

    // Create RLS policies
    await client.query(`
      CREATE POLICY "Users can view their own event hosting requests"
      ON public.event_hosting_requests FOR SELECT
      USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'event_director')
      ));
    `);
    console.log('✓ Created SELECT policy');

    await client.query(`
      CREATE POLICY "Admins can insert event hosting requests"
      ON public.event_hosting_requests FOR INSERT
      WITH CHECK (true);
    `);
    console.log('✓ Created INSERT policy');

    await client.query(`
      CREATE POLICY "Admins and users can update their own requests"
      ON public.event_hosting_requests FOR UPDATE
      USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      ));
    `);
    console.log('✓ Created UPDATE policy');

    await client.query(`
      CREATE POLICY "Admins can delete event hosting requests"
      ON public.event_hosting_requests FOR DELETE
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      ));
    `);
    console.log('✓ Created DELETE policy');

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
