import { Migration } from '@mikro-orm/migrations';

export class Migration20251209222447 extends Migration {

  override async up(): Promise<void> {
    // Create quickbooks_connections table for QuickBooks integration
    this.addSql(`create table if not exists "quickbooks_connections" ("id" uuid not null, "realm_id" text not null, "access_token" text not null, "refresh_token" text not null, "access_token_expires_at" timestamptz not null, "refresh_token_expires_at" timestamptz not null, "company_name" text null, "is_active" boolean not null default true, "created_at" timestamptz not null, "updated_at" timestamptz not null, "last_sync_at" timestamptz null, constraint "quickbooks_connections_pkey" primary key ("id"));`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "quickbooks_connections";`);
  }

}
