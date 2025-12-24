import { Migration } from '@mikro-orm/migrations';

export class Migration20251219212056 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "profiles" add column if not exists "cover_image_position" jsonb null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "profiles" drop column if exists "cover_image_position";`);
  }

}
