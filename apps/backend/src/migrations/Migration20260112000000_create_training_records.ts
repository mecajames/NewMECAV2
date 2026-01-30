import { Migration } from '@mikro-orm/migrations';

export class Migration20260112000000_create_training_records extends Migration {
  async up(): Promise<void> {
    // Create training_type enum
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE training_type AS ENUM ('spl', 'sql', 'both');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create trainee_type enum
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE trainee_type AS ENUM ('judge', 'event_director');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create training_result enum
    this.addSql(`
      DO $$ BEGIN
        CREATE TYPE training_result AS ENUM ('pass', 'fail');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create training_records table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "training_records" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "trainee_type" trainee_type NOT NULL,
        "trainee_id" uuid NOT NULL,
        "training_type" training_type NOT NULL,
        "training_date" date NOT NULL,
        "result" training_result NOT NULL,
        "trainer_id" uuid NOT NULL REFERENCES "profiles"("id") ON DELETE RESTRICT,
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Create indexes
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_training_records_trainee" ON "training_records"("trainee_type", "trainee_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_training_records_trainer" ON "training_records"("trainer_id");');
    this.addSql('CREATE INDEX IF NOT EXISTS "idx_training_records_date" ON "training_records"("training_date");');

    // Enable RLS
    this.addSql('ALTER TABLE "training_records" ENABLE ROW LEVEL SECURITY;');

    // Create RLS policies (admin only for all operations)
    this.addSql(`
      CREATE POLICY "training_records_select_policy" ON "training_records"
        FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
    `);

    this.addSql(`
      CREATE POLICY "training_records_insert_policy" ON "training_records"
        FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');
    `);

    this.addSql(`
      CREATE POLICY "training_records_update_policy" ON "training_records"
        FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
    `);

    this.addSql(`
      CREATE POLICY "training_records_delete_policy" ON "training_records"
        FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');
    `);
  }

  async down(): Promise<void> {
    // Drop RLS policies
    this.addSql('DROP POLICY IF EXISTS "training_records_delete_policy" ON "training_records";');
    this.addSql('DROP POLICY IF EXISTS "training_records_update_policy" ON "training_records";');
    this.addSql('DROP POLICY IF EXISTS "training_records_insert_policy" ON "training_records";');
    this.addSql('DROP POLICY IF EXISTS "training_records_select_policy" ON "training_records";');

    // Drop table
    this.addSql('DROP TABLE IF EXISTS "training_records" CASCADE;');

    // Drop enum types
    this.addSql('DROP TYPE IF EXISTS training_result CASCADE;');
    this.addSql('DROP TYPE IF EXISTS trainee_type CASCADE;');
    this.addSql('DROP TYPE IF EXISTS training_type CASCADE;');
  }
}
