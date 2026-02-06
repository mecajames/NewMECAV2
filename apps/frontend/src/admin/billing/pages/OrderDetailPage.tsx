import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, User, CreditCard, MapPin, XCircle, DollarSign, Ban } from 'lucide-react';
import { billingApi, Order, ordersApi, invoicesApi } from '../../../api-client/billing.api-client';
import { OrderStatusBadge } from '../components/BillingStatusBadge';
import { OrderType, OrderStatus } from '../billing.types';
import CancelRefundModal, { CancelRefundMode } from '../components/CancelRefundModal';

const orderTypeLabels: Record<OrderType, string> = {
  [OrderType.MEMBERSHIP]: 'Membership',
  [OrderType.EVENT_REGISTRATION]: 'Event Registration',
  [OrderType.MANUAL]: 'Manual',
  [OrderType.MECA_SHOP]: 'MECA Shop',
  [OrderType.MERCHANDISE]: 'Merchandise',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState(false);

  // Cancel/Refund modal state
  const [cancelRefundModalOpen, setCancelRefundModalOpen] = useState(false);
  const [cancelRefundMode, setCancelRefundMode] = useState<CancelRefundMode>('cancel');

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const data = await billingApi.getOrder(id!);
      setOrder(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  // Find the membership item in the order (if it's a membership order)
  const membershipItem = useMemo(() => {
    if (!order) return null;
    // Look for items with itemType 'membership' that have a referenceId
    return order.items.find(
      (item) => item.itemType.toLowerCase() === 'membership' && item.referenceId
    );
  }, [order]);

  // Determine if we should show Cancel/Refund buttons
  // For membership orders, show buttons even without a specific membership item (legacy orders)
  const canCancelOrRefund = useMemo(() => {
    if (!order) return false;
    // Show for COMPLETED MEMBERSHIP orders
    // For legacy orders without membershipItem, admin will need to find the membership manually
    return (
      order.status === OrderStatus.COMPLETED &&
      order.orderType === OrderType.MEMBERSHIP
    );
  }, [order]);

  // Determine if we have a valid membership reference for the modal
  const hasMembershipReference = useMemo(() => {
    return !!membershipItem?.referenceId || !!order?.user?.id;
  }, [membershipItem, order]);

  // Check if there's a Stripe payment for refund
  const hasStripePayment = useMemo(() => {
    return !!order?.payment?.stripePaymentIntentId;
  }, [order]);

  const handleOpenCancelModal = () => {
    if (!membershipItem?.referenceId) {
      alert('This is a legacy order without a linked membership reference. Please go to the Members section to find and manage this member\'s membership directly.');
      return;
    }
    setCancelRefundMode('cancel');
    setCancelRefundModalOpen(true);
  };

  const handleOpenRefundModal = () => {
    if (!membershipItem?.referenceId) {
      alert('This is a legacy order without a linked membership reference. Please go to the Members section to find and manage this member\'s membership directly.');
      return;
    }
    setCancelRefundMode('refund');
    setCancelRefundModalOpen(true);
  };

  const handleCancelRefundSuccess = () => {
    fetchOrder();
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    const reason = prompt('Enter cancellation reason (optional):');
    if (reason !== null) {
      try {
        await ordersApi.cancel(order.id, reason || undefined);
        fetchOrder();
      } catch (err) {
        console.error('Error cancelling order:', err);
        alert('Failed to cancel order');
      }
    }
  };

  const handleViewInvoice = async () => {
    if (!order) return;
    setViewingInvoice(true);
    try {
      // Create invoice from order if it doesn't exist, or get existing one
      const invoice = await invoicesApi.createFromOrder(order.id);
      navigate(`/admin/billing/invoices/${invoice.id}`);
    } catch (err) {
      console.error('Error viewing invoice:', err);
      alert('Failed to load invoice. Please try again.');
    } finally {
      setViewingInvoice(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: string, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(parseFloat(amount));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">{error || 'Order not found'}</p>
        <button
          onClick={() => navigate('/admin/billing/orders')}
          className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{order.orderNumber}</h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="text-gray-400 mt-1">
              {orderTypeLabels[order.orderType]} - Created {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {order.status === OrderStatus.PENDING && (
              <button
                onClick={handleCancelOrder}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-lg transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Cancel Order
              </button>
            )}
            {canCancelOrRefund && (
              <>
                <button
                  onClick={handleOpenCancelModal}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold rounded-lg transition-colors"
                  title={!membershipItem?.referenceId ? 'Legacy order - manage membership from Members section' : undefined}
                >
                  <Ban className="h-4 w-4" />
                  Cancel Membership
                </button>
                <button
                  onClick={handleOpenRefundModal}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-lg transition-colors"
                  title={!membershipItem?.referenceId ? 'Legacy order - manage membership from Members section' : undefined}
                >
                  <DollarSign className="h-4 w-4" />
                  Refund
                </button>
              </>
            )}
            <button
              onClick={() => navigate('/admin/billing/orders')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Orders
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-orange-500" />
                <h2 className="text-xl font-semibold text-white">Order Items</h2>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-700">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        Description
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {order.items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-500 text-sm">
                          No itemized details available (legacy order)
                        </td>
                      </tr>
                    ) : (
                      order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <div className="text-sm text-white">{item.description}</div>
                            <div className="text-xs text-gray-500 capitalize">{item.itemType.replace('_', ' ')}</div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-gray-300">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-300">
                            {formatCurrency(item.unitPrice, order.currency)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-white">
                            {formatCurrency(item.total, order.currency)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 border-t border-slate-700 pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Subtotal</span>
                      <span className="text-gray-300">{formatCurrency(order.subtotal, order.currency)}</span>
                    </div>
                    {parseFloat(order.tax) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Tax</span>
                        <span className="text-gray-300">{formatCurrency(order.tax, order.currency)}</span>
                      </div>
                    )}
                    {parseFloat(order.discount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Discount</span>
                        <span className="text-green-400">-{formatCurrency(order.discount, order.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold border-t border-slate-700 pt-2">
                      <span className="text-white">Total</span>
                      <span className="text-white">{formatCurrency(order.total, order.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-white mb-3">Notes</h2>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Customer & Payment Info */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-white">Customer</h2>
              </div>
              {(() => {
                const userName = order.user
                  ? `${order.user.first_name || ''} ${order.user.last_name || ''}`.trim()
                  : null;
                const billingName = order.billingAddress?.name;
                const customerName = userName || billingName || 'No Name';
                const hasProfile = order.user?.id;
                const isGuestOrder = !order.user;

                return order.user ? (
                  <div className="space-y-2">
                    {hasProfile ? (
                      <button
                        onClick={() => navigate(`/admin/members/${order.user!.id}`)}
                        className="text-orange-400 hover:text-orange-300 hover:underline font-medium text-left"
                      >
                        {customerName}
                      </button>
                    ) : (
                      <p className="text-white font-medium">{customerName}</p>
                    )}
                    <p className="text-gray-400 text-sm">{order.user.email}</p>
                    {order.user.meca_id && (
                      <p className="text-orange-400 text-sm font-medium">
                        MECA ID: #{order.user.meca_id}
                      </p>
                    )}
                    {hasProfile && (
                      <button
                        onClick={() => navigate(`/admin/members/${order.user!.id}`)}
                        className="mt-2 w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-sm text-white rounded-lg transition-colors"
                      >
                        View Full Profile
                      </button>
                    )}
                  </div>
                ) : isGuestOrder ? (
                  <div className="space-y-2">
                    {billingName && <p className="text-white font-medium">{billingName}</p>}
                    <p className="text-gray-500 text-sm">Guest Order (No account)</p>
                  </div>
                ) : (
                  <p className="text-gray-400">No customer information</p>
                );
              })()}
            </div>

            {/* Payment Info */}
            {order.payment && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard className="h-5 w-5 text-green-500" />
                  <h2 className="text-lg font-semibold text-white">Payment</h2>
                </div>
                <div className="space-y-2 text-sm">
                  {order.payment.stripePaymentIntentId && (
                    <div>
                      <span className="text-gray-400">Stripe ID: </span>
                      <span className="text-gray-300 font-mono text-xs">
                        {order.payment.stripePaymentIntentId}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Billing Address */}
            {order.billingAddress && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-white">Billing Address</h2>
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  {order.billingAddress.name && <p className="font-medium text-white">{order.billingAddress.name}</p>}
                  {order.billingAddress.address1 && <p>{order.billingAddress.address1}</p>}
                  {order.billingAddress.address2 && <p>{order.billingAddress.address2}</p>}
                  {(order.billingAddress.city || order.billingAddress.state || order.billingAddress.postalCode) && (
                    <p>
                      {order.billingAddress.city}{order.billingAddress.city && order.billingAddress.state && ', '}
                      {order.billingAddress.state} {order.billingAddress.postalCode}
                    </p>
                  )}
                  {order.billingAddress.country && <p>{order.billingAddress.country}</p>}
                </div>
              </div>
            )}

            {/* Invoice Link */}
            <button
              onClick={handleViewInvoice}
              disabled={viewingInvoice}
              className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-center"
            >
              {viewingInvoice ? 'Loading Invoice...' : 'View Invoice'}
            </button>
          </div>
        </div>
      </div>

      {/* Cancel/Refund Modal */}
      {membershipItem && (
        <CancelRefundModal
          isOpen={cancelRefundModalOpen}
          onClose={() => setCancelRefundModalOpen(false)}
          onSuccess={handleCancelRefundSuccess}
          membershipId={membershipItem.referenceId!}
          membershipType={membershipItem.description}
          totalAmount={order.total}
          endDate={undefined} // We don't have end date in order, modal will handle this
          hasStripePayment={hasStripePayment}
          mode={cancelRefundMode}
        />
      )}
    </div>
  );
}
