import { Migration } from '@mikro-orm/migrations';

export class Migration20260112100000_add_judge_to_user_role_enum extends Migration {
  override async up(): Promise<void> {
    // Add 'judge' value to the user_role enum type
    // IF NOT EXISTS prevents errors if this has already been applied
    this.addSql(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'judge';`);
  }

  override async down(): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values easily
    // To truly remove, you'd need to:
    // 1. Create a new enum without 'judge'
    // 2. Update all tables to use the new enum
    // 3. Drop the old enum
    // For safety, this down migration is a no-op
    console.log('Warning: Cannot remove enum value from PostgreSQL. Manual intervention required if needed.');
  }
}
