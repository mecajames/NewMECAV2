import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { SeoOverride } from './seo-override.entity';
import { SiteSettings } from '../site-settings/site-settings.entity';

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  type?: string;
  noindex?: boolean;
  jsonLd?: object;
  googleVerification?: string;
  bingVerification?: string;
}

@Injectable()
export class PrerenderService {
  private readonly logger = new Logger(PrerenderService.name);
  private readonly siteUrl = 'https://mecacaraudio.com';
  private readonly siteName = 'MECA Car Audio';
  private readonly defaultImage = `${this.siteUrl}/og-image.png`;
  private readonly twitterHandle = '@mecacaraudio';

  constructor(private readonly em: EntityManager) {}

  /**
   * Generate a fully formed HTML page with SEO meta tags for the given URL path.
   * Used to serve crawlers a page with proper meta tags without needing JS execution.
   */
  async renderPage(path: string): Promise<string> {
    const meta = await this.getMetaForPath(path);
    return this.buildHtml(meta);
  }

  private async getMetaForPath(path: string): Promise<PageMeta> {
    // Normalize path
    const cleanPath = path.replace(/\/$/, '') || '/';
    const em = this.em.fork();

    // Check for SEO override first (gracefully handle missing table)
    let override: SeoOverride | null = null;
    try {
      override = await em.findOne(SeoOverride, { url_path: cleanPath });
    } catch {
      // Table may not exist yet
    }

    // Get verification codes
    const verificationRows = await em.find(SiteSettings, {
      setting_key: { $in: ['seo_google_verification', 'seo_bing_verification'] },
    });
    const googleVerification = verificationRows.find(r => r.setting_key === 'seo_google_verification')?.setting_value || '';
    const bingVerification = verificationRows.find(r => r.setting_key === 'seo_bing_verification')?.setting_value || '';

    // Get base meta from dynamic or static routes
    let baseMeta: PageMeta;
    const dynamicMeta = await this.getDynamicMeta(cleanPath);
    baseMeta = dynamicMeta || this.getStaticMeta(cleanPath);

    // Apply overrides if they exist
    if (override) {
      if (override.title) baseMeta.title = override.title;
      if (override.description) baseMeta.description = override.description;
      if (override.canonical_url) baseMeta.canonical = override.canonical_url;
      if (override.og_image) baseMeta.image = override.og_image;
      if (override.noindex) baseMeta.noindex = true;
    }

    baseMeta.googleVerification = googleVerification;
    baseMeta.bingVerification = bingVerification;

    return baseMeta;
  }

