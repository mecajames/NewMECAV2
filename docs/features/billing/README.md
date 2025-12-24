# Billing, Invoice & Order Tracking System

This documentation covers the comprehensive billing, invoice, and order tracking suite for the MECA admin dashboard.

## Overview

The billing system provides complete financial management for MECA's services including:
- **Invoice Generation** - Automatic and manual invoice creation with PDF generation
- **Order Tracking** - Complete order lifecycle management
- **Payment History** - Comprehensive payment records and reporting
- **Admin Dashboard** - Full administrative control over billing operations
- **User Billing Portal** - Self-service billing management for members

## Documentation Index

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture and data flow |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Entity relationships and database design |
| [API_REFERENCE.md](./API_REFERENCE.md) | Backend API endpoints and DTOs |
| [ADMIN_DASHBOARD.md](./ADMIN_DASHBOARD.md) | Admin UI components and workflows |
| [USER_PORTAL.md](./USER_PORTAL.md) | User-facing billing portal |
| [PDF_GENERATION.md](./PDF_GENERATION.md) | Invoice PDF generation system |
| [INTEGRATIONS.md](./INTEGRATIONS.md) | Stripe, QuickBooks, and email integrations |

## Core Features

### 1. Invoice Management
- Automatic invoice generation on payment
- Manual invoice creation for custom charges
- Sequential invoice numbering (INV-2024-00001)
- PDF generation and download
- Email delivery of invoices
- Invoice status tracking (draft, sent, paid, overdue, cancelled, refunded)

### 2. Order Tracking
- Order creation from memberships and event registrations
- Line item tracking with descriptions and pricing
- Order status lifecycle (pending → processing → completed/cancelled)
- Order history and audit trail
- Refund processing with reason tracking

### 3. Admin Dashboard Features
- **Invoice List View** - Filterable, sortable invoice grid
- **Invoice Detail View** - Complete invoice information with actions
- **Order Management** - Order list with status filtering
- **Payment History** - Comprehensive payment records
- **Billing Reports** - Revenue reports and analytics
- **Manual Actions** - Create invoices, process refunds, adjust orders

### 4. User Billing Portal
- View payment history
- Download invoices as PDF
- View current membership status
- Update payment methods
- View upcoming renewals

## Services Covered

The billing system handles payments for:

| Service | Description | Payment Type |
|---------|-------------|--------------|
| Memberships | Annual, lifetime, team, retailer memberships | `MEMBERSHIP` |
| Event Registration | Competition entry fees | `EVENT_REGISTRATION` |
| Manual Charges | Admin-created charges | `OTHER` |

## Quick Links

- **Backend Module**: `apps/backend/src/billing/`
- **Frontend Admin**: `apps/frontend/src/admin/billing/`
- **Frontend Portal**: `apps/frontend/src/billing/`
- **Shared Schemas**: `packages/shared/src/schemas/billing.schema.ts`

## Related Documentation

- [Payments Module README](../../../apps/backend/src/payments/README.md) - Existing payment infrastructure
- [Stripe Integration](../../../apps/backend/src/stripe/) - Payment processing
- [QuickBooks Integration](../../../apps/backend/src/quickbooks/) - Accounting sync
