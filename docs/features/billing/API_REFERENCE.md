# Billing API Reference

## Base URL

All endpoints are prefixed with `/api/billing`.

## Authentication

All endpoints require authentication. Admin-only endpoints require `ADMIN` role.

---

## Orders API

### List Orders

```http
GET /api/billing/orders
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `status` | OrderStatus | - | Filter by status |
| `userId` | UUID | - | Filter by user |
| `orderType` | OrderType | - | Filter by type |
| `startDate` | ISO date | - | Filter from date |
| `endDate` | ISO date | - | Filter to date |
| `search` | string | - | Search order number |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "orderNumber": "ORD-2024-00001",
      "user": { "id": "uuid", "email": "...", "firstName": "...", "lastName": "..." },
      "status": "completed",
      "orderType": "membership",
      "subtotal": "99.00",
      "tax": "0.00",
      "discount": "0.00",
      "total": "99.00",
      "currency": "USD",
      "itemCount": 1,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}
```

### Get Order by ID

```http
GET /api/billing/orders/:id
```

**Response:**
```json
{
  "id": "uuid",
  "orderNumber": "ORD-2024-00001",
  "user": { "id": "uuid", "email": "...", "firstName": "...", "lastName": "..." },
  "status": "completed",
  "orderType": "membership",
  "subtotal": "99.00",
  "tax": "0.00",
  "discount": "0.00",
  "total": "99.00",
  "currency": "USD",
  "notes": "Annual membership renewal",
  "billingAddress": {
    "name": "John Doe",
    "email": "john@example.com",
    "address1": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "postalCode": "78701",
    "country": "US"
  },
  "items": [
    {
      "id": "uuid",
      "description": "MECA Annual Membership",
      "quantity": 1,
      "unitPrice": "99.00",
      "total": "99.00",
      "itemType": "membership",
      "referenceId": "membership-uuid"
    }
  ],
  "payment": {
    "id": "uuid",
    "paymentStatus": "paid",
    "paymentMethod": "stripe",
    "amount": "99.00"
  },
  "invoice": {
    "id": "uuid",
    "invoiceNumber": "INV-2024-00001",
    "status": "paid"
  },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Create Order (Admin)

```http
POST /api/billing/orders
```

**Request Body:**
```json
{
  "userId": "uuid",
  "orderType": "manual",
  "items": [
    {
      "description": "Custom service charge",
      "quantity": 1,
      "unitPrice": "50.00",
      "itemType": "other"
    }
  ],
  "notes": "Manual charge for special request",
  "billingAddress": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

**Response:** Returns the created order.

### Update Order Status (Admin)

```http
PATCH /api/billing/orders/:id/status
```

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Marked complete by admin"
}
```

### Cancel Order (Admin)

```http
POST /api/billing/orders/:id/cancel
```

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

### Refund Order (Admin)

```http
POST /api/billing/orders/:id/refund
```

**Request Body:**
```json
{
  "reason": "Duplicate charge",
  "amount": "99.00",
  "refundToStripe": true
}
```

---

## Invoices API

### List Invoices

```http
GET /api/billing/invoices
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |
| `status` | InvoiceStatus | - | Filter by status |
| `userId` | UUID | - | Filter by user |
| `startDate` | ISO date | - | Filter from date |
| `endDate` | ISO date | - | Filter to date |
| `search` | string | - | Search invoice number |
| `overdue` | boolean | - | Only overdue invoices |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "invoiceNumber": "INV-2024-00001",
      "user": { "id": "uuid", "email": "...", "firstName": "...", "lastName": "..." },
      "status": "paid",
      "total": "99.00",
      "currency": "USD",
      "dueDate": "2024-01-30",
      "paidAt": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 150,
    "totalPages": 8
  }
}
```

### Get Invoice by ID

```http
GET /api/billing/invoices/:id
```

**Response:**
```json
{
  "id": "uuid",
  "invoiceNumber": "INV-2024-00001",
  "user": { "id": "uuid", "email": "...", "firstName": "...", "lastName": "..." },
  "order": { "id": "uuid", "orderNumber": "ORD-2024-00001" },
  "status": "paid",
  "subtotal": "99.00",
  "tax": "0.00",
  "discount": "0.00",
  "total": "99.00",
  "currency": "USD",
  "dueDate": "2024-01-30",
  "paidAt": "2024-01-15T10:30:00Z",
  "sentAt": "2024-01-15T10:31:00Z",
  "pdfUrl": "/api/billing/invoices/uuid/pdf",
  "notes": "Thank you for your business",
  "billingAddress": {
    "name": "John Doe",
    "email": "john@example.com",
    "address1": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "postalCode": "78701",
    "country": "US"
  },
  "companyInfo": {
    "name": "MECA - Mobile Electronics Competition Association",
    "address": "...",
    "phone": "...",
    "email": "info@mecacaraudio.com",
    "website": "https://mecacaraudio.com"
  },
  "items": [
    {
      "id": "uuid",
      "description": "MECA Annual Membership",
      "quantity": 1,
      "unitPrice": "99.00",
      "total": "99.00",
      "itemType": "membership"
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Create Invoice (Admin)

```http
POST /api/billing/invoices
```

**Request Body:**
```json
{
  "userId": "uuid",
  "items": [
    {
      "description": "Custom service",
      "quantity": 1,
      "unitPrice": "100.00",
      "itemType": "other"
    }
  ],
  "dueDate": "2024-02-15",
  "notes": "Payment due within 30 days",
  "sendEmail": true
}
```

### Update Invoice (Admin)

```http
PATCH /api/billing/invoices/:id
```

**Request Body:**
```json
{
  "status": "sent",
  "dueDate": "2024-02-28",
  "notes": "Updated payment terms"
}
```

### Mark Invoice Paid (Admin)

```http
POST /api/billing/invoices/:id/mark-paid
```

**Request Body:**
```json
{
  "paidAt": "2024-01-15T10:30:00Z",
  "notes": "Paid via bank transfer"
}
```

### Send Invoice Email (Admin)

```http
POST /api/billing/invoices/:id/send
```

**Request Body:**
```json
{
  "email": "override@example.com",
  "message": "Please find your invoice attached."
}
```

### Get Invoice PDF

```http
GET /api/billing/invoices/:id/pdf
```

**Response:** Binary PDF file with `Content-Type: application/pdf`

### Regenerate Invoice PDF (Admin)

```http
POST /api/billing/invoices/:id/regenerate-pdf
```

---

## User Billing Endpoints

These endpoints are for authenticated users to access their own billing information.

### Get My Orders

```http
GET /api/billing/my/orders
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |

### Get My Invoices

```http
GET /api/billing/my/invoices
```

### Get My Payment History

```http
GET /api/billing/my/payments
```

### Download My Invoice PDF

```http
GET /api/billing/my/invoices/:id/pdf
```

---

## Billing Statistics (Admin)

### Get Dashboard Stats

```http
GET /api/billing/stats/dashboard
```

**Response:**
```json
{
  "totalRevenue": {
    "today": "1250.00",
    "thisWeek": "8500.00",
    "thisMonth": "32000.00",
    "thisYear": "285000.00"
  },
  "orderCounts": {
    "pending": 5,
    "processing": 12,
    "completed": 1500,
    "cancelled": 25,
    "refunded": 15
  },
  "invoiceCounts": {
    "draft": 3,
    "sent": 8,
    "paid": 1450,
    "overdue": 12,
    "cancelled": 10
  },
  "recentOrders": [...],
  "overdueInvoices": [...]
}
```

### Get Revenue Report

```http
GET /api/billing/stats/revenue
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `startDate` | ISO date | 30 days ago | Start date |
| `endDate` | ISO date | today | End date |
| `groupBy` | string | day | day, week, month |

**Response:**
```json
{
  "data": [
    { "date": "2024-01-01", "revenue": "1250.00", "orderCount": 15 },
    { "date": "2024-01-02", "revenue": "980.00", "orderCount": 12 }
  ],
  "summary": {
    "totalRevenue": "32000.00",
    "averageOrderValue": "85.00",
    "totalOrders": 376
  }
}
```

### Export Orders (Admin)

```http
GET /api/billing/export/orders
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | csv, xlsx |
| `startDate` | ISO date | Filter start |
| `endDate` | ISO date | Filter end |
| `status` | OrderStatus | Filter by status |

**Response:** File download with appropriate content type.

### Export Invoices (Admin)

```http
GET /api/billing/export/invoices
```

Same parameters as export orders.

---

## Schemas (Shared Package)

### Order Schemas

```typescript
// packages/shared/src/schemas/orders.schema.ts
import { z } from 'zod';
import { OrderStatus, OrderStatusSchema, OrderType, OrderTypeSchema, OrderItemType, OrderItemTypeSchema } from './enums.schema';

// Order Item
export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.string(),
  total: z.string(),
  itemType: OrderItemTypeSchema,
  referenceId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

// Create Order Item
export const CreateOrderItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.string(),
  itemType: OrderItemTypeSchema,
  referenceId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type CreateOrderItemDto = z.infer<typeof CreateOrderItemSchema>;

// Billing Address
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

// Order Response
export const OrderSchema = z.object({
  id: z.string().uuid(),
  orderNumber: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }).nullable(),
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
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Order = z.infer<typeof OrderSchema>;

// Create Order
export const CreateOrderSchema = z.object({
  userId: z.string().uuid().optional(),
  orderType: OrderTypeSchema,
  items: z.array(CreateOrderItemSchema).min(1),
  notes: z.string().optional(),
  billingAddress: BillingAddressSchema.optional(),
});
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;

// Update Order Status
export const UpdateOrderStatusSchema = z.object({
  status: OrderStatusSchema,
  notes: z.string().optional(),
});
export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;

// Cancel Order
export const CancelOrderSchema = z.object({
  reason: z.string().min(1),
});
export type CancelOrderDto = z.infer<typeof CancelOrderSchema>;

// Refund Order
export const RefundOrderSchema = z.object({
  reason: z.string().min(1),
  amount: z.string().optional(),
  refundToStripe: z.boolean().default(true),
});
export type RefundOrderDto = z.infer<typeof RefundOrderSchema>;

// Order List Query
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
```

### Invoice Schemas

```typescript
// packages/shared/src/schemas/invoices.schema.ts
import { z } from 'zod';
import { InvoiceStatus, InvoiceStatusSchema, InvoiceItemType, InvoiceItemTypeSchema } from './enums.schema';
import { BillingAddressSchema } from './orders.schema';

// Invoice Item
export const InvoiceItemSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: z.string(),
  total: z.string(),
  itemType: InvoiceItemTypeSchema,
  referenceId: z.string().uuid().optional(),
});
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

// Create Invoice Item
export const CreateInvoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.string(),
  itemType: InvoiceItemTypeSchema,
  referenceId: z.string().uuid().optional(),
});
export type CreateInvoiceItemDto = z.infer<typeof CreateInvoiceItemSchema>;

