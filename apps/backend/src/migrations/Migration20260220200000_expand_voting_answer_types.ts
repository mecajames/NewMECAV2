import { Migration } from '@mikro-orm/migrations';

export class Migration20260220200000_expand_voting_answer_types extends Migration {
  // ALTER TYPE ... ADD VALUE cannot run inside a transaction
  isTransactional(): boolean {
    return false;
  }

  async up(): Promise<void> {
    // Add new enum values to voting_answer_type
    this.addSql("ALTER TYPE voting_answer_type ADD VALUE IF NOT EXISTS 'member';");
    this.addSql("ALTER TYPE voting_answer_type ADD VALUE IF NOT EXISTS 'judge';");
    this.addSql("ALTER TYPE voting_answer_type ADD VALUE IF NOT EXISTS 'event_director';");
    this.addSql("ALTER TYPE voting_answer_type ADD VALUE IF NOT EXISTS 'retailer';");
    this.addSql("ALTER TYPE voting_answer_type ADD VALUE IF NOT EXISTS 'manufacturer';");
    this.addSql("ALTER TYPE voting_answer_type ADD VALUE IF NOT EXISTS 'venue';");
    this.addSql("ALTER TYPE voting_answer_type ADD VALUE IF NOT EXISTS 'team';");
  }

  async down(): Promise<void> {
    // Cannot remove enum values in PostgreSQL without recreating the type
    // The extra enum values are harmless and will be ignored
  }
}
