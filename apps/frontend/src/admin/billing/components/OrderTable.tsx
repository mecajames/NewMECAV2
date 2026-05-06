import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, MoreVertical, XCircle } from 'lucide-react';
import { Order } from '../../../api-client/billing.api-client';
import { OrderStatusBadge } from './BillingStatusBadge';
import { OrderType } from '../billing.types';

interface OrderTableProps {
  orders: Order[];
  loading?: boolean;
  onViewOrder?: (order: Order) => void;
  onCancelOrder?: (order: Order) => void;
  compact?: boolean;
}

const orderTypeLabels: Record<OrderType, string> = {
  [OrderType.MEMBERSHIP]: 'Membership',
  [OrderType.EVENT_REGISTRATION]: 'Event Registration',
  [OrderType.MANUAL]: 'Manual',
  [OrderType.MECA_SHOP]: 'MECA Shop',
  [OrderType.MERCHANDISE]: 'Merchandise',
};

export function OrderTable({
  orders,
  loading = false,
  onViewOrder,
  onCancelOrder,
  compact = false,
}: OrderTableProps) {
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: string, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(parseFloat(amount));
  };

  const handleViewOrder = (order: Order) => {
    if (onViewOrder) {
      onViewOrder(order);
    } else {
      navigate(`/admin/billing/orders/${order.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <p>No orders found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700">
     <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-700/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Order
            </th>
            {!compact && (
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Customer
              </th>
            )}
            {!compact && (
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Items
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Subscription
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
              Total
            </th>
            {!compact && (
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Date
              </th>
            )}
            <th className="relative px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {orders.map((order) => (
            <tr
              key={order.id}
              className="hover:bg-slate-700/30 cursor-pointer transition-colors"
              onClick={() => handleViewOrder(order)}
            >
              <td className="whitespace-nowrap px-4 py-3">
                <div className="text-sm font-medium text-white">
                  {order.orderNumber}
                </div>
                {!compact && order.items.length > 0 && (
                  <div className="text-xs text-gray-500">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </div>
                )}
              </td>
              {!compact && (
                <td className="whitespace-nowrap px-4 py-3">
                  {(() => {
                    // Backend exposes this relation as `member`; older paths
                    // used `user`. Read whichever is present so we never
                    // mis-flag a real linked customer as a guest.
                    const owner = order.member || order.user;
                    const userName = owner
                      ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim()
                      : null;
                    const billingName = order.billingAddress?.name;
                    const customerName = userName || billingName || (owner?.email ? owner.email : 'Guest');
                    const hasProfile = !!owner?.id;

                    return (
                      <>
                        {hasProfile ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/members/${owner!.id}`);
                            }}
                            className="text-sm text-orange-400 hover:text-orange-300 hover:underline font-medium text-left"
                          >
                            {customerName}
                          </button>
                        ) : (
                          <div className="text-sm text-gray-300">
                            {customerName}
                          </div>
                        )}
                        {owner && (
                          <div className="text-xs text-gray-500">
                            {owner.email}
                            {owner.meca_id && (
                              <span className="ml-2 text-orange-400">#{owner.meca_id}</span>
                            )}
                          </div>
                        )}
                        {!hasProfile && (
                          <div className="text-xs text-amber-400">
                            Guest Purchase (no account)
                          </div>
                        )}
                      </>
                    );
                  })()}
                </td>
              )}
              {!compact && (
                <td className="px-4 py-3">
                  {order.items.length > 0 ? (
                    <div className="max-w-xs">
                      <div
                        className="text-sm text-gray-300 truncate"
                        title={order.items[0].description}
                      >
                        {order.items[0].description}
                      </div>
                      {order.items.length > 1 && (
                        <div className="text-xs text-gray-500">
                          +{order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </td>
              )}
              <td className="whitespace-nowrap px-4 py-3">
                {(() => {
                  // Descriptive type label — distinguishes a brand-new
                  // membership purchase from a renewal, names shop and event
                  // orders explicitly. The is_renewal flag comes from the
                  // backend, which determines it from the buyer's order
                  // history (prior completed membership orders) — works
                  // regardless of order-number format (PMPRO-* or ORD-*).
                  const otype = String(order.orderType || '').toLowerCase();
                  const isRenewal = order.is_renewal === true
                    || (order as any)?.metadata?.isRenewal === true
                    || /renew/i.test(order.orderNumber || '');
                  let label: string;
                  let className = 'text-sm text-gray-300 font-medium';
                  if (otype === 'membership') {
                    label = isRenewal ? 'Membership Renewal' : 'New Membership';
                    className = isRenewal
                      ? 'text-sm text-cyan-300 font-medium'
                      : 'text-sm text-emerald-300 font-medium';
                  } else if (otype === 'event_registration') {
                    label = 'Event Registration';
                    className = 'text-sm text-blue-300 font-medium';
                  } else if (otype === 'shop' || otype === 'meca_shop' || otype === 'merchandise') {
                    label = 'Shop Purchase';
                    className = 'text-sm text-purple-300 font-medium';
                  } else if (otype === 'manual') {
                    label = 'Manual Order';
                    className = 'text-sm text-amber-300 font-medium';
                  } else {
                    label = orderTypeLabels[order.orderType] || String(order.orderType || '—');
                  }
                  return <span className={className}>{label}</span>;
                })()}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                {order.metadata?.subscription_id ? (
                  <span className="font-mono text-xs text-blue-400">
                    {String(order.metadata.subscription_id)}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500">-</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <OrderStatusBadge status={order.status} size="sm" />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <span className="text-sm font-medium text-white">
                  {formatCurrency(order.total, order.currency)}
                </span>
              </td>
              {!compact && (
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="text-sm text-gray-400">
                    {formatDate(order.createdAt)}
                  </span>
                </td>
              )}
              <td className="relative whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === order.id ? null : order.id);
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-slate-600 hover:text-white"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  {openMenuId === order.id && (
                    <div className="absolute right-0 z-10 mt-2 w-48 rounded-md bg-slate-700 py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewOrder(order);
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-200 hover:bg-slate-600"
                      >
                        <Eye className="mr-3 h-4 w-4" />
                        View Details
                      </button>
                      {onCancelOrder && order.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCancelOrder(order);
                            setOpenMenuId(null);
                          }}
                          className="flex w-full items-center px-4 py-2 text-sm text-red-400 hover:bg-slate-600"
                        >
                          <XCircle className="mr-3 h-4 w-4" />
                          Cancel Order
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
     </div>
    </div>
  );
}
