// =============================================================================
// Billing Enums (local copy for frontend - Vite/Rollup compatibility)
// =============================================================================

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
  MECA_SHOP = 'meca_shop',
  MERCHANDISE = 'merchandise',
}

export enum OrderItemType {
  MEMBERSHIP = 'membership',
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
// Billing Types
// =============================================================================

export interface BillingAddress {
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}
