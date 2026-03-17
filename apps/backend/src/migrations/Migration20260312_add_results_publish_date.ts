import { Migration } from '@mikro-orm/migrations';

export class Migration20260312_add_results_publish_date extends Migration {
  async up(): Promise<void> {
    this.addSql('ALTER TABLE "voting_sessions" ADD COLUMN IF NOT EXISTS "results_publish_date" timestamptz NULL;');
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE "voting_sessions" DROP COLUMN IF EXISTS "results_publish_date";');
  }
}
