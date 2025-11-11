import { Migration } from '@mikro-orm/migrations';

export class Migration20251108000000_add_event_formats extends Migration {

  async up(): Promise<void> {
    this.addSql('ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "formats" jsonb NULL;');
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE "events" DROP COLUMN IF EXISTS "formats";');
  }

}
