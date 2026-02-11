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
import { OrderStatus, InvoiceStatus } from '../billing.types';

type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'all';

// Helper to get date range params for export
const getDateRangeFromSelection = (range: DateRange): { startDate?: string; endDate?: string } => {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];

  let startDate: string | undefined;

  switch (range) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'quarter':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'all':
    default:
      // No date filters for 'all'
      return {};
  }

  return { startDate, endDate };
};

export default function RevenueReportsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BillingDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('month');

  // Get date range params for current selection
  const getDateRangeParams = () => getDateRangeFromSelection(dateRange);

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
          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
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
            <div>
              <h1 className="text-2xl font-bold text-white">Revenue Reports</h1>
              <p className="text-sm text-gray-400">
                View detailed revenue analytics and trends
              </p>
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
              <div className="relative group">
                <button
                  className="flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                {/* Export dropdown menu */}
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-md shadow-lg border border-slate-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <div className="py-1">
                    <button
                      onClick={() => billingApi.downloadRevenueExport(getDateRangeParams())}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700"
                    >
                      Revenue Report (CSV)
                    </button>
                    <button
                      onClick={() => billingApi.downloadOrdersExport(getDateRangeParams())}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700"
                    >
                      All Orders (CSV)
                    </button>
                    <button
                      onClick={() => billingApi.downloadInvoicesExport(getDateRangeParams())}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700"
                    >
                      All Invoices (CSV)
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/billing')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Billing
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
                <p className="text-gray-400 text-sm">Completed Orders</p>
                <p className="text-white font-semibold text-2xl">
                  {stats?.orders.counts[OrderStatus.COMPLETED] || 0}
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
            <h2 className="text-xl font-semibold text-white mb-6">Order Breakdown by Type</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-slate-700">
                <span className="text-gray-400">Membership Orders</span>
                <span className="text-blue-500 font-medium">--</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-700">
                <span className="text-gray-400">Event Registrations</span>
                <span className="text-green-500 font-medium">--</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-400">Manual Orders</span>
                <span className="text-purple-500 font-medium">--</span>
              </div>
              <p className="text-xs text-gray-500 mt-4">Category breakdown coming soon</p>
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
                <span className="text-green-500 font-medium">{stats?.orders.counts[OrderStatus.COMPLETED] || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-700">
                <span className="text-gray-400">Pending</span>
                <span className="text-yellow-500 font-medium">{stats?.orders.counts[OrderStatus.PENDING] || 0}</span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-400">Cancelled/Refunded</span>
                <span className="text-red-400 font-medium">{(stats?.orders.counts[OrderStatus.CANCELLED] || 0) + (stats?.orders.counts[OrderStatus.REFUNDED] || 0)}</span>
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
              <p className="text-3xl font-bold text-gray-400">{stats?.invoices.counts[InvoiceStatus.DRAFT] || 0}</p>
              <p className="text-gray-400 text-sm mt-1">Draft</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-500">{stats?.invoices.counts[InvoiceStatus.SENT] || 0}</p>
              <p className="text-gray-400 text-sm mt-1">Sent</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">{stats?.invoices.counts[InvoiceStatus.PAID] || 0}</p>
              <p className="text-gray-400 text-sm mt-1">Paid</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-500">{stats?.invoices.counts[InvoiceStatus.OVERDUE] || 0}</p>
              <p className="text-gray-400 text-sm mt-1">Overdue</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
