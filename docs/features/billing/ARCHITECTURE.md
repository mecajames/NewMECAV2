# Billing System Architecture

## System Overview

The billing system follows the existing three-tier architecture pattern used throughout NewMECA V2:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────┐     ┌──────────────────────┐                      │
│  │   Admin Dashboard    │     │   User Billing       │                      │
│  │                      │     │   Portal             │                      │
│  │  - Invoice List      │     │                      │                      │
│  │  - Invoice Details   │     │  - Payment History   │                      │
│  │  - Order Management  │     │  - Invoice Downloads │                      │
│  │  - Reports           │     │  - Subscriptions     │                      │
│  │  - Manual Actions    │     │                      │                      │
│  └──────────┬───────────┘     └──────────┬───────────┘                      │
│             │                            │                                   │
│             └───────────┬────────────────┘                                   │
│                         │                                                    │
│              ┌──────────▼───────────┐                                       │
│              │    API Client        │                                       │
│              │  billing.api-client  │                                       │
│              └──────────┬───────────┘                                       │
│                         │                                                    │
└─────────────────────────┼────────────────────────────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────┼────────────────────────────────────────────────────┐
│                         │           BACKEND LAYER                            │
├─────────────────────────┼────────────────────────────────────────────────────┤
│                         │                                                    │
│              ┌──────────▼───────────┐                                       │
│              │  Billing Controller  │                                       │
│              │  /api/billing/*      │                                       │
│              └──────────┬───────────┘                                       │
│                         │                                                    │
│    ┌────────────────────┼────────────────────┐                              │
│    │                    │                    │                              │
│    ▼                    ▼                    ▼                              │
│ ┌──────────┐    ┌──────────────┐    ┌──────────────┐                        │
│ │ Invoice  │    │    Order     │    │    PDF       │                        │
│ │ Service  │    │   Service    │    │  Generator   │                        │
│ └────┬─────┘    └──────┬───────┘    └──────────────┘                        │
│      │                 │                                                     │
│      └────────┬────────┘                                                    │
│               │                                                              │
│    ┌──────────▼───────────┐                                                 │
│    │   Payment Service    │◄────────── (Existing)                           │
│    │   Stripe Service     │                                                 │
│    │   QuickBooks Service │                                                 │
│    └──────────┬───────────┘                                                 │
│               │                                                              │
└───────────────┼──────────────────────────────────────────────────────────────┘
                │
┌───────────────┼──────────────────────────────────────────────────────────────┐
│               │            DATABASE LAYER                                    │
├───────────────┼──────────────────────────────────────────────────────────────┤
│               │                                                              │
│    ┌──────────▼───────────┐                                                 │
│    │      PostgreSQL      │                                                 │
│    │                      │                                                 │
│    │  - invoices          │                                                 │
│    │  - invoice_items     │                                                 │
│    │  - orders            │                                                 │
│    │  - order_items       │                                                 │
│    │  - payments (exists) │                                                 │
│    │  - memberships       │                                                 │
│    │  - profiles          │                                                 │
│    └──────────────────────┘                                                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Module Structure

### Backend Module Organization

```
apps/backend/src/
├── billing/                      # NEW: Billing module
│   ├── billing.module.ts         # NestJS module definition
│   ├── billing.controller.ts     # REST API endpoints
│   ├── index.ts                  # Barrel exports
│   └── README.md                 # Module documentation
│
├── invoices/                     # NEW: Invoice management
│   ├── invoices.entity.ts        # Invoice entity
│   ├── invoice-items.entity.ts   # Line items entity
│   ├── invoices.service.ts       # Invoice business logic
│   ├── invoices.controller.ts    # Invoice endpoints
│   ├── invoices.module.ts        # Module definition
│   ├── pdf/                      # PDF generation
│   │   ├── invoice-pdf.service.ts
│   │   └── templates/
│   │       └── invoice.template.ts
│   └── index.ts
│
├── orders/                       # NEW: Order management
│   ├── orders.entity.ts          # Order entity
│   ├── order-items.entity.ts     # Order line items
│   ├── orders.service.ts         # Order business logic
│   ├── orders.controller.ts      # Order endpoints
│   ├── orders.module.ts          # Module definition
│   └── index.ts
│
├── payments/                     # EXISTING: Payment processing
│   ├── payments.entity.ts
│   ├── payments.service.ts
│   └── payments.controller.ts
│
├── stripe/                       # EXISTING: Stripe integration
│   └── ...
│
└── quickbooks/                   # EXISTING: QuickBooks integration
    └── ...
```

### Frontend Module Organization

```
apps/frontend/src/
├── admin/
│   ├── billing/                  # NEW: Admin billing section
│   │   ├── pages/
│   │   │   ├── BillingDashboardPage.tsx    # Overview dashboard
│   │   │   ├── InvoicesPage.tsx            # Invoice list
│   │   │   ├── InvoiceDetailPage.tsx       # Single invoice view
│   │   │   ├── OrdersPage.tsx              # Order list
│   │   │   ├── OrderDetailPage.tsx         # Single order view
│   │   │   └── BillingReportsPage.tsx      # Reports and analytics
│   │   ├── components/
│   │   │   ├── InvoiceTable.tsx
│   │   │   ├── OrderTable.tsx
│   │   │   ├── InvoiceStatusBadge.tsx
│   │   │   ├── OrderStatusBadge.tsx
│   │   │   ├── CreateInvoiceModal.tsx
│   │   │   ├── RefundModal.tsx
│   │   │   └── BillingStatsCard.tsx
│   │   └── index.ts
│   └── pages/
│       └── MemberDetailPage.tsx  # UPDATED: Implement OrdersInvoicesTab
│
├── billing/                      # UPDATED: User billing portal
│   ├── pages/
│   │   ├── BillingPage.tsx       # Main billing dashboard
│   │   ├── PaymentHistoryPage.tsx
│   │   └── InvoicePage.tsx       # View/download invoice
│   ├── components/
│   │   ├── PaymentHistoryTable.tsx
│   │   ├── InvoiceDownloadButton.tsx
│   │   └── MembershipBillingCard.tsx
│   └── index.ts
│
└── api-client/
    └── billing.api-client.ts     # NEW: Billing API client
```

### Shared Package

```
packages/shared/src/schemas/
├── index.ts                      # UPDATED: Export new schemas
├── enums.schema.ts               # UPDATED: Add billing enums
├── billing.schema.ts             # NEW: Billing DTOs
├── invoices.schema.ts            # NEW: Invoice DTOs
└── orders.schema.ts              # NEW: Order DTOs
```

## Data Flow Diagrams

### Invoice Generation Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Payment    │     │   Invoice    │     │     PDF      │
│   Webhook    │────►│   Service    │────►│   Generator  │
│   (Stripe)   │     │              │     │              │
└──────────────┘     └──────┬───────┘     └──────┬───────┘
                           │                     │
                           ▼                     ▼
                    ┌──────────────┐      ┌──────────────┐
                    │   Database   │      │   Storage    │
                    │   (Invoice)  │      │   (PDF)      │
                    └──────────────┘      └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Email      │
                    │   Service    │
                    │  (optional)  │
                    └──────────────┘
```

### Order Lifecycle

```
┌─────────┐     ┌────────────┐     ┌───────────┐     ┌───────────┐
│ PENDING │────►│ PROCESSING │────►│ COMPLETED │     │ CANCELLED │
└─────────┘     └────────────┘     └───────────┘     └───────────┘
     │                │                  │                 ▲
     │                │                  │                 │
     │                └──────────────────┼─────────────────┘
     │                                   │
     │                                   ▼
     │                            ┌───────────┐
     └───────────────────────────►│  REFUNDED │
                                  └───────────┘
```

### Invoice Status Lifecycle

```
┌─────────┐     ┌────────┐     ┌────────┐
│  DRAFT  │────►│  SENT  │────►│  PAID  │
└─────────┘     └────────┘     └────────┘
     │               │              │
     │               │              │
     │               ▼              ▼
     │         ┌─────────┐    ┌──────────┐
     │         │ OVERDUE │    │ REFUNDED │
     │         └─────────┘    └──────────┘
     │               │
     ▼               ▼
┌───────────────────────┐
│      CANCELLED        │
└───────────────────────┘
```

## Integration Points

### Stripe Integration

The billing system integrates with the existing Stripe module:

```typescript
// On successful payment webhook
async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  // 1. Update payment record
  await this.paymentService.processPayment({ ... });

  // 2. Create order from payment metadata
  const order = await this.orderService.createFromPayment(payment);

  // 3. Generate invoice
  const invoice = await this.invoiceService.createFromOrder(order);

  // 4. Generate PDF
  await this.invoicePdfService.generate(invoice);

  // 5. Send email (if enabled)
  await this.emailService.sendInvoice(invoice);

  // 6. Sync to QuickBooks (existing)
  await this.quickbooksService.createSalesReceipt(payment);
}
```

### QuickBooks Integration

Invoices sync with QuickBooks for accounting:
- Invoice creation triggers QuickBooks sales receipt
- Refunds trigger QuickBooks credit memo
- Daily reconciliation job ensures consistency

### Email Integration

Invoice emails are sent via the notification system:
- Invoice generated → Email with PDF attachment
- Payment reminder → Overdue invoice notification
- Refund processed → Refund confirmation email

## Security Considerations

### Access Control

| Role | Permissions |
|------|-------------|
| `ADMIN` | Full access to all billing features |
| `EVENT_DIRECTOR` | View invoices for their events |
| `RETAILER` | View own invoices and orders |
| `USER` | View own invoices and payment history |

### Data Protection

- Invoice PDFs stored with signed URLs (expiring)
- Payment details masked in frontend (last 4 digits only)
- Audit logging for all billing actions
- PCI compliance via Stripe (no card data stored)

## Performance Considerations

### Database Indexes

```sql
-- Invoice queries
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- Order queries
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

### Caching Strategy

- Invoice list pagination: Cache first page
- Invoice PDF: Cache with CDN (1 hour TTL)
- Billing stats: Cache with 5-minute TTL
- User payment history: No cache (real-time)

### Background Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Invoice PDF Generation | On-demand | Generate PDFs asynchronously |
| Overdue Invoice Check | Daily | Mark invoices as overdue |
| QuickBooks Sync | Real-time + Daily | Sync and reconcile |
| Report Generation | Nightly | Pre-generate common reports |
