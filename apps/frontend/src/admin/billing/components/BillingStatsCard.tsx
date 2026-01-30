import { DollarSign, FileText, ShoppingCart, TrendingUp, AlertCircle } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: 'revenue' | 'orders' | 'invoices' | 'unpaid' | 'trend';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'warning' | 'success';
}

const iconMap = {
  revenue: DollarSign,
  orders: ShoppingCart,
  invoices: FileText,
  unpaid: AlertCircle,
  trend: TrendingUp,
};

const variantStyles = {
  default: 'bg-white border-gray-200',
  warning: 'bg-orange-50 border-orange-200',
  success: 'bg-green-50 border-green-200',
};

const iconVariantStyles = {
  default: 'bg-blue-100 text-blue-600',
  warning: 'bg-orange-100 text-orange-600',
  success: 'bg-green-100 text-green-600',
};

export function BillingStatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
}: StatsCardProps) {
  const Icon = iconMap[icon];

  return (
    <div className={`rounded-lg border p-6 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          {trend && (
            <p
              className={`mt-1 text-sm ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%{' '}
              <span className="text-gray-500">vs last period</span>
            </p>
          )}
        </div>
        <div className={`rounded-full p-3 ${iconVariantStyles[variant]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

interface StatsGridProps {
  stats: {
    revenue: string;
    ordersTotal: number;
    invoicesTotal: number;
    unpaidTotal: string;
    unpaidCount: number;
  };
}

export function BillingStatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <BillingStatsCard
        title="Total Revenue"
        value={`$${stats.revenue}`}
        icon="revenue"
        variant="success"
      />
      <BillingStatsCard
        title="Total Orders"
        value={stats.ordersTotal}
        icon="orders"
      />
      <BillingStatsCard
        title="Total Invoices"
        value={stats.invoicesTotal}
        icon="invoices"
      />
      <BillingStatsCard
        title="Unpaid Invoices"
        value={`$${stats.unpaidTotal}`}
        subtitle={`${stats.unpaidCount} invoice${stats.unpaidCount !== 1 ? 's' : ''}`}
        icon="unpaid"
        variant={stats.unpaidCount > 0 ? 'warning' : 'default'}
      />
    </div>
  );
}
