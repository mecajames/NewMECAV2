import { OrderStatus, InvoiceStatus } from '../billing.types';

interface StatusBadgeProps {
  status: OrderStatus | InvoiceStatus;
  size?: 'sm' | 'md';
}

const orderStatusConfig: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  [OrderStatus.PENDING]: { label: 'Pending', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  [OrderStatus.PROCESSING]: { label: 'Processing', color: 'text-blue-700', bg: 'bg-blue-100' },
  [OrderStatus.COMPLETED]: { label: 'Completed', color: 'text-green-700', bg: 'bg-green-100' },
  [OrderStatus.CANCELLED]: { label: 'Cancelled', color: 'text-gray-700', bg: 'bg-gray-100' },
  [OrderStatus.REFUNDED]: { label: 'Refunded', color: 'text-orange-700', bg: 'bg-orange-100' },
};

const invoiceStatusConfig: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  [InvoiceStatus.DRAFT]: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-100' },
  [InvoiceStatus.SENT]: { label: 'Sent', color: 'text-blue-700', bg: 'bg-blue-100' },
  [InvoiceStatus.PAID]: { label: 'Paid', color: 'text-green-700', bg: 'bg-green-100' },
  [InvoiceStatus.OVERDUE]: { label: 'Overdue', color: 'text-red-700', bg: 'bg-red-100' },
  [InvoiceStatus.CANCELLED]: { label: 'Cancelled', color: 'text-gray-700', bg: 'bg-gray-100' },
  [InvoiceStatus.REFUNDED]: { label: 'Refunded', color: 'text-orange-700', bg: 'bg-orange-100' },
};

export function BillingStatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  // Check if it's an order status or invoice status
  const config = Object.values(OrderStatus).includes(status as OrderStatus)
    ? orderStatusConfig[status as OrderStatus]
    : invoiceStatusConfig[status as InvoiceStatus];

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.color} ${sizeClasses}`}
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
      className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.color} ${sizeClasses}`}
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
      className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.color} ${sizeClasses}`}
    >
      {config.label}
    </span>
  );
}
