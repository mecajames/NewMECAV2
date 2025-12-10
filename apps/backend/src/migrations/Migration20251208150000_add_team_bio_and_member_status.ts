import { Migration } from '@mikro-orm/migrations';

export class Migration20251208150000_add_team_bio_and_member_status extends Migration {

  async up(): Promise<void> {
    // Add bio column to teams table
    this.addSql(`
      ALTER TABLE public.teams
      ADD COLUMN IF NOT EXISTS bio TEXT;
    `);

    // Add status column to team_members table (for join request/invite workflow)
    // Status values: 'active', 'pending_approval', 'pending_invite', 'pending_renewal', 'inactive'
    this.addSql(`
      ALTER TABLE public.team_members
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    `);

    // Add requested_at column for tracking when join request/invite was sent
    this.addSql(`
      ALTER TABLE public.team_members
      ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;
    `);

    // Add request_message column for optional message with join request or invite
    this.addSql(`
      ALTER TABLE public.team_members
      ADD COLUMN IF NOT EXISTS request_message TEXT;
    `);

    // Create index for status to quickly filter active/pending members
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_team_members_status ON public.team_members(status);
    `);

    // Make joined_at nullable (it should only be set when member becomes active)
    this.addSql(`
      ALTER TABLE public.team_members
      ALTER COLUMN joined_at DROP NOT NULL;
    `);

    // Set joined_at for existing members that have status='active' and no joined_at
    this.addSql(`
      UPDATE public.team_members
      SET joined_at = NOW()
      WHERE joined_at IS NULL AND status = 'active';
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS idx_team_members_status;`);
    this.addSql(`ALTER TABLE public.team_members DROP COLUMN IF EXISTS request_message;`);
    this.addSql(`ALTER TABLE public.team_members DROP COLUMN IF EXISTS requested_at;`);
    this.addSql(`ALTER TABLE public.team_members DROP COLUMN IF EXISTS status;`);
    this.addSql(`ALTER TABLE public.teams DROP COLUMN IF EXISTS bio;`);
  }
}
