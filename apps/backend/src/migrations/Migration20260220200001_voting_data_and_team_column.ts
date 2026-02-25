import { Migration } from '@mikro-orm/migrations';

export class Migration20260220200001_voting_data_and_team_column extends Migration {
  async up(): Promise<void> {
    // Migrate existing member_select → member
    this.addSql("UPDATE voting_questions SET answer_type = 'member' WHERE answer_type = 'member_select';");

    // Add selected_team_id column to voting_responses
    this.addSql(`
      ALTER TABLE "voting_responses"
        ADD COLUMN IF NOT EXISTS "selected_team_id" uuid;
    `);

    this.addSql(`
      DO $$ BEGIN
        ALTER TABLE "voting_responses"
          ADD CONSTRAINT "voting_responses_selected_team_id_fkey"
          FOREIGN KEY ("selected_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Index for team-based queries
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_voting_responses_team" ON "voting_responses"("selected_team_id") WHERE selected_team_id IS NOT NULL;');
  }

  async down(): Promise<void> {
    // Drop team index and FK
    this.addSql('DROP INDEX IF EXISTS "idx_voting_responses_team";');
    this.addSql('ALTER TABLE "voting_responses" DROP CONSTRAINT IF EXISTS "voting_responses_selected_team_id_fkey";');
    this.addSql('ALTER TABLE "voting_responses" DROP COLUMN IF EXISTS "selected_team_id";');

    // Migrate member back to member_select
    this.addSql("UPDATE voting_questions SET answer_type = 'member_select' WHERE answer_type = 'member';");
  }
}
