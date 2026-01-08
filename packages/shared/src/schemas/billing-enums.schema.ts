import { z } from 'zod';

// =============================================================================
// Billing, Order & Invoice Enums
// =============================================================================

/**
 * Payment methods available when admin creates a membership
 */
export enum AdminPaymentMethod {
  CASH = 'cash',
  CHECK = 'check',
  CREDIT_CARD_INVOICE = 'credit_card_invoice', // Send invoice, user pays online
  COMPLIMENTARY = 'complimentary', // Free/waived - no payment required
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum OrderType {
  MEMBERSHIP = 'membership',
  EVENT_REGISTRATION = 'event_registration',
  MANUAL = 'manual',
}

export enum OrderItemType {
  MEMBERSHIP = 'membership',
  TEAM_ADDON = 'team_addon',
  EVENT_CLASS = 'event_class',
  PROCESSING_FEE = 'processing_fee',
  DISCOUNT = 'discount',
  TAX = 'tax',
  OTHER = 'other',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum InvoiceItemType {
  MEMBERSHIP = 'membership',
  EVENT_CLASS = 'event_class',
  PROCESSING_FEE = 'processing_fee',
  DISCOUNT = 'discount',
  TAX = 'tax',
  OTHER = 'other',
}

// =============================================================================
// Zod Schemas
// =============================================================================

export const AdminPaymentMethodSchema = z.nativeEnum(AdminPaymentMethod);
export const OrderStatusSchema = z.nativeEnum(OrderStatus);
export const OrderTypeSchema = z.nativeEnum(OrderType);
export const OrderItemTypeSchema = z.nativeEnum(OrderItemType);
export const InvoiceStatusSchema = z.nativeEnum(InvoiceStatus);
export const InvoiceItemTypeSchema = z.nativeEnum(InvoiceItemType);
