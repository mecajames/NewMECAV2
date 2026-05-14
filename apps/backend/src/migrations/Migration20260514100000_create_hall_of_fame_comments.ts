import { Migration } from '@mikro-orm/migrations';

export class Migration20260514100000_create_hall_of_fame_comments extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."hall_of_fame_comments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "inductee_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "body" text NOT NULL,
        "is_hidden" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz,
        CONSTRAINT "hall_of_fame_comments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "hall_of_fame_comments_inductee_fkey" FOREIGN KEY ("inductee_id")
          REFERENCES "public"."hall_of_fame_inductees"("id") ON DELETE CASCADE,
        CONSTRAINT "hall_of_fame_comments_user_fkey" FOREIGN KEY ("user_id")
          REFERENCES "public"."profiles"("id") ON DELETE CASCADE
      );
    `);

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "hall_of_fame_comments_inductee_created_idx"
        ON "public"."hall_of_fame_comments" ("inductee_id", "created_at" DESC);
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."hall_of_fame_comments";`);
  }
}
