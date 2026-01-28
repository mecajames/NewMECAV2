import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  FileText,
  ShoppingCart,
  ArrowLeft,
  Download,
  ChevronRight,
  Users,
  AlertCircle,
  UserPlus,
  Eye,
  Pencil,
  Car,
} from 'lucide-react';
import { useAuth } from '@/auth';
import { billingApi, Order, Invoice } from '../../api-client/billing.api-client';
import { membershipsApi, Membership, SecondaryMembershipInfo, AddSecondaryModal, EditSecondaryModal, RELATIONSHIP_TYPES } from '@/memberships';

export default function BillingPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'invoices'>('overview');
  const [membership, setMembership] = useState<Membership | null>(null);
  const [secondaryMemberships, setSecondaryMemberships] = useState<SecondaryMembershipInfo[]>([]);
  const [showAddSecondaryModal, setShowAddSecondaryModal] = useState(false);
  const [showEditSecondaryModal, setShowEditSecondaryModal] = useState(false);
  const [editingSecondary, setEditingSecondary] = useState<SecondaryMembershipInfo | null>(null);

  useEffect(() => {
    if (profile?.id) {
      fetchBillingData();
    }
  }, [profile?.id]);

  const fetchBillingData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const [ordersRes, invoicesRes, membershipRes] = await Promise.all([
        billingApi.getMyOrders({ limit: 10 }),
        billingApi.getMyInvoices({ limit: 10 }),
        membershipsApi.getUserActiveMembership(profile.id),
      ]);
      setOrders(ordersRes.data || []);
      setInvoices(invoicesRes.data || []);
      setMembership(membershipRes);

      // If this is a master membership, fetch secondaries
      if (membershipRes?.id) {
        try {
          const secondaries = await membershipsApi.getSecondaryMemberships(membershipRes.id);
          setSecondaryMemberships(secondaries);
        } catch (err) {
          // Not a master or no secondaries - that's ok
          console.log('No secondary memberships found');
        }
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSecondary = (secondary: SecondaryMembershipInfo) => {
    setEditingSecondary(secondary);
    setShowEditSecondaryModal(true);
  };

  const handleSecondaryEdited = () => {
    fetchBillingData();
    setShowEditSecondaryModal(false);
    setEditingSecondary(null);
  };

  // Helper to get relationship label
  const getRelationshipLabel = (relationship?: string): string => {
    if (!relationship) return '';
    const found = RELATIONSHIP_TYPES.find((r) => r.value === relationship);
    return found ? found.label : relationship;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Check for invalid date (Unix epoch usually means null/undefined was passed)
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) return 'N/A';
    return date.toLocaleDateString('en-US', {
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
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        {/* Membership Status Card */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Current Membership</h2>
          {membership ? (
            <div className="space-y-4">
              {/* Main membership info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-gray-400 text-sm">Membership Type</p>
                    <p className="text-lg font-semibold text-white">
                      {membership.membershipTypeConfig?.name || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">MECA ID</p>
                    <p className="text-lg font-semibold text-orange-400">
                      {membership.mecaId || 'Pending'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Status</p>
                    <p
                      className={`text-lg font-semibold capitalize ${
                        membership.paymentStatus === 'paid' ? 'text-green-400' : 'text-yellow-400'
                      }`}
                    >
                      {membership.paymentStatus === 'paid' ? 'Active' : 'Pending Payment'}
                    </p>
                  </div>
                  {membership.endDate && (
                    <div>
                      <p className="text-gray-400 text-sm">Expires</p>
                      <p className="text-lg font-semibold text-white">
                        {new Date(membership.endDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => navigate(`/membership/checkout/${membership.membershipTypeConfig?.id}?renew=true`)}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Renew
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Secondary memberships section */}
              <div className="border-t border-slate-700 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-md font-semibold text-white flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-400" />
                    Secondary Memberships ({secondaryMemberships.length})
                  </h3>
                  <button
                    onClick={() => setShowAddSecondaryModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Secondary Member
                  </button>
                </div>
                {secondaryMemberships.length > 0 && (
                  <div className="space-y-3">
                    {secondaryMemberships.map((secondary) => (
                      <div
                        key={secondary.id}
                        className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-white font-medium">{secondary.competitorName}</p>
                              {secondary.relationshipToMaster && (
                                <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                                  {getRelationshipLabel(secondary.relationshipToMaster)}
                                </span>
                              )}
                              {secondary.hasOwnLogin && (
                                <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                                  Has Login
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-gray-400 text-xs">Membership</p>
                                <p className="text-gray-200">
                                  {secondary.membershipType?.name || 'Membership'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-400 text-xs">MECA ID</p>
                                <p className="text-orange-400 font-medium font-mono">
                                  {secondary.mecaId ? `#${secondary.mecaId}` : 'Pending'}
                                </p>
                              </div>
                              {(secondary.vehicleMake || secondary.vehicleModel) && (
                                <div>
                                  <p className="text-gray-400 text-xs flex items-center gap-1">
                                    <Car className="h-3 w-3" /> Vehicle
                                  </p>
                                  <p className="text-gray-200">
                                    {[secondary.vehicleMake, secondary.vehicleModel].filter(Boolean).join(' ')}
                                    {secondary.vehicleColor && ` (${secondary.vehicleColor})`}
                                  </p>
                                </div>
                              )}
                              {secondary.vehicleLicensePlate && (
                                <div>
                                  <p className="text-gray-400 text-xs">License Plate</p>
                                  <p className="text-gray-200 font-mono">{secondary.vehicleLicensePlate}</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                secondary.paymentStatus === 'paid'
                                  ? 'bg-green-900/50 text-green-400'
                                  : 'bg-yellow-900/50 text-yellow-400'
                              }`}
                            >
                              {secondary.paymentStatus === 'paid' ? 'Active' : 'Payment Pending'}
                            </span>
                            {/* Edit Button */}
                            <button
                              onClick={() => handleEditSecondary(secondary)}
                              className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
                              title="Edit secondary member"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            {secondary.paymentStatus !== 'paid' && (
                              <button
                                onClick={() => {
                                  // Find the invoice for this secondary membership
                                  const secondaryInvoice = invoices.find(inv =>
                                    (inv.status === 'sent' || inv.status === 'draft' || inv.status === 'overdue') &&
                                    inv.items?.some(item =>
                                      item.description?.toLowerCase().includes(secondary.competitorName.toLowerCase()) ||
                                      item.referenceId === secondary.id
                                    )
                                  );
                                  if (secondaryInvoice) {
                                    navigate(`/pay/invoice/${secondaryInvoice.id}`);
                                  } else {
                                    // Fallback: switch to invoices tab if we can't find it
                                    setActiveTab('invoices');
                                  }
                                }}
                                className="flex items-center gap-1 px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg transition-colors"
                              >
                                <AlertCircle className="h-3 w-3" />
                                View Invoice
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Status</p>
                <p className="text-lg font-semibold text-gray-400">No Active Membership</p>
              </div>
              <button
                onClick={() => navigate('/membership')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Get Membership
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
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
                        {/* Show Pay Now button for unpaid invoices */}
                        {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'draft') && (
                          <button
                            onClick={() => navigate(`/pay/invoice/${invoice.id}`)}
                            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Pay Now
                          </button>
                        )}
                        <button
                          onClick={() => billingApi.viewMyInvoicePdf(invoice.id).catch(err => {
                            console.error('Error viewing invoice:', err);
                            alert('Failed to view invoice. Please try again.');
                          })}
                          className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => billingApi.downloadMyInvoicePdf(invoice.id, invoice.invoiceNumber).catch(err => {
                            console.error('Error downloading invoice:', err);
                            alert('Failed to download invoice. Please try again.');
                          })}
                          className="p-2 text-gray-400 hover:text-green-400 transition-colors"
                          title="Download Invoice"
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
                        <div className="flex items-center gap-2">
                          {/* Show Pay Now button for unpaid invoices */}
                          {(invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'draft') && (
                            <button
                              onClick={() => navigate(`/pay/invoice/${invoice.id}`)}
                              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Pay Now
                            </button>
                          )}
                          <button
                            onClick={() => billingApi.viewMyInvoicePdf(invoice.id).catch(err => {
                              console.error('Error viewing invoice:', err);
                              alert('Failed to view invoice. Please try again.');
                            })}
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                            title="View Invoice"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                          <button
                            onClick={() => billingApi.downloadMyInvoicePdf(invoice.id, invoice.invoiceNumber).catch(err => {
                              console.error('Error downloading invoice:', err);
                              alert('Failed to download invoice. Please try again.');
                            })}
                            className="flex items-center gap-1 text-green-400 hover:text-green-300"
                            title="Download Invoice"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Secondary Modal */}
      {membership && (
        <AddSecondaryModal
          isOpen={showAddSecondaryModal}
          onClose={() => setShowAddSecondaryModal(false)}
          masterMembershipId={membership.id}
          onSuccess={() => {
            // Refresh data to get the latest secondaries from the server
            fetchBillingData();
          }}
        />
      )}

      {/* Edit Secondary Modal */}
      {editingSecondary && profile?.id && (
        <EditSecondaryModal
          isOpen={showEditSecondaryModal}
          onClose={() => {
            setShowEditSecondaryModal(false);
            setEditingSecondary(null);
          }}
          secondary={editingSecondary}
          requestingUserId={profile.id}
          onSuccess={handleSecondaryEdited}
        />
      )}
    </div>
  );
}
