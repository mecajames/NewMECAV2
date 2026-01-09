import { ShopOrderStatus } from '@newmeca/shared';

interface OrderStatusBadgeProps {
  status: ShopOrderStatus;
  className?: string;
}

const statusConfig: Record<ShopOrderStatus, { label: string; className: string }> = {
  [ShopOrderStatus.PENDING]: {
    label: 'Pending',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  [ShopOrderStatus.PAID]: {
    label: 'Paid',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  [ShopOrderStatus.PROCESSING]: {
    label: 'Processing',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  [ShopOrderStatus.SHIPPED]: {
    label: 'Shipped',
    className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  [ShopOrderStatus.DELIVERED]: {
    label: 'Delivered',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  [ShopOrderStatus.CANCELLED]: {
    label: 'Cancelled',
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
  [ShopOrderStatus.REFUNDED]: {
    label: 'Refunded',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

export function OrderStatusBadge({ status, className = '' }: OrderStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig[ShopOrderStatus.PENDING];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

export default OrderStatusBadge;
