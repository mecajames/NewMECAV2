import { Migration } from '@mikro-orm/migrations';

/**
 * Additive: creates `ticket_quick_links` (editable "Insert link" entries for the
 * ticket reply composer) and seeds the previously-hardcoded links as GLOBAL,
 * ownerless entries. Touches no existing table or data.
 */
export class Migration20260618130000_ticket_quick_links extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."ticket_quick_links" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NULL,
        "label" text NOT NULL,
        "url" text NOT NULL,
        "category" text NULL,
        "is_global" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ticket_quick_links_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "ticket_quick_links_user_fkey"
          FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE
      );
    `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "ticket_quick_links_user_idx" ON "public"."ticket_quick_links" ("user_id", "sort_order");`,
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "ticket_quick_links_global_idx" ON "public"."ticket_quick_links" ("is_global", "sort_order") WHERE "is_global" = true;`,
    );

    // Seed the previously-hardcoded ticketQuickLinks.ts entries as global links.
    // Guard with NOT EXISTS so re-running (or running after a manual seed) is safe.
    this.addSql(`
      INSERT INTO "public"."ticket_quick_links" ("label","url","category","is_global","sort_order")
      SELECT v.label, v.url, v.category, true, v.ord
      FROM (VALUES
        ('Help Center','https://mecacaraudio.com/member-support','Support',0),
        ('Knowledge Base','https://mecacaraudio.com/knowledge-base','Support',1),
        ('Competition Guides','https://mecacaraudio.com/competition-guides','Support',2),
        ('Contact Us','https://mecacaraudio.com/contact','Support',3),
        ('Events Calendar','https://mecacaraudio.com/events','Competition',4),
        ('Results','https://mecacaraudio.com/results','Competition',5),
        ('Standings','https://mecacaraudio.com/standings','Competition',6),
        ('Team Standings','https://mecacaraudio.com/team-standings','Competition',7),
        ('World Records','https://mecacaraudio.com/world-records','Competition',8),
        ('Rulebooks','https://mecacaraudio.com/rulebooks','Competition',9),
        ('Member Directory','https://mecacaraudio.com/members','Directories',10),
        ('Team Directory','https://mecacaraudio.com/teams','Directories',11),
        ('Retailer Directory','https://mecacaraudio.com/retailers','Directories',12),
        ('Manufacturer Directory','https://mecacaraudio.com/manufacturers','Directories',13),
        ('Membership / Join / Renew','https://mecacaraudio.com/membership','Membership',14),
        ('Hall of Fame','https://mecacaraudio.com/hall-of-fame','Membership',15)
      ) AS v(label,url,category,ord)
      WHERE NOT EXISTS (SELECT 1 FROM "public"."ticket_quick_links" WHERE "is_global" = true);
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."ticket_quick_links";`);
  }
}