  private getStaticMeta(path: string): PageMeta {
    const routes: Record<string, PageMeta> = {
      '/': {
        title: 'MECA Car Audio | Car Audio Competitions',
        description: 'The Premier Platform for Car Audio Competition Management. Browse events, view results, and join the MECA community.',
        canonical: '/',
        type: 'website',
        jsonLd: this.getOrganizationSchema(),
      },
      '/events': {
        title: 'Competition Events | MECA Car Audio',
        description: 'Browse upcoming and past car audio competition events. Find SPL, SQL, and Show & Shine events near you. Register for MECA sanctioned competitions.',
        canonical: '/events',
      },
      '/shop': {
        title: 'MECA Shop | Official Merchandise & Gear',
        description: 'Shop official MECA merchandise, apparel, and competition gear. Support the car audio community with quality products.',
        canonical: '/shop',
      },
      '/results': {
        title: 'Competition Results | MECA Car Audio',
        description: 'View competition results from MECA sanctioned car audio events. See scores, placements, and detailed breakdowns.',
        canonical: '/results',
      },
      '/leaderboard': {
        title: 'Leaderboard Rankings | MECA Car Audio',
        description: 'Check the current MECA leaderboard rankings. See who leads in SPL, SQL, and overall points standings.',
        canonical: '/leaderboard',
      },
      '/standings': {
        title: 'Season Standings | MECA Car Audio',
        description: 'View current season standings for MECA competitors. Track points, rankings, and championship positions.',
        canonical: '/standings',
      },
      '/team-standings': {
        title: 'Team Standings | MECA Car Audio',
        description: 'View team standings for MECA car audio competitions. See which teams are leading in total points this season.',
        canonical: '/team-standings',
      },
      '/team-leaderboard': {
        title: 'Top 10 Teams | MECA Car Audio',
        description: 'View the top 10 teams in MECA car audio competitions. See which teams are leading in total points this season.',
        canonical: '/team-leaderboard',
      },
      '/members': {
        title: 'Member Directory | MECA Car Audio',
        description: 'Browse the MECA member directory. Find competitors, enthusiasts, and community members.',
        canonical: '/members',
      },
      '/teams': {
        title: 'Team Directory | MECA Car Audio',
        description: 'Discover MECA competition teams. Browse team profiles and see their achievements.',
        canonical: '/teams',
      },
      '/retailers': {
        title: 'Retailer Directory | MECA Car Audio',
        description: 'Find MECA authorized retailers near you. Connect with professional car audio installers and shops.',
        canonical: '/retailers',
      },
      '/manufacturers': {
        title: 'Manufacturer Directory | MECA Car Audio',
        description: 'Explore MECA partner manufacturers. Discover the brands that support car audio competition.',
        canonical: '/manufacturers',
      },
      '/judges': {
        title: 'Judge Directory | MECA Car Audio',
        description: 'Meet the official MECA judges. Certified professionals who score competitions across the country.',
        canonical: '/judges',
      },
      '/event-directors': {
        title: 'Event Director Directory | MECA Car Audio',
        description: 'Find MECA event directors. The professionals who organize and run sanctioned competitions.',
        canonical: '/event-directors',
      },
      '/rulebooks': {
        title: 'Rulebooks | MECA Car Audio',
        description: 'Access official MECA rulebooks for SPL, SQL, and Show & Shine competitions. Learn the rules and regulations.',
        canonical: '/rulebooks',
      },
      '/hall-of-fame': {
        title: 'Hall of Fame | MECA Car Audio',
        description: 'Celebrate MECA legends in our Hall of Fame. Honoring outstanding achievements in car audio competition.',
        canonical: '/hall-of-fame',
      },
      '/championship-archives': {
        title: 'Championship Archives | MECA Car Audio',
        description: 'Explore MECA championship history. View past winners, records, and memorable moments.',
        canonical: '/championship-archives',
      },
      '/class-calculator': {
        title: 'Class Calculator | MECA Car Audio',
        description: 'Calculate your MECA competition class. Determine the right category for your vehicle and equipment.',
        canonical: '/class-calculator',
      },
      '/membership': {
        title: 'Membership | MECA Car Audio',
        description: 'Join MECA and unlock exclusive benefits. Compete in sanctioned events and connect with the community.',
        canonical: '/membership',
      },
      '/contact': {
        title: 'Contact Us | MECA Car Audio',
        description: 'Contact MECA for questions, support, or inquiries. We are here to help the car audio community.',
        canonical: '/contact',
      },
      '/host-event': {
        title: 'Host an Event | MECA Car Audio',
        description: 'Host a MECA sanctioned event at your location. Partner with us to bring car audio competitions to your area.',
        canonical: '/host-event',
      },
      '/competition-guides': {
        title: 'Competition Guides | MECA Car Audio',
        description: 'Learn how to compete in MECA events. Guides for beginners and experienced competitors alike.',
        canonical: '/competition-guides',
      },
      '/competition-guides/quick-start': {
        title: 'Quick Start Guide | MECA Car Audio',
        description: 'Get started with MECA competitions. A step-by-step guide for first-time competitors.',
        canonical: '/competition-guides/quick-start',
      },
      '/privacy-policy': {
        title: 'Privacy Policy | MECA Car Audio',
        description: 'Read the MECA privacy policy. Learn how we protect and handle your personal information.',
        canonical: '/privacy-policy',
      },
      '/terms-and-conditions': {
        title: 'Terms and Conditions | MECA Car Audio',
        description: 'Review MECA terms and conditions. Understand the rules governing use of our platform and services.',
        canonical: '/terms-and-conditions',
      },
    };

    return routes[path] || {
      title: 'MECA Car Audio | Car Audio Competitions',
      description: 'The Premier Platform for Car Audio Competition Management. Browse events, view results, and join the MECA community.',
      canonical: path,
    };
  }

