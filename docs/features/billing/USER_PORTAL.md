# User Billing Portal

## Overview

The user billing portal provides members with self-service access to their billing information, payment history, and invoice downloads.

## Navigation Structure

```
User Dashboard
└── Billing
    ├── Overview (current membership, recent activity)
    ├── Payment History
    └── Invoices (download PDFs)
```

## Page Specifications

### 1. Billing Overview Page

**Route:** `/billing`

**Purpose:** Central hub for user billing information with quick access to key features.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MY BILLING                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ CURRENT MEMBERSHIP                                                      ││
│  │                                                                         ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │                                                                 │   ││
│  │  │  🏆 MECA Annual Membership                                      │   ││
│  │  │                                                                 │   ││
│  │  │  Status: ● Active                                               │   ││
│  │  │  Member ID: MECA-2024-001234                                    │   ││
│  │  │  Expires: December 31, 2024                                     │   ││
│  │  │                                                                 │   ││
│  │  │  [Renew Membership]  [View Membership Details]                  │   ││
│  │  │                                                                 │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────────────────────┐ ┌──────────────────────────────────┐  │
│  │ BILLING SUMMARY                  │ │ QUICK ACTIONS                    │  │
│  │                                  │ │                                  │  │
│  │ Total This Year: $198.00         │ │ [📄 View Payment History]       │  │
│  │ Orders: 2                        │ │ [📥 Download All Invoices]      │  │
│  │ Last Payment: Jan 15, 2024       │ │ [💳 Manage Payment Methods]     │  │
│  │                                  │ │                                  │  │
│  └──────────────────────────────────┘ └──────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ RECENT TRANSACTIONS                                                     ││
│  │                                                                         ││
│  │ ┌───────────────────────────────────────────────────────────────────┐  ││
│  │ │ Jan 15, 2024                                                      │  ││
│  │ │ MECA Annual Membership Renewal                      $99.00        │  ││
│  │ │ ✓ Paid via Stripe                     [View Invoice] [Download]   │  ││
│  │ └───────────────────────────────────────────────────────────────────┘  ││
│  │ ┌───────────────────────────────────────────────────────────────────┐  ││
│  │ │ Jan 15, 2024                                                      │  ││
│  │ │ Spring Showdown 2024 - SQ Expert                    $75.00        │  ││
│  │ │ ✓ Paid via Stripe                     [View Invoice] [Download]   │  ││
│  │ └───────────────────────────────────────────────────────────────────┘  ││
│  │                                                                         ││
│  │                                          [View All Transactions →]      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Components:**
- `MembershipStatusCard` - Shows current membership with status and expiration
- `BillingSummaryCard` - Quick stats (total spent, order count)
- `QuickActionsCard` - Links to common billing tasks
- `RecentTransactionsList` - Last 5 transactions with invoice actions

---

### 2. Payment History Page

**Route:** `/billing/history`

