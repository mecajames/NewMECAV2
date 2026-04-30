import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/auth/contexts/AuthContext';
import { billingApi, Invoice, MyTransaction } from '../../api-client/billing.api-client';
import { membershipsApi, Membership, SecondaryMembershipInfo, AddSecondaryModal, EditSecondaryModal, RELATIONSHIP_TYPES } from '@/memberships';

type BillingTab = 'overview' | 'memberships' | 'shop_orders' | 'event_registrations' | 'invoices';

export default function BillingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<MyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const initialTab = (searchParams.get('tab') as BillingTab) || 'overview';
  const validTabs: BillingTab[] = ['overview', 'memberships', 'shop_orders', 'event_registrations', 'invoices'];
  const [activeTab, setActiveTabState] = useState<BillingTab>(
    validTabs.includes(initialTab) ? initialTab : 'overview',
  );

  // Wrapper that also keeps the URL in sync so links from elsewhere can land on a specific tab.
  const setActiveTab = (tab: BillingTab) => {
    setActiveTabState(tab);
    if (tab === 'overview') {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  // Keep tab in sync if URL changes externally (e.g., back/forward navigation).
  useEffect(() => {
    const urlTab = searchParams.get('tab') as BillingTab | null;
    if (urlTab && validTabs.includes(urlTab) && urlTab !== activeTab) {
      setActiveTabState(urlTab);
    } else if (!urlTab && activeTab !== 'overview') {
      setActiveTabState('overview');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Row to highlight after navigating from another page (e.g., the Membership History "View" button).
  const highlightedId = searchParams.get('highlight');
  const [membership, setMembership] = useState<Membership | null>(null);
  const [secondaryMemberships, setSecondaryMemberships] = useState<SecondaryMembershipInfo[]>([]);
  const [showAddSecondaryModal, setShowAddSecondaryModal] = useState(false);
  const [showEditSecondaryModal, setShowEditSecondaryModal] = useState(false);
  const [editingSecondary, setEditingSecondary] = useState<SecondaryMembershipInfo | null>(null);

  const membershipTxs = transactions.filter((t) => t.source === 'membership');
  const shopTxs = transactions.filter((t) => t.source === 'shop_order');
  const eventTxs = transactions.filter((t) => t.source === 'event_registration');

  useEffect(() => {
    if (profile?.id) {
      fetchBillingData();
    }
  }, [profile?.id]);

  const fetchBillingData = async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const [invoicesRes, membershipRes, transactionsRes] = await Promise.all([
        billingApi.getMyInvoices({ limit: 10 }),
        membershipsApi.getUserActiveMembership(profile.id),
        billingApi.getMyAllTransactions().catch(() => ({ data: [], total: 0 })),
      ]);
      setInvoices(invoicesRes.data || []);
      setMembership(membershipRes);
      setTransactions(transactionsRes.data || []);

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
            className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
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
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">Payments and Invoices</h1>
            </div>
            <p className="text-gray-400">Review your memberships, shop orders, event registrations, and invoices</p>
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
                  {membership.startDate && (
                    <div>
                      <p className="text-gray-400 text-sm">Start Date</p>
                      <p className="text-lg font-semibold text-white">
                        {new Date(membership.startDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
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
                  <div>
                    <p className="text-gray-400 text-sm">Auto-Renewal</p>
                    <p className={`text-lg font-semibold ${
                      membership.stripeSubscriptionId ? 'text-green-400' :
                      membership.hadLegacySubscription ? 'text-yellow-400' :
                      'text-gray-400'
                    }`}>
                      {membership.stripeSubscriptionId ? 'Active' :
                       membership.hadLegacySubscription ? 'Legacy' :
                       'Off'}
                    </p>
                  </div>
                </div>
              </div>
              {/* Subscription ID */}
              {(membership.stripeSubscriptionId || membership.hadLegacySubscription) && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Subscription ID:</span>
                    {membership.stripeSubscriptionId ? (
                      <span className="font-mono text-sm text-blue-400">{membership.stripeSubscriptionId}</span>
                    ) : membership.hadLegacySubscription ? (
                      <span className="text-sm text-yellow-400">Legacy (needs re-setup)</span>
                    ) : null}
                  </div>
                </div>
              )}

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
        <div className="flex flex-wrap gap-2 sm:gap-4 mb-6">
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
            onClick={() => setActiveTab('memberships')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'memberships'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Memberships ({membershipTxs.length})
          </button>
          <button
            onClick={() => setActiveTab('shop_orders')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'shop_orders'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Shop Orders ({shopTxs.length})
          </button>
          <button
            onClick={() => setActiveTab('event_registrations')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'event_registrations'
                ? 'bg-orange-600 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Event Registrations ({eventTxs.length})
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
            {/* Recent Activity (memberships, shop orders, event registrations combined) */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-blue-400" />
                  Recent Activity
                </h3>
              </div>
              {transactions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <button
                      key={tx.id}
                      onClick={() => {
                        if (tx.source === 'membership') setActiveTab('memberships');
                        else if (tx.source === 'shop_order') setActiveTab('shop_orders');
                        else setActiveTab('event_registrations');
                      }}
                      className="w-full flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-left"
                    >
                      <div>
                        <p className="text-white font-medium">{tx.type}</p>
                        <p className="text-gray-400 text-sm">{tx.reference}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{formatDate(tx.date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{formatCurrency(tx.amount)}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full capitalize ${getStatusColor(tx.status).bg} ${getStatusColor(tx.status).text}`}
                        >
                          {tx.status}
                        </span>
                      </div>
                    </button>
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
                        {invoice.metadata?.subscription_id && (
                          <p className="text-gray-500 text-xs font-mono mt-0.5">
                            Sub: {String(invoice.metadata.subscription_id)}
                          </p>
                        )}
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

        {/* Memberships Tab */}
        {!loading && activeTab === 'memberships' && (
          <TransactionTable
            transactions={membershipTxs}
            emptyIcon={<CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-500" />}
            emptyText="No memberships found"
            referenceLabel="Membership"
            descriptionLabel="Plan"
            highlightedId={highlightedId}
            onView={(tx) => {
              if (tx.invoiceId) {
                // Has a formal invoice — show the in-app invoice viewer (which has its own Print button).
                navigate(`/invoice/${tx.invoiceId}`);
              } else {
                // No formal invoice (comp / admin-assigned / $0 upgrade) — show the in-app receipt
                // viewer (same dark-theme look). The Print button on that page opens the clean
                // printable HTML in a new tab.
                const membershipId = tx.id.replace(/^membership:/, '');
                navigate(`/membership/${membershipId}/receipt`);
              }
            }}
          />
        )}

        {/* Shop Orders Tab */}
        {!loading && activeTab === 'shop_orders' && (
          <TransactionTable
            transactions={shopTxs}
            emptyIcon={<ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-500" />}
            emptyText="No shop orders found"
            referenceLabel="Order #"
            descriptionLabel="Description"
            onView={(tx) => tx.detailUrl && navigate(tx.detailUrl)}
          />
        )}

        {/* Event Registrations Tab */}
        {!loading && activeTab === 'event_registrations' && (
          <TransactionTable
            transactions={eventTxs}
            emptyIcon={<Calendar className="h-16 w-16 mx-auto mb-4 text-gray-500" />}
            emptyText="No event registrations found"
            referenceLabel="Reference"
            descriptionLabel="Event"
            onView={(tx) => {
              const registrationId = tx.id.replace(/^event_registration:/, '');
              navigate(`/my-registrations/${registrationId}`);
            }}
            extraActions={(tx) => {
              if (tx.status !== 'pending') return null;
              const registrationId = tx.id.replace(/^event_registration:/, '');
              // Pull the eventId out of the detailUrl (`/events/<id>`) so we can route to checkout.
              const eventId = tx.detailUrl?.replace(/^\/events\//, '');
              if (!eventId) return null;
              return (
                <button
                  onClick={() => navigate(`/events/${eventId}/register?registrationId=${registrationId}`)}
                  className="flex items-center gap-1 text-orange-400 hover:text-orange-300"
                >
                  <CreditCard className="h-4 w-4" />
                  Pay Now
                </button>
              );
            }}
          />
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
                      Subscription
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {invoice.metadata?.subscription_id ? (
                          <span className="font-mono text-xs text-blue-400">
                            {String(invoice.metadata.subscription_id)}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
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

interface TransactionTableProps {
  transactions: MyTransaction[];
  emptyIcon: React.ReactNode;
  emptyText: string;
  referenceLabel: string;
  descriptionLabel: string;
  onView?: (tx: MyTransaction) => void;
  highlightedId?: string | null;
  extraActions?: (tx: MyTransaction) => React.ReactNode;
}

function TransactionTable({
  transactions,
  emptyIcon,
  emptyText,
  referenceLabel,
  descriptionLabel,
  onView,
  highlightedId,
  extraActions,
}: TransactionTableProps) {
  const highlightedRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (highlightedId && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedId, transactions]);
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) return 'N/A';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  const statusColor = (status: string): { bg: string; text: string } => {
    const map: Record<string, { bg: string; text: string }> = {
      paid: { bg: 'bg-green-900/50', text: 'text-green-400' },
      completed: { bg: 'bg-green-900/50', text: 'text-green-400' },
      shipped: { bg: 'bg-blue-900/50', text: 'text-blue-400' },
      delivered: { bg: 'bg-green-900/50', text: 'text-green-400' },
      processing: { bg: 'bg-blue-900/50', text: 'text-blue-400' },
      pending: { bg: 'bg-yellow-900/50', text: 'text-yellow-400' },
      cancelled: { bg: 'bg-gray-800/50', text: 'text-gray-400' },
      refunded: { bg: 'bg-orange-900/50', text: 'text-orange-400' },
      failed: { bg: 'bg-red-900/50', text: 'text-red-400' },
    };
    return map[status] || { bg: 'bg-gray-800/50', text: 'text-gray-400' };
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
        <div className="text-center py-12">
          {emptyIcon}
          <p className="text-gray-400">{emptyText}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-700/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{referenceLabel}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">{descriptionLabel}</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {transactions.map((tx) => {
            const c = statusColor(tx.status);
            const isHighlighted = highlightedId === tx.id;
            return (
              <tr
                key={tx.id}
                ref={isHighlighted ? highlightedRowRef : undefined}
                className={`transition-colors ${
                  isHighlighted
                    ? 'bg-orange-500/15 ring-2 ring-orange-500/60 ring-inset'
                    : 'hover:bg-slate-700/30'
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{tx.reference}</td>
                <td className="px-6 py-4 text-sm text-gray-300">{tx.description}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full capitalize ${c.bg} ${c.text}`}>{tx.status}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white text-right">{formatCurrency(tx.amount)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatDate(tx.date)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-3 flex-wrap">
                    {extraActions && extraActions(tx)}
                    {onView && (
                      <button
                        onClick={() => onView(tx)}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    )}
                    {tx.invoiceId && (
                      <button
                        onClick={() =>
                          billingApi.viewMyInvoicePdf(tx.invoiceId!).catch((err) => {
                            console.error('Error viewing invoice:', err);
                            alert('Failed to view invoice. Please try again.');
                          })
                        }
                        className="flex items-center gap-1 text-green-400 hover:text-green-300"
                      >
                        <Download className="h-4 w-4" />
                        Invoice
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
