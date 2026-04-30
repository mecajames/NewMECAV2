// Renders a printable membership receipt as standalone HTML, mirroring the
// invoice template the backend uses (logo, table layout, status badge) but
// titled "Receipt" and built from a Membership record. Used for $0 / comp /
// admin-assigned memberships that have no formal Invoice record.

import type { Membership } from '@/memberships';

const FRONTEND_URL = (typeof window !== 'undefined' && window.location.origin) || 'https://www.mecacaraudio.com';
const LOGO_URL = `${FRONTEND_URL}/meca-logo-transparent.png`;

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value?: string | Date | null): string {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatCurrency(value: string | number | undefined | null): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(num) || 0);
}

function inferPaymentMethod(m: Membership): string {
  if (m.stripePaymentIntentId) return 'Credit / Debit Card (Stripe)';
  if (m.paypalSubscriptionId) return 'PayPal';
  const tx = (m.transactionId || '').toLowerCase();
  if (tx.includes('cash')) return 'Cash';
  if (tx.includes('check') || tx.includes('cheque')) return 'Check';
  if (tx.includes('comp') || tx.includes('admin')) return 'Complimentary / Admin';
  if (Number(m.amountPaid ?? 0) === 0) return 'Complimentary / No Charge';
  if (m.paymentStatus === 'pending') return 'Pending Payment';
  return m.transactionId ? 'Other' : 'Not Recorded';
}

const STATUS_LABELS: Record<string, string> = {
  paid: 'Paid',
  pending: 'Pending',
  failed: 'Declined',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
};

const STATUS_CLASSES: Record<string, string> = {
  paid: 'status-paid',
  pending: 'status-draft',
  failed: 'status-overdue',
  refunded: 'status-refunded',
  cancelled: 'status-cancelled',
};

export function renderMembershipReceiptHtml(membership: Membership): string {
  const user: any = (membership as any).user || {};
  const config: any = (membership as any).membershipTypeConfig || {};
  const planName = config.name || 'Membership';
  const planCategory = config.category || '';
  const memberName = membership.competitorName ||
    [user.first_name, user.last_name].filter(Boolean).join(' ') ||
    user.email ||
    'Member';
  const memberEmail = user.email || '';
  const billingStreet = user.billing_street || user.address || '';
  const billingCity = user.billing_city || user.city || '';
  const billingState = user.billing_state || user.state || '';
  const billingZip = user.billing_zip || user.postal_code || '';
  const billingCountry = user.billing_country || user.country || 'US';

  const status = String(membership.paymentStatus || 'pending').toLowerCase();
  const statusLabel = STATUS_LABELS[status] || status;
  const statusClass = STATUS_CLASSES[status] || 'status-draft';

  const paymentMethod = inferPaymentMethod(membership);
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
  <title>Receipt ${escapeHtml(reference)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #333; padding: 40px; background: #fff; }
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
    <div class="header">
      <div class="company-info">
        <img src="${LOGO_URL}" alt="MECA Logo" class="company-logo" onerror="this.style.display='none'" />
        <div class="company-details">
          <h1>Mobile Electronics Competition Association</h1>
          <p>billing@mecacaraudio.com</p>
        </div>
      </div>
      <div class="invoice-title">
        <h2>Receipt</h2>
        <p class="invoice-number">${escapeHtml(reference)}</p>
        <span class="status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>
      </div>
    </div>

    <div class="addresses">
      <div class="address-block">
        <h3>Member</h3>
        <p>
          ${escapeHtml(memberName)}<br>
          ${memberEmail ? `${escapeHtml(memberEmail)}<br>` : ''}
          ${billingStreet ? `${escapeHtml(billingStreet)}<br>` : ''}
          ${(billingCity || billingState || billingZip) ? `${escapeHtml(billingCity)}, ${escapeHtml(billingState)} ${escapeHtml(billingZip)}<br>` : ''}
          ${escapeHtml(billingCountry)}
        </p>
      </div>
      <div class="address-block">
        <h3>Receipt Details</h3>
        <table class="details-table">
          <tr>
            <td>Receipt Date:</td>
            <td>${formatDate(membership.startDate || new Date().toISOString())}</td>
          </tr>
          ${membership.endDate ? `
          <tr>
            <td>Expires:</td>
            <td>${formatDate(membership.endDate)}</td>
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
            <td>${escapeHtml(paymentMethod)}</td>
          </tr>
        </table>
      </div>
    </div>

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
          <td>${escapeHtml(planName)}${planCategory ? ` (${escapeHtml(planCategory)})` : ''}</td>
          <td>membership</td>
          <td>1</td>
          <td>${formatCurrency(amount)}</td>
          <td>${formatCurrency(amount)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <table class="totals-table">
        <tr>
          <td>Subtotal:</td>
          <td>${formatCurrency(amount)}</td>
        </tr>
        <tr class="total-row">
          <td>Total:</td>
          <td>${formatCurrency(amount)}</td>
        </tr>
      </table>
    </div>

    ${(membership.transactionId || membership.stripePaymentIntentId || membership.paypalSubscriptionId) ? `
    <div class="notes">
      <h3>Transaction</h3>
      <p>
        ${membership.transactionId ? `Transaction ID: ${escapeHtml(membership.transactionId)}<br>` : ''}
        ${membership.stripePaymentIntentId ? `Stripe Intent: ${escapeHtml(membership.stripePaymentIntentId)}<br>` : ''}
        ${membership.paypalSubscriptionId ? `PayPal Subscription: ${escapeHtml(membership.paypalSubscriptionId)}` : ''}
      </p>
    </div>
    ` : ''}

    <div class="footer">
      <p>Thank you for being a MECA member!</p>
      <p>Fun, Fair, Loud and Clear!</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
