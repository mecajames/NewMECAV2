import { Migration } from '@mikro-orm/migrations';

export class Migration20260324300000_wf_registration_mode extends Migration {
  override async up(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."world_finals_registration_config" ADD COLUMN IF NOT EXISTS "registration_mode" text NOT NULL DEFAULT 'single';`);
  }

  override async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."world_finals_registration_config" DROP COLUMN IF EXISTS "registration_mode";`);
  }
}
