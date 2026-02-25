import { Injectable, Logger } from '@nestjs/common';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

export interface SummaryStats {
  pageViews: number;
  activeUsers: number;
  sessions: number;
  avgSessionDuration: number;
  bounceRate: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface TopPage {
  pagePath: string;
  pageViews: number;
  activeUsers: number;
}

export interface TrafficSource {
  channel: string;
  sessions: number;
  activeUsers: number;
}

export interface DeviceCategory {
  device: string;
  users: number;
}

export interface AnalyticsDashboard {
  summary: SummaryStats;
  pageViewsOverTime: TimeSeriesPoint[];
  activeUsersOverTime: TimeSeriesPoint[];
  topPages: TopPage[];
  trafficSources: TrafficSource[];
  deviceCategories: DeviceCategory[];
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private client: BetaAnalyticsDataClient | null = null;
  private propertyId: string | null = null;
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    const propertyId = process.env.GA4_PROPERTY_ID;
    const credentialsJson = process.env.GA4_CREDENTIALS_JSON;

    if (propertyId && credentialsJson) {
      try {
        const credentials = JSON.parse(credentialsJson);
        this.client = new BetaAnalyticsDataClient({ credentials });
        this.propertyId = propertyId;
        this.logger.log('Google Analytics Data API client initialized');
      } catch (error) {
        this.logger.warn('Failed to initialize GA4 client: invalid credentials JSON');
      }
    } else {
      this.logger.warn('GA4 not configured: missing GA4_PROPERTY_ID or GA4_CREDENTIALS_JSON');
    }
  }

  isConfigured(): boolean {
    return this.client !== null && this.propertyId !== null;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getSummaryStats(startDate: string, endDate: string): Promise<SummaryStats> {
    const cacheKey = `summary_${startDate}_${endDate}`;
    const cached = this.getCached<SummaryStats>(cacheKey);
    if (cached) return cached;

    const [response] = await this.client!.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
    });

    const row = response.rows?.[0];
    const result: SummaryStats = {
      pageViews: Number(row?.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(row?.metricValues?.[1]?.value ?? 0),
      sessions: Number(row?.metricValues?.[2]?.value ?? 0),
      avgSessionDuration: Number(row?.metricValues?.[3]?.value ?? 0),
      bounceRate: Number(row?.metricValues?.[4]?.value ?? 0),
    };

    this.setCache(cacheKey, result);
    return result;
  }

  async getPageViewsOverTime(startDate: string, endDate: string): Promise<TimeSeriesPoint[]> {
    const cacheKey = `pageviews_time_${startDate}_${endDate}`;
    const cached = this.getCached<TimeSeriesPoint[]>(cacheKey);
    if (cached) return cached;

    const [response] = await this.client!.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    const result: TimeSeriesPoint[] = (response.rows ?? []).map((row) => ({
      date: row.dimensionValues?.[0]?.value ?? '',
      value: Number(row.metricValues?.[0]?.value ?? 0),
    }));

    this.setCache(cacheKey, result);
    return result;
  }

  async getActiveUsersOverTime(startDate: string, endDate: string): Promise<TimeSeriesPoint[]> {
    const cacheKey = `activeusers_time_${startDate}_${endDate}`;
    const cached = this.getCached<TimeSeriesPoint[]>(cacheKey);
    if (cached) return cached;

    const [response] = await this.client!.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    });

    const result: TimeSeriesPoint[] = (response.rows ?? []).map((row) => ({
      date: row.dimensionValues?.[0]?.value ?? '',
      value: Number(row.metricValues?.[0]?.value ?? 0),
    }));

    this.setCache(cacheKey, result);
    return result;
  }

  async getTopPages(startDate: string, endDate: string, limit = 10): Promise<TopPage[]> {
    const cacheKey = `toppages_${startDate}_${endDate}_${limit}`;
    const cached = this.getCached<TopPage[]>(cacheKey);
    if (cached) return cached;

    const [response] = await this.client!.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit,
    });

    const result: TopPage[] = (response.rows ?? []).map((row) => ({
      pagePath: row.dimensionValues?.[0]?.value ?? '',
      pageViews: Number(row.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    this.setCache(cacheKey, result);
    return result;
  }

  async getTrafficSources(startDate: string, endDate: string): Promise<TrafficSource[]> {
    const cacheKey = `traffic_${startDate}_${endDate}`;
    const cached = this.getCached<TrafficSource[]>(cacheKey);
    if (cached) return cached;

    const [response] = await this.client!.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    });

    const result: TrafficSource[] = (response.rows ?? []).map((row) => ({
      channel: row.dimensionValues?.[0]?.value ?? '',
      sessions: Number(row.metricValues?.[0]?.value ?? 0),
      activeUsers: Number(row.metricValues?.[1]?.value ?? 0),
    }));

    this.setCache(cacheKey, result);
    return result;
  }

  async getDeviceCategories(startDate: string, endDate: string): Promise<DeviceCategory[]> {
    const cacheKey = `devices_${startDate}_${endDate}`;
    const cached = this.getCached<DeviceCategory[]>(cacheKey);
    if (cached) return cached;

    const [response] = await this.client!.runReport({
      property: `properties/${this.propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    });

    const result: DeviceCategory[] = (response.rows ?? []).map((row) => ({
      device: row.dimensionValues?.[0]?.value ?? '',
      users: Number(row.metricValues?.[0]?.value ?? 0),
    }));

    this.setCache(cacheKey, result);
    return result;
  }

  async getDashboard(startDate: string, endDate: string): Promise<AnalyticsDashboard> {
    const cacheKey = `dashboard_${startDate}_${endDate}`;
    const cached = this.getCached<AnalyticsDashboard>(cacheKey);
    if (cached) return cached;

    const [summary, pageViewsOverTime, activeUsersOverTime, topPages, trafficSources, deviceCategories] =
      await Promise.all([
        this.getSummaryStats(startDate, endDate),
        this.getPageViewsOverTime(startDate, endDate),
        this.getActiveUsersOverTime(startDate, endDate),
        this.getTopPages(startDate, endDate),
        this.getTrafficSources(startDate, endDate),
        this.getDeviceCategories(startDate, endDate),
      ]);

    const result: AnalyticsDashboard = {
      summary,
      pageViewsOverTime,
      activeUsersOverTime,
      topPages,
      trafficSources,
      deviceCategories,
    };

    this.setCache(cacheKey, result);
    return result;
  }
}
