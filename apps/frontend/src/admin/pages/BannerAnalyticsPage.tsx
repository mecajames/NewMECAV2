import { useState, useEffect } from 'react';
import { BarChart3, Eye, MousePointer, TrendingUp, ArrowLeft, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { BannerAnalytics } from '@newmeca/shared';
import { getAllBannersAnalytics } from '../../api-client/banners.api-client';

type DateRange = 'last7' | 'last30' | 'last90' | 'custom';

export default function BannerAnalyticsPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<BannerAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('last30');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedBanner, setSelectedBanner] = useState<BannerAnalytics | null>(null);

  // Helper to check if a date string is a complete valid date (YYYY-MM-DD)
  const isValidDate = (dateStr: string) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr);

  useEffect(() => {
    // For custom range, only fetch when both dates are fully entered
    if (dateRange === 'custom') {
      if (isValidDate(customStartDate) && isValidDate(customEndDate)) {
        loadAnalytics();
      }
      return;
    }
    loadAnalytics();
  }, [dateRange, customStartDate, customEndDate]);

  const getDateRangeParams = (): { startDate?: Date; endDate?: Date } => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    switch (dateRange) {
      case 'last7': {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        return { startDate: start, endDate: now };
      }
      case 'last30': {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        return { startDate: start, endDate: now };
      }
      case 'last90': {
        const start = new Date(now);
        start.setDate(start.getDate() - 90);
        start.setHours(0, 0, 0, 0);
        return { startDate: start, endDate: now };
      }
      case 'custom': {
        if (customStartDate && customEndDate) {
          return {
            startDate: new Date(customStartDate),
            endDate: new Date(customEndDate),
          };
        }
        return {};
      }
      default:
        return {};
    }
  };

  const loadAnalytics = async () => {
    try {
      // Only show full-page spinner on initial load, not on date changes
      if (analytics.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const { startDate, endDate } = getDateRangeParams();
      const data = await getAllBannersAnalytics(startDate, endDate);
      setAnalytics(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate totals
  const totals = analytics.reduce(
    (acc, banner) => ({
      impressions: acc.impressions + banner.totalImpressions,
      clicks: acc.clicks + banner.totalClicks,
    }),
    { impressions: 0, clicks: 0 }
  );

  const overallCTR = totals.impressions > 0
    ? ((totals.clicks / totals.impressions) * 100).toFixed(2)
    : '0.00';

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin/banners"
              className="p-2 text-slate-400 hover:text-white transition-colors"
              title="Back to Banners"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-orange-500" />
                Banner Analytics
              </h1>
              <p className="text-gray-400">Track banner performance</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>

        {/* Date Range Selector */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="h-5 w-5 text-orange-500" />
              <span className="font-medium">Date Range:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'last7', label: 'Last 7 Days' },
                { value: 'last30', label: 'Last 30 Days' },
                { value: 'last90', label: 'Last 90 Days' },
                { value: 'custom', label: 'Custom' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDateRange(option.value as DateRange)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === option.value
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 transition-opacity ${refreshing ? 'opacity-50' : ''}`}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-slate-400">Total Impressions</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatNumber(totals.impressions)}</p>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <MousePointer className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-slate-400">Total Clicks</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatNumber(totals.clicks)}</p>
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-400" />
              </div>
              <span className="text-slate-400">Overall CTR</span>
            </div>
            <p className="text-3xl font-bold text-white">{overallCTR}%</p>
          </div>
        </div>

        {/* Banners Table */}
        <div className={`bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-8 transition-opacity ${refreshing ? 'opacity-50' : ''}`}>
          <div className="p-4 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white">Banner Performance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Banner</th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300">Advertiser</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Impressions</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Clicks</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">CTR</th>
                  <th className="text-right py-4 px-6 text-sm font-medium text-slate-300">Details</th>
                </tr>
              </thead>
              <tbody>
                {analytics.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No analytics data available for the selected date range.
                    </td>
                  </tr>
                ) : (
                  analytics.map((banner) => (
                    <tr key={banner.bannerId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-4 px-6 text-white font-medium">{banner.bannerName}</td>
                      <td className="py-4 px-6 text-slate-300">{banner.advertiserName}</td>
                      <td className="py-4 px-6 text-right text-white">{formatNumber(banner.totalImpressions)}</td>
                      <td className="py-4 px-6 text-right text-white">{formatNumber(banner.totalClicks)}</td>
                      <td className="py-4 px-6 text-right">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          banner.clickThroughRate >= 1
                            ? 'bg-green-500/20 text-green-400'
                            : banner.clickThroughRate >= 0.5
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {banner.clickThroughRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedBanner(selectedBanner?.bannerId === banner.bannerId ? null : banner)}
                          className="text-orange-500 hover:text-orange-400 text-sm font-medium"
                        >
                          {selectedBanner?.bannerId === banner.bannerId ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Stats Detail */}
        {selectedBanner && selectedBanner.dailyStats.length > 0 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">
                Daily Stats: {selectedBanner.bannerName}
              </h2>
            </div>
            <div className="p-4">
              {/* Simple bar chart visualization */}
              <div className="space-y-2">
                {selectedBanner.dailyStats.slice(-14).map((day, index) => {
                  const maxImpressions = Math.max(...selectedBanner.dailyStats.map(d => d.impressions), 1);
                  const impressionWidth = (day.impressions / maxImpressions) * 100;
                  // clickWidth could be used for a separate click bar visualization
                  const _clickWidth = (day.clicks / maxImpressions) * 100;
                  void _clickWidth; // Suppress unused variable warning

                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-20 text-sm text-slate-400 flex-shrink-0">
                        {formatDate(day.date)}
                      </div>
                      <div className="flex-1 relative">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-6 bg-slate-700 rounded overflow-hidden">
                            <div
                              className="h-full bg-blue-500/50 relative"
                              style={{ width: `${impressionWidth}%` }}
                            >
                              <div
                                className="absolute inset-y-0 left-0 bg-green-500"
                                style={{ width: day.impressions > 0 ? `${(day.clicks / day.impressions) * 100}%` : '0%' }}
                              />
                            </div>
                          </div>
                          <div className="w-32 text-sm text-slate-300 text-right flex-shrink-0">
                            {day.impressions} / {day.clicks}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500/50 rounded"></div>
                  <span className="text-sm text-slate-400">Impressions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm text-slate-400">Clicks</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
