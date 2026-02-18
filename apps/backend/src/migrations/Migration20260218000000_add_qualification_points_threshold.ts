import { Migration } from '@mikro-orm/migrations';

export class Migration20260218000000_add_qualification_points_threshold extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "seasons" add column if not exists "qualification_points_threshold" int null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "seasons" drop column if exists "qualification_points_threshold";`);
  }
}
