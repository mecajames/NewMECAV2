import { Migration } from '@mikro-orm/migrations';

export class Migration20251206100001_enhance_teams_table extends Migration {
  async up(): Promise<void> {
    // Add new columns to teams table for enhanced team creation form
    this.addSql(`
      ALTER TABLE public.teams
      ADD COLUMN IF NOT EXISTS team_type varchar(50) DEFAULT 'competitive',
      ADD COLUMN IF NOT EXISTS location varchar(255),
      ADD COLUMN IF NOT EXISTS max_members integer DEFAULT 50,
      ADD COLUMN IF NOT EXISTS website varchar(500),
      ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS requires_approval boolean DEFAULT true;
    `);

    // Create index for public teams (for listing)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_teams_is_public ON public.teams(is_public) WHERE is_public = true;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP INDEX IF EXISTS idx_teams_is_public;
    `);

    this.addSql(`
      ALTER TABLE public.teams
      DROP COLUMN IF EXISTS team_type,
      DROP COLUMN IF EXISTS location,
      DROP COLUMN IF EXISTS max_members,
      DROP COLUMN IF EXISTS website,
      DROP COLUMN IF EXISTS is_public,
      DROP COLUMN IF EXISTS requires_approval;
    `);
  }
}
