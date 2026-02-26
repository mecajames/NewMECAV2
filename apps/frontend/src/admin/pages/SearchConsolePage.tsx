import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Globe, MousePointerClick, TrendingUp, MapPin, AlertCircle, Send } from 'lucide-react';
import {
  analyticsApi,
  type SearchConsoleData,
  type IndexingStatus,
} from '@/api-client/analytics.api-client';

type DateRange = '7' | '14' | '28' | '90';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7': 'Last 7 Days',
  '14': 'Last 14 Days',
  '28': 'Last 28 Days',
  '90': 'Last 90 Days',
};

function getDateRange(range: DateRange): { startDate: string; endDate: string } {
  const end = new Date();
  end.setDate(end.getDate() - 3); // Search Console data has 2-3 day delay
  const start = new Date(end);
  start.setDate(start.getDate() - Number(range));
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

export default function SearchConsolePage() {
  const navigate = useNavigate();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [data, setData] = useState<SearchConsoleData | null>(null);
  const [sitemaps, setSitemaps] = useState<IndexingStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('28');
  const [submittingSitemap, setSubmittingSitemap] = useState(false);
  const [sitemapMessage, setSitemapMessage] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (configured) {
      fetchData();
    }
  }, [configured, dateRange]);

  const checkStatus = async () => {
    try {
      const status = await analyticsApi.getSearchConsoleStatus();
      setConfigured(status.configured);
      if (!status.configured) {
        setLoading(false);
      }
    } catch {
      setError('Failed to check Search Console status');
      setLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { startDate, endDate } = getDateRange(dateRange);
      const [dashboard, sitemapStatus] = await Promise.all([
        analyticsApi.getSearchConsoleDashboard(startDate, endDate),
        analyticsApi.getSitemapStatus(),
      ]);
      setData(dashboard);
      setSitemaps(sitemapStatus);
    } catch {
      setError('Failed to load Search Console data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSitemap = async () => {
    setSubmittingSitemap(true);
    setSitemapMessage(null);
    try {
      const result = await analyticsApi.submitSitemap();
      setSitemapMessage(result.success ? 'Sitemap submitted successfully!' : 'Failed to submit sitemap');
      if (result.success) {
        const sitemapStatus = await analyticsApi.getSitemapStatus();
        setSitemaps(sitemapStatus);
      }
    } catch {
      setSitemapMessage('Failed to submit sitemap');
    } finally {
      setSubmittingSitemap(false);
    }
  };

  if (configured === false) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Admin Dashboard
          </button>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
            <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Search Console Not Configured</h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              Search Console uses the same service account as Google Analytics.
              Make sure your <code className="text-orange-400">GA4_CREDENTIALS_JSON</code> service account
              has access to your Search Console property for <code className="text-orange-400">mecacaraudio.com</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-2 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Admin Dashboard
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Search Console</h1>
            <p className="text-slate-400 text-sm mt-1">Search performance, keywords, and indexing status</p>
          </div>
          <div className="flex gap-2">
            {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {DATE_RANGE_LABELS[range]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent" />
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-700 rounded-xl p-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchData}
              className="mt-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={MousePointerClick}
                label="Total Clicks"
                value={data.summary.totalClicks.toLocaleString()}
                color="text-orange-500"
              />
              <StatCard
                icon={Globe}
                label="Total Impressions"
                value={data.summary.totalImpressions.toLocaleString()}
                color="text-cyan-500"
              />
              <StatCard
                icon={TrendingUp}
                label="Average CTR"
                value={`${data.summary.averageCtr}%`}
                color="text-emerald-500"
              />
              <StatCard
                icon={MapPin}
                label="Average Position"
                value={data.summary.averagePosition.toString()}
                color="text-violet-500"
              />
            </div>

            {/* Top Queries Table */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-orange-500" />
                Top Search Queries
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 pb-3 font-medium">Query</th>
                      <th className="text-right text-slate-400 pb-3 font-medium">Clicks</th>
                      <th className="text-right text-slate-400 pb-3 font-medium">Impressions</th>
                      <th className="text-right text-slate-400 pb-3 font-medium">CTR</th>
                      <th className="text-right text-slate-400 pb-3 font-medium">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topQueries.map((q, i) => (
                      <tr key={i} className="border-b border-slate-700/50">
                        <td className="py-2.5 text-white max-w-[300px] truncate" title={q.query}>
                          {q.query}
                        </td>
                        <td className="py-2.5 text-right text-slate-300">{q.clicks.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-slate-300">{q.impressions.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-slate-300">{q.ctr}%</td>
                        <td className="py-2.5 text-right">
                          <span className={`font-medium ${q.position <= 3 ? 'text-emerald-400' : q.position <= 10 ? 'text-orange-400' : 'text-slate-400'}`}>
                            {q.position}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.topQueries.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No search query data available for this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Pages from Search */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Globe className="h-5 w-5 text-cyan-500" />
                Top Pages from Search
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-400 pb-3 font-medium">Page</th>
                      <th className="text-right text-slate-400 pb-3 font-medium">Clicks</th>
                      <th className="text-right text-slate-400 pb-3 font-medium">Impressions</th>
                      <th className="text-right text-slate-400 pb-3 font-medium">CTR</th>
                      <th className="text-right text-slate-400 pb-3 font-medium">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.map((p, i) => (
                      <tr key={i} className="border-b border-slate-700/50">
                        <td className="py-2.5 text-white max-w-[350px] truncate" title={p.page}>
                          {p.page.replace('https://mecacaraudio.com', '')}
                        </td>
                        <td className="py-2.5 text-right text-slate-300">{p.clicks.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-slate-300">{p.impressions.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-slate-300">{p.ctr}%</td>
                        <td className="py-2.5 text-right">
                          <span className={`font-medium ${p.position <= 3 ? 'text-emerald-400' : p.position <= 10 ? 'text-orange-400' : 'text-slate-400'}`}>
                            {p.position}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.topPages.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No page data available for this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sitemap Status */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Sitemap Status</h3>
                <button
                  onClick={handleSubmitSitemap}
                  disabled={submittingSitemap}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Send className="h-4 w-4" />
                  {submittingSitemap ? 'Submitting...' : 'Submit Sitemap'}
                </button>
              </div>

              {sitemapMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${
                  sitemapMessage.includes('success')
                    ? 'bg-emerald-900/30 border border-emerald-700 text-emerald-400'
                    : 'bg-red-900/30 border border-red-700 text-red-400'
                }`}>
                  {sitemapMessage}
                </div>
              )}

              {sitemaps.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left text-slate-400 pb-3 font-medium">Sitemap URL</th>
                        <th className="text-left text-slate-400 pb-3 font-medium">Status</th>
                        <th className="text-left text-slate-400 pb-3 font-medium">Last Submitted</th>
                        <th className="text-right text-slate-400 pb-3 font-medium">Warnings</th>
                        <th className="text-right text-slate-400 pb-3 font-medium">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sitemaps.map((sm, i) => (
                        <tr key={i} className="border-b border-slate-700/50">
                          <td className="py-2.5 text-white truncate max-w-[300px]" title={sm.sitemapUrl}>
                            {sm.sitemapUrl}
                          </td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              sm.isPending
                                ? 'bg-amber-900/30 text-amber-400'
                                : 'bg-emerald-900/30 text-emerald-400'
                            }`}>
                              {sm.isPending ? 'Pending' : 'Processed'}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-300">
                            {sm.lastSubmitted
                              ? new Date(sm.lastSubmitted).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="py-2.5 text-right text-slate-300">{sm.warnings ?? 0}</td>
                          <td className="py-2.5 text-right">
                            <span className={sm.errors ? 'text-red-400 font-medium' : 'text-slate-300'}>
                              {sm.errors ?? 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>No sitemaps found in Search Console.</p>
                  <p className="text-sm mt-1">Click "Submit Sitemap" to register your sitemap.</p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${color}`} />
      </div>
    </div>
  );
}