**Purpose:** Complete chronological list of all payments.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Billing                                                            │
│                                                                              │
│                          PAYMENT HISTORY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Filter by year: [All Time ▼]          🔍 Search transactions...        ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  2024                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ┌───────────────────────────────────────────────────────────────────┐  ││
│  │ │ January 15, 2024                                                  │  ││
│  │ │                                                                   │  ││
│  │ │ MECA Annual Membership Renewal                                    │  ││
│  │ │ Order #ORD-2024-00015                                             │  ││
│  │ │                                                                   │  ││
│  │ │ Amount: $99.00                Status: ✓ Paid                      │  ││
│  │ │ Payment Method: Visa •••• 4242                                    │  ││
│  │ │                                                                   │  ││
│  │ │ [View Details]  [Download Invoice]                                │  ││
│  │ └───────────────────────────────────────────────────────────────────┘  ││
│  │                                                                         ││
│  │ ┌───────────────────────────────────────────────────────────────────┐  ││
│  │ │ January 15, 2024                                                  │  ││
│  │ │                                                                   │  ││
│  │ │ Spring Showdown 2024 - SQ Expert Class                            │  ││
│  │ │ Order #ORD-2024-00014                                             │  ││
│  │ │                                                                   │  ││
│  │ │ Amount: $75.00                Status: ✓ Paid                      │  ││
│  │ │ Payment Method: Visa •••• 4242                                    │  ││
│  │ │                                                                   │  ││
│  │ │ [View Details]  [Download Invoice]                                │  ││
│  │ └───────────────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  2023                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ ┌───────────────────────────────────────────────────────────────────┐  ││
│  │ │ December 20, 2023                                                 │  ││
│  │ │                                                                   │  ││
│  │ │ MECA Annual Membership                                            │  ││
│  │ │ Order #ORD-2023-00892                                             │  ││
│  │ │                                                                   │  ││
│  │ │ Amount: $99.00                Status: ✓ Paid                      │  ││
│  │ │ Payment Method: Visa •••• 4242                                    │  ││
│  │ │                                                                   │  ││
│  │ │ [View Details]  [Download Invoice]                                │  ││
│  │ └───────────────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [Load More]                                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Grouped by year for easy navigation
- Expandable transaction details
- Quick invoice download
- Search and filter options
- Infinite scroll or pagination

---

### 3. Invoice View Page

**Route:** `/billing/invoices/:id`

**Purpose:** View a single invoice with download option.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Billing                                                            │
│                                                                              │
│                           INVOICE                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                         ││
│  │  ┌─────────────────────────┐           ┌─────────────────────────────┐ ││
│  │  │ MECA                    │           │ INVOICE #INV-2024-00015     │ ││
│  │  │ Mobile Electronics      │           │                             │ ││
│  │  │ Competition Association │           │ Date: January 15, 2024      │ ││
│  │  │                         │           │ Status: ✓ PAID              │ ││
│  │  │ info@mecacaraudio.com  │           │                             │ ││
│  │  │ mecacaraudio.com       │           │                             │ ││
│  │  └─────────────────────────┘           └─────────────────────────────┘ ││
│  │                                                                         ││
│  │  ────────────────────────────────────────────────────────────────────── ││
│  │                                                                         ││
│  │  BILL TO:                                                               ││
│  │  John Doe                                                               ││
│  │  john@example.com                                                       ││
│  │  123 Main Street                                                        ││
│  │  Austin, TX 78701                                                       ││
│  │                                                                         ││
│  │  ────────────────────────────────────────────────────────────────────── ││
│  │                                                                         ││
│  │  ┌───────────────────────────────────┬───────┬───────────┬───────────┐ ││
│  │  │ Description                        │ Qty   │ Price     │ Total     │ ││
│  │  ├───────────────────────────────────┼───────┼───────────┼───────────┤ ││
│  │  │ MECA Annual Membership             │ 1     │ $99.00    │ $99.00    │ ││
│  │  └───────────────────────────────────┴───────┴───────────┴───────────┘ ││
│  │                                                                         ││
│  │                                              Subtotal:       $99.00    ││
│  │                                              Tax:            $0.00     ││
│  │                                              ────────────────────────  ││
│  │                                              Total:          $99.00    ││
│  │                                              Amount Paid:    $99.00    ││
│  │                                              Balance Due:    $0.00     ││
│  │                                                                         ││
│  │  ────────────────────────────────────────────────────────────────────── ││
│  │                                                                         ││
│  │  Payment Information:                                                   ││
│  │  Paid on January 15, 2024 via Stripe (Visa •••• 4242)                  ││
│  │                                                                         ││
│  │  ────────────────────────────────────────────────────────────────────── ││
│  │                                                                         ││
│  │  Thank you for your membership!                                         ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    [📥 Download PDF]    [🖨️ Print]                      ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Invoice preview matching PDF layout
- Download PDF button
- Print functionality
- Payment status and method display

---

## Component Specifications

