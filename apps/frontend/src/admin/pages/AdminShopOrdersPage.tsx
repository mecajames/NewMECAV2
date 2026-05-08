import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Filter,
  Calendar,
  Mail,
  Truck,
  DollarSign,
  Loader2,
  Eye,
  MessageSquare,
  X,
  RotateCcw,
  ExternalLink,
  ArrowLeft,
  FileText,
  XCircle,
  Trash2,
} from 'lucide-react';
import { ShopOrder } from '@newmeca/shared';
import { shopApi, ShopStats } from '@/shop/shop.api-client';
import { OrderStatusBadge } from '@/shop/components/OrderStatusBadge';

// Local type to avoid Rollup issues with CommonJS enum re-exports
type ShopOrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export function AdminShopOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ShopOrderStatus | ''>('');

  // Order detail modal
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Update status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<ShopOrderStatus>('pending');
  const [savingStatus, setSavingStatus] = useState(false);

  // Tracking modal
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [savingTracking, setSavingTracking] = useState(false);

  // Notes modal
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesOrderId, setNotesOrderId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Refund modal
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  // Invoice creation recovery
  const [creatingInvoiceForOrderId, setCreatingInvoiceForOrderId] = useState<string | null>(null);

  // Bulk-cancel + abandoned-cleanup state. Selection is reset whenever the
  // visible page changes so an admin can't accidentally act on rows they
  // can no longer see.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState<null | 'cancel' | 'abandoned'>(null);

  const toggleSelect = (id: string, sel: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (sel) next.add(id); else next.delete(id);
      return next;
    });
  };

  // Only PENDING orders are cancellable, so the "select all" header checkbox
  // toggles only the pending visible rows — selecting a paid/shipped row
  // would just produce a per-row failure on bulk-cancel.
  const pendingVisible = orders.filter(o => o.status === 'pending');
  const allPendingSelected = pendingVisible.length > 0 && pendingVisible.every(o => selectedIds.has(o.id));
  const somePendingSelected = pendingVisible.some(o => selectedIds.has(o.id));

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, statsData] = await Promise.all([
        shopApi.adminGetOrders({ status: filterStatus || undefined }),
        shopApi.adminGetStats(),
      ]);
      setOrders(ordersData.orders);
      setTotalOrders(ordersData.total);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const viewOrder = async (orderId: string) => {
    try {
      const order = await shopApi.adminGetOrder(orderId);
      setSelectedOrder(order);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error loading order:', err);
    }
  };

  const openStatusModal = (order: ShopOrder) => {
    setStatusOrderId(order.id);
    setNewStatus(order.status);
    setShowStatusModal(true);
  };

  const updateStatus = async () => {
    if (!statusOrderId) return;
    setSavingStatus(true);
    try {
      await shopApi.adminUpdateOrderStatus(statusOrderId, newStatus);
      setShowStatusModal(false);
      setStatusOrderId(null);
      loadData();
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setSavingStatus(false);
    }
  };

  const openTrackingModal = (order: ShopOrder) => {
    setTrackingOrderId(order.id);
    setTrackingNumber(order.trackingNumber || '');
    setShowTrackingModal(true);
  };

  const saveTracking = async () => {
    if (!trackingOrderId) return;
    setSavingTracking(true);
    try {
      await shopApi.adminAddTrackingNumber(trackingOrderId, trackingNumber);
      setShowTrackingModal(false);
      setTrackingOrderId(null);
      loadData();
    } catch (err) {
      console.error('Error saving tracking:', err);
    } finally {
      setSavingTracking(false);
    }
  };

  const openNotesModal = (order: ShopOrder) => {
    setNotesOrderId(order.id);
    setAdminNotes(order.adminNotes || '');
    setShowNotesModal(true);
  };

  const saveNotes = async () => {
    if (!notesOrderId) return;
    setSavingNotes(true);
    try {
      await shopApi.adminUpdateNotes(notesOrderId, adminNotes);
      setShowNotesModal(false);
      setNotesOrderId(null);
      loadData();
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const openRefundModal = (order: ShopOrder) => {
    setRefundOrderId(order.id);
    setRefundReason('');
    setShowRefundModal(true);
  };

  const processRefund = async () => {
    if (!refundOrderId) return;
    setProcessingRefund(true);
    try {
      await shopApi.adminRefundOrder(refundOrderId, refundReason || undefined);
      setShowRefundModal(false);
      setRefundOrderId(null);
      loadData();
    } catch (err) {
      console.error('Error processing refund:', err);
    } finally {
      setProcessingRefund(false);
    }
  };

  const canRefund = (order: ShopOrder) => {
    return order.status === 'paid' || order.status === 'processing';
  };

  /**
   * Cancel a single pending order. Wraps the admin endpoint with a confirm
   * + reason prompt; non-pending orders are blocked server-side and surfaced
   * here as an alert.
   */
  const handleCancelOne = async (order: ShopOrder) => {
    if (!window.confirm(`Cancel order ${order.orderNumber}? Card was never charged.`)) return;
    const reason = window.prompt('Reason (optional):') || undefined;
    try {
      await shopApi.adminCancelOrder(order.id, reason);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to cancel order');
    }
  };

  const handleBulkCancel = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Cancel ${ids.length} pending order(s)?`)) return;
    const reason = window.prompt('Reason (optional):') || undefined;
    setBulkRunning('cancel');
    try {
      const results = await shopApi.adminBulkCancelOrders(ids, reason);
      const ok = results.filter(r => r.ok).length;
      const failed = results.length - ok;
      const errors = results.filter(r => !r.ok && r.error).slice(0, 3).map(r => r.error).join('; ');
      alert(failed > 0 ? `${ok} cancelled, ${failed} failed${errors ? ` — ${errors}` : ''}` : `${ok} cancelled`);
      setSelectedIds(new Set());
      loadData();
    } finally {
      setBulkRunning(null);
    }
  };

  const handleCancelAbandoned = async () => {
    if (!window.confirm('Cancel ALL pending orders older than 24h that were abandoned at checkout? This is the same job the daily cron runs at 3am.')) return;
    setBulkRunning('abandoned');
    try {
      const result = await shopApi.adminCancelAbandonedOrders(24);
      alert(`Cancelled ${result.cancelled} abandoned order(s).`);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to run abandoned-cleanup');
    } finally {
      setBulkRunning(null);
    }
  };

  const createInvoiceForOrder = async (orderId: string) => {
    setCreatingInvoiceForOrderId(orderId);
    try {
      await shopApi.adminCreateInvoiceForOrder(orderId);
      loadData();
    } catch (err) {
      console.error('Error creating invoice:', err);
      alert('Failed to create invoice. Check console for details.');
    } finally {
      setCreatingInvoiceForOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Shop Orders</h1>
            <p className="text-gray-400 mt-1">Manage customer orders</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCancelAbandoned}
              disabled={bulkRunning !== null}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-medium rounded-lg border border-amber-500/30 transition-colors disabled:opacity-50"
              title="Cancel any orders that have been pending >24h. Runs daily via cron — this triggers it manually."
            >
              <Trash2 className="h-4 w-4" />
              {bulkRunning === 'abandoned' ? 'Working…' : 'Cancel Abandoned'}
            </button>
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <p className="text-sm text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-white">{stats.totalOrders}</p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <p className="text-sm text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.pendingOrders}</p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <p className="text-sm text-gray-400">Processing</p>
              <p className="text-2xl font-bold text-purple-400">{stats.processingOrders}</p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <p className="text-sm text-gray-400">Shipped</p>
              <p className="text-2xl font-bold text-cyan-400">{stats.shippedOrders}</p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <p className="text-sm text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-green-400">
                ${stats.totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ShopOrderStatus | '')}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <span className="text-gray-400 text-sm">{totalOrders} orders total</span>
          </div>
        </div>

        {/* Bulk action bar — visible only when at least one row is selected */}
        {selectedIds.size > 0 && (
          <div className="mb-3 flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <span className="text-sm text-orange-300 font-medium">
              {selectedIds.size} selected
            </span>
            <div className="flex-1" />
            <button
              onClick={handleBulkCancel}
              disabled={bulkRunning !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-md border border-red-500/30 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              {bulkRunning === 'cancel' ? 'Cancelling…' : 'Cancel Selected'}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-gray-400 hover:text-white text-xs"
            >
              Clear
            </button>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-slate-600 mb-4" />
              <p className="text-gray-400">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-3 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allPendingSelected}
                        ref={(el) => { if (el) el.indeterminate = !allPendingSelected && somePendingSelected; }}
                        onChange={(e) => {
                          const next = e.target.checked;
                          // Toggle only PENDING rows — non-pending can't be cancelled.
                          pendingVisible.forEach(o => toggleSelect(o.id, next));
                        }}
                        className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-orange-500 focus:ring-orange-500"
                        title="Select all pending"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {orders.map((order) => (
                    <tr key={order.id} className={`hover:bg-slate-700/30 ${selectedIds.has(order.id) ? 'bg-orange-500/5' : ''}`}>
                      <td className="px-3 py-4 w-10">
                        {/* Only PENDING orders are selectable — others can't be cancelled. */}
                        {order.status === 'pending' ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.id)}
                            onChange={(e) => toggleSelect(order.id, e.target.checked)}
                            className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-orange-500 focus:ring-orange-500"
                          />
                        ) : (
                          <span className="inline-block h-4 w-4" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-white font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">
                          {order.items?.reduce((sum, i) => sum + i.quantity, 0) || 0} items
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-300">
                            {order.guestEmail || order.user?.email || 'N/A'}
                          </span>
                        </div>
                        {order.shippingAddress?.name && (
                          <p className="text-sm text-gray-500">{order.shippingAddress.name}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          {new Date(order.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => openStatusModal(order)}>
                          <OrderStatusBadge status={order.status} />
                        </button>
                        {order.trackingNumber && (
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {order.trackingNumber}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-white font-medium">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          {Number(order.totalAmount).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => viewOrder(order.id)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openTrackingModal(order)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            title="Add Tracking"
                          >
                            <Truck className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openNotesModal(order)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                            title="Admin Notes"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                          {canRefund(order) && (
                            <button
                              onClick={() => openRefundModal(order)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Refund Order"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                          {order.status === 'pending' && (
                            <button
                              onClick={() => handleCancelOne(order)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Cancel Order"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          {order.billingOrderId ? (
                            <a
                              href={`/dashboard/admin/billing/orders/${order.billingOrderId}`}
                              className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="View Billing Order"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          ) : (order.status === 'paid' || order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered') ? (
                            <button
                              onClick={() => createInvoiceForOrder(order.id)}
                              disabled={creatingInvoiceForOrderId === order.id}
                              className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded-lg transition-colors disabled:opacity-50"
                              title="Create Missing Invoice"
                            >
                              {creatingInvoiceForOrderId === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order Detail Modal */}
        {showDetailModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedOrder.orderNumber}</h2>
                  <OrderStatusBadge status={selectedOrder.status} className="mt-2" />
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Invoice Warning/Info Banner */}
                {(selectedOrder.status === 'paid' || selectedOrder.status === 'processing' || selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered') && !selectedOrder.billingOrderId && (
                  <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-yellow-400" />
                      <span className="text-yellow-300 text-sm font-medium">Invoice missing for this paid order</span>
                    </div>
                    <button
                      onClick={() => createInvoiceForOrder(selectedOrder.id)}
                      disabled={creatingInvoiceForOrderId === selectedOrder.id}
                      className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {creatingInvoiceForOrderId === selectedOrder.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Create Invoice
                    </button>
                  </div>
                )}
                {selectedOrder.billingOrderId && (
                  <div className="bg-slate-700/50 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-blue-400" />
                      <span className="text-gray-300 text-sm">Billing Order: <span className="text-white font-medium">{selectedOrder.billingOrderId}</span></span>
                    </div>
                    <a
                      href={`/dashboard/admin/billing/orders/${selectedOrder.billingOrderId}`}
                      className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* Customer Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Customer</h3>
                  <p className="text-white">{selectedOrder.guestEmail || selectedOrder.user?.email}</p>
                  {selectedOrder.guestName && (
                    <p className="text-gray-400">{selectedOrder.guestName}</p>
                  )}
                </div>

                {/* Shipping Address */}
                {selectedOrder.shippingAddress && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Shipping Address</h3>
                    <div className="text-gray-300">
                      <p>{selectedOrder.shippingAddress.name}</p>
                      <p>{selectedOrder.shippingAddress.line1}</p>
                      {selectedOrder.shippingAddress.line2 && (
                        <p>{selectedOrder.shippingAddress.line2}</p>
                      )}
                      <p>
                        {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}{' '}
                        {selectedOrder.shippingAddress.postalCode}
                      </p>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="flex justify-between text-gray-300">
                        <span>
                          {item.productName} × {item.quantity}
                        </span>
                        <span>${Number(item.totalPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-slate-700 pt-4 space-y-2">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal</span>
                    <span>${Number(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Shipping</span>
                    <span>${Number(selectedOrder.shippingAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Tax</span>
                    <span>${Number(selectedOrder.taxAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-lg">
                    <span>Total</span>
                    <span>${Number(selectedOrder.totalAmount).toFixed(2)}</span>
                  </div>
                </div>

                {/* Tracking */}
                {selectedOrder.trackingNumber && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Tracking</h3>
                    <p className="text-white">{selectedOrder.trackingNumber}</p>
                  </div>
                )}

                {/* Admin Notes */}
                {selectedOrder.adminNotes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Admin Notes</h3>
                    <p className="text-gray-300">{selectedOrder.adminNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Update Status Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Update Order Status</h3>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ShopOrderStatus)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white mb-6 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updateStatus}
                  disabled={savingStatus}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingStatus ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tracking Modal */}
        {showTrackingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Add Tracking Number</h3>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white mb-6 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setShowTrackingModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTracking}
                  disabled={savingTracking}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingTracking ? 'Saving...' : 'Save Tracking'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notes Modal */}
        {showNotesModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Admin Notes</h3>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add internal notes..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white mb-6 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setShowNotesModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNotes}
                  disabled={savingNotes}
                  className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Refund Modal */}
        {showRefundModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-white mb-4">Refund Order</h3>
              <p className="text-gray-400 mb-4">
                This will mark the order as refunded and restore inventory. The refund in Stripe must be processed separately.
              </p>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Reason for refund (optional)..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white mb-6 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={processRefund}
                  disabled={processingRefund}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {processingRefund ? 'Processing...' : 'Process Refund'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminShopOrdersPage;
