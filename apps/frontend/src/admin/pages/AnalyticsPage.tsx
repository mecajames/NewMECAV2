import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { ArrowLeft, Eye, Users, Activity, Clock, AlertCircle } from 'lucide-react';
import { analyticsApi, type AnalyticsDashboard } from '@/api-client/analytics.api-client';

type DateRange = '7daysAgo' | '14daysAgo' | '30daysAgo';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7daysAgo': 'Last 7 Days',
  '14daysAgo': 'Last 14 Days',
  '30daysAgo': 'Last 30 Days',
};

const DEVICE_COLORS = ['#f97316', '#06b6d4', '#a855f7', '#22c55e', '#eab308'];

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${month}/${day}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30daysAgo');

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (configured) {
      fetchDashboard();
    }
  }, [configured, dateRange]);

  const checkStatus = async () => {
    try {
      const status = await analyticsApi.getStatus();
      setConfigured(status.configured);
      if (!status.configured) {
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to check analytics status');
      setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsApi.getDashboard(dateRange, 'today');
      setDashboard(data);
    } catch (err) {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
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
            <h2 className="text-2xl font-bold text-white mb-2">Google Analytics Not Configured</h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              To view site analytics, set the <code className="text-orange-400">GA4_PROPERTY_ID</code> and{' '}
              <code className="text-orange-400">GA4_CREDENTIALS_JSON</code> environment variables in the backend.
              See the setup instructions in the project documentation.
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Site Analytics</h1>
            <p className="text-slate-400 text-sm mt-1">Google Analytics traffic and user data</p>
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
              onClick={fetchDashboard}
              className="mt-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        ) : dashboard ? (
          <>
            {/* Summary Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                icon={Eye}
                label="Page Views"
                value={dashboard.summary.pageViews.toLocaleString()}
                color="text-orange-500"
              />
              <StatCard
                icon={Users}
                label="Active Users"
                value={dashboard.summary.activeUsers.toLocaleString()}
                color="text-cyan-500"
              />
              <StatCard
                icon={Activity}
                label="Sessions"
                value={dashboard.summary.sessions.toLocaleString()}
                color="text-emerald-500"
              />
              <StatCard
                icon={Clock}
                label="Avg Session Duration"
                value={formatDuration(dashboard.summary.avgSessionDuration)}
                color="text-violet-500"
              />
            </div>

            {/* Page Views Over Time */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Page Views Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboard.pageViewsOverTime.map((p) => ({ ...p, date: formatDate(p.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f8fafc' }}
                    itemStyle={{ color: '#f97316' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={2} dot={false} name="Page Views" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Active Users Over Time */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-4">Active Users Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboard.activeUsersOverTime.map((p) => ({ ...p, date: formatDate(p.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#f8fafc' }}
                    itemStyle={{ color: '#06b6d4' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={false} name="Active Users" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Two-Column: Top Pages + Traffic Sources */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Top Pages Table */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top Pages</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left text-slate-400 pb-3 font-medium">Page Path</th>
                        <th className="text-right text-slate-400 pb-3 font-medium">Views</th>
                        <th className="text-right text-slate-400 pb-3 font-medium">Users</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.topPages.map((page, i) => (
                        <tr key={i} className="border-b border-slate-700/50">
                          <td className="py-2.5 text-white truncate max-w-[200px]" title={page.pagePath}>
                            {page.pagePath}
                          </td>
                          <td className="py-2.5 text-right text-slate-300">{page.pageViews.toLocaleString()}</td>
                          <td className="py-2.5 text-right text-slate-300">{page.activeUsers.toLocaleString()}</td>
                        </tr>
                      ))}
                      {dashboard.topPages.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-4 text-center text-slate-500">No data available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Traffic Sources Bar Chart */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Traffic Sources</h3>
                {dashboard.trafficSources.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboard.trafficSources} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                      <YAxis type="category" dataKey="channel" stroke="#94a3b8" fontSize={12} width={120} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        labelStyle={{ color: '#f8fafc' }}
                      />
                      <Bar dataKey="sessions" fill="#f97316" name="Sessions" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-slate-500">No data available</div>
                )}
              </div>
            </div>

            {/* Device Categories Donut */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Device Breakdown</h3>
              {dashboard.deviceCategories.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <ResponsiveContainer width="100%" height={250} className="max-w-[300px]">
                    <PieChart>
                      <Pie
                        data={dashboard.deviceCategories.map((d) => ({ ...d }))}
                        dataKey="users"
                        nameKey="device"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={60}
                        strokeWidth={0}
                      >
                        {dashboard.deviceCategories.map((_, i) => (
                          <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        labelStyle={{ color: '#f8fafc' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2">
                    {dashboard.deviceCategories.map((cat, i) => (
                      <div key={cat.device} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: DEVICE_COLORS[i % DEVICE_COLORS.length] }}
                        />
                        <span className="text-white capitalize">{cat.device}</span>
                        <span className="text-slate-400">{cat.users.toLocaleString()} users</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-slate-500">No data available</div>
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
