import { Migration } from '@mikro-orm/migrations';

export class Migration20260514200000_create_membership_renewal_tokens extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."membership_renewal_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "membership_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "token" text NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "used_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "membership_renewal_tokens_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "membership_renewal_tokens_token_unique" UNIQUE ("token"),
        CONSTRAINT "membership_renewal_tokens_membership_fkey"
          FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE CASCADE,
        CONSTRAINT "membership_renewal_tokens_user_fkey"
          FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
      );
    `);
    this.addSql(`CREATE INDEX IF NOT EXISTS "membership_renewal_tokens_user_idx" ON "public"."membership_renewal_tokens" ("user_id", "expires_at");`);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."membership_renewal_tokens";`);
  }
}
