import { Migration } from '@mikro-orm/migrations';

/**
 * Adds the 12 columns the Membership entity declares but the DB was missing,
 * so Retail/Manufacturer purchases that go through POST /api/memberships stop
 * crashing on `column "business_country" of relation "memberships" does not
 * exist`. The entity has had these fields for a while; the matching DDL was
 * never written, so any insert that used MikroORM defaults (business_country,
 * business_listing_status) failed, and any select would have failed too once a
 * row existed with those columns expected.
 *
 * Adds: relationship_to_master, the structured business_* address block,
 * business_description, business_logo_url, business_listing_status (+ updated_at),
 * and paypal_subscription_id.
 *
 * All columns are nullable to stay compatible with rows created before the
 * UI collected them. The two columns the entity gives defaults to also get
 * those defaults at the DB level (`business_country='US'`,
 * `business_listing_status='pending_approval'`) so MikroORM and Postgres agree.
 */
export class Migration20260425230000_add_membership_business_address_and_paypal extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."memberships"
        ADD COLUMN IF NOT EXISTS "relationship_to_master"     text,
        ADD COLUMN IF NOT EXISTS "business_phone"             text,
        ADD COLUMN IF NOT EXISTS "business_street"            text,
        ADD COLUMN IF NOT EXISTS "business_city"              text,
        ADD COLUMN IF NOT EXISTS "business_state"             text,
        ADD COLUMN IF NOT EXISTS "business_postal_code"       text,
        ADD COLUMN IF NOT EXISTS "business_country"           text DEFAULT 'US',
        ADD COLUMN IF NOT EXISTS "business_description"       text,
        ADD COLUMN IF NOT EXISTS "business_logo_url"          text,
        ADD COLUMN IF NOT EXISTS "business_listing_status"    text DEFAULT 'pending_approval',
        ADD COLUMN IF NOT EXISTS "business_listing_updated_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "paypal_subscription_id"     text;
    `);
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE "public"."memberships"
        DROP COLUMN IF EXISTS "paypal_subscription_id",
        DROP COLUMN IF EXISTS "business_listing_updated_at",
        DROP COLUMN IF EXISTS "business_listing_status",
        DROP COLUMN IF EXISTS "business_logo_url",
        DROP COLUMN IF EXISTS "business_description",
        DROP COLUMN IF EXISTS "business_country",
        DROP COLUMN IF EXISTS "business_postal_code",
        DROP COLUMN IF EXISTS "business_state",
        DROP COLUMN IF EXISTS "business_city",
        DROP COLUMN IF EXISTS "business_street",
        DROP COLUMN IF EXISTS "business_phone",
        DROP COLUMN IF EXISTS "relationship_to_master";
    `);
  }
}
