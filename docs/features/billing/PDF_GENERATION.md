# Invoice PDF Generation

## Overview

The PDF generation system creates professional invoices that can be downloaded by users and admins. PDFs are generated on-demand and cached for performance.

## Technology Stack

**Recommended Library:** `@react-pdf/renderer`

This library allows creating PDFs using React components, making it easy to maintain and customize invoice templates.

**Alternative Options:**
- `pdfkit` - Lower-level PDF generation
- `puppeteer` - Browser-based PDF rendering (heavier)
- `jsPDF` - Client-side PDF generation

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PDF GENERATION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  API Request │────►│  Invoice     │────►│  PDF         │────►│  Response    │
│  GET /pdf    │     │  Service     │     │  Generator   │     │  (Binary)    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                           │                     │
                           │                     ▼
                           │              ┌──────────────┐
                           │              │  Template    │
                           │              │  Renderer    │
                           │              └──────────────┘
                           │                     │
                           ▼                     ▼
                    ┌──────────────┐     ┌──────────────┐
                    │  Database    │     │  Cache       │
                    │  (Invoice)   │     │  (optional)  │
                    └──────────────┘     └──────────────┘
```

## Backend Implementation

### PDF Service

```typescript
// apps/backend/src/invoices/pdf/invoice-pdf.service.ts
import { Injectable } from '@nestjs/common';
import { renderToBuffer } from '@react-pdf/renderer';
import { Invoice } from '../invoices.entity';
import { InvoicePdfTemplate } from './templates/invoice.template';

@Injectable()
export class InvoicePdfService {
  private readonly companyInfo = {
    name: 'MECA - Mobile Electronics Competition Association',
    address: '123 Competition Way, Austin, TX 78701',
    phone: '(555) 123-4567',
    email: 'info@mecacaraudio.com',
    website: 'https://mecacaraudio.com',
  };

  async generate(invoice: Invoice): Promise<Buffer> {
    const pdfDocument = InvoicePdfTemplate({
      invoice,
      companyInfo: this.companyInfo,
    });

    const buffer = await renderToBuffer(pdfDocument);
    return buffer;
  }

  async generateAndSave(invoice: Invoice): Promise<string> {
    const buffer = await this.generate(invoice);

    // Option 1: Save to file storage (S3, local, etc.)
    // const url = await this.storageService.upload(buffer, `invoices/${invoice.invoiceNumber}.pdf`);

    // Option 2: Store as base64 in database (small files only)
    // invoice.pdfData = buffer.toString('base64');

    // Option 3: Generate on-demand (no storage)
    // Return a signed URL or the endpoint

    return `/api/billing/invoices/${invoice.id}/pdf`;
  }
}
```

### PDF Template (React-PDF)

```tsx
// apps/backend/src/invoices/pdf/templates/invoice.template.tsx
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';
import { Invoice, InvoiceItem } from '../../invoices.entity';

interface InvoicePdfProps {
  invoice: Invoice;
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 40,
  },
  companyInfo: {
    textAlign: 'right',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#f97316', // Orange accent
  },
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  billTo: {
    width: '50%',
  },
  invoiceInfo: {
    width: '40%',
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  customerName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    color: '#ffffff',
    padding: 10,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 10,
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  colDescription: {
    width: '50%',
  },
  colQty: {
    width: '15%',
    textAlign: 'center',
  },
  colPrice: {
    width: '17.5%',
    textAlign: 'right',
  },
  colTotal: {
    width: '17.5%',
    textAlign: 'right',
  },
  totals: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
    width: 200,
  },
  totalLabel: {
    width: '50%',
    textAlign: 'right',
    paddingRight: 10,
  },
  totalValue: {
    width: '50%',
    textAlign: 'right',
  },
  totalFinal: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#1e293b',
  },
  statusBadge: {
    padding: '4 12',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  statusPaid: {
    backgroundColor: '#22c55e',
    color: '#ffffff',
  },
  statusPending: {
    backgroundColor: '#f97316',
    color: '#ffffff',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 8,
  },
  notes: {
    marginTop: 40,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  notesTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
});

