import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  FileText,
  ShoppingCart,
  ArrowLeft,
  Download,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/auth';
import { billingApi, Order, Invoice } from '../../api-client/billing.api-client';

export default function BillingPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'invoices'>('overview');

  useEffect(() => {
    if (profile?.id) {
      fetchBillingData();
    }
  }, [profile?.id]);

  const fetchBillingData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const [ordersRes, invoicesRes] = await Promise.all([
        billingApi.getMyOrders(profile.id, { limit: 10 }),
        billingApi.getMyInvoices(profile.id, { limit: 10 }),
      ]);
      setOrders(ordersRes.data || []);
      setInvoices(invoicesRes.data || []);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-yellow-900/50', text: 'text-yellow-400' },
      processing: { bg: 'bg-blue-900/50', text: 'text-blue-400' },
      completed: { bg: 'bg-green-900/50', text: 'text-green-400' },
      cancelled: { bg: 'bg-gray-800/50', text: 'text-gray-400' },
      refunded: { bg: 'bg-orange-900/50', text: 'text-orange-400' },
      draft: { bg: 'bg-gray-800/50', text: 'text-gray-400' },
      sent: { bg: 'bg-blue-900/50', text: 'text-blue-400' },
      paid: { bg: 'bg-green-900/50', text: 'text-green-400' },
      overdue: { bg: 'bg-red-900/50', text: 'text-red-400' },
    };
    return colors[status] || { bg: 'bg-gray-800/50', text: 'text-gray-400' };
  };

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-xl mb-4">Please sign in to view billing</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="h-10 w-10 text-orange-500" />
              <h1 className="text-4xl font-bold text-white">Billing</h1>
            </div>
            <p className="text-gray-400">Manage your payments and view invoices</p>
          </div>
          <button
            onClick={fetchBillingData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Membership Status Card */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Current Membership</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Status</p>
              <p
                className={`text-lg font-semibold capitalize ${
                  profile.membership_status === 'active' ? 'text-green-400' : 'text-gray-400'
                }`}
              >
                {profile.membership_status || 'None'}
              </p>
            </div>
            {profile.membership_expiry && (
              <div className="text-right">
                <p className="text-gray-400 text-sm">Expires</p>
                <p className="text-lg font-semibold text-white">
                  {new Date(profile.membership_expiry).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
            <button
              onClick={() => navigate('/membership')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              {profile.membership_status === 'active' ? 'Renew' : 'Get Membership'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'invoices'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Invoices ({invoices.length})
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500"></div>
          </div>
        )}

        {/* Overview Tab */}
        {!loading && activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-400" />
                  Recent Orders
                </h3>
                {orders.length > 0 && (
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-sm text-orange-400 hover:text-orange-300"
                  >
                    View all →
                  </button>
                )}
              </div>
              {orders.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No orders yet</p>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 3).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div>
                        <p className="text-white font-medium">{order.orderNumber}</p>
                        <p className="text-gray-400 text-sm">{formatDate(order.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{formatCurrency(order.total)}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status).bg} ${getStatusColor(order.status).text}`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Invoices */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-400" />
                  Recent Invoices
                </h3>
                {invoices.length > 0 && (
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className="text-sm text-orange-400 hover:text-orange-300"
                  >
                    View all →
                  </button>
                )}
              </div>
              {invoices.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No invoices yet</p>
              ) : (
                <div className="space-y-3">
                  {invoices.slice(0, 3).map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div>
                        <p className="text-white font-medium">{invoice.invoiceNumber}</p>
                        <p className="text-gray-400 text-sm">{formatDate(invoice.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-white font-medium">{formatCurrency(invoice.total)}</p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(invoice.status).bg} ${getStatusColor(invoice.status).text}`}
                          >
                            {invoice.status}
                          </span>
                        </div>
                        <button
                          onClick={() => billingApi.viewMyInvoicePdf(invoice.id)}
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          title="View PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {!loading && activeTab === 'orders' && (
          <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400">No orders found</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {order.orderNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {order.orderType?.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status).bg} ${getStatusColor(order.status).text}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white text-right">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {!loading && activeTab === 'invoices' && (
          <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400">No invoices found</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.status).bg} ${getStatusColor(invoice.status).text}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white text-right">
                        {formatCurrency(invoice.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => billingApi.viewMyInvoicePdf(invoice.id)}
                          className="flex items-center gap-1 text-orange-400 hover:text-orange-300"
                        >
                          <Download className="h-4 w-4" />
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
