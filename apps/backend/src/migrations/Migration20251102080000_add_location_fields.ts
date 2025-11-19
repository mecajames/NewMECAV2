import { Migration } from '@mikro-orm/migrations';

export class Migration20251102080000_add_location_fields extends Migration {

  async up(): Promise<void> {
    // Add location fields to events table
    this.addSql('ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue_city" text NULL;');
    this.addSql('ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue_state" text NULL;');
    this.addSql('ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue_postal_code" text NULL;');
    this.addSql('ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "venue_country" text NULL DEFAULT \'US\';');

    // Add location fields to profiles table
    this.addSql('ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "address" text NULL;');
    this.addSql('ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "city" text NULL;');
    this.addSql('ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "state" text NULL;');
    this.addSql('ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "postal_code" text NULL;');
    this.addSql('ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "country" text NULL DEFAULT \'US\';');

    // Update phone to match E.164 format eventually
    this.addSql('COMMENT ON COLUMN "profiles"."phone" IS \'Phone number (E.164 format recommended: +1234567890)\';');
  }

  async down(): Promise<void> {
    // Remove location fields from events table
    this.addSql('ALTER TABLE "events" DROP COLUMN IF EXISTS "venue_city";');
    this.addSql('ALTER TABLE "events" DROP COLUMN IF EXISTS "venue_state";');
    this.addSql('ALTER TABLE "events" DROP COLUMN IF EXISTS "venue_postal_code";');
    this.addSql('ALTER TABLE "events" DROP COLUMN IF EXISTS "venue_country";');

    // Remove location fields from profiles table
    this.addSql('ALTER TABLE "profiles" DROP COLUMN IF EXISTS "address";');
    this.addSql('ALTER TABLE "profiles" DROP COLUMN IF EXISTS "city";');
    this.addSql('ALTER TABLE "profiles" DROP COLUMN IF EXISTS "state";');
    this.addSql('ALTER TABLE "profiles" DROP COLUMN IF EXISTS "postal_code";');
    this.addSql('ALTER TABLE "profiles" DROP COLUMN IF EXISTS "country";');
  }

}