### MembershipStatusCard

```tsx
interface MembershipStatusCardProps {
  membership: {
    type: string;
    status: 'active' | 'expired' | 'pending';
    memberId: string;
    expiresAt: Date | null;
  } | null;
}

// States:
// - Active membership with expiration
// - Expired membership with renewal CTA
// - No membership with join CTA
```

### PaymentHistoryItem

```tsx
interface PaymentHistoryItemProps {
  payment: {
    id: string;
    orderNumber: string;
    description: string;
    amount: string;
    status: PaymentStatus;
    paymentMethod: string;
    paidAt: Date;
    invoiceId: string;
  };
  onViewDetails: () => void;
  onDownloadInvoice: () => void;
}
```

### InvoiceDownloadButton

```tsx
interface InvoiceDownloadButtonProps {
  invoiceId: string;
  invoiceNumber: string;
  variant?: 'button' | 'link' | 'icon';
}

// Handles:
// - Loading state during PDF generation
// - Error handling
// - Download trigger
```

---

## API Integration

### User Billing API Client

```typescript
// apps/frontend/src/api-client/billing.api-client.ts

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Get user's orders
export async function getMyOrders(params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const res = await fetch(
    `${API_BASE_URL}/api/billing/my/orders?${searchParams}`,
    { credentials: 'include' }
  );
  if (!res.ok) throw new Error('Failed to fetch orders');
  return res.json();
}

// Get user's invoices
export async function getMyInvoices(params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const res = await fetch(
    `${API_BASE_URL}/api/billing/my/invoices?${searchParams}`,
    { credentials: 'include' }
  );
  if (!res.ok) throw new Error('Failed to fetch invoices');
  return res.json();
}

// Get user's payment history
export async function getMyPayments(params?: { page?: number; limit?: number }) {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.limit) searchParams.set('limit', params.limit.toString());

  const res = await fetch(
    `${API_BASE_URL}/api/billing/my/payments?${searchParams}`,
    { credentials: 'include' }
  );
  if (!res.ok) throw new Error('Failed to fetch payments');
  return res.json();
}

// Download invoice PDF
export async function downloadInvoicePdf(invoiceId: string): Promise<Blob> {
  const res = await fetch(
    `${API_BASE_URL}/api/billing/my/invoices/${invoiceId}/pdf`,
    { credentials: 'include' }
  );
  if (!res.ok) throw new Error('Failed to download invoice');
  return res.blob();
}

// Get single invoice
export async function getMyInvoice(invoiceId: string) {
  const res = await fetch(
    `${API_BASE_URL}/api/billing/my/invoices/${invoiceId}`,
    { credentials: 'include' }
  );
  if (!res.ok) throw new Error('Failed to fetch invoice');
  return res.json();
}

export const billingApi = {
  getMyOrders,
  getMyInvoices,
  getMyPayments,
  downloadInvoicePdf,
  getMyInvoice,
};
```

---

## React Hooks

```typescript
// apps/frontend/src/billing/hooks.ts

import { useState, useEffect } from 'react';
import { billingApi } from '../api-client/billing.api-client';

export function useMyPayments(page = 1, limit = 10) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const result = await billingApi.getMyPayments({ page, limit });
        setPayments(result.data);
        setPagination(result.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payments');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [page, limit]);

  return { payments, loading, error, pagination };
}

export function useInvoiceDownload() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async (invoiceId: string, invoiceNumber: string) => {
    try {
      setDownloading(true);
      setError(null);
      const blob = await billingApi.downloadInvoicePdf(invoiceId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download');
    } finally {
      setDownloading(false);
    }
  };

  return { download, downloading, error };
}
```

---

## Styling Guidelines

Follow existing frontend patterns:
- Match the existing billing page stub styling
- Dark theme consistent with admin dashboard
- Responsive design for mobile users
- Clear visual hierarchy
- Accessible color contrast
- Loading states for all async operations
- Error states with retry options
