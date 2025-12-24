import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Calendar,
  RefreshCw,
  Download,
} from 'lucide-react';
import { billingApi, BillingDashboardStats } from '../../../api-client/billing.api-client';

type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'all';

export default function RevenueReportsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BillingDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('month');

  const fetchStats = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await billingApi.getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching revenue stats:', err);
      setError('Failed to load revenue statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => fetchStats()}
          className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/billing')}
                className="rounded-full p-2 text-gray-400 hover:bg-slate-700 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Revenue Reports</h1>
                <p className="text-sm text-gray-400">
                  View detailed revenue analytics and trends
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchStats(true)}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-slate-600 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                className="flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Date Range Filter */}
        <div className="mb-8 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <span className="text-gray-400 text-sm mr-2">Period:</span>
          {(['week', 'month', 'quarter', 'year', 'all'] as DateRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                dateRange === range
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              {range === 'all' ? 'All Time' : range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Revenue</p>
                <p className="text-white font-semibold text-2xl">
                  ${stats?.revenue.total || '0.00'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">This Month</p>
                <p className="text-white font-semibold text-2xl">
                  ${stats?.revenue.thisMonth || '0.00'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Avg Order Value</p>
                <p className="text-white font-semibold text-2xl">
                  ${stats?.orders.total ? (parseFloat(stats.revenue.total) / stats.orders.total).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Unpaid Amount</p>
                <p className="text-white font-semibold text-2xl">
                  ${stats?.invoices.unpaid.total || '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue by Category */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-6">Revenue by Category</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Memberships</span>
                  <span className="text-white font-medium">${stats?.revenue.byCategory?.memberships || '0.00'}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: stats?.revenue.total ? `${(parseFloat(stats.revenue.byCategory?.memberships || '0') / parseFloat(stats.revenue.total) * 100)}%` : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Event Registrations</span>
                  <span className="text-white font-medium">${stats?.revenue.byCategory?.events || '0.00'}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: stats?.revenue.total ? `${(parseFloat(stats.revenue.byCategory?.events || '0') / parseFloat(stats.revenue.total) * 100)}%` : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Manual Orders</span>
                  <span className="text-white font-medium">${stats?.revenue.byCategory?.manual || '0.00'}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: stats?.revenue.total ? `${(parseFloat(stats.revenue.byCategory?.manual || '0') / parseFloat(stats.revenue.total) * 100)}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-6">Order Statistics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-700">
                <span className="text-gray-400">Total Orders</span>
                <span className="text-white font-medium">{stats?.orders.total || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-700">
                <span className="text-gray-400">Completed</span>
                <span className="text-green-500 font-medium">{stats?.orders.completed || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-700">
                <span className="text-gray-400">Pending</span>
                <span className="text-yellow-500 font-medium">{stats?.orders.pending || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-400">Cancelled/Refunded</span>
                <span className="text-red-400 font-medium">{stats?.orders.cancelled || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Statistics */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-6">Invoice Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{stats?.invoices.total || 0}</p>
              <p className="text-gray-400 text-sm mt-1">Total Invoices</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-400">{stats?.invoices.draft || 0}</p>
              <p className="text-gray-400 text-sm mt-1">Draft</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">{stats?.invoices.sent || 0}</p>
              <p className="text-gray-400 text-sm mt-1">Sent</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{stats?.invoices.paid || 0}</p>
              <p className="text-gray-400 text-sm mt-1">Paid</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">{stats?.invoices.overdue || 0}</p>
              <p className="text-gray-400 text-sm mt-1">Overdue</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
