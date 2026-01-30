import { z } from 'zod';
import {
  InvoiceStatus,
  InvoiceStatusSchema,
  InvoiceItemType,
  InvoiceItemTypeSchema,
} from './billing-enums.schema.js';
import { BillingAddressSchema } from './orders.schema.js';

// =============================================================================
// Company Info Schema
// =============================================================================

export const CompanyAddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

export const CompanyInfoSchema = z.object({
  name: z.string(),
  address: CompanyAddressSchema.optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().optional(),
  taxId: z.string().optional(),
});
export type CompanyInfo = z.infer<typeof CompanyInfoSchema>;

// =============================================================================
// Invoice Item Schemas
// =============================================================================

export const InvoiceItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.string(),
  total: z.string(),
  itemType: InvoiceItemTypeSchema,
  referenceId: z.string().uuid().optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
  createdAt: z.coerce.date(),
});
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

export const CreateInvoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.string(),
  itemType: InvoiceItemTypeSchema,
  referenceId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateInvoiceItemDto = z.infer<typeof CreateInvoiceItemSchema>;

// =============================================================================
// Invoice Schemas
// =============================================================================

// User reference for invoice responses
export const InvoiceUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
});

// Order reference for invoice responses
export const InvoiceOrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
});

// Invoice response schema
export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  user: InvoiceUserSchema.nullable(),
  order: InvoiceOrderSchema.nullable(),
  status: InvoiceStatusSchema,
  subtotal: z.string(),
  tax: z.string(),
  discount: z.string(),
  total: z.string(),
  currency: z.string(),
  dueDate: z.coerce.date().nullable(),
  paidAt: z.coerce.date().nullable(),
  sentAt: z.coerce.date().nullable(),
  pdfUrl: z.string().nullable(),
  notes: z.string().nullable(),
  billingAddress: BillingAddressSchema.nullable(),
  companyInfo: CompanyInfoSchema.nullable(),
  items: z.array(InvoiceItemSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

// Invoice list item (simplified for list views)
export const InvoiceListItemSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  user: InvoiceUserSchema.nullable(),
  status: InvoiceStatusSchema,
  total: z.string(),
  currency: z.string(),
  dueDate: z.coerce.date().nullable(),
  paidAt: z.coerce.date().nullable(),
  sentAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});
export type InvoiceListItem = z.infer<typeof InvoiceListItemSchema>;

// Create invoice
export const CreateInvoiceSchema = z.object({
  userId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  items: z.array(CreateInvoiceItemSchema).min(1),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  billingAddress: BillingAddressSchema.optional(),
  sendEmail: z.boolean().default(false),
  currency: z.string().default('USD'),
});
export type CreateInvoiceDto = z.infer<typeof CreateInvoiceSchema>;

// Update invoice
export const UpdateInvoiceSchema = z.object({
  status: InvoiceStatusSchema.optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});
export type UpdateInvoiceDto = z.infer<typeof UpdateInvoiceSchema>;

// Update invoice status (for controller)
export const UpdateInvoiceStatusSchema = z.object({
  status: InvoiceStatusSchema,
  notes: z.string().optional(),
});
export type UpdateInvoiceStatusDto = z.infer<typeof UpdateInvoiceStatusSchema>;

// Mark invoice as paid
export const MarkInvoicePaidSchema = z.object({
  paidAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});
export type MarkInvoicePaidDto = z.infer<typeof MarkInvoicePaidSchema>;

// Send invoice
export const SendInvoiceSchema = z.object({
  email: z.string().email().optional(),
  message: z.string().optional(),
});
export type SendInvoiceDto = z.infer<typeof SendInvoiceSchema>;

// Invoice list query
export const InvoiceListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: InvoiceStatusSchema.optional(),
  userId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
  overdue: z.coerce.boolean().optional(),
});
export type InvoiceListQuery = z.infer<typeof InvoiceListQuerySchema>;

// Invoice list response
export const InvoiceListResponseSchema = z.object({
  data: z.array(InvoiceListItemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    totalItems: z.number(),
    totalPages: z.number(),
  }),
});
export type InvoiceListResponse = z.infer<typeof InvoiceListResponseSchema>;

// Create invoice from order (internal use)
export const CreateInvoiceFromOrderSchema = z.object({
  orderId: z.string().uuid(),
  sendEmail: z.boolean().default(true),
});
export type CreateInvoiceFromOrderDto = z.infer<typeof CreateInvoiceFromOrderSchema>;
