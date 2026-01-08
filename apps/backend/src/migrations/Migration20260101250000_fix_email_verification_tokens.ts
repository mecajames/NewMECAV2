import { Migration } from '@mikro-orm/migrations';

export class Migration20260101250000_fix_email_verification_tokens extends Migration {
  override async up(): Promise<void> {
    // Add missing columns to email_verification_tokens for reference verification

    // Add email column (for verifying reference emails, not tied to a user)
    this.addSql(`
      ALTER TABLE "email_verification_tokens"
      ADD COLUMN IF NOT EXISTS "email" text;
    `);

    // Add related_entity_id column (to link to the reference being verified)
    this.addSql(`
      ALTER TABLE "email_verification_tokens"
      ADD COLUMN IF NOT EXISTS "related_entity_id" uuid;
    `);

    // Add is_used boolean column (alternative to used_at for simpler checks)
    this.addSql(`
      ALTER TABLE "email_verification_tokens"
      ADD COLUMN IF NOT EXISTS "is_used" boolean NOT NULL DEFAULT false;
    `);

    // Make user_id nullable (reference verifications don't have users)
    this.addSql(`
      ALTER TABLE "email_verification_tokens"
      ALTER COLUMN "user_id" DROP NOT NULL;
    `);

    // Add index on related_entity_id
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "idx_verification_tokens_related_entity"
      ON "email_verification_tokens"("related_entity_id");
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "idx_verification_tokens_related_entity";`);
    this.addSql(`ALTER TABLE "email_verification_tokens" DROP COLUMN IF EXISTS "is_used";`);
    this.addSql(`ALTER TABLE "email_verification_tokens" DROP COLUMN IF EXISTS "related_entity_id";`);
    this.addSql(`ALTER TABLE "email_verification_tokens" DROP COLUMN IF EXISTS "email";`);
    this.addSql(`ALTER TABLE "email_verification_tokens" ALTER COLUMN "user_id" SET NOT NULL;`);
  }
}
