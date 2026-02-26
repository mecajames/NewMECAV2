import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { SiteSettings } from '../site-settings/site-settings.entity';
import { SeoOverride } from './seo-override.entity';

// SEO setting key constants
const SEO_KEYS = {
  TITLE_SEPARATOR: 'seo_title_separator',
  SITE_NAME: 'seo_site_name',
  DEFAULT_DESCRIPTION: 'seo_default_description',
  GOOGLE_VERIFICATION: 'seo_google_verification',
  BING_VERIFICATION: 'seo_bing_verification',
  SOCIAL_IMAGE: 'seo_social_image',
  TWITTER_HANDLE: 'seo_twitter_handle',
} as const;

export interface SeoSettings {
  titleSeparator: string;
  siteName: string;
  defaultDescription: string;
  googleVerification: string;
  bingVerification: string;
  socialImage: string;
  twitterHandle: string;
}

export interface SeoOverrideDto {
  url_path: string;
  title?: string;
  description?: string;
  canonical_url?: string;
  noindex?: boolean;
  og_image?: string;
}

@Injectable()
export class SeoService {
  private readonly logger = new Logger(SeoService.name);
  private readonly siteUrl = 'https://mecacaraudio.com';

  constructor(private readonly em: EntityManager) {}

  // ===========================================================================
  // SEO Settings (stored in site_settings key-value table)
  // ===========================================================================

  async getSeoSettings(): Promise<SeoSettings> {
    const em = this.em.fork();
    const rows = await em.find(SiteSettings, {
      setting_key: { $like: 'seo_%' },
    });

    const map = new Map(rows.map(r => [r.setting_key, r.setting_value]));

    return {
      titleSeparator: map.get(SEO_KEYS.TITLE_SEPARATOR) || ' | ',
      siteName: map.get(SEO_KEYS.SITE_NAME) || 'MECA Car Audio',
      defaultDescription: map.get(SEO_KEYS.DEFAULT_DESCRIPTION) || 'The Premier Platform for Car Audio Competition Management.',
      googleVerification: map.get(SEO_KEYS.GOOGLE_VERIFICATION) || '',
      bingVerification: map.get(SEO_KEYS.BING_VERIFICATION) || '',
      socialImage: map.get(SEO_KEYS.SOCIAL_IMAGE) || '',
      twitterHandle: map.get(SEO_KEYS.TWITTER_HANDLE) || '@mecacaraudio',
    };
  }

  async updateSeoSettings(settings: Partial<SeoSettings>, updatedBy: string): Promise<SeoSettings> {
    const em = this.em.fork();

    const keyMap: Record<string, string> = {
      titleSeparator: SEO_KEYS.TITLE_SEPARATOR,
      siteName: SEO_KEYS.SITE_NAME,
      defaultDescription: SEO_KEYS.DEFAULT_DESCRIPTION,
      googleVerification: SEO_KEYS.GOOGLE_VERIFICATION,
      bingVerification: SEO_KEYS.BING_VERIFICATION,
      socialImage: SEO_KEYS.SOCIAL_IMAGE,
      twitterHandle: SEO_KEYS.TWITTER_HANDLE,
    };

    for (const [field, value] of Object.entries(settings)) {
      const key = keyMap[field];
      if (!key || value === undefined) continue;

      const existing = await em.findOne(SiteSettings, { setting_key: key });
      if (existing) {
        existing.setting_value = String(value);
        existing.updated_by = updatedBy;
        existing.updated_at = new Date();
      } else {
        em.create(SiteSettings, {
          setting_key: key,
          setting_value: String(value),
          setting_type: 'string',
          description: `SEO setting: ${field}`,
          updated_by: updatedBy,
          updated_at: new Date(),
        });
      }
    }

    await em.flush();
    return this.getSeoSettings();
  }

  // ===========================================================================
  // SEO Overrides (per-page title/description overrides)
  // ===========================================================================

  async getAllOverrides(): Promise<SeoOverride[]> {
    try {
      const em = this.em.fork();
      return await em.find(SeoOverride, {}, { orderBy: { url_path: 'ASC' } });
    } catch (err: any) {
      // Table may not exist yet if migration hasn't run
      if (err.message?.includes('does not exist') || err.code === '42P01') {
        this.logger.warn('seo_overrides table does not exist yet. Run migration: rushx migration:up');
        return [];
      }
      throw err;
    }
  }

  async getOverrideByPath(urlPath: string): Promise<SeoOverride | null> {
    try {
      const em = this.em.fork();
      return await em.findOne(SeoOverride, { url_path: urlPath });
    } catch (err: any) {
      if (err.message?.includes('does not exist') || err.code === '42P01') {
        return null;
      }
      throw err;
    }
  }

