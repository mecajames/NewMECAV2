import { Migration } from '@mikro-orm/migrations';

export class Migration20251204190000_add_fee_fields extends Migration {
  async up(): Promise<void> {
    // Add fee fields to event_hosting_requests
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS member_entry_fee TEXT;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS non_member_entry_fee TEXT;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS has_gate_fee BOOLEAN;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS gate_fee TEXT;`);

    // Add fee fields to events table
    this.addSql(`ALTER TABLE events ADD COLUMN IF NOT EXISTS member_entry_fee DECIMAL(10,2);`);
    this.addSql(`ALTER TABLE events ADD COLUMN IF NOT EXISTS non_member_entry_fee DECIMAL(10,2);`);
    this.addSql(`ALTER TABLE events ADD COLUMN IF NOT EXISTS has_gate_fee BOOLEAN DEFAULT false;`);
    this.addSql(`ALTER TABLE events ADD COLUMN IF NOT EXISTS gate_fee DECIMAL(10,2);`);
  }

  async down(): Promise<void> {
    // Remove fee fields from event_hosting_requests
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS member_entry_fee;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS non_member_entry_fee;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS has_gate_fee;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS gate_fee;`);

    // Remove fee fields from events table
    this.addSql(`ALTER TABLE events DROP COLUMN IF EXISTS member_entry_fee;`);
    this.addSql(`ALTER TABLE events DROP COLUMN IF EXISTS non_member_entry_fee;`);
    this.addSql(`ALTER TABLE events DROP COLUMN IF EXISTS has_gate_fee;`);
    this.addSql(`ALTER TABLE events DROP COLUMN IF EXISTS gate_fee;`);
  }
}
