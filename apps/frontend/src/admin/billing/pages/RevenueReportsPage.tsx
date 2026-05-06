import { useState, useEffect, useMemo } from 'react';
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

/** Built-in period presets. `custom` opens an explicit start/end date pair. */
type Period = 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';

/** Preset → start/end ISO date strings. `all` returns nothing → no filter. */
function presetToRange(p: Period): { startDate?: string; endDate?: string } {
  if (p === 'all' || p === 'custom') return {};
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  switch (p) {
    case 'week':    start.setDate(now.getDate() - 7); break;
    case 'month':   start.setMonth(now.getMonth() - 1); break;
    case 'quarter': start.setMonth(now.getMonth() - 3); break;
    case 'year':    start.setFullYear(now.getFullYear() - 1); break;
  }
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

/** YYYY-MM-DD slice — used by date inputs. */
function ymd(d: Date) { return d.toISOString().slice(0, 10); }

/** Pretty type-name for the order breakdown. */
const TYPE_LABELS: Record<string, string> = {
  new_membership: 'New Memberships',
  membership_renewal: 'Membership Renewals',
  // Legacy fallback if backend hasn't been redeployed yet:
  membership: 'Membership Orders',
  event_registration: 'Event Registrations',
  manual: 'Manual Orders',
  shop: 'Shop Purchases',
  meca_shop: 'Shop Purchases',
  merchandise: 'Merchandise',
};

export default function RevenueReportsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BillingDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState<Period>('month');

  // For year/month pickers and the custom range. We don't show all of these
  // simultaneously — see the conditional rendering below.
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>(ymd(new Date()));

  // Compute the actual {startDate, endDate} we'll send to the API given the
  // current selection. Memoized so we can reuse it for both fetch and exports.
  const range = useMemo<{ startDate?: string; endDate?: string }>(() => {
    if (period === 'custom') {
      return {
        startDate: customStart || undefined,
        endDate: customEnd || undefined,
      };
    }
    if (period === 'year') {
      return {
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
      };
    }
    if (period === 'month') {
      // month === 0 → "All Months" (whole calendar year for the picked Year).
      if (month === 0) {
        return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
      }
      // When a specific year+month combo is set, report on that month.
      // Otherwise behave as "last 30 days" preset for backwards compat.
      const explicitMonth = year !== currentYear || month !== (new Date().getMonth() + 1);
      if (explicitMonth) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0); // last day of that month
        return { startDate: ymd(start), endDate: ymd(end) };
      }
    }
    return presetToRange(period);
  }, [period, year, month, customStart, customEnd, currentYear]);

  const fetchStats = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await billingApi.getDashboardStats(range);
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
  }, [range.startDate, range.endDate]);

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 8; y--) years.push(y);
    return years;
  }, [currentYear]);

  const monthOptions = [
    { v: 0, l: 'All Months (whole year)' },
    { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
    { v: 4, l: 'April' }, { v: 5, l: 'May' }, { v: 6, l: 'June' },
    { v: 7, l: 'July' }, { v: 8, l: 'August' }, { v: 9, l: 'September' },
    { v: 10, l: 'October' }, { v: 11, l: 'November' }, { v: 12, l: 'December' },
  ];

  const periodLabel = period === 'custom'
    ? `${customStart || '…'} → ${customEnd || '…'}`
    : period === 'year'
      ? `Year ${year}`
      : period === 'month'
        ? (month === 0
            ? `All of ${year}`
            : `${monthOptions.find(m => m.v === month)?.l ?? ''} ${year}`)
        : period === 'all'
          ? 'All time'
          : period === 'week' ? 'Last 7 days'
          : period === 'quarter' ? 'Last 90 days'
          : '';

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

  // Type breakdown: prefer real data when present; fall back to placeholders.
  const breakdown = stats?.orders.byType ?? {};
  const breakdownEntries = Object.entries(breakdown);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Revenue Reports</h1>
              <p className="text-sm text-gray-400">
                View detailed revenue analytics — period: <span className="text-white">{periodLabel}</span>
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
                <div className="absolute right-0 mt-2 w-48 bg-slate-800 rounded-md shadow-lg border border-slate-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <div className="py-1">
                    <button
                      onClick={() => billingApi.downloadRevenueExport(range)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700"
                    >
                      Revenue Report (CSV)
                    </button>
                    <button
                      onClick={() => billingApi.downloadOrdersExport(range)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700"
                    >
                      All Orders (CSV)
                    </button>
                    <button
                      onClick={() => billingApi.downloadInvoicesExport(range)}
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
        {/* Period Filter */}
        <div className="mb-6 bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-gray-400 text-sm mr-2">Period:</span>
            {(['week', 'month', 'quarter', 'year', 'all', 'custom'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  period === p
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                }`}
              >
                {p === 'all' ? 'All Time'
                  : p === 'custom' ? 'Custom Range'
                  : p === 'week' ? 'Last 7 Days'
                  : p === 'month' ? 'Month'
                  : p === 'quarter' ? 'Last 90 Days'
                  : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>

          {/* Year + Month pickers shown for month/year presets */}
          {(period === 'year' || period === 'month') && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {period === 'month' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Month</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value, 10))}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  >
                    {monthOptions.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Explicit start/end pickers for custom range */}
          {period === 'custom' && (
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 ml-2 mb-2">
                Leave Start Date empty to include all earlier data.
              </p>
            </div>
          )}
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
            <div className="space-y-3">
              {breakdownEntries.length === 0 ? (
                <p className="text-gray-500 text-sm">No orders in this period.</p>
              ) : (
                breakdownEntries
                  .sort((a, b) => parseFloat(b[1].revenue) - parseFloat(a[1].revenue))
                  .map(([type, info]) => (
                    <div key={type} className="flex justify-between items-center py-3 border-b border-slate-700 last:border-0">
                      <div>
                        <span className="text-gray-300 font-medium">
                          {TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">({info.count} orders)</span>
                      </div>
                      <span className="text-emerald-400 font-medium">${info.revenue}</span>
                    </div>
                  ))
              )}
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
