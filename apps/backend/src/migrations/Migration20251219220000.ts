import { Migration } from '@mikro-orm/migrations';

export class Migration20251219220000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "teams" add column if not exists "cover_image_position" jsonb null;`);
    this.addSql(`alter table "events" add column if not exists "flyer_image_position" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "teams" drop column if exists "cover_image_position";`);
    this.addSql(`alter table "events" drop column if exists "flyer_image_position";`);
  }

}
