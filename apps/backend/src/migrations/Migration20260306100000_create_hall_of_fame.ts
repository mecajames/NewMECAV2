import { Migration } from '@mikro-orm/migrations';

export class Migration20260306100000_create_hall_of_fame extends Migration {
  async up(): Promise<void> {
    // Create table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "public"."hall_of_fame_inductees" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "category" text NOT NULL,
        "induction_year" integer NOT NULL,
        "name" text NOT NULL,
        "state" text,
        "team_affiliation" text,
        "location" text,
        "bio" text,
        "image_url" text,
        "created_by" uuid,
        "updated_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz,
        CONSTRAINT "hall_of_fame_inductees_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "hall_of_fame_inductees_category_year_name_unique" UNIQUE ("category", "induction_year", "name"),
        CONSTRAINT "hall_of_fame_inductees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
        CONSTRAINT "hall_of_fame_inductees_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL
      );
    `);

    // Index for fast filtering
    this.addSql(`CREATE INDEX IF NOT EXISTS "hall_of_fame_inductees_category_year_idx" ON "public"."hall_of_fame_inductees" ("category", "induction_year");`);

    // Seed: Competitors 2005
    const competitors2005 = [
      ['Steve Cook', 'NY'], ['Troy Martin', 'NJ'], ['Ivan Beaver', 'TX'],
      ['Mike Galvan', 'TX'], ['Eldridge Hoard', 'TX'], ['TJ Clarke', 'TX'],
      ['John Perih', 'MD'], ['Curtis Harvey', 'FL'], ['Alan Dante', 'NY'],
      ['Nathan Gailey', 'OH'], ['Adam Adkisson', 'OH'], ['Jeff Poore', 'TN'],
      ['Juan (Moose) Hernandez', 'FL'], ['Robert Whipkey', 'TX'], ['Kevin White', 'FL'],
      ['Greg Koller', 'OH'], ['Bill Lam', 'FL'], ['Chris Pate', 'AL'],
      ['Wayne Harris', 'OH'],
    ];
    for (const [name, state] of competitors2005) {
      this.addSql(`INSERT INTO "public"."hall_of_fame_inductees" ("category", "induction_year", "name", "state") VALUES ('competitors', 2005, '${name.replace(/'/g, "''")}', '${state}') ON CONFLICT DO NOTHING;`);
    }

    // Seed: Competitors 2008
    const competitors2008 = [
      ['Jeff Youngblood', 'TN'], ['Alton Williams', 'NC'], ['Micah Hartley', 'NC'],
      ['Dave Wright', 'FL'], ['Rich Lane', 'NJ'], ['Marcus Layton', 'NC'],
      ['James Brown', 'FL'], ['Henry Garris', 'NC'], ['Lee Patterson', 'NC'],
      ['Kenny Brown', 'MD'], ['Dean Burns', 'NJ'], ['Ricky Johnson', 'SC'],
      ['George Johnson', 'NC'], ['Travis Edwards', 'TX'], ['Myron Bazemore', 'NC'],
    ];
    for (const [name, state] of competitors2008) {
      this.addSql(`INSERT INTO "public"."hall_of_fame_inductees" ("category", "induction_year", "name", "state") VALUES ('competitors', 2008, '${name.replace(/'/g, "''")}', '${state}') ON CONFLICT DO NOTHING;`);
    }

    // Seed: Competitors 2022
    const competitors2022: [string, string | null][] = [
      ['Bryan Scibilia', 'MA'], ['Terri Lane', 'NJ'], ['Toris Adside', null],
      ['John Morgan', 'TX'], ['Loren Lei', null], ['Chrissy Cook', 'NY'],
      ['David Cay', 'GA'], ['Jeff Licciardi', 'TX'], ['Kevin Barwick', 'TX'],
      ['Elias Megchun', null], ['Scott Sumter', 'TX'], ['Wayne Harris', 'OH'],
      ['Terrence Wiggins', 'FL'], ['Eddy Solis', 'TX'], ['Albert Griffith', 'FL'],
      ['Shannon McIntosh', 'MD'], ['Brenda Cook', 'NY'], ['Jose Roman', 'FL'],
      ['Robert Clark', 'GA'], ['Brandon Bishop', 'TX'], ['Alex Estrada', 'TX'],
    ];
    for (const [name, state] of competitors2022) {
      this.addSql(`INSERT INTO "public"."hall_of_fame_inductees" ("category", "induction_year", "name", "state") VALUES ('competitors', 2022, '${name.replace(/'/g, "''")}', ${state ? `'${state}'` : 'NULL'}) ON CONFLICT DO NOTHING;`);
    }

    // Seed: Teams 2005
    const teams2005: [string, string | null][] = [
      ['Cheating Death', 'TX'], ['Audio Assassins', 'NJ'], ['Xtremes', 'FL'],
      ['Team Fi', 'FL'], ['Wiz Kidz', 'MD'], ['Bass Race', 'TN'],
    ];
    for (const [name, state] of teams2005) {
      this.addSql(`INSERT INTO "public"."hall_of_fame_inductees" ("category", "induction_year", "name", "state") VALUES ('teams', 2005, '${name.replace(/'/g, "''")}', ${state ? `'${state}'` : 'NULL'}) ON CONFLICT DO NOTHING;`);
    }

    // Seed: Teams 2008
    const teams2008: [string, string | null][] = [
      ['Team Nemesis', 'NC'], ['Bass Junky', 'NC'], ['Eargasm', 'FL'],
      ['Outlaw Audio', 'TX'],
    ];
    for (const [name, state] of teams2008) {
      this.addSql(`INSERT INTO "public"."hall_of_fame_inductees" ("category", "induction_year", "name", "state") VALUES ('teams', 2008, '${name.replace(/'/g, "''")}', ${state ? `'${state}'` : 'NULL'}) ON CONFLICT DO NOTHING;`);
    }

    // Seed: Teams 2022
    const teams2022: [string, string | null][] = [
      ['SBN', 'TX'], ['Mic\'d Up', 'TX'], ['Team Sundown', 'TX'],
      ['Team Crescendo', null],
    ];
    for (const [name, state] of teams2022) {
      this.addSql(`INSERT INTO "public"."hall_of_fame_inductees" ("category", "induction_year", "name", "state") VALUES ('teams', 2022, '${name.replace(/'/g, "''")}', ${state ? `'${state}'` : 'NULL'}) ON CONFLICT DO NOTHING;`);
    }

    // Seed: Retailers 2005
    const retailers2005: [string, string][] = [
      ['Krazy Kustomz', 'FL'], ['Tru Custom Car Audio', 'FL'], ['SBN Customs', 'TX'],
      ['Audio Precision', 'NJ'], ['Car Audio Plus', 'FL'],
    ];
    for (const [name, location] of retailers2005) {
      this.addSql(`INSERT INTO "public"."hall_of_fame_inductees" ("category", "induction_year", "name", "location") VALUES ('retailers', 2005, '${name.replace(/'/g, "''")}', '${location}') ON CONFLICT DO NOTHING;`);
    }

    // Seed: Retailers 2008
    const retailers2008: [string, string][] = [
      ['Exotic Rides', 'NC'], ['Auto Sound', 'NC'], ['Tito\'s Custom Car Audio', 'NC'],
      ['Phat Farm', 'NC'], ['Scorpion Audio', 'TX'],
    ];
    for (const [name, location] of retailers2008) {
      this.addSql(`INSERT INTO "public"."hall_of_fame_inductees" ("category", "induction_year", "name", "location") VALUES ('retailers', 2008, '${name.replace(/'/g, "''")}', '${location}') ON CONFLICT DO NOTHING;`);
    }

    // Seed: Retailers 2022
    const retailers2022: [string, string][] = [
      ['Perfection Car Audio', 'TX'], ['Sound Decisions', 'TX'],
      ['The Car Audio Shop', 'TX'], ['WVTX', 'TX'],
      ['Audio Precision 2', 'NJ'], ['Extreme Customs', 'GA'],
      ['RJs Mobile Electronics', 'MD'], ['Elite Car Stereo', 'FL'],
      ['Tint World - Ft. Lauderdale', 'FL'], ['Audiomasters', 'NJ'],
    ];
    for (const [name, location] of retailers2022) {
      this.addSql(`INSERT INTO "public"."hall_of_fame_inductees" ("category", "induction_year", "name", "location") VALUES ('retailers', 2022, '${name.replace(/'/g, "''")}', '${location}') ON CONFLICT DO NOTHING;`);
    }

    // Seed: Judges 2005
    const judges2005: [string, string][] = [
      ['Ryan "Gooch" Guciardo', 'FL'], ['Steve Stern', 'FL'],
      ['Mike Mentink', 'FL'], ['Tim "Ice" Murphy', 'MD'], ['Steve Brown', 'TX'],
    ];
    for (const [name, state] of judges2005) {
      this.addSql(`INSERT INTO "public"."hall_of_fame_inductees" ("category", "induction_year", "name", "state") VALUES ('judges', 2005, '${name.replace(/'/g, "''")}', '${state}') ON CONFLICT DO NOTHING;`);
    }

    // Seed: Judges 2008
    const judges2008: [string, string][] = [
      ['Demp Dempsey', 'NC'], ['AJ Evelyn', 'NC'], ['Johnathan Ward', 'FL'],
      ['Donny Williams', 'NC'], ['Sean Heaton', 'FL'],
    ];
    for (const [name, state] of judges2008) {
      this.addSql(`INSERT INTO "public"."hall_of_fame_inductees" ("category", "induction_year", "name", "state") VALUES ('judges', 2008, '${name.replace(/'/g, "''")}', '${state}') ON CONFLICT DO NOTHING;`);
    }

    // Seed: Judges 2022
    const judges2022: [string, string | null][] = [
      ['Darryl Flagg', 'SC'], ['Marc "Doc" Holiday', 'FL'],
      ['Quentin Lewis', 'TX'], ['Clint Shifflet', 'TX'],
      ['Johnny Price', null], ['Nathan Gailey', 'OH'], ['Tim Shea', null],
    ];
    for (const [name, state] of judges2022) {
      this.addSql(`INSERT INTO "public"."hall_of_fame_inductees" ("category", "induction_year", "name", "state") VALUES ('judges', 2022, '${name.replace(/'/g, "''")}', ${state ? `'${state}'` : 'NULL'}) ON CONFLICT DO NOTHING;`);
    }
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "public"."hall_of_fame_inductees";`);
  }
}
