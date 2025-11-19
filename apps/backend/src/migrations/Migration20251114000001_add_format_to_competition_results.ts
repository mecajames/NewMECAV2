import { Migration } from '@mikro-orm/migrations';

export class Migration20251114000001_add_format_to_competition_results extends Migration {
  async up(): Promise<void> {
    this.addSql('ALTER TABLE "public"."competition_results" ADD COLUMN "format" text NULL;');
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE "public"."competition_results" DROP COLUMN "format";');
  }
}
