// Local type to avoid Rollup issues with CommonJS enum re-exports
type ShopOrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

interface OrderStatusBadgeProps {
  status: ShopOrderStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  paid: {
    label: 'Paid',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  processing: {
    label: 'Processing',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  shipped: {
    label: 'Shipped',
    className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
  refunded: {
    label: 'Refunded',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

export function OrderStatusBadge({ status, className = '' }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

export default OrderStatusBadge;
