import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, CreditCard, Loader2, FileText } from 'lucide-react';
import { invoicesApi, billingApi, InvoiceForPayment } from '../../api-client/billing.api-client';

function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);
}

function formatDate(value?: string | Date | null): string {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function statusPill(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    paid: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Paid' },
    sent: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Sent' },
    overdue: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Overdue' },
    cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Cancelled' },
    refunded: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Refunded' },
    draft: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Draft' },
  };
  const c = map[status?.toLowerCase()] || { bg: 'bg-slate-500/20', text: 'text-slate-300', label: status || 'Unknown' };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${c.bg} ${c.text} uppercase tracking-wider`}>
      {c.label}
    </span>
  );
}

export default function InvoiceViewPage() {
  const navigate = useNavigate();
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<InvoiceForPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!invoiceId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await invoicesApi.getForPayment(invoiceId);
        if (!cancelled) setInvoice(data);
      } catch (err) {
        console.error('Failed to load invoice:', err);
        if (!cancelled) setError('Invoice not found or you do not have permission to view it.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [invoiceId]);

  const handlePrint = async () => {
    if (!invoiceId) return;
    setPrinting(true);
    try {
      await billingApi.viewMyInvoicePdf(invoiceId);
    } catch (err) {
      console.error('Error opening printable invoice:', err);
      alert('Failed to open printable version. Please try again.');
    } finally {
      setPrinting(false);
    }
  };

  const handlePay = () => {
    if (invoiceId) navigate(`/pay/invoice/${invoiceId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Invoice unavailable</h2>
            <p className="text-gray-400 mb-6">{error || 'This invoice could not be loaded.'}</p>
            <button
              onClick={() => navigate('/billing')}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              Back to Payments &amp; Invoices
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPayable = invoice.status === 'sent' || invoice.status === 'overdue' || invoice.status === 'draft';
  const billing = invoice.billingAddress;
  const customerName = invoice.user
    ? `${invoice.user.firstName || ''} ${invoice.user.lastName || ''}`.trim() || invoice.user.email
    : 'Customer';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12 printable">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top action bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 print:hidden">
          <button
            onClick={() => navigate('/billing?tab=invoices')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Payments &amp; Invoices
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            {isPayable && (
              <button
                onClick={handlePay}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                Pay Invoice
              </button>
            )}
            <button
              onClick={handlePrint}
              disabled={printing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              Print / Download
            </button>
          </div>
        </div>

        {/* Invoice card */}
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden printable-card">
          {/* Header */}
          <div className="p-6 sm:p-8 border-b border-slate-700">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-orange-500" />
                  </div>
                  <h1 className="text-3xl font-bold text-white">Invoice</h1>
                </div>
                <p className="text-gray-400 font-mono text-sm">{invoice.invoiceNumber}</p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-2">
                {statusPill(invoice.status)}
                <p className="text-3xl font-bold text-white">{formatCurrency(invoice.total)}</p>
              </div>
            </div>
          </div>

          {/* Bill To & Details */}
          <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6 border-b border-slate-700">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Bill To</p>
              <p className="text-white font-semibold">{customerName}</p>
              {invoice.user?.email && <p className="text-gray-400 text-sm">{invoice.user.email}</p>}
              {billing && (
                <div className="text-gray-400 text-sm mt-2 space-y-0.5">
                  {billing.address1 && <p>{billing.address1}</p>}
                  {billing.address2 && <p>{billing.address2}</p>}
                  {(billing.city || billing.state || billing.postalCode) && (
                    <p>
                      {[billing.city, billing.state].filter(Boolean).join(', ')} {billing.postalCode || ''}
                    </p>
                  )}
                  {billing.country && billing.country !== 'US' && <p>{billing.country}</p>}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Invoice Details</p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Due Date:</span>
                  <span className="text-white">{formatDate(invoice.dueDate)}</span>
                </div>
                {invoice.companyInfo?.name && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Issued By:</span>
                    <span className="text-white text-right">{invoice.companyInfo.name}</span>
                  </div>
                )}
                {invoice.companyInfo?.email && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Contact:</span>
                    <span className="text-white">{invoice.companyInfo.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="p-6 sm:p-8 border-b border-slate-700">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-4">Line Items</p>
            <div className="overflow-x-auto -mx-6 sm:-mx-8">
              <table className="w-full">
                <thead className="bg-slate-700/40">
                  <tr>
                    <th className="px-6 sm:px-8 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Qty</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Unit Price</th>
                    <th className="px-6 sm:px-8 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-6 sm:px-8 py-4 text-sm text-white">{item.description}</td>
                      <td className="px-3 py-4 text-sm text-gray-400 font-mono">{item.itemType || '—'}</td>
                      <td className="px-3 py-4 text-sm text-gray-300 text-right">{item.quantity}</td>
                      <td className="px-3 py-4 text-sm text-gray-300 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-6 sm:px-8 py-4 text-sm text-white text-right font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="p-6 sm:p-8 border-b border-slate-700">
            <div className="ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span className="text-white">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {parseFloat(invoice.tax) > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Tax</span>
                  <span className="text-white">{formatCurrency(invoice.tax)}</span>
                </div>
              )}
              {parseFloat(invoice.discount) > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Discount</span>
                  <span className="text-green-400">-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="border-t border-slate-700 pt-2 flex justify-between text-base font-bold">
                <span className="text-white">Total</span>
                <span className="text-orange-400">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer / notes */}
          <div className="p-6 sm:p-8 bg-slate-900/40">
            <p className="text-xs text-gray-500">
              Need help with this invoice? Contact{' '}
              <a href={`mailto:${invoice.companyInfo?.email || 'billing@mecacaraudio.com'}`} className="text-orange-400 hover:text-orange-300">
                {invoice.companyInfo?.email || 'billing@mecacaraudio.com'}
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
