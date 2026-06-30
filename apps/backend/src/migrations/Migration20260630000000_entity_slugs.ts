import { Migration } from '@mikro-orm/migrations';

/**
 * Additive: SEO-friendly slug columns for detail pages, so URLs read like
 * /events/the-ohio-car-audio-show-3-2026 instead of /events/<uuid>. Nullable +
 * a PARTIAL unique index (only enforced where slug IS NOT NULL) so existing rows
 * stay valid until backfilled (SlugBackfillService) and many nulls are allowed.
 * Touches no existing data.
 */
export class Migration20260630000000_entity_slugs extends Migration {
  private readonly tables = [
    'events',
    'shop_products',
    'profiles',
    'teams',
    'retailer_listings',
    'manufacturer_listings',
    'judges',
    'event_directors',
    'rulebooks',
  ];

  override async up(): Promise<void> {
    for (const t of this.tables) {
      this.addSql(`ALTER TABLE "public"."${t}" ADD COLUMN IF NOT EXISTS "slug" varchar(120) NULL;`);
      this.addSql(
        `CREATE UNIQUE INDEX IF NOT EXISTS "${t}_slug_unique" ON "public"."${t}" ("slug") WHERE "slug" IS NOT NULL;`,
      );
    }
  }

  override async down(): Promise<void> {
    for (const t of this.tables) {
      this.addSql(`DROP INDEX IF EXISTS "public"."${t}_slug_unique";`);
      this.addSql(`ALTER TABLE "public"."${t}" DROP COLUMN IF EXISTS "slug";`);
    }
  }
}
