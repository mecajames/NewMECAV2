import { z } from 'zod';

// =============================================================================
// Shop Enums (Single Source of Truth)
// =============================================================================

export enum ShopOrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum ShopProductCategory {
  MEASURING_TOOLS = 'measuring_tools',
  CDS = 'cds',
  APPAREL = 'apparel',
  ACCESSORIES = 'accessories',
  OTHER = 'other',
}

// =============================================================================
// Zod Schemas for Enums
// =============================================================================

export const ShopOrderStatusSchema = z.nativeEnum(ShopOrderStatus);
export const ShopProductCategorySchema = z.nativeEnum(ShopProductCategory);

// =============================================================================
// Address Schema (reusable for shipping/billing)
// =============================================================================

export const ShopAddressSchema = z.object({
  name: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1).default('US'),
  phone: z.string().optional(),
});

export type ShopAddress = z.infer<typeof ShopAddressSchema>;

// =============================================================================
// Shop Product Schemas
// =============================================================================

export const ShopProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  shortDescription: z.string().nullable().optional(),
  category: ShopProductCategorySchema,
  price: z.number().positive(),
  compareAtPrice: z.number().positive().nullable().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
  imageUrl: z.string().nullable().optional(),
  additionalImages: z.array(z.string()).nullable().optional(),
  sku: z.string().nullable().optional(),
  stockQuantity: z.number().int().default(-1), // -1 = unlimited
  trackInventory: z.boolean().default(false),
  stripeProductId: z.string().nullable().optional(),
  stripePriceId: z.string().nullable().optional(),
  quickbooksItemId: z.string().nullable().optional(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ShopProduct = z.infer<typeof ShopProductSchema>;

export const CreateShopProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  category: ShopProductCategorySchema,
  price: z.number().positive(),
  compareAtPrice: z.number().positive().optional(),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
  displayOrder: z.number().int().optional().default(0),
  imageUrl: z.string().optional(),
  additionalImages: z.array(z.string()).optional(),
  sku: z.string().optional(),
  stockQuantity: z.number().int().optional().default(-1),
  trackInventory: z.boolean().optional().default(false),
  stripeProductId: z.string().optional(),
  stripePriceId: z.string().optional(),
  quickbooksItemId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateShopProductDto = z.infer<typeof CreateShopProductSchema>;

export const UpdateShopProductSchema = CreateShopProductSchema.partial();
export type UpdateShopProductDto = z.infer<typeof UpdateShopProductSchema>;

// =============================================================================
// Shop Order Item Schemas
// =============================================================================

export const ShopOrderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  productId: z.string().uuid().nullable().optional(),
  productName: z.string(),
  productSku: z.string().nullable().optional(),
  unitPrice: z.number().positive(),
  quantity: z.number().int().positive(),
  totalPrice: z.number().positive(),
  product: ShopProductSchema.optional(),
});

export type ShopOrderItem = z.infer<typeof ShopOrderItemSchema>;

// =============================================================================
// Shop Order Schemas
// =============================================================================

export const ShopOrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  userId: z.string().uuid().nullable().optional(),
  guestEmail: z.string().email().nullable().optional(),
  guestName: z.string().nullable().optional(),
  status: ShopOrderStatusSchema,
  subtotal: z.number().nonnegative(),
  shippingAmount: z.number().nonnegative().default(0),
  taxAmount: z.number().nonnegative().default(0),
  totalAmount: z.number().nonnegative(),
  stripePaymentIntentId: z.string().nullable().optional(),
  stripeChargeId: z.string().nullable().optional(),
  shippingAddress: ShopAddressSchema.nullable().optional(),
  billingAddress: ShopAddressSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  adminNotes: z.string().nullable().optional(),
  trackingNumber: z.string().nullable().optional(),
  shippedAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  items: z.array(ShopOrderItemSchema).optional(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    fullName: z.string().optional(),
  }).optional(),
});

export type ShopOrder = z.infer<typeof ShopOrderSchema>;

export const CreateShopOrderSchema = z.object({
  userId: z.string().uuid().optional(),
  guestEmail: z.string().email().optional(),
  guestName: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  shippingAddress: ShopAddressSchema.optional(),
  billingAddress: ShopAddressSchema.optional(),
  notes: z.string().optional(),
  stripePaymentIntentId: z.string().optional(),
});

export type CreateShopOrderDto = z.infer<typeof CreateShopOrderSchema>;

export const UpdateShopOrderSchema = z.object({
  status: ShopOrderStatusSchema.optional(),
  adminNotes: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippedAt: z.coerce.date().optional(),
});

export type UpdateShopOrderDto = z.infer<typeof UpdateShopOrderSchema>;

// =============================================================================
// Cart Item Schema (for frontend)
// =============================================================================

export const CartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export type CartItem = z.infer<typeof CartItemSchema>;

// =============================================================================
// Shop Payment Intent Request Schema
// =============================================================================

export const CreateShopPaymentIntentSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  email: z.string().email(),
  shippingAddress: ShopAddressSchema.optional(),
  billingAddress: ShopAddressSchema.optional(),
  userId: z.string().uuid().optional(),
});

export type CreateShopPaymentIntentDto = z.infer<typeof CreateShopPaymentIntentSchema>;

// =============================================================================
// Shop Statistics Schema (for admin dashboard)
// =============================================================================

export const ShopStatsSchema = z.object({
  totalProducts: z.number().int(),
  activeProducts: z.number().int(),
  totalOrders: z.number().int(),
  pendingOrders: z.number().int(),
  processingOrders: z.number().int(),
  shippedOrders: z.number().int(),
  totalRevenue: z.number(),
  ordersThisMonth: z.number().int(),
  revenueThisMonth: z.number(),
});

export type ShopStats = z.infer<typeof ShopStatsSchema>;
