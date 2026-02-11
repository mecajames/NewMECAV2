import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, User, MapPin, Building, Download, Send, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { billingApi, Invoice, invoicesApi } from '../../../api-client/billing.api-client';
import { InvoiceStatusBadge } from '../components/BillingStatusBadge';
import { InvoiceStatus } from '../billing.types';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const data = await billingApi.getInvoice(id!);
      setInvoice(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice) return;
    try {
      const result = await billingApi.sendInvoice(invoice.id);
      if (result.success) {
        fetchInvoice();
      } else {
        alert(result.error || 'Failed to send invoice');
      }
    } catch (err) {
      console.error('Error sending invoice:', err);
      alert('Failed to send invoice');
    }
  };

  const handleResendInvoice = async () => {
    if (!invoice) return;
    try {
      const result = await invoicesApi.resend(invoice.id);
      if (result.success) {
        alert('Invoice email sent successfully');
      } else {
        alert(result.error || 'Failed to resend invoice');
      }
    } catch (err) {
      console.error('Error resending invoice:', err);
      alert('Failed to resend invoice');
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    try {
      await invoicesApi.markAsPaid(invoice.id);
      fetchInvoice();
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      alert('Failed to mark invoice as paid');
    }
  };

  const handleCancelInvoice = async () => {
    if (!invoice) return;
    const reason = prompt('Enter cancellation reason (optional):');
    if (reason !== null) {
      try {
        await invoicesApi.cancel(invoice.id, reason || undefined);
        fetchInvoice();
      } catch (err) {
        console.error('Error cancelling invoice:', err);
        alert('Failed to cancel invoice');
      }
    }
  };

  const handleViewPdf = () => {
    if (invoice) {
      billingApi.viewInvoicePdf(invoice.id);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: string, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(parseFloat(amount));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">{error || 'Invoice not found'}</p>
        <button
          onClick={() => navigate('/admin/billing/invoices')}
          className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
        >
          Back to Invoices
        </button>
      </div>
    );
  }

  const isOverdue = invoice.status === InvoiceStatus.OVERDUE;
  const canSend = invoice.status === InvoiceStatus.DRAFT;
  const canResend = invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.OVERDUE;
  const canMarkPaid = invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.OVERDUE;
  const canCancel = invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELLED;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{invoice.invoiceNumber}</h1>
              <InvoiceStatusBadge status={invoice.status} />
            </div>
            <p className="text-gray-400 mt-1">
              Created {formatDateTime(invoice.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleViewPdf}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              View PDF
            </button>
            {canSend && (
              <button
                onClick={handleSendInvoice}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            )}
            {canResend && (
              <button
                onClick={handleResendInvoice}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Resend
              </button>
            )}
            {canMarkPaid && (
              <button
                onClick={handleMarkPaid}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                Mark Paid
              </button>
            )}
            {canCancel && (
              <button
                onClick={handleCancelInvoice}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold rounded-lg transition-colors"
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </button>
            )}
            <button
              onClick={() => navigate('/admin/billing/invoices')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Invoices
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Invoice Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Items */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-orange-500" />
                <h2 className="text-xl font-semibold text-white">Invoice Items</h2>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-700">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        Description
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {invoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div className="text-sm text-white">{item.description}</div>
                          <div className="text-xs text-gray-500 capitalize">{item.itemType.replace('_', ' ')}</div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-300">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-300">
                          {formatCurrency(item.unitPrice, invoice.currency)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-white">
                          {formatCurrency(item.total, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 border-t border-slate-700 pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Subtotal</span>
                      <span className="text-gray-300">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                    </div>
                    {parseFloat(invoice.tax) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Tax</span>
                        <span className="text-gray-300">{formatCurrency(invoice.tax, invoice.currency)}</span>
                      </div>
                    )}
                    {parseFloat(invoice.discount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Discount</span>
                        <span className="text-green-400">-{formatCurrency(invoice.discount, invoice.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-semibold border-t border-slate-700 pt-2">
                      <span className="text-white">Total</span>
                      <span className="text-white">{formatCurrency(invoice.total, invoice.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-white mb-3">Notes</h2>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Customer & Payment Info */}
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-white">Customer</h2>
              </div>
              {invoice.user ? (
                <div className="space-y-2">
                  <p className="text-white font-medium">
                    {`${invoice.user.first_name || ''} ${invoice.user.last_name || ''}`.trim() || 'No Name'}
                  </p>
                  <p className="text-gray-400 text-sm">{invoice.user.email}</p>
                  {invoice.user.meca_id && (
                    <p className="text-orange-400 text-sm font-medium">
                      MECA ID: #{invoice.user.meca_id}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">Guest invoice</p>
              )}
            </div>

            {/* Date Info */}
            <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-4">Dates</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Invoice Date</span>
                  <span className="text-gray-300">{formatDate(invoice.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Due Date</span>
                  <span className={isOverdue ? 'text-red-400 font-medium' : 'text-gray-300'}>
                    {formatDate(invoice.dueDate)}
                  </span>
                </div>
                {invoice.sentAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sent Date</span>
                    <span className="text-gray-300">{formatDate(invoice.sentAt)}</span>
                  </div>
                )}
                {invoice.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Paid Date</span>
                    <span className="text-green-400 font-medium">{formatDate(invoice.paidAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Company Info */}
            {invoice.companyInfo && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Building className="h-5 w-5 text-purple-500" />
                  <h2 className="text-lg font-semibold text-white">From</h2>
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  <p className="font-medium text-white">{invoice.companyInfo.name}</p>
                  {invoice.companyInfo.email && <p>{invoice.companyInfo.email}</p>}
                  {invoice.companyInfo.phone && <p>{invoice.companyInfo.phone}</p>}
                  {invoice.companyInfo.website && (
                    <p className="text-blue-400">{invoice.companyInfo.website}</p>
                  )}
                </div>
              </div>
            )}

            {/* Billing Address */}
            {invoice.billingAddress && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-green-500" />
                  <h2 className="text-lg font-semibold text-white">Billing Address</h2>
                </div>
                <div className="text-sm text-gray-300 space-y-1">
                  {invoice.billingAddress.name && <p className="font-medium text-white">{invoice.billingAddress.name}</p>}
                  {invoice.billingAddress.address1 && <p>{invoice.billingAddress.address1}</p>}
                  {invoice.billingAddress.address2 && <p>{invoice.billingAddress.address2}</p>}
                  {(invoice.billingAddress.city || invoice.billingAddress.state || invoice.billingAddress.postalCode) && (
                    <p>
                      {invoice.billingAddress.city}{invoice.billingAddress.city && invoice.billingAddress.state && ', '}
                      {invoice.billingAddress.state} {invoice.billingAddress.postalCode}
                    </p>
                  )}
                  {invoice.billingAddress.country && <p>{invoice.billingAddress.country}</p>}
                </div>
              </div>
            )}

            {/* Related Order Link */}
            {invoice.order && (
              <button
                onClick={() => navigate(`/admin/billing/orders/${invoice.order!.id}`)}
                className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors text-center"
              >
                View Order {invoice.order.orderNumber}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