// Company Info
export const CompanyInfoSchema = z.object({
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string().email(),
  website: z.string().url(),
  taxId: z.string().optional(),
});
export type CompanyInfo = z.infer<typeof CompanyInfoSchema>;

// Invoice Response
export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }).nullable(),
  order: z.object({
    id: z.string().uuid(),
    orderNumber: z.string(),
  }).nullable(),
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

// Create Invoice
export const CreateInvoiceSchema = z.object({
  userId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  items: z.array(CreateInvoiceItemSchema).min(1),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  billingAddress: BillingAddressSchema.optional(),
  sendEmail: z.boolean().default(false),
});
export type CreateInvoiceDto = z.infer<typeof CreateInvoiceSchema>;

// Update Invoice
export const UpdateInvoiceSchema = z.object({
  status: InvoiceStatusSchema.optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});
export type UpdateInvoiceDto = z.infer<typeof UpdateInvoiceSchema>;

// Mark Paid
export const MarkInvoicePaidSchema = z.object({
  paidAt: z.coerce.date().optional(),
  notes: z.string().optional(),
});
export type MarkInvoicePaidDto = z.infer<typeof MarkInvoicePaidSchema>;

// Send Invoice
export const SendInvoiceSchema = z.object({
  email: z.string().email().optional(),
  message: z.string().optional(),
});
export type SendInvoiceDto = z.infer<typeof SendInvoiceSchema>;

