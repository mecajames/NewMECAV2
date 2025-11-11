import { Migration } from '@mikro-orm/migrations';

export class Migration20251107000000_add_points_multiplier extends Migration {

  async up(): Promise<void> {
    // Add points_multiplier field to events table
    // Default to 2 for existing events (standard regional event multiplier)
    this.addSql('ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "points_multiplier" integer NULL DEFAULT 2;');

    // Add comment explaining the multiplier values
    this.addSql('COMMENT ON COLUMN "events"."points_multiplier" IS \'Points multiplier: 0=non-competitive, 1=local, 2=regional, 3=state/major, 4=championship\';');
  }

  async down(): Promise<void> {
    // Remove points_multiplier field from events table
    this.addSql('ALTER TABLE "events" DROP COLUMN IF EXISTS "points_multiplier";');
  }

}
