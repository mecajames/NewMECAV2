import { Migration } from '@mikro-orm/migrations';

export class Migration20260225000000_add_banner_size extends Migration {
  async up(): Promise<void> {
    this.addSql(`CREATE TYPE "banner_size" AS ENUM ('728x90', '300x250', '160x600', '300x600', '970x90', '970x250', '320x50', '320x100');`);
    this.addSql(`ALTER TABLE "public"."banners" ADD COLUMN "size" "banner_size" NULL;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."banners" DROP COLUMN IF EXISTS "size";`);
    this.addSql(`DROP TYPE IF EXISTS "banner_size";`);
  }
}
