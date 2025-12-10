import { Migration } from '@mikro-orm/migrations';

export class Migration20251206000000_create_teams_tables extends Migration {

  async up(): Promise<void> {
    // Create teams table with indexes
    this.addSql(`
      CREATE TABLE IF NOT EXISTS public.teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        logo_url TEXT,
        captain_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_teams_captain_id ON public.teams(captain_id);
      CREATE INDEX IF NOT EXISTS idx_teams_season_id ON public.teams(season_id);
      CREATE INDEX IF NOT EXISTS idx_teams_is_active ON public.teams(is_active);
    `);

    // Create team_members table with indexes
    this.addSql(`
      CREATE TABLE IF NOT EXISTS public.team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(team_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
      CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
    `);

    // Enable RLS
    this.addSql(`ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;`);
    this.addSql(`ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;`);

    // RLS policies for teams table
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view active teams' AND tablename = 'teams'
        ) THEN
          CREATE POLICY "Anyone can view active teams"
          ON public.teams FOR SELECT
          USING (is_active = true OR captain_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          ));
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create teams' AND tablename = 'teams'
        ) THEN
          CREATE POLICY "Authenticated users can create teams"
          ON public.teams FOR INSERT
          WITH CHECK (auth.uid() IS NOT NULL);
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Captains and admins can update teams' AND tablename = 'teams'
        ) THEN
          CREATE POLICY "Captains and admins can update teams"
          ON public.teams FOR UPDATE
          USING (captain_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          ));
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Captains and admins can delete teams' AND tablename = 'teams'
        ) THEN
          CREATE POLICY "Captains and admins can delete teams"
          ON public.teams FOR DELETE
          USING (captain_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
          ));
        END IF;
      END $$;
    `);

    // RLS policies for team_members table
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view team members' AND tablename = 'team_members'
        ) THEN
          CREATE POLICY "Anyone can view team members"
          ON public.team_members FOR SELECT
          USING (true);
        END IF;
      END $$;
    `);

    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies WHERE policyname = 'Team captains and admins can add members' AND tablename = 'team_members'
        ) THEN
          CREATE POLICY "Team captains and admins can add members"
          ON public.team_members FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.teams
              WHERE teams.id = team_id
              AND teams.captain_id = auth.uid()
            ) OR EXISTS (
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
          SELECT 1 FROM pg_policies WHERE policyname = 'Team captains and admins can remove members' AND tablename = 'team_members'
        ) THEN
          CREATE POLICY "Team captains and admins can remove members"
          ON public.team_members FOR DELETE
          USING (
            user_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM public.teams
              WHERE teams.id = team_id
              AND teams.captain_id = auth.uid()
            ) OR EXISTS (
              SELECT 1 FROM public.profiles
              WHERE profiles.id = auth.uid()
              AND profiles.role = 'admin'
            )
          );
        END IF;
      END $$;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS public.team_members CASCADE;`);
    this.addSql(`DROP TABLE IF EXISTS public.teams CASCADE;`);
  }
}
