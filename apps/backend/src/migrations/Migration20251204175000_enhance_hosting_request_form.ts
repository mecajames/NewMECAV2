import { Migration } from '@mikro-orm/migrations';

export class Migration20251204175000_enhance_hosting_request_form extends Migration {
  async up(): Promise<void> {
    // Host/Business Information
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS host_type TEXT;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS venue_name TEXT;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS indoor_outdoor TEXT;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS power_available BOOLEAN;`);

    // Competition Formats (JSON array of format IDs/names)
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS competition_formats JSONB;`);

    // Multi-Day Event Support
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS is_multi_day BOOLEAN DEFAULT false;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS day_2_date TIMESTAMPTZ;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS day_2_start_time TEXT;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS day_2_end_time TEXT;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS day_3_date TIMESTAMPTZ;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS day_3_start_time TEXT;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS day_3_end_time TEXT;`);

    // Registration Information
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS has_registration_fee BOOLEAN;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS estimated_entry_fee TEXT;`);
    this.addSql(`ALTER TABLE event_hosting_requests ADD COLUMN IF NOT EXISTS pre_registration_available BOOLEAN;`);
  }

  async down(): Promise<void> {
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS host_type;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS venue_name;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS indoor_outdoor;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS power_available;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS competition_formats;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS is_multi_day;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS day_2_date;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS day_2_start_time;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS day_2_end_time;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS day_3_date;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS day_3_start_time;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS day_3_end_time;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS has_registration_fee;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS estimated_entry_fee;`);
    this.addSql(`ALTER TABLE event_hosting_requests DROP COLUMN IF EXISTS pre_registration_available;`);
  }
}
