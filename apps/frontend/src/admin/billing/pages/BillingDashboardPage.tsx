import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  FileText,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { billingApi, BillingDashboardStats } from '../../../api-client/billing.api-client';
import { OrderTable } from '../components/OrderTable';
import { InvoiceTable } from '../components/InvoiceTable';

export default function BillingDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BillingDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

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
          className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
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
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="rounded-full p-2 text-gray-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Billing Dashboard
              </h1>
              <p className="text-gray-400">
                Overview of orders, invoices, and revenue
              </p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            <Zap className={`h-4 w-4 ${syncing ? 'animate-pulse' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Registrations'}
          </button>
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
            {syncResult.message}
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
            <OrderTable orders={stats?.recent.orders || []} compact />
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
            <InvoiceTable invoices={stats?.recent.invoices || []} compact />
          </div>
        </div>
      </div>
    </div>
  );
}
