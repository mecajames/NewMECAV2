import axios from 'axios';

export interface AnalyticsStatus {
  configured: boolean;
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

// Search Console types
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

export const analyticsApi = {
  getStatus: async (): Promise<AnalyticsStatus> => {
    const response = await axios.get('/api/admin/analytics/status');
    return response.data;
  },

  getDashboard: async (startDate: string, endDate: string): Promise<AnalyticsDashboard> => {
    const response = await axios.get('/api/admin/analytics/dashboard', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getPageViews: async (startDate: string, endDate: string): Promise<TimeSeriesPoint[]> => {
    const response = await axios.get('/api/admin/analytics/page-views', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getTopPages: async (startDate: string, endDate: string, limit = 10): Promise<TopPage[]> => {
    const response = await axios.get('/api/admin/analytics/top-pages', {
      params: { startDate, endDate, limit },
    });
    return response.data;
  },

  getTrafficSources: async (startDate: string, endDate: string): Promise<TrafficSource[]> => {
    const response = await axios.get('/api/admin/analytics/traffic-sources', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getDevices: async (startDate: string, endDate: string): Promise<DeviceCategory[]> => {
    const response = await axios.get('/api/admin/analytics/devices', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // Search Console
  getSearchConsoleStatus: async (): Promise<{ configured: boolean }> => {
    const response = await axios.get('/api/admin/analytics/search-console/status');
    return response.data;
  },

  getSearchConsoleDashboard: async (startDate?: string, endDate?: string): Promise<SearchConsoleData> => {
    const response = await axios.get('/api/admin/analytics/search-console/dashboard', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getSearchConsoleQueries: async (startDate?: string, endDate?: string, limit = 50): Promise<SearchQuery[]> => {
    const response = await axios.get('/api/admin/analytics/search-console/queries', {
      params: { startDate, endDate, limit },
    });
    return response.data;
  },

  getSearchConsolePages: async (startDate?: string, endDate?: string, limit = 50): Promise<SearchPage[]> => {
    const response = await axios.get('/api/admin/analytics/search-console/pages', {
      params: { startDate, endDate, limit },
    });
    return response.data;
  },

  getSitemapStatus: async (): Promise<IndexingStatus[]> => {
    const response = await axios.get('/api/admin/analytics/search-console/sitemaps');
    return response.data;
  },

  submitSitemap: async (): Promise<{ success: boolean }> => {
    const response = await axios.post('/api/admin/analytics/search-console/submit-sitemap');
    return response.data;
  },
};
