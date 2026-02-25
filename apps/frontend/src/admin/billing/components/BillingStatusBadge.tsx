import { OrderStatus, InvoiceStatus } from '../billing.types';

interface StatusBadgeProps {
  status: OrderStatus | InvoiceStatus;
  size?: 'sm' | 'md';
}

const orderStatusConfig: Record<OrderStatus, { label: string; color: string; bg: string; border: string }> = {
  [OrderStatus.PENDING]: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  [OrderStatus.PROCESSING]: { label: 'Processing', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
  [OrderStatus.COMPLETED]: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30' },
  [OrderStatus.CANCELLED]: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
  [OrderStatus.REFUNDED]: { label: 'Refunded', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30' },
};

const invoiceStatusConfig: Record<InvoiceStatus, { label: string; color: string; bg: string; border: string }> = {
  [InvoiceStatus.DRAFT]: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-500/15', border: 'border-gray-500/30' },
  [InvoiceStatus.SENT]: { label: 'Sent', color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30' },
  [InvoiceStatus.PAID]: { label: 'Paid', color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30' },
  [InvoiceStatus.OVERDUE]: { label: 'Overdue', color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30' },
  [InvoiceStatus.CANCELLED]: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
  [InvoiceStatus.REFUNDED]: { label: 'Refunded', color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30' },
};

export function BillingStatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = Object.values(OrderStatus).includes(status as OrderStatus)
    ? orderStatusConfig[status as OrderStatus]
    : invoiceStatusConfig[status as InvoiceStatus];

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${config.bg} ${config.color} ${config.border} ${sizeClasses}`}
    >
      {config.label}
    </span>
  );
}

export function OrderStatusBadge({ status, size = 'md' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const config = orderStatusConfig[status];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${config.bg} ${config.color} ${config.border} ${sizeClasses}`}
    >
      {config.label}
    </span>
  );
}

export function InvoiceStatusBadge({ status, size = 'md' }: { status: InvoiceStatus; size?: 'sm' | 'md' }) {
  const config = invoiceStatusConfig[status];
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${config.bg} ${config.color} ${config.border} ${sizeClasses}`}
    >
      {config.label}
    </span>
  );
}
