import { Migration } from '@mikro-orm/migrations';

export class Migration20251221020738 extends Migration {

  override async up(): Promise<void> {
    // Add start_date and end_date columns to retailer_listings
    this.addSql(`alter table "retailer_listings" add column if not exists "start_date" date null;`);
    this.addSql(`alter table "retailer_listings" add column if not exists "end_date" date null;`);

    // Add start_date and end_date columns to manufacturer_listings
    this.addSql(`alter table "manufacturer_listings" add column if not exists "start_date" date null;`);
    this.addSql(`alter table "manufacturer_listings" add column if not exists "end_date" date null;`);
  }

  override async down(): Promise<void> {
    // Remove date columns from retailer_listings
    this.addSql(`alter table "retailer_listings" drop column if exists "start_date";`);
    this.addSql(`alter table "retailer_listings" drop column if exists "end_date";`);

    // Remove date columns from manufacturer_listings
    this.addSql(`alter table "manufacturer_listings" drop column if exists "start_date";`);
    this.addSql(`alter table "manufacturer_listings" drop column if exists "end_date";`);
  }

}
