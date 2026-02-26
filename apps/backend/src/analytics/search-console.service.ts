import { Injectable, Logger } from '@nestjs/common';
import { google, webmasters_v3 } from 'googleapis';

export interface SearchQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchPage {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchConsoleSummary {
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
}

export interface SearchConsoleData {
  summary: SearchConsoleSummary;
  topQueries: SearchQuery[];
  topPages: SearchPage[];
}

export interface IndexingStatus {
  sitemapUrl: string;
  lastSubmitted?: string;
  isPending: boolean;
  lastDownloaded?: string;
  warnings?: number;
  errors?: number;
}

@Injectable()
export class SearchConsoleService {
  private readonly logger = new Logger(SearchConsoleService.name);
  private webmasters: webmasters_v3.Webmasters | null = null;
  private readonly siteUrl = 'https://mecacaraudio.com';

  constructor() {
    const credentialsJson = process.env.GA4_CREDENTIALS_JSON;

    if (credentialsJson) {
      try {
        const credentials = JSON.parse(credentialsJson);
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
        });
        this.webmasters = google.webmasters({ version: 'v3', auth });
        this.logger.log('Google Search Console API client initialized');
      } catch (error) {
        this.logger.warn('Failed to initialize Search Console client: invalid credentials JSON');
      }
    } else {
      this.logger.warn('Search Console not configured: missing GA4_CREDENTIALS_JSON');
    }
  }

  isConfigured(): boolean {
    return this.webmasters !== null;
  }

  /**
   * Get top search queries with clicks, impressions, CTR, and position
   */
  async getTopQueries(startDate: string, endDate: string, limit = 25): Promise<SearchQuery[]> {
    if (!this.webmasters) return [];

    try {
      const response = await this.webmasters.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['query'],
          rowLimit: limit,
          dataState: 'final',
        },
      });

      return (response.data.rows ?? []).map((row) => ({
        query: row.keys?.[0] ?? '',
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: Math.round((row.ctr ?? 0) * 10000) / 100, // Convert to percentage
        position: Math.round((row.position ?? 0) * 10) / 10,
      }));
    } catch (error: any) {
      this.logger.error(`Failed to get top queries: ${error.message}`);
      return [];
    }
  }

  /**
   * Get top pages from search results with clicks, impressions, CTR, and position
   */
  async getTopPages(startDate: string, endDate: string, limit = 25): Promise<SearchPage[]> {
    if (!this.webmasters) return [];

    try {
      const response = await this.webmasters.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit: limit,
          dataState: 'final',
        },
      });

      return (response.data.rows ?? []).map((row) => ({
        page: row.keys?.[0] ?? '',
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: Math.round((row.ctr ?? 0) * 10000) / 100,
        position: Math.round((row.position ?? 0) * 10) / 10,
      }));
    } catch (error: any) {
      this.logger.error(`Failed to get top pages: ${error.message}`);
      return [];
    }
  }

  /**
   * Get summary stats (total clicks, impressions, avg CTR, avg position)
   */
  async getSummary(startDate: string, endDate: string): Promise<SearchConsoleSummary> {
    if (!this.webmasters) {
      return { totalClicks: 0, totalImpressions: 0, averageCtr: 0, averagePosition: 0 };
    }

    try {
      const response = await this.webmasters.searchanalytics.query({
        siteUrl: this.siteUrl,
        requestBody: {
          startDate,
          endDate,
          dataState: 'final',
        },
      });

      const rows = response.data.rows ?? [];
      if (rows.length === 0) {
        return { totalClicks: 0, totalImpressions: 0, averageCtr: 0, averagePosition: 0 };
      }

      const row = rows[0];
      return {
        totalClicks: row.clicks ?? 0,
        totalImpressions: row.impressions ?? 0,
        averageCtr: Math.round((row.ctr ?? 0) * 10000) / 100,
        averagePosition: Math.round((row.position ?? 0) * 10) / 10,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get summary: ${error.message}`);
      return { totalClicks: 0, totalImpressions: 0, averageCtr: 0, averagePosition: 0 };
    }
  }

  /**
   * Get full search console dashboard data
   */
  async getDashboard(startDate: string, endDate: string): Promise<SearchConsoleData> {
    const [summary, topQueries, topPages] = await Promise.all([
      this.getSummary(startDate, endDate),
      this.getTopQueries(startDate, endDate),
      this.getTopPages(startDate, endDate),
    ]);

    return { summary, topQueries, topPages };
  }

  /**
   * Get sitemap indexing status
   */
  async getSitemapStatus(): Promise<IndexingStatus[]> {
    if (!this.webmasters) return [];

    try {
      const response = await this.webmasters.sitemaps.list({
        siteUrl: this.siteUrl,
      });

      return (response.data.sitemap ?? []).map((sm) => ({
        sitemapUrl: sm.path ?? '',
        lastSubmitted: sm.lastSubmitted ?? undefined,
        isPending: sm.isPending ?? false,
        lastDownloaded: sm.lastDownloaded ?? undefined,
        warnings: sm.warnings ? Number(sm.warnings) : undefined,
        errors: sm.errors ? Number(sm.errors) : undefined,
      }));
    } catch (error: any) {
      this.logger.error(`Failed to get sitemap status: ${error.message}`);
      return [];
    }
  }

  /**
   * Submit sitemap to Google Search Console
   */
  async submitSitemap(): Promise<boolean> {
    if (!this.webmasters) return false;

    try {
      await this.webmasters.sitemaps.submit({
        siteUrl: this.siteUrl,
        feedpath: `${this.siteUrl}/sitemap.xml`,
      });
      this.logger.log('Sitemap submitted to Google Search Console');
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to submit sitemap: ${error.message}`);
      return false;
    }
  }
}
