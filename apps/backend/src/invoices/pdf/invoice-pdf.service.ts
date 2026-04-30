import { Injectable } from '@nestjs/common';
import { Invoice } from '../invoices.entity';
import { InvoiceStatus, CompanyInfo, BillingAddress, PaymentStatus } from '@newmeca/shared';
import { Membership } from '../../memberships/memberships.entity';

/**
 * Service for generating invoice PDFs
 * Uses a simple HTML-to-PDF approach that can be rendered by puppeteer or similar
 * For now, generates HTML that can be converted to PDF on the fly
 */
@Injectable()
export class InvoicePdfService {
  private get logoUrl(): string {
    return `${process.env.FRONTEND_URL || 'https://www.mecacaraudio.com'}/meca-logo-transparent.png`;
  }
  /**
   * Generate PDF content for an invoice
   * Returns HTML that can be converted to PDF
   */
  generateInvoiceHtml(invoice: Invoice): string {
    const companyInfo = invoice.companyInfo as CompanyInfo;
    const billingAddress = invoice.billingAddress as BillingAddress;
    const items = invoice.items.getItems();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
      padding: 40px;
    }

    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e0e0e0;
    }

    .company-info {
      display: flex;
      align-items: flex-start;
      gap: 20px;
    }

    .company-logo {
      width: 150px;
      height: auto;
      flex-shrink: 0;
    }

    .company-details h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 8px;
    }

    .company-details p {
      color: #666;
      font-size: 11px;
    }

    .invoice-title {
      text-align: right;
    }

    .invoice-title h2 {
      font-size: 32px;
      font-weight: 300;
      color: #333;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .invoice-number {
      font-size: 14px;
      color: #666;
      margin-top: 8px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 8px;
    }

    .status-draft { background: #f0f0f0; color: #666; }
    .status-sent { background: #e3f2fd; color: #1976d2; }
    .status-paid { background: #e8f5e9; color: #388e3c; }
    .status-overdue { background: #ffebee; color: #d32f2f; }
    .status-cancelled { background: #fafafa; color: #9e9e9e; }
    .status-refunded { background: #fff3e0; color: #f57c00; }

    .addresses {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
    }

    .address-block {
      width: 45%;
    }

    .address-block h3 {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #999;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }

    .address-block p {
      font-size: 12px;
      line-height: 1.6;
    }

    .invoice-details {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }

    .details-table {
      width: 250px;
    }

    .details-table tr td {
      padding: 4px 0;
    }

    .details-table tr td:first-child {
      color: #666;
      font-size: 11px;
    }

    .details-table tr td:last-child {
      text-align: right;
      font-weight: 500;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }

    .items-table thead tr {
      background: #f8f9fa;
    }

    .items-table th {
      padding: 12px;
      text-align: left;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: #666;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e0e0e0;
    }

    .items-table th:last-child,
    .items-table td:last-child {
      text-align: right;
    }

    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }

    .items-table tbody tr:hover {
      background: #fafafa;
    }

    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }

    .totals-table {
      width: 300px;
    }

    .totals-table tr td {
      padding: 8px 0;
    }

    .totals-table tr td:first-child {
      color: #666;
    }

    .totals-table tr td:last-child {
      text-align: right;
      font-weight: 500;
    }

    .totals-table .total-row td {
      font-size: 16px;
      font-weight: 700;
      color: #1a1a1a;
      border-top: 2px solid #333;
      padding-top: 12px;
    }

    .notes {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 4px;
      margin-bottom: 40px;
    }

    .notes h3 {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
    }

    .notes p {
      font-size: 12px;
      color: #333;
    }

    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #999;
      font-size: 10px;
    }

    .footer p {
      margin-bottom: 4px;
    }

    @media print {
      body {
        padding: 0;
      }
      .invoice-container {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <img src="${this.logoUrl}" alt="MECA Logo" class="company-logo" />
        <div class="company-details">
          <h1>${this.escapeHtml(companyInfo?.name || 'MECA')}</h1>
          ${companyInfo?.address ? `
          <p>
            ${this.escapeHtml(companyInfo.address.street || '')}<br>
            ${this.escapeHtml(companyInfo.address.city || '')}, ${this.escapeHtml(companyInfo.address.state || '')} ${this.escapeHtml(companyInfo.address.postalCode || '')}<br>
            ${this.escapeHtml(companyInfo.address.country || 'US')}
          </p>
          ` : ''}
          ${companyInfo?.email ? `<p><!--email_off-->${this.escapeHtml(companyInfo.email)}<!--/email_off--></p>` : ''}
          ${companyInfo?.phone ? `<p>${this.escapeHtml(companyInfo.phone)}</p>` : ''}
        </div>
      </div>
      <div class="invoice-title">
        <h2>Invoice</h2>
        <p class="invoice-number">${this.escapeHtml(invoice.invoiceNumber)}</p>
        <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
      </div>
    </div>

    <!-- Addresses -->
    <div class="addresses">
      <div class="address-block">
        <h3>Bill To</h3>
        ${billingAddress ? `
        <p>
          ${this.escapeHtml(billingAddress.name || '')}<br>
          ${this.escapeHtml(billingAddress.address1 || '')}${billingAddress.address2 ? `<br>${this.escapeHtml(billingAddress.address2)}` : ''}<br>
          ${this.escapeHtml(billingAddress.city || '')}, ${this.escapeHtml(billingAddress.state || '')} ${this.escapeHtml(billingAddress.postalCode || '')}<br>
          ${this.escapeHtml(billingAddress.country || 'US')}
        </p>
        ` : '<p>N/A</p>'}
      </div>
      <div class="address-block">
        <h3>Invoice Details</h3>
        <table class="details-table">
          <tr>
            <td>Invoice Date:</td>
            <td>${this.formatDate(invoice.createdAt)}</td>
          </tr>
          <tr>
            <td>Due Date:</td>
            <td>${this.formatDate(invoice.dueDate)}</td>
          </tr>
          ${invoice.paidAt ? `
          <tr>
            <td>Paid Date:</td>
            <td>${this.formatDate(invoice.paidAt)}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    </div>

    <!-- Line Items -->
    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Type</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
        <tr>
          <td>${this.escapeHtml(item.description)}</td>
          <td>${this.escapeHtml(item.itemType)}</td>
          <td>${item.quantity}</td>
          <td>${this.formatCurrency(item.unitPrice, invoice.currency)}</td>
          <td>${this.formatCurrency(item.total, invoice.currency)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td>${this.formatCurrency(invoice.subtotal, invoice.currency)}</td>
        </tr>
        ${parseFloat(invoice.tax) > 0 ? `
        <tr>
          <td>Tax:</td>
          <td>${this.formatCurrency(invoice.tax, invoice.currency)}</td>
        </tr>
        ` : ''}
        ${parseFloat(invoice.discount) > 0 ? `
        <tr>
          <td>Discount${invoice.couponCode ? ` (${invoice.couponCode})` : ''}:</td>
          <td>-${this.formatCurrency(invoice.discount, invoice.currency)}</td>
        </tr>
        ` : ''}
        <tr class="total-row">
          <td>Total:</td>
          <td>${this.formatCurrency(invoice.total, invoice.currency)}</td>
        </tr>
      </table>
    </div>

    <!-- Notes -->
    ${invoice.notes ? `
    <div class="notes">
      <h3>Notes</h3>
      <p>${this.escapeHtml(invoice.notes)}</p>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p>Thank you for your business!</p>
      ${companyInfo?.website ? `<p>${this.escapeHtml(companyInfo.website)}</p>` : ''}
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate HTML receipt for a membership that has no formal invoice
   * (e.g., $0 / comp / admin-assigned). Mirrors generateInvoiceHtml visually
   * but reads from the Membership entity and labels the document "Receipt".
   */
  generateMembershipReceiptHtml(membership: Membership): string {
    const user = membership.user as any;
    const config = membership.membershipTypeConfig as any;
    const planName = config?.name || 'Membership';
    const planCategory = config?.category || '';
    const memberName = membership.competitorName ||
      [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
      user?.email ||
      'Member';
    const memberEmail = user?.email || '';
    const billingStreet = user?.billing_street || user?.address || '';
    const billingCity = user?.billing_city || user?.city || '';
    const billingState = user?.billing_state || user?.state || '';
    const billingZip = user?.billing_zip || user?.postal_code || '';
    const billingCountry = user?.billing_country || user?.country || 'US';

    const status = (membership.paymentStatus || 'pending').toLowerCase();
    const statusLabelMap: Record<string, string> = {
      paid: 'Paid',
      pending: 'Pending',
      failed: 'Declined',
      refunded: 'Refunded',
      cancelled: 'Cancelled',
    };
    const statusLabel = statusLabelMap[status] || status;
    // Reuse invoice status badge classes for visual parity
    const statusClassMap: Record<string, string> = {
      paid: 'status-paid',
      pending: 'status-draft',
      failed: 'status-overdue',
      refunded: 'status-refunded',
      cancelled: 'status-cancelled',
    };
    const statusClass = statusClassMap[status] || 'status-draft';

    const paymentMethod = this.inferMembershipPaymentMethod(membership);
    const amount = Number(membership.amountPaid ?? 0);
    const reference = membership.mecaId
      ? `MECA-${membership.mecaId}`
      : `MECA-${String(membership.id).slice(0, 8).toUpperCase()}`;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${this.escapeHtml(reference)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #333; padding: 40px; }
    .invoice-container { max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #e0e0e0; }
    .company-info { display: flex; align-items: flex-start; gap: 20px; }
    .company-logo { width: 150px; height: auto; flex-shrink: 0; }
    .company-details h1 { font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
    .company-details p { color: #666; font-size: 11px; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { font-size: 32px; font-weight: 300; color: #333; text-transform: uppercase; letter-spacing: 2px; }
    .invoice-number { font-size: 14px; color: #666; margin-top: 8px; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; margin-top: 8px; }
    .status-draft { background: #f0f0f0; color: #666; }
    .status-sent { background: #e3f2fd; color: #1976d2; }
    .status-paid { background: #e8f5e9; color: #388e3c; }
    .status-overdue { background: #ffebee; color: #d32f2f; }
    .status-cancelled { background: #fafafa; color: #9e9e9e; }
    .status-refunded { background: #fff3e0; color: #f57c00; }
    .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .address-block { width: 45%; }
    .address-block h3 { font-size: 10px; font-weight: 600; text-transform: uppercase; color: #999; margin-bottom: 8px; letter-spacing: 1px; }
    .address-block p { font-size: 12px; line-height: 1.6; }
    .details-table { width: 250px; }
    .details-table tr td { padding: 4px 0; }
    .details-table tr td:first-child { color: #666; font-size: 11px; }
    .details-table tr td:last-child { text-align: right; font-weight: 500; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table thead tr { background: #f8f9fa; }
    .items-table th { padding: 12px; text-align: left; font-size: 10px; font-weight: 600; text-transform: uppercase; color: #666; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0; }
    .items-table th:last-child, .items-table td:last-child { text-align: right; }
    .items-table td { padding: 12px; border-bottom: 1px solid #eee; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .totals-table { width: 300px; }
    .totals-table tr td { padding: 8px 0; }
    .totals-table tr td:first-child { color: #666; }
    .totals-table tr td:last-child { text-align: right; font-weight: 500; }
    .totals-table .total-row td { font-size: 16px; font-weight: 700; color: #1a1a1a; border-top: 2px solid #333; padding-top: 12px; }
    .notes { background: #f8f9fa; padding: 20px; border-radius: 4px; margin-bottom: 40px; }
    .notes h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #666; margin-bottom: 8px; }
    .notes p { font-size: 12px; color: #333; }
    .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #999; font-size: 10px; }
    .footer p { margin-bottom: 4px; }
    @media print { body { padding: 0; } .invoice-container { max-width: 100%; } }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <img src="${this.logoUrl}" alt="MECA Logo" class="company-logo" />
        <div class="company-details">
          <h1>Mobile Electronics Competition Association</h1>
          <p><!--email_off-->billing@mecacaraudio.com<!--/email_off--></p>
        </div>
      </div>
      <div class="invoice-title">
        <h2>Receipt</h2>
        <p class="invoice-number">${this.escapeHtml(reference)}</p>
        <span class="status-badge ${statusClass}">${this.escapeHtml(statusLabel)}</span>
      </div>
    </div>

    <!-- Addresses -->
    <div class="addresses">
      <div class="address-block">
        <h3>Member</h3>
        <p>
          ${this.escapeHtml(memberName)}<br>
          ${memberEmail ? `${this.escapeHtml(memberEmail)}<br>` : ''}
          ${billingStreet ? `${this.escapeHtml(billingStreet)}<br>` : ''}
          ${(billingCity || billingState || billingZip) ? `${this.escapeHtml(billingCity)}, ${this.escapeHtml(billingState)} ${this.escapeHtml(billingZip)}<br>` : ''}
          ${this.escapeHtml(billingCountry)}
        </p>
      </div>
      <div class="address-block">
        <h3>Receipt Details</h3>
        <table class="details-table">
          <tr>
            <td>Receipt Date:</td>
            <td>${this.formatDate(membership.startDate || new Date())}</td>
          </tr>
          ${membership.endDate ? `
          <tr>
            <td>Expires:</td>
            <td>${this.formatDate(membership.endDate)}</td>
          </tr>
          ` : ''}
          ${membership.mecaId ? `
          <tr>
            <td>MECA ID:</td>
            <td>#${membership.mecaId}</td>
          </tr>
          ` : ''}
          <tr>
            <td>Payment Method:</td>
            <td>${this.escapeHtml(paymentMethod)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Line Items -->
    <table class="items-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Type</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${this.escapeHtml(planName)}${planCategory ? ` (${this.escapeHtml(planCategory)})` : ''}</td>
          <td>membership</td>
          <td>1</td>
          <td>${this.formatCurrency(amount)}</td>
          <td>${this.formatCurrency(amount)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td>${this.formatCurrency(amount)}</td>
        </tr>
        <tr class="total-row">
          <td>Total:</td>
          <td>${this.formatCurrency(amount)}</td>
        </tr>
      </table>
    </div>

    ${membership.transactionId || membership.stripePaymentIntentId || membership.paypalSubscriptionId ? `
    <!-- Notes -->
    <div class="notes">
      <h3>Transaction</h3>
      <p>
        ${membership.transactionId ? `Transaction ID: ${this.escapeHtml(membership.transactionId)}<br>` : ''}
        ${membership.stripePaymentIntentId ? `Stripe Intent: ${this.escapeHtml(membership.stripePaymentIntentId)}<br>` : ''}
        ${membership.paypalSubscriptionId ? `PayPal Subscription: ${this.escapeHtml(membership.paypalSubscriptionId)}` : ''}
      </p>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p>Thank you for being a MECA member!</p>
      <p>Fun, Fair, Loud and Clear!</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private inferMembershipPaymentMethod(m: Membership): string {
    if (m.stripePaymentIntentId) return 'Credit / Debit Card (Stripe)';
    if (m.paypalSubscriptionId) return 'PayPal';
    const tx = (m.transactionId || '').toLowerCase();
    if (tx.includes('cash')) return 'Cash';
    if (tx.includes('check') || tx.includes('cheque')) return 'Check';
    if (tx.includes('comp') || tx.includes('admin')) return 'Complimentary / Admin';
    if (Number(m.amountPaid ?? 0) === 0) return 'Complimentary / No Charge';
    if (m.paymentStatus === PaymentStatus.PENDING) return 'Pending Payment';
    return m.transactionId ? 'Other' : 'Not Recorded';
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format currency amount
   */
  private formatCurrency(amount: string | number, currency: string = 'USD'): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(num);
  }

  /**
   * Get status color for PDF
   */
  getStatusColor(status: InvoiceStatus): string {
    const colors: Record<InvoiceStatus, string> = {
      [InvoiceStatus.DRAFT]: '#9e9e9e',
      [InvoiceStatus.SENT]: '#1976d2',
      [InvoiceStatus.PAID]: '#388e3c',
      [InvoiceStatus.OVERDUE]: '#d32f2f',
      [InvoiceStatus.CANCELLED]: '#757575',
      [InvoiceStatus.REFUNDED]: '#f57c00',
    };
    return colors[status] || '#333';
  }
}