  private async getDynamicMeta(path: string): Promise<PageMeta | null> {
    const em = this.em.fork();
    const conn = em.getConnection();

    // Event detail: /events/:id
    let match = path.match(/^\/events\/([a-f0-9-]+)$/);
    if (match) {
      const rows = await conn.execute(
        `SELECT title, event_date, location_name, location_city, location_state FROM events WHERE id = ? LIMIT 1`,
        [match[1]],
      );
      if (rows.length > 0) {
        const e = rows[0];
        const dateStr = e.event_date ? new Date(e.event_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';
        const location = [e.location_name, e.location_city, e.location_state].filter(Boolean).join(', ');
        return {
          title: `${e.title} | MECA Event`,
          description: `Join us${location ? ` at ${location}` : ''}${dateStr ? ` on ${dateStr}` : ''} for this exciting car audio competition event.`,
          canonical: path,
        };
      }
    }

    // Product detail: /shop/products/:id
    match = path.match(/^\/shop\/products\/([a-f0-9-]+)$/);
    if (match) {
      const rows = await conn.execute(
        `SELECT name, description FROM shop_products WHERE id = ? LIMIT 1`,
        [match[1]],
      );
      if (rows.length > 0) {
        const p = rows[0];
        const desc = p.description
          ? p.description.substring(0, 157) + (p.description.length > 157 ? '...' : '')
          : `Shop ${p.name} from the official MECA store. Quality car audio competition gear and merchandise.`;
        return {
          title: `${p.name} | MECA Shop`,
          description: desc,
          canonical: path,
        };
      }
    }

    // Member profile: /members/:id
    match = path.match(/^\/members\/([a-f0-9-]+)$/);
    if (match) {
      const rows = await conn.execute(
        `SELECT full_name FROM profiles WHERE id = ? AND is_public = true LIMIT 1`,
        [match[1]],
      );
      if (rows.length > 0) {
        return {
          title: `${rows[0].full_name} | MECA Member`,
          description: `View ${rows[0].full_name}'s MECA member profile. See competition history and achievements.`,
          canonical: path,
        };
      }
    }

    // Retailer profile: /retailers/:id
    match = path.match(/^\/retailers\/([a-f0-9-]+)$/);
    if (match) {
      const rows = await conn.execute(
        `SELECT business_name FROM retailer_listings WHERE id = ? LIMIT 1`,
        [match[1]],
      );
      if (rows.length > 0) {
        return {
          title: `${rows[0].business_name} | MECA Retailer`,
          description: `${rows[0].business_name} - MECA authorized retailer. Professional car audio installation and equipment.`,
          canonical: path,
        };
      }
    }

    // Manufacturer profile: /manufacturers/:id
    match = path.match(/^\/manufacturers\/([a-f0-9-]+)$/);
    if (match) {
      const rows = await conn.execute(
        `SELECT business_name FROM manufacturer_listings WHERE id = ? LIMIT 1`,
        [match[1]],
      );
      if (rows.length > 0) {
        return {
          title: `${rows[0].business_name} | MECA Manufacturer`,
          description: `${rows[0].business_name} - MECA partner manufacturer. Quality car audio equipment and products.`,
          canonical: path,
        };
      }
    }

    // Team profile: /teams/:id
    match = path.match(/^\/teams\/([a-f0-9-]+)$/);
    if (match) {
      const rows = await conn.execute(
        `SELECT name FROM teams WHERE id = ? AND is_public = true LIMIT 1`,
        [match[1]],
      );
      if (rows.length > 0) {
        return {
          title: `${rows[0].name} | MECA Team`,
          description: `View ${rows[0].name} team profile. See team members, competition history, and achievements.`,
          canonical: path,
        };
      }
    }

    // Judge profile: /judges/:id
    match = path.match(/^\/judges\/([a-f0-9-]+)$/);
    if (match) {
      const rows = await conn.execute(
        `SELECT j.id, p.full_name FROM judges j JOIN profiles p ON p.id = j.user_id WHERE j.id = ? LIMIT 1`,
        [match[1]],
      );
      if (rows.length > 0) {
        return {
          title: `${rows[0].full_name} | MECA Judge`,
          description: `${rows[0].full_name} - Official MECA certified judge. View judging history and credentials.`,
          canonical: path,
        };
      }
    }

    // Event Director profile: /event-directors/:id
    match = path.match(/^\/event-directors\/([a-f0-9-]+)$/);
    if (match) {
      const rows = await conn.execute(
        `SELECT ed.id, p.full_name FROM event_directors ed JOIN profiles p ON p.id = ed.user_id WHERE ed.id = ? LIMIT 1`,
        [match[1]],
      );
      if (rows.length > 0) {
        return {
          title: `${rows[0].full_name} | MECA Event Director`,
          description: `${rows[0].full_name} - MECA event director. View events organized and director profile.`,
          canonical: path,
        };
      }
    }

    // Championship archive: /championship-archives/:year
    match = path.match(/^\/championship-archives\/(\d{4})$/);
    if (match) {
      return {
        title: `${match[1]} Championship Archives | MECA Car Audio`,
        description: `View the ${match[1]} MECA championship results. Champions, standings, and memorable moments from the season.`,
        canonical: path,
      };
    }

    // Rulebook detail: /rulebooks/:id
    match = path.match(/^\/rulebooks\/([a-f0-9-]+)$/);
    if (match) {
      const rows = await conn.execute(
        `SELECT title FROM rulebooks WHERE id = ? LIMIT 1`,
        [match[1]],
      );
      if (rows.length > 0) {
        return {
          title: `${rows[0].title} | MECA Rulebook`,
          description: `Read the ${rows[0].title}. Official MECA competition rules and regulations.`,
          canonical: path,
        };
      }
    }

    return null;
  }

  private buildHtml(meta: PageMeta): string {
    const fullUrl = `${this.siteUrl}${meta.canonical}`;
    const image = meta.image || this.defaultImage;
    const type = meta.type || 'website';

    const jsonLdScript = meta.jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`
      : '';

    const noindexTag = meta.noindex ? '\n  <meta name="robots" content="noindex, nofollow">' : '';

    const googleTag = meta.googleVerification
      ? `\n  <meta name="google-site-verification" content="${this.escapeAttr(meta.googleVerification)}">`
      : '';

    const bingTag = meta.bingVerification
      ? `\n  <meta name="msvalidate.01" content="${this.escapeAttr(meta.bingVerification)}">`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(meta.title)}</title>
  <meta name="description" content="${this.escapeAttr(meta.description)}">
  <link rel="canonical" href="${fullUrl}">${noindexTag}${googleTag}${bingTag}

  <!-- Open Graph -->
  <meta property="og:title" content="${this.escapeAttr(meta.title)}">
  <meta property="og:description" content="${this.escapeAttr(meta.description)}">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="${fullUrl}">
  <meta property="og:type" content="${type}">
  <meta property="og:site_name" content="${this.siteName}">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${this.escapeAttr(meta.title)}">
  <meta name="twitter:description" content="${this.escapeAttr(meta.description)}">
  <meta name="twitter:image" content="${image}">
  <meta name="twitter:site" content="${this.twitterHandle}">

  ${jsonLdScript}

  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
</head>
<body>
  <div id="root">
    <h1>${this.escapeHtml(meta.title)}</h1>
    <p>${this.escapeHtml(meta.description)}</p>
    <p>Visit <a href="${fullUrl}">${fullUrl}</a> to view this page.</p>
  </div>
</body>
</html>`;
  }

  private getOrganizationSchema(): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Mobile Electronics Competition Association',
      alternateName: 'MECA',
      url: this.siteUrl,
      logo: `${this.siteUrl}/logo.png`,
      sameAs: [
        'https://www.facebook.com/mecacaraudio',
        'https://www.instagram.com/mecacaraudio',
        'https://www.youtube.com/@mecacaraudio',
      ],
      description: 'The Premier Platform for Car Audio Competition Management.',
    };
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escapeAttr(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