// Invoice List Query
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
```

### Billing Stats Schema

```typescript
// packages/shared/src/schemas/billing-stats.schema.ts
import { z } from 'zod';

export const RevenueStatsSchema = z.object({
  today: z.string(),
  thisWeek: z.string(),
  thisMonth: z.string(),
  thisYear: z.string(),
});

export const OrderCountsSchema = z.object({
  pending: z.number(),
  processing: z.number(),
  completed: z.number(),
  cancelled: z.number(),
  refunded: z.number(),
});

export const InvoiceCountsSchema = z.object({
  draft: z.number(),
  sent: z.number(),
  paid: z.number(),
  overdue: z.number(),
  cancelled: z.number(),
});

export const BillingDashboardStatsSchema = z.object({
  totalRevenue: RevenueStatsSchema,
  orderCounts: OrderCountsSchema,
  invoiceCounts: InvoiceCountsSchema,
  recentOrders: z.array(z.unknown()),
  overdueInvoices: z.array(z.unknown()),
});
export type BillingDashboardStats = z.infer<typeof BillingDashboardStatsSchema>;

export const RevenueDataPointSchema = z.object({
  date: z.string(),
  revenue: z.string(),
  orderCount: z.number(),
});

export const RevenueReportSchema = z.object({
  data: z.array(RevenueDataPointSchema),
  summary: z.object({
    totalRevenue: z.string(),
    averageOrderValue: z.string(),
    totalOrders: z.number(),
  }),
});
export type RevenueReport = z.infer<typeof RevenueReportSchema>;
```
