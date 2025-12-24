import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, MoreVertical, Send, Download, XCircle, CheckCircle } from 'lucide-react';
import { Invoice, billingApi } from '../../../api-client/billing.api-client';
import { InvoiceStatusBadge } from './BillingStatusBadge';
import { InvoiceStatus } from '../billing.types';

interface InvoiceTableProps {
  invoices: Invoice[];
  loading?: boolean;
  onViewInvoice?: (invoice: Invoice) => void;
  onSendInvoice?: (invoice: Invoice) => void;
  onMarkPaid?: (invoice: Invoice) => void;
  onCancelInvoice?: (invoice: Invoice) => void;
  compact?: boolean;
}

export function InvoiceTable({
  invoices,
  loading = false,
  onViewInvoice,
  onSendInvoice,
  onMarkPaid,
  onCancelInvoice,
  compact = false,
}: InvoiceTableProps) {
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: string, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(parseFloat(amount));
  };

  const handleViewInvoice = (invoice: Invoice) => {
    if (onViewInvoice) {
      onViewInvoice(invoice);
    } else {
      navigate(`/admin/billing/invoices/${invoice.id}`);
    }
  };

  const handleDownloadPdf = (invoice: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    billingApi.viewInvoicePdf(invoice.id);
    setOpenMenuId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <p>No invoices found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-700/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Invoice
            </th>
            {!compact && (
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Customer
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
              Total
            </th>
            {!compact && (
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Due Date
              </th>
            )}
            <th className="relative px-4 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              className="hover:bg-slate-700/30 cursor-pointer transition-colors"
              onClick={() => handleViewInvoice(invoice)}
            >
              <td className="whitespace-nowrap px-4 py-3">
                <div className="text-sm font-medium text-white">
                  {invoice.invoiceNumber}
                </div>
                {!compact && invoice.order && (
                  <div className="text-xs text-gray-500">
                    Order: {invoice.order.orderNumber}
                  </div>
                )}
              </td>
              {!compact && (
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="text-sm text-gray-300">
                    {invoice.user
                      ? `${invoice.user.first_name || ''} ${invoice.user.last_name || ''}`.trim() ||
                        invoice.user.email
                      : 'Guest'}
                  </div>
                  {invoice.user && (
                    <div className="text-xs text-gray-500">{invoice.user.email}</div>
                  )}
                </td>
              )}
              <td className="whitespace-nowrap px-4 py-3">
                <InvoiceStatusBadge status={invoice.status} size="sm" />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <span className="text-sm font-medium text-white">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </td>
              {!compact && (
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`text-sm ${
                      invoice.status === InvoiceStatus.OVERDUE
                        ? 'font-medium text-red-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {formatDate(invoice.dueDate)}
                  </span>
                </td>
              )}
              <td className="relative whitespace-nowrap px-4 py-3 text-right text-sm font-medium">
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === invoice.id ? null : invoice.id);
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-slate-600 hover:text-white"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  {openMenuId === invoice.id && (
                    <div className="absolute right-0 z-10 mt-2 w-48 rounded-md bg-slate-700 py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewInvoice(invoice);
                          setOpenMenuId(null);
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-200 hover:bg-slate-600"
                      >
                        <Eye className="mr-3 h-4 w-4" />
                        View Details
                      </button>
                      <button
                        onClick={(e) => handleDownloadPdf(invoice, e)}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-200 hover:bg-slate-600"
                      >
                        <Download className="mr-3 h-4 w-4" />
                        View PDF
                      </button>
                      {onSendInvoice && invoice.status === InvoiceStatus.DRAFT && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSendInvoice(invoice);
                            setOpenMenuId(null);
                          }}
                          className="flex w-full items-center px-4 py-2 text-sm text-gray-200 hover:bg-slate-600"
                        >
                          <Send className="mr-3 h-4 w-4" />
                          Send Invoice
                        </button>
                      )}
                      {onMarkPaid &&
                        (invoice.status === InvoiceStatus.SENT ||
                          invoice.status === InvoiceStatus.OVERDUE) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkPaid(invoice);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center px-4 py-2 text-sm text-green-400 hover:bg-slate-600"
                          >
                            <CheckCircle className="mr-3 h-4 w-4" />
                            Mark as Paid
                          </button>
                        )}
                      {onCancelInvoice &&
                        invoice.status !== InvoiceStatus.PAID &&
                        invoice.status !== InvoiceStatus.CANCELLED && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCancelInvoice(invoice);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center px-4 py-2 text-sm text-red-400 hover:bg-slate-600"
                          >
                            <XCircle className="mr-3 h-4 w-4" />
                            Cancel Invoice
                          </button>
                        )}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
