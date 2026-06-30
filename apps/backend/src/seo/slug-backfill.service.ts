import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { makeUniqueSlug } from '../common/slug.util';

interface SlugEntity {
  table: string;
  /** SELECT returning id, name (and optionally year) for rows missing a slug. */
  selectMissing: string;
  /** Append the event year to the slug (events only). */
  year?: boolean;
  fallback: string;
}

// Per-entity backfill config. Table names are hardcoded constants (no injection).
// LIMIT caps each run so a large table (profiles) drains over a few runs.
const ENTITIES: SlugEntity[] = [
  { table: 'events', year: true, fallback: 'event', selectMissing: `SELECT id, title AS name, extract(year from event_date)::int AS year FROM events WHERE slug IS NULL LIMIT 5000` },
  { table: 'shop_products', fallback: 'product', selectMissing: `SELECT id, name FROM shop_products WHERE slug IS NULL LIMIT 5000` },
  { table: 'profiles', fallback: 'member', selectMissing: `SELECT id, full_name AS name FROM profiles WHERE slug IS NULL LIMIT 5000` },
  { table: 'teams', fallback: 'team', selectMissing: `SELECT id, name FROM teams WHERE slug IS NULL LIMIT 5000` },
  { table: 'retailer_listings', fallback: 'retailer', selectMissing: `SELECT id, business_name AS name FROM retailer_listings WHERE slug IS NULL LIMIT 5000` },
  { table: 'manufacturer_listings', fallback: 'manufacturer', selectMissing: `SELECT id, business_name AS name FROM manufacturer_listings WHERE slug IS NULL LIMIT 5000` },
  { table: 'judges', fallback: 'judge', selectMissing: `SELECT j.id, p.full_name AS name FROM judges j LEFT JOIN profiles p ON p.id = j.user_id WHERE j.slug IS NULL LIMIT 5000` },
  { table: 'event_directors', fallback: 'event-director', selectMissing: `SELECT ed.id, p.full_name AS name FROM event_directors ed LEFT JOIN profiles p ON p.id = ed.user_id WHERE ed.slug IS NULL LIMIT 5000` },
  { table: 'rulebooks', fallback: 'rulebook', selectMissing: `SELECT id, title AS name FROM rulebooks WHERE slug IS NULL LIMIT 5000` },
];

/**
 * Fills SEO slugs for detail-page entities. Runs once shortly after deploy
 * (onModuleInit) and daily, claimed via cron_send_log so only ONE instance does
 * it (avoids slug races across the multi-instance prod fleet). Only ever fills
 * rows whose slug IS NULL, so it's safe to re-run and never churns existing slugs.
 */
@Injectable()
export class SlugBackfillService implements OnModuleInit {
  private readonly logger = new Logger(SlugBackfillService.name);

  constructor(private readonly em: EntityManager) {}

  async onModuleInit(): Promise<void> {
    // Background, non-blocking — don't hold up app startup.
    this.runClaimed().catch((e) => this.logger.error(`Slug backfill on init failed: ${e}`));
  }

  @Cron('0 4 * * *', { name: 'slug-backfill' })
  async dailyBackfill(): Promise<void> {
    await this.runClaimed();
  }

  private async runClaimed(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    try {
      await this.em.getConnection().execute(
        'INSERT INTO cron_send_log (job_key, range_id) VALUES (?, ?)',
        ['slug_backfill', today],
      );
    } catch (err: any) {
      const code = err?.code ?? err?.cause?.code;
      if (code === '23505' || /duplicate key|unique/i.test(String(err?.message ?? ''))) {
        return; // another instance already ran today
      }
      // Claim table missing or other issue — proceed best-effort (the partial
      // unique index still prevents duplicate slugs).
      this.logger.warn(`Slug backfill claim error (continuing best-effort): ${err}`);
    }
    await this.backfillAll();
  }

  /** Fill missing slugs across all configured entities. Returns per-table counts. */
  async backfillAll(): Promise<Array<{ table: string; filled: number }>> {
    const results: Array<{ table: string; filled: number }> = [];
    for (const ent of ENTITIES) {
      try {
        results.push({ table: ent.table, filled: await this.backfillEntity(ent) });
      } catch (err) {
        this.logger.error(`Slug backfill failed for ${ent.table}: ${err}`);
        results.push({ table: ent.table, filled: 0 });
      }
    }
    const total = results.reduce((s, r) => s + r.filled, 0);
    if (total > 0) {
      this.logger.log(
        `Slug backfill filled ${total}: ${results.filter((r) => r.filled).map((r) => `${r.table}=${r.filled}`).join(', ')}`,
      );
    }
    return results;
  }

  private async backfillEntity(ent: SlugEntity): Promise<number> {
    const conn = this.em.getConnection();
    const missing: Array<{ id: string; name: string | null; year?: number | null }> =
      await conn.execute(ent.selectMissing);
    if (!missing.length) return 0;

    // Seed the uniqueness set with slugs already taken in this table.
    const existing: Array<{ slug: string }> = await conn.execute(
      `SELECT slug FROM ${ent.table} WHERE slug IS NOT NULL`,
    );
    const used = new Set(existing.map((r) => r.slug));

    let filled = 0;
    for (const row of missing) {
      const base = ent.year && row.year ? `${row.name ?? ''}-${row.year}` : row.name ?? '';
      const slug = await makeUniqueSlug(base, async (c) => used.has(c), ent.fallback);
      used.add(slug);
      try {
        await conn.execute(`UPDATE ${ent.table} SET slug = ? WHERE id = ? AND slug IS NULL`, [slug, row.id]);
        filled++;
      } catch (err: any) {
        // Lost a race on the partial unique index — skip; a later run retries.
        this.logger.warn(`Slug backfill skipped ${ent.table} ${row.id}: ${err?.message ?? err}`);
      }
    }
    return filled;
  }
}
