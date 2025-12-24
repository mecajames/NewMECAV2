import { z } from 'zod';
import { OrderListItemSchema } from './orders.schema';
import { InvoiceListItemSchema } from './invoices.schema';

// =============================================================================
// Revenue Stats Schemas
// =============================================================================

export const RevenueStatsSchema = z.object({
  today: z.string(),
  thisWeek: z.string(),
  thisMonth: z.string(),
  thisYear: z.string(),
});
export type RevenueStats = z.infer<typeof RevenueStatsSchema>;

// =============================================================================
// Count Stats Schemas
// =============================================================================

export const OrderCountsSchema = z.object({
  pending: z.number(),
  processing: z.number(),
  completed: z.number(),
  cancelled: z.number(),
  refunded: z.number(),
});
export type OrderCounts = z.infer<typeof OrderCountsSchema>;

export const InvoiceCountsSchema = z.object({
  draft: z.number(),
  sent: z.number(),
  paid: z.number(),
  overdue: z.number(),
  cancelled: z.number(),
  refunded: z.number(),
});
export type InvoiceCounts = z.infer<typeof InvoiceCountsSchema>;

// =============================================================================
// Dashboard Stats Schema
// =============================================================================

export const BillingDashboardStatsSchema = z.object({
  totalRevenue: RevenueStatsSchema,
  orderCounts: OrderCountsSchema,
  invoiceCounts: InvoiceCountsSchema,
  recentOrders: z.array(OrderListItemSchema),
  overdueInvoices: z.array(InvoiceListItemSchema),
});
export type BillingDashboardStats = z.infer<typeof BillingDashboardStatsSchema>;

// =============================================================================
// Revenue Report Schemas
// =============================================================================

export const RevenueDataPointSchema = z.object({
  date: z.string(),
  revenue: z.string(),
  orderCount: z.number(),
});
export type RevenueDataPoint = z.infer<typeof RevenueDataPointSchema>;

export const RevenueReportQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
});
export type RevenueReportQuery = z.infer<typeof RevenueReportQuerySchema>;

export const RevenueReportSchema = z.object({
  data: z.array(RevenueDataPointSchema),
  summary: z.object({
    totalRevenue: z.string(),
    averageOrderValue: z.string(),
    totalOrders: z.number(),
  }),
});
export type RevenueReport = z.infer<typeof RevenueReportSchema>;

// =============================================================================
// User Billing Stats Schema
// =============================================================================

export const UserBillingStatsSchema = z.object({
  totalSpent: z.string(),
  orderCount: z.number(),
  invoiceCount: z.number(),
  openInvoices: z.number(),
  lastPaymentDate: z.coerce.date().nullable(),
});
export type UserBillingStats = z.infer<typeof UserBillingStatsSchema>;
