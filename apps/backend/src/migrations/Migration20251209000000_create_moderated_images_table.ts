import { Migration } from '@mikro-orm/migrations';

export class Migration20251209000000_create_moderated_images_table extends Migration {
  async up(): Promise<void> {
    // Create moderated_images table for tracking image visibility/moderation status
    this.addSql(`
      CREATE TABLE IF NOT EXISTS public.moderated_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        image_type VARCHAR(20) NOT NULL DEFAULT 'profile',
        is_hidden BOOLEAN NOT NULL DEFAULT false,
        moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        moderated_at TIMESTAMPTZ DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(user_id, image_url)
      );
    `);

    // Create indexes for efficient lookups
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_moderated_images_user_id ON public.moderated_images(user_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_moderated_images_is_hidden ON public.moderated_images(is_hidden);`);

    // Create moderation_log table for tracking all moderation actions
    this.addSql(`
      CREATE TABLE IF NOT EXISTS public.moderation_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        moderator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL,
        reason VARCHAR(100),
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Create indexes for moderation log
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_moderation_log_user_id ON public.moderation_log(user_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_moderation_log_moderator_id ON public.moderation_log(moderator_id);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_moderation_log_action ON public.moderation_log(action);`);
    this.addSql(`CREATE INDEX IF NOT EXISTS idx_moderation_log_created_at ON public.moderation_log(created_at);`);

    // Enable RLS
    this.addSql(`ALTER TABLE public.moderated_images ENABLE ROW LEVEL SECURITY;`);
    this.addSql(`ALTER TABLE public.moderation_log ENABLE ROW LEVEL SECURITY;`);

    // RLS policies for moderated_images - admins can manage, users can read their own
    this.addSql(`
      CREATE POLICY "Admins can manage moderated images" ON public.moderated_images
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        );
    `);

    this.addSql(`
      CREATE POLICY "Users can view their own moderated images" ON public.moderated_images
        FOR SELECT
        USING (user_id = auth.uid());
    `);

    // RLS policies for moderation_log - admins only
    this.addSql(`
      CREATE POLICY "Admins can view moderation log" ON public.moderation_log
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        );
    `);

    this.addSql(`
      CREATE POLICY "Admins can insert moderation log" ON public.moderation_log
        FOR INSERT
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          )
        );
    `);
  }

  async down(): Promise<void> {
    // Drop policies
    this.addSql(`DROP POLICY IF EXISTS "Admins can manage moderated images" ON public.moderated_images;`);
    this.addSql(`DROP POLICY IF EXISTS "Users can view their own moderated images" ON public.moderated_images;`);
    this.addSql(`DROP POLICY IF EXISTS "Admins can view moderation log" ON public.moderation_log;`);
    this.addSql(`DROP POLICY IF EXISTS "Admins can insert moderation log" ON public.moderation_log;`);

    // Drop tables
    this.addSql(`DROP TABLE IF EXISTS public.moderation_log;`);
    this.addSql(`DROP TABLE IF EXISTS public.moderated_images;`);
  }
}
