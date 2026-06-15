import { Migration } from '@mikro-orm/migrations';

/**
 * Add a points multiplier to event hosting requests so the requester / event
 * director can specify the event's points weighting (1X local, 2X regional,
 * 3X state/major, 4X championship) at submission time. When an admin approves
 * the request, this value is carried into the created event's
 * events.points_multiplier. Defaults to 1 (local).
 */
export class Migration20260615000000_add_hosting_request_points_multiplier extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."event_hosting_requests"
        ADD COLUMN IF NOT EXISTS "points_multiplier" integer NULL DEFAULT 1;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE "public"."event_hosting_requests" DROP COLUMN IF EXISTS "points_multiplier";`);
  }
}
