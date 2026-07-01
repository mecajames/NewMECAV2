import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  FileText,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Zap,
  Search,
  MoreVertical,
  CreditCard,
  XOctagon,
  ShieldAlert,
} from 'lucide-react';
import { billingApi, BillingDashboardStats } from '../../../api-client/billing.api-client';
import { useAuth } from '@/auth/contexts/AuthContext';
import { SeasonSelect, useSeasonFilter } from '@/shared/components/SeasonSelect';
import axios from '@/lib/axios';

interface SubscriptionStats {
  active: number;
  churnLast30Days: number;
  upcomingRenewalsNext14Days: number;
  failedPaymentsLast30Days: number;
  mrrFormatted: string;
}
import { OrderTable } from '../components/OrderTable';
import { InvoiceTable } from '../components/InvoiceTable';
import { OrderStatus, OrderType, InvoiceStatus } from '../billing.types';

export default function BillingDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BillingDashboardStats | null>(null);
  const [subStats, setSubStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [_refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    errors?: string[];
  } | null>(null);

  // James-only (MECA 202401) global billing backfill.
  const { profile } = useAuth();
  const isJames = String((profile as any)?.meca_id) === '202401';
  const [backfilling, setBackfilling] = useState(false);
  const [backfillPreview, setBackfillPreview] = useState<any | null>(null);
  const [backfillProgress, setBackfillProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [backfillResult, setBackfillResult] = useState<{ members: number; payments: number; orders: number } | null>(null);
  const [backfillError, setBackfillError] = useState<string | null>(null);

  // PREVIEW: dry-run across all members → full per-member breakdown, no writes.
  const previewBackfill = async () => {
    setBackfilling(true);
    setBackfillError(null);
    setBackfillResult(null);
    try {
      const res = await axios.post(`/api/payments/admin/backfill-all?dryRun=true`);
      setBackfillPreview(res.data);
    } catch (err: any) {
      setBackfillError(err?.response?.data?.message || 'Preview failed.');
    } finally {
      setBackfilling(false);
    }
  };

  // APPLY: process members one at a time so we can show real progress (and so a
  // failure on one member doesn't abort the rest). Uses the previewed member
  // list; fetches it first if there's no preview yet.
  const applyBackfill = async () => {
    let members: any[] = backfillPreview?.members || [];
    if (!backfillPreview) {
      setBackfilling(true);
      try {
        const res = await axios.post(`/api/payments/admin/backfill-all?dryRun=true`);
        setBackfillPreview(res.data);
        members = res.data?.members || [];
      } catch (err: any) {
        setBackfillError(err?.response?.data?.message || 'Could not load the member list.');
        setBackfilling(false);
        return;
      }
    }
    if (members.length === 0) {
      alert('Nothing to backfill — every member already has complete billing records.');
      return;
    }
    if (!window.confirm(
      `Apply the billing backfill to ${members.length} member(s)?\n\nIt creates the missing Payment/Order/Invoice records. No member emails are sent. Idempotent — safe to re-run.`,
    )) return;

    setBackfilling(true);
    setBackfillError(null);
    setBackfillResult(null);
    const tally = { members: 0, payments: 0, orders: 0 };
    try {
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        setBackfillProgress({ current: i + 1, total: members.length, name: m.member_name || m.meca_id || m.member_id });
        try {
          const res = await axios.post(`/api/payments/admin/backfill-member/${m.member_id}?dryRun=false`);
          tally.members += 1;
          tally.payments += res.data?.created?.payments ?? 0;
          tally.orders += res.data?.created?.orders ?? 0;
        } catch {
          // keep going — one member's failure shouldn't stop the sweep
        }
      }
      setBackfillResult(tally);
      setBackfillPreview(null); // previewed work is now done
    } finally {
      setBackfillProgress(null);
      setBackfilling(false);
    }
  };

  // Mobile action menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  // Filter state for orders
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | ''>('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | ''>('');

  // Filter state for invoices
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatus | ''>('');

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (!stats?.recent.orders) return [];
    return stats.recent.orders.filter((order) => {
      const matchesSearch =
        !orderSearch ||
        order.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
        order.user?.email?.toLowerCase().includes(orderSearch.toLowerCase()) ||
        order.user?.first_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
        order.user?.last_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
        order.items.some((item) => item.description.toLowerCase().includes(orderSearch.toLowerCase()));
      const matchesStatus = !orderStatusFilter || order.status === orderStatusFilter;
      const matchesType = !orderTypeFilter || order.orderType === orderTypeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [stats?.recent.orders, orderSearch, orderStatusFilter, orderTypeFilter]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    if (!stats?.recent.invoices) return [];
    return stats.recent.invoices.filter((invoice) => {
      const matchesSearch =
        !invoiceSearch ||
        invoice.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        invoice.user?.email?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        invoice.user?.first_name?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        invoice.user?.last_name?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        invoice.items.some((item) => item.description.toLowerCase().includes(invoiceSearch.toLowerCase()));
      const matchesStatus = !invoiceStatusFilter || invoice.status === invoiceStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [stats?.recent.invoices, invoiceSearch, invoiceStatusFilter]);

  // Season filter for the revenue/orders/invoices block. Money has no season
  // tag, so it's scoped by the season's date range. Subscriptions stay live.
  // Default = current season. A ref keeps the latest range available to
  // fetchStats (also called by the Refresh button + auto-refresh interval).
  const { seasonId, setSeasonId, dateRange, loading: seasonsLoading } = useSeasonFilter();
  const seasonRangeRef = useRef<{ seasonId: string | null; startDate?: string; endDate?: string }>({ seasonId: null });
  seasonRangeRef.current = { seasonId, startDate: dateRange.startDate, endDate: dateRange.endDate };

  const fetchStats = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const { seasonId: sid, startDate, endDate } = seasonRangeRef.current;
      const [data, subData] = await Promise.all([
        billingApi.getDashboardStats(sid ? { startDate, endDate } : undefined),
        billingApi.getSubscriptionStats().catch(() => null), // live — not season-scoped
      ]);
      setStats(data);
      setSubStats(subData);
      setError(null);
    } catch (err) {
      console.error('Error fetching billing stats:', err);
      setError('Failed to load billing statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // (Re)fetch when the season changes. Wait for seasons to load so we default
  // to the current season instead of flashing all-time numbers.
  useEffect(() => {
    if (seasonsLoading) return;
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonsLoading, seasonId, dateRange.startDate, dateRange.endDate]);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const result = await billingApi.syncRegistrations();

      if (result.synced > 0) {
        setSyncResult({
          success: true,
          message: `Synced ${result.synced} registration(s) to billing`,
        });
        // Refresh stats after successful sync
        await fetchStats(true);
      } else if (result.toSync === 0) {
        setSyncResult({
          success: true,
          message: 'All registrations are already synced',
        });
      } else {
        setSyncResult({
          success: false,
          message: `Failed to sync ${result.failed} registration(s)`,
          errors: result.errors,
        });
      }
    } catch (err) {
      console.error('Sync error:', err);
      setSyncResult({
        success: false,
        message: 'Failed to sync registrations',
      });
    } finally {
      setSyncing(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">
              Billing Dashboard
            </h1>
            <p className="text-gray-400">
              Overview of orders, invoices, and revenue
            </p>
          </div>

          {/* Desktop buttons */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <Zap className={`h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Registrations'}
            </button>
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          </div>

          {/* Mobile hamburger menu */}
          <div className="sm:hidden relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              aria-label="Actions menu"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleSync();
                  }}
                  disabled={syncing}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-slate-600 transition-colors disabled:opacity-50 text-left"
                >
                  <Zap className={`h-4 w-4 text-orange-400 ${syncing ? 'animate-pulse' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Registrations'}
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/dashboard/admin');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-slate-600 transition-colors text-left"
                >
                  <ArrowLeft className="h-4 w-4 text-gray-400" />
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sync Result Message */}
        {syncResult && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              syncResult.success
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}
          >
            <p>{syncResult.message}</p>
            {syncResult.errors && syncResult.errors.length > 0 && (
              <ul className="mt-2 text-sm list-disc list-inside">
                {syncResult.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* James-only (MECA 202401): GLOBAL billing backfill — rebuild missing
            Payment/Order/Invoice records across ALL members. Preview first. */}
        {isJames && (
          <div className="mb-8 bg-slate-800 rounded-xl border border-orange-500/30 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white">Billing Backfill (all members)</h2>
                <p className="text-sm text-gray-400 mt-0.5">
                  Reconstruct missing Payment / Order / Invoice records across every member (e.g. older subscription buyers).
                  Owner-only. No emails are sent. Idempotent — safe to re-run.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={previewBackfill}
                  disabled={backfilling}
                  className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50"
                >
                  {backfilling && !backfillProgress ? 'Scanning…' : 'Preview'}
                </button>
                <button
                  onClick={applyBackfill}
                  disabled={backfilling}
                  className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>

            {backfillError && (
              <div className="mt-4 text-sm rounded-lg px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-300">{backfillError}</div>
            )}

            {/* Live progress while applying */}
            {backfillProgress && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-300 mb-1">
                  <span>Repairing {backfillProgress.current} of {backfillProgress.total} — {backfillProgress.name}</span>
                  <span>{Math.round((backfillProgress.current / backfillProgress.total) * 100)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 transition-all" style={{ width: `${(backfillProgress.current / backfillProgress.total) * 100}%` }} />
                </div>
              </div>
            )}

            {/* Apply result */}
            {backfillResult && (
              <div className="mt-4 text-sm rounded-lg px-4 py-3 bg-green-500/10 border border-green-500/30 text-green-300">
                ✓ Done — repaired {backfillResult.members} member(s): created {backfillResult.payments} payment(s) and {backfillResult.orders} order/invoice record(s).
              </div>
            )}

            {/* Preview detail: totals + per-member breakdown of what will be repaired */}
            {backfillPreview && !backfillResult && (
              <div className="mt-4">
                <div className="text-sm rounded-lg px-4 py-3 bg-blue-500/10 border border-blue-500/30 text-blue-200">
                  {backfillPreview.totals.members_affected === 0 ? (
                    <span>Nothing to repair — every member already has complete billing records.</span>
                  ) : (
                    <span>
                      <strong>{backfillPreview.totals.members_affected}</strong> member(s) affected ·{' '}
                      <strong>{backfillPreview.totals.memberships_missing_payment}</strong> membership(s) with no payment ·{' '}
                      <strong>{backfillPreview.totals.payments_missing_order}</strong> payment(s) missing an order/invoice.
                      {' '}Applying will create the missing records (nothing existing is replaced). Click <strong>Apply</strong> to commit.
                    </span>
                  )}
                </div>

                {backfillPreview.members.length > 0 && (
                  <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-700">
                    {backfillPreview.members.map((m: any) => (
                      <div key={m.member_id} className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-medium">{m.member_name || 'Member'}</span>
                          {m.meca_id && <span className="text-orange-400 font-mono text-xs">#{m.meca_id}</span>}
                        </div>
                        {m.memberships_missing_payment.length > 0 && (
                          <ul className="text-gray-300 space-y-0.5 mb-1">
                            {m.memberships_missing_payment.map((mm: any) => (
                              <li key={mm.membership_id}>
                                • Membership <span className="text-gray-400">{mm.type || 'Membership'}</span> (${Number(mm.amount).toFixed(2)}) has no payment →{' '}
                                <span className="text-emerald-400">will create payment + order + invoice</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {m.payments_missing_order.length > 0 && (
                          <ul className="text-gray-300 space-y-0.5">
                            {m.payments_missing_order.map((pm: any) => (
                              <li key={pm.payment_id}>
                                • Payment ${Number(pm.amount).toFixed(2)} <span className="text-gray-500 font-mono text-xs">{pm.reference || ''}</span> has no order →{' '}
                                <span className="text-emerald-400">will create order + invoice</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Subscription KPIs */}
        {subStats && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-white">
                Subscriptions <span className="text-xs font-normal text-gray-500 uppercase">· live</span>
              </h2>
              <button
                onClick={() => navigate('/admin/billing/subscriptions')}
                className="text-sm text-orange-500 hover:text-orange-400"
              >
                Manage subscriptions →
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-800 rounded-xl p-5 shadow-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Active</p>
                <p className="text-white font-semibold text-2xl mt-1">{subStats.active}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-5 shadow-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wide">MRR</p>
                <p className="text-white font-semibold text-2xl mt-1">{subStats.mrrFormatted}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-5 shadow-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Renewing &lt;14d</p>
                <p className="text-white font-semibold text-2xl mt-1">{subStats.upcomingRenewalsNext14Days}</p>
              </div>
              <div className="bg-slate-800 rounded-xl p-5 shadow-lg">
                <p className="text-gray-400 text-xs uppercase tracking-wide">Churn 30d</p>
                <p className={`font-semibold text-2xl mt-1 ${subStats.churnLast30Days > 0 ? 'text-amber-400' : 'text-white'}`}>
                  {subStats.churnLast30Days}
                </p>
              </div>
              <button
                onClick={() => navigate('/admin/billing/failed-payments')}
                className="bg-slate-800 hover:bg-slate-700 rounded-xl p-5 shadow-lg text-left transition-colors group"
                title="View failed payments"
              >
                <p className="text-gray-400 text-xs uppercase tracking-wide group-hover:text-gray-300">Failed 30d</p>
                <p className={`font-semibold text-2xl mt-1 ${subStats.failedPaymentsLast30Days > 0 ? 'text-red-400' : 'text-white'}`}>
                  {subStats.failedPaymentsLast30Days}
                </p>
                <p className="text-orange-400 text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View list →</p>
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-white">Revenue &amp; Orders</h2>
          <SeasonSelect value={seasonId} onChange={setSeasonId} />
        </div>
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
                <ShoppingCart className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Orders</p>
                <p className="text-white font-semibold text-2xl">
                  {stats?.orders.total || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Invoices</p>
                <p className="text-white font-semibold text-2xl">
                  {stats?.invoices.total || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Unpaid Invoices</p>
                <p className="text-white font-semibold text-2xl">
                  ${stats?.invoices.unpaid.total || '0.00'}
                </p>
                <p className="text-gray-500 text-xs">
                  {stats?.invoices.unpaid.count || 0} invoices
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => navigate('/admin/billing/payments')}
            className="bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left ring-1 ring-orange-500/20 hover:ring-orange-500/40"
          >
            <div className="w-12 h-12 rounded-full bg-orange-500/15 text-orange-400 flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">All Payments</h3>
            <p className="text-gray-400 text-sm">Unified Stripe + PayPal — all statuses</p>
          </button>

          <button
            onClick={() => navigate('/admin/billing/failed-payments')}
            className="bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center mb-4">
              <XOctagon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Failed Payments</h3>
            <p className="text-gray-400 text-sm">
              Triage queue —{' '}
              <span className={subStats && subStats.failedPaymentsLast30Days > 0 ? 'text-red-400 font-semibold' : ''}>
                {subStats?.failedPaymentsLast30Days ?? 0}
              </span>{' '}
              in the last 30 days
            </p>
          </button>

          <button
            onClick={() => navigate('/admin/billing/orders')}
            className="bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 flex items-center justify-center mb-4">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">View All Orders</h3>
            <p className="text-gray-400 text-sm">{stats?.orders.total || 0} total orders</p>
          </button>

          <button
            onClick={() => navigate('/admin/billing/invoices')}
            className="bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">View All Invoices</h3>
            <p className="text-gray-400 text-sm">{stats?.invoices.total || 0} total invoices</p>
          </button>

          <button
            onClick={() => navigate('/admin/billing/revenue')}
            className="bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Revenue Reports</h3>
            <p className="text-gray-400 text-sm">View detailed analytics</p>
          </button>

          <button
            onClick={() => navigate('/admin/billing/recurring')}
            className="bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 flex items-center justify-center mb-4">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Recurring Invoices</h3>
            <p className="text-gray-400 text-sm">Subscriptions & templates</p>
          </button>

          <button
            onClick={() => navigate('/admin/billing/subscriptions')}
            className="bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left ring-1 ring-indigo-500/20 hover:ring-indigo-500/40"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-4">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Stripe Subscriptions</h3>
            <p className="text-gray-400 text-sm">
              {subStats?.active ?? 0} active · assign, move &amp; convert legacy
            </p>
          </button>

          <button
            onClick={() => navigate('/admin/billing/reconciliation')}
            className="bg-slate-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center mb-4">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Reconciliation</h3>
            <p className="text-gray-400 text-sm">Ledger consistency &amp; webhook errors</p>
          </button>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Recent Orders</h2>
              <button
                onClick={() => navigate('/admin/billing/orders')}
                className="text-sm text-orange-500 hover:text-orange-400"
              >
                View all →
              </button>
            </div>
            {/* Order Filters */}
            <div className="mb-4 flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value as OrderStatus | '')}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  <option value="">All Statuses</option>
                  {Object.values(OrderStatus).map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
                <select
                  value={orderTypeFilter}
                  onChange={(e) => setOrderTypeFilter(e.target.value as OrderType | '')}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                >
                  <option value="">All Types</option>
                  {Object.values(OrderType).map((type) => (
                    <option key={type} value={type}>
                      {type.replace('_', ' ').charAt(0) + type.replace('_', ' ').slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <OrderTable orders={filteredOrders} compact />
          </div>

          {/* Recent Invoices */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Recent Invoices</h2>
              <button
                onClick={() => navigate('/admin/billing/invoices')}
                className="text-sm text-orange-500 hover:text-orange-400"
              >
                View all →
              </button>
            </div>
            {/* Invoice Filters */}
            <div className="mb-4 flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
              <select
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value as InvoiceStatus | '')}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
              >
                <option value="">All Statuses</option>
                {Object.values(InvoiceStatus).map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0) + status.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <InvoiceTable invoices={filteredInvoices} compact />
          </div>
        </div>
      </div>
    </div>
  );
}