export function InvoicePdfTemplate({ invoice, companyInfo }: InvoicePdfProps) {
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency || 'USD',
    }).format(parseFloat(amount));
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  };

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {/* Logo placeholder - replace with actual logo */}
            <Text style={styles.companyName}>{companyInfo.name}</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text>{companyInfo.address}</Text>
            <Text>{companyInfo.phone}</Text>
            <Text>{companyInfo.email}</Text>
            <Text>{companyInfo.website}</Text>
          </View>
        </View>

        {/* Invoice Title */}
        <Text style={styles.invoiceTitle}>INVOICE</Text>

        {/* Invoice Details */}
        <View style={styles.invoiceDetails}>
          <View style={styles.billTo}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.customerName}>
              {invoice.billingAddress?.name ||
                `${invoice.user?.firstName || ''} ${invoice.user?.lastName || ''}`.trim() ||
                'Customer'}
            </Text>
            <Text>{invoice.billingAddress?.email || invoice.user?.email}</Text>
            {invoice.billingAddress?.address1 && (
              <>
                <Text>{invoice.billingAddress.address1}</Text>
                {invoice.billingAddress.address2 && (
                  <Text>{invoice.billingAddress.address2}</Text>
                )}
                <Text>
                  {invoice.billingAddress.city}, {invoice.billingAddress.state}{' '}
                  {invoice.billingAddress.postalCode}
                </Text>
                <Text>{invoice.billingAddress.country}</Text>
              </>
            )}
          </View>

          <View style={styles.invoiceInfo}>
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>Invoice Number</Text>
              <Text style={{ fontWeight: 'bold' }}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>Invoice Date</Text>
              <Text>{formatDate(invoice.createdAt)}</Text>
            </View>
            {invoice.dueDate && (
              <View style={{ marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>Due Date</Text>
                <Text>{formatDate(invoice.dueDate)}</Text>
              </View>
            )}
            <View>
              <Text style={styles.sectionTitle}>Status</Text>
              <Text
                style={[
                  styles.statusBadge,
                  invoice.status === 'paid' ? styles.statusPaid : styles.statusPending,
                ]}
              >
                {invoice.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDescription}>Description</Text>
            <Text style={styles.colQty}>Qty</Text>
            <Text style={styles.colPrice}>Unit Price</Text>
            <Text style={styles.colTotal}>Total</Text>
          </View>

          {invoice.items?.map((item, index) => (
            <View
              key={item.id}
              style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
            >
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{formatCurrency(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          {parseFloat(invoice.tax) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.tax)}</Text>
            </View>
          )}
          {parseFloat(invoice.discount) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={styles.totalValue}>-{formatCurrency(invoice.discount)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.total)}</Text>
          </View>
          {invoice.status === 'paid' && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Amount Paid:</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice.total)}</Text>
              </View>
              <View style={[styles.totalRow, { fontWeight: 'bold' }]}>
                <Text style={styles.totalLabel}>Balance Due:</Text>
                <Text style={styles.totalValue}>{formatCurrency('0.00')}</Text>
              </View>
            </>
          )}
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Thank you for your business! For questions, contact {companyInfo.email}
          </Text>
          <Text style={{ marginTop: 4 }}>
            {companyInfo.name} • {companyInfo.website}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
```

### Controller Endpoint

```typescript
// In billing.controller.ts
@Get('invoices/:id/pdf')
@Header('Content-Type', 'application/pdf')
async getInvoicePdf(
  @Param('id') id: string,
  @Res() res: Response,
) {
  const invoice = await this.invoiceService.findById(id);
  if (!invoice) {
    throw new NotFoundException('Invoice not found');
  }

  const pdfBuffer = await this.invoicePdfService.generate(invoice);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.pdf"`,
    'Content-Length': pdfBuffer.length,
  });

  res.send(pdfBuffer);
}
```

## PDF Template Customization

### Company Logo

To add a company logo:

```tsx
// Add logo as base64 or URL
const LOGO_BASE64 = 'data:image/png;base64,...';

// In template:
<Image
  src={LOGO_BASE64}
  style={styles.logo}
/>
```

### Custom Fonts

```typescript
import { Font } from '@react-pdf/renderer';

Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.ttf' },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 'bold' },
  ],
});
```

### Localization

```typescript
// Support multiple currencies and date formats
const localeConfig = {
  'en-US': {
    currency: 'USD',
    dateFormat: { year: 'numeric', month: 'long', day: 'numeric' },
  },
  'en-GB': {
    currency: 'GBP',
    dateFormat: { year: 'numeric', month: 'long', day: 'numeric' },
  },
};
```

## Caching Strategy

### On-Demand Generation with Cache

```typescript
@Injectable()
export class InvoicePdfService {
  constructor(
    private readonly cacheManager: Cache,
  ) {}

  async generate(invoice: Invoice): Promise<Buffer> {
    const cacheKey = `invoice-pdf:${invoice.id}:${invoice.updatedAt.getTime()}`;

    // Check cache first
    const cached = await this.cacheManager.get<Buffer>(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate PDF
    const buffer = await this.generatePdf(invoice);

    // Cache for 1 hour
    await this.cacheManager.set(cacheKey, buffer, 3600);

    return buffer;
  }
}
```

### Invalidation

Invalidate cached PDFs when invoice is updated:

```typescript
async updateInvoice(id: string, data: UpdateInvoiceDto) {
  const invoice = await this.update(id, data);

  // Invalidate PDF cache
  await this.cacheManager.del(`invoice-pdf:${id}:*`);

  return invoice;
}
```

## Security Considerations

### Access Control

```typescript
@Get('my/invoices/:id/pdf')
async getMyInvoicePdf(
  @Param('id') id: string,
  @CurrentUser() user: User,
  @Res() res: Response,
) {
  const invoice = await this.invoiceService.findById(id);

  if (!invoice) {
    throw new NotFoundException('Invoice not found');
  }

  // Verify ownership
  if (invoice.user?.id !== user.id) {
    throw new ForbiddenException('Access denied');
  }

  // Generate and return PDF
  const pdfBuffer = await this.invoicePdfService.generate(invoice);
  // ...
}
```

### Signed URLs (Optional)

For pre-generated PDFs stored in cloud storage:

```typescript
async getSignedPdfUrl(invoiceId: string): Promise<string> {
  const signedUrl = await this.storageService.getSignedUrl(
    `invoices/${invoiceId}.pdf`,
    { expiresIn: 3600 } // 1 hour
  );
  return signedUrl;
}
```

## Testing

### Unit Test

```typescript
describe('InvoicePdfService', () => {
  it('should generate a valid PDF buffer', async () => {
    const invoice = createMockInvoice();

    const buffer = await pdfService.generate(invoice);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Verify PDF header
    const header = buffer.slice(0, 5).toString();
    expect(header).toBe('%PDF-');
  });
});
```

### Visual Regression Testing

Use tools like `pdf-visual-diff` to catch template changes:

```typescript
it('should match expected PDF output', async () => {
  const invoice = createMockInvoice();
  const buffer = await pdfService.generate(invoice);

  const diff = await comparePdf(buffer, 'expected-invoice.pdf');
  expect(diff.percentage).toBeLessThan(0.01); // 1% tolerance
});
```