  async createOverride(dto: SeoOverrideDto, updatedBy: string): Promise<SeoOverride> {
    const em = this.em.fork();

    const existing = await em.findOne(SeoOverride, { url_path: dto.url_path });
    if (existing) {
      throw new Error(`Override already exists for path: ${dto.url_path}`);
    }

    const override = em.create(SeoOverride, {
      url_path: dto.url_path,
      title: dto.title,
      description: dto.description,
      canonical_url: dto.canonical_url,
      noindex: dto.noindex ?? false,
      og_image: dto.og_image,
      updated_by: updatedBy,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await em.persistAndFlush(override);
    return override;
  }

  async updateOverride(id: string, dto: Partial<SeoOverrideDto>, updatedBy: string): Promise<SeoOverride> {
    const em = this.em.fork();
    const override = await em.findOne(SeoOverride, { id });
    if (!override) {
      throw new NotFoundException(`SEO override not found: ${id}`);
    }

    if (dto.title !== undefined) override.title = dto.title || undefined;
    if (dto.description !== undefined) override.description = dto.description || undefined;
    if (dto.canonical_url !== undefined) override.canonical_url = dto.canonical_url || undefined;
    if (dto.noindex !== undefined) override.noindex = dto.noindex;
    if (dto.og_image !== undefined) override.og_image = dto.og_image || undefined;
    override.updated_by = updatedBy;
    override.updated_at = new Date();

    await em.flush();
    return override;
  }

  async deleteOverride(id: string): Promise<boolean> {
    const em = this.em.fork();
    const override = await em.findOne(SeoOverride, { id });
    if (!override) return false;
    await em.removeAndFlush(override);
    return true;
  }

  /**
   * Generate XML sitemap with all public pages
   */
  async generateSitemap(): Promise<string> {
    const em = this.em.fork();

    // Gather all dynamic URLs in parallel
    const [
      eventIds,
      productIds,
      profileIds,
      retailerIds,
      manufacturerIds,
      teamIds,
      judgeIds,
      eventDirectorIds,
      archiveYears,
      rulebookIds,
    ] = await Promise.all([
      this.getEventIds(em),
      this.getProductIds(em),
      this.getPublicProfileIds(em),
      this.getRetailerIds(em),
      this.getManufacturerIds(em),
      this.getTeamIds(em),
      this.getJudgeIds(em),
      this.getEventDirectorIds(em),
      this.getArchiveYears(em),
      this.getRulebookIds(em),
    ]);

    const urls: SitemapUrl[] = [];

    // Static pages
    urls.push(
      { loc: '/', changefreq: 'daily', priority: 1.0 },
      { loc: '/events', changefreq: 'daily', priority: 0.9 },
      { loc: '/shop', changefreq: 'daily', priority: 0.8 },
      { loc: '/results', changefreq: 'daily', priority: 0.8 },
      { loc: '/leaderboard', changefreq: 'daily', priority: 0.7 },
      { loc: '/standings', changefreq: 'daily', priority: 0.7 },
      { loc: '/team-standings', changefreq: 'weekly', priority: 0.6 },
      { loc: '/team-leaderboard', changefreq: 'weekly', priority: 0.6 },
      { loc: '/members', changefreq: 'weekly', priority: 0.6 },
      { loc: '/teams', changefreq: 'weekly', priority: 0.6 },
      { loc: '/retailers', changefreq: 'weekly', priority: 0.7 },
      { loc: '/manufacturers', changefreq: 'weekly', priority: 0.7 },
      { loc: '/judges', changefreq: 'weekly', priority: 0.6 },
      { loc: '/event-directors', changefreq: 'weekly', priority: 0.6 },
      { loc: '/rulebooks', changefreq: 'monthly', priority: 0.7 },
      { loc: '/hall-of-fame', changefreq: 'yearly', priority: 0.6 },
      { loc: '/championship-archives', changefreq: 'yearly', priority: 0.6 },
      { loc: '/class-calculator', changefreq: 'monthly', priority: 0.5 },
      { loc: '/membership', changefreq: 'monthly', priority: 0.7 },
      { loc: '/contact', changefreq: 'monthly', priority: 0.5 },
      { loc: '/host-event', changefreq: 'monthly', priority: 0.5 },
      { loc: '/competition-guides', changefreq: 'monthly', priority: 0.6 },
      { loc: '/competition-guides/quick-start', changefreq: 'monthly', priority: 0.5 },
      { loc: '/privacy-policy', changefreq: 'yearly', priority: 0.2 },
      { loc: '/terms-and-conditions', changefreq: 'yearly', priority: 0.2 },
    );

    // Dynamic pages
    for (const row of eventIds) {
      urls.push({ loc: `/events/${row.id}`, changefreq: 'weekly', priority: 0.7 });
    }

    for (const row of productIds) {
      urls.push({ loc: `/shop/products/${row.id}`, changefreq: 'weekly', priority: 0.6 });
    }

    for (const row of profileIds) {
      urls.push({ loc: `/members/${row.id}`, changefreq: 'monthly', priority: 0.4 });
    }

    for (const row of retailerIds) {
      urls.push({ loc: `/retailers/${row.id}`, changefreq: 'monthly', priority: 0.5 });
    }

    for (const row of manufacturerIds) {
      urls.push({ loc: `/manufacturers/${row.id}`, changefreq: 'monthly', priority: 0.5 });
    }

    for (const row of teamIds) {
      urls.push({ loc: `/teams/${row.id}`, changefreq: 'monthly', priority: 0.4 });
    }

    for (const row of judgeIds) {
      urls.push({ loc: `/judges/${row.id}`, changefreq: 'monthly', priority: 0.4 });
    }

    for (const row of eventDirectorIds) {
      urls.push({ loc: `/event-directors/${row.id}`, changefreq: 'monthly', priority: 0.4 });
    }

    for (const row of archiveYears) {
      urls.push({ loc: `/championship-archives/${row.year}`, changefreq: 'yearly', priority: 0.5 });
    }

    for (const row of rulebookIds) {
      urls.push({ loc: `/rulebooks/${row.id}`, changefreq: 'monthly', priority: 0.5 });
    }

    this.logger.log(`Generated sitemap with ${urls.length} URLs`);

    return this.buildSitemapXml(urls);
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const siteUrl = this.siteUrl;

    if (!isProduction) {
      // Block all crawling on non-production environments
      return [
        'User-agent: *',
        'Disallow: /',
        '',
      ].join('\n');
    }

    return [
      'User-agent: *',
      'Allow: /',
      '',
      '# Admin and API routes',
      'Disallow: /admin',
      'Disallow: /api/',
      'Disallow: /login',
      'Disallow: /change-password',
      'Disallow: /dashboard',
      'Disallow: /profile/edit',
      'Disallow: /shop/cart',
      'Disallow: /shop/checkout',
      '',
      '# Auth callback routes',
      'Disallow: /auth/',
      '',
      '# Payment routes',
      'Disallow: /pay/',
      '',
      `Sitemap: ${siteUrl}/sitemap.xml`,
      '',
    ].join('\n');
  }

  // ===========================================================================
  // Database queries for sitemap URLs
  // ===========================================================================

  private async getEventIds(em: EntityManager): Promise<{ id: string }[]> {
    const conn = em.getConnection();
    return conn.execute(
      `SELECT id FROM events WHERE status IN ('upcoming', 'completed') ORDER BY event_date DESC LIMIT 5000`,
    );
  }

  private async getProductIds(em: EntityManager): Promise<{ id: string }[]> {
    const conn = em.getConnection();
    return conn.execute(
      `SELECT id FROM shop_products WHERE is_active = true ORDER BY display_order, created_at DESC LIMIT 1000`,
    );
  }

  private async getPublicProfileIds(em: EntityManager): Promise<{ id: string }[]> {
    const conn = em.getConnection();
    return conn.execute(
      `SELECT id FROM profiles WHERE is_public = true ORDER BY created_at DESC LIMIT 10000`,
    );
  }

  private async getRetailerIds(em: EntityManager): Promise<{ id: string }[]> {
    const conn = em.getConnection();
    return conn.execute(
      `SELECT id FROM retailer_listings WHERE is_active = true AND is_approved = true AND (end_date IS NULL OR end_date >= CURRENT_DATE) ORDER BY created_at DESC LIMIT 5000`,
    );
  }

  private async getManufacturerIds(em: EntityManager): Promise<{ id: string }[]> {
    const conn = em.getConnection();
    return conn.execute(
      `SELECT id FROM manufacturer_listings WHERE is_active = true AND is_approved = true AND (end_date IS NULL OR end_date >= CURRENT_DATE) ORDER BY created_at DESC LIMIT 5000`,
    );
  }

  private async getTeamIds(em: EntityManager): Promise<{ id: string }[]> {
    const conn = em.getConnection();
    return conn.execute(
      `SELECT id FROM teams WHERE is_public = true AND is_active = true ORDER BY created_at DESC LIMIT 5000`,
    );
  }

  private async getJudgeIds(em: EntityManager): Promise<{ id: string }[]> {
    const conn = em.getConnection();
    return conn.execute(
      `SELECT id FROM judges WHERE is_active = true ORDER BY created_at DESC LIMIT 5000`,
    );
  }

  private async getEventDirectorIds(em: EntityManager): Promise<{ id: string }[]> {
    const conn = em.getConnection();
    return conn.execute(
      `SELECT id FROM event_directors WHERE is_active = true ORDER BY created_at DESC LIMIT 5000`,
    );
  }

  private async getArchiveYears(em: EntityManager): Promise<{ year: number }[]> {
    const conn = em.getConnection();
    return conn.execute(
      `SELECT DISTINCT year FROM championship_archives WHERE published = true ORDER BY year DESC`,
    );
  }

  private async getRulebookIds(em: EntityManager): Promise<{ id: string }[]> {
    const conn = em.getConnection();
    return conn.execute(
      `SELECT id FROM rulebooks WHERE is_active = true ORDER BY created_at DESC LIMIT 500`,
    );
  }

  // ===========================================================================
  // XML generation
  // ===========================================================================

  private buildSitemapXml(urls: SitemapUrl[]): string {
    const today = new Date().toISOString().split('T')[0];

    const urlEntries = urls
      .map(
        (u) => `  <url>
    <loc>${this.escapeXml(this.siteUrl + u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority.toFixed(1)}</priority>
  </url>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

interface SitemapUrl {
  loc: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}
