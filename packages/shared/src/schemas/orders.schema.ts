import { z } from 'zod';
import {
  OrderStatus,
  OrderStatusSchema,
  OrderType,
  OrderTypeSchema,
  OrderItemType,
  OrderItemTypeSchema,
} from './billing-enums.schema.js';

// =============================================================================
// Billing Address Schema
// =============================================================================

export const BillingAddressSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});
export type BillingAddress = z.infer<typeof BillingAddressSchema>;

// =============================================================================
// Order Item Schemas
// =============================================================================

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.string(),
  total: z.string(),
  itemType: OrderItemTypeSchema,
  referenceId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  createdAt: z.coerce.date(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const CreateOrderItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.string(),
  itemType: OrderItemTypeSchema,
  referenceId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateOrderItemDto = z.infer<typeof CreateOrderItemSchema>;

// =============================================================================
// Order Schemas
// =============================================================================

// User reference for order responses
export const OrderUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});

// Order response schema
export const OrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  user: OrderUserSchema.nullable(),
  status: OrderStatusSchema,
  orderType: OrderTypeSchema,
  subtotal: z.string(),
  tax: z.string(),
  discount: z.string(),
  total: z.string(),
  currency: z.string(),
  notes: z.string().nullable(),
  billingAddress: BillingAddressSchema.nullable(),
  items: z.array(OrderItemSchema),
  paymentId: z.string().uuid().nullable(),
  invoiceId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Order = z.infer<typeof OrderSchema>;

// Order list item (simplified for list views)
export const OrderListItemSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  user: OrderUserSchema.nullable(),
  status: OrderStatusSchema,
  orderType: OrderTypeSchema,
  total: z.string(),
  currency: z.string(),
  itemCount: z.number(),
  createdAt: z.coerce.date(),
});
export type OrderListItem = z.infer<typeof OrderListItemSchema>;

// Create order
export const CreateOrderSchema = z.object({
  userId: z.string().uuid().optional(),
  orderType: OrderTypeSchema,
  items: z.array(CreateOrderItemSchema).min(1),
  notes: z.string().optional(),
  billingAddress: BillingAddressSchema.optional(),
  currency: z.string().default('USD'),
});
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;

// Update order status
export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusSchema,
  notes: z.string().optional(),
});
export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;

// Cancel order
export const CancelOrderSchema = z.object({
  reason: z.string().min(1),
});
export type CancelOrderDto = z.infer<typeof CancelOrderSchema>;

// Refund order
export const RefundOrderSchema = z.object({
  reason: z.string().min(1),
  amount: z.string().optional(),
  refundToStripe: z.boolean().default(true),
});
export type RefundOrderDto = z.infer<typeof RefundOrderSchema>;

// Order list query
export const OrderListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: OrderStatusSchema.optional(),
  orderType: OrderTypeSchema.optional(),
  userId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
});
export type OrderListQuery = z.infer<typeof OrderListQuerySchema>;

// Order list response
export const OrderListResponseSchema = z.object({
  data: z.array(OrderListItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});
export type OrderListResponse = z.infer<typeof OrderListResponseSchema>;

// Create order from payment (internal use)
export const CreateOrderFromPaymentSchema = z.object({
  paymentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  orderType: OrderTypeSchema,
  items: z.array(CreateOrderItemSchema).min(1),
  billingAddress: BillingAddressSchema.optional(),
  notes: z.string().optional(),
});
export type CreateOrderFromPaymentDto = z.infer<typeof CreateOrderFromPaymentSchema>;
