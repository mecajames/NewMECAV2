import { Migration } from '@mikro-orm/migrations';

export class Migration20251221173357 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "retailer_listings" add column "offer_text" text null;`);
  }

}
