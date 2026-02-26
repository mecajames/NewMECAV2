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
} from 'lucide-react';
import { billingApi, BillingDashboardStats } from '../../../api-client/billing.api-client';
import { OrderTable } from '../components/OrderTable';
import { InvoiceTable } from '../components/InvoiceTable';
import { OrderStatus, OrderType, InvoiceStatus } from '../billing.types';

export default function BillingDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BillingDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [_refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    errors?: string[];
  } | null>(null);

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

  const fetchStats = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await billingApi.getDashboardStats();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching billing stats:', err);
      setError('Failed to load billing statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

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
        <div className="mb-8 flex items-start justify-between gap-4">
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

        {/* Stats Grid */}
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
              <div className="flex gap-2">
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
