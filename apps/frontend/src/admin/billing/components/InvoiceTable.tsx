import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, MoreVertical, Send, Download, XCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Invoice, billingApi } from '../../../api-client/billing.api-client';
import { InvoiceStatusBadge } from './BillingStatusBadge';
import { InvoiceStatus } from '../billing.types';

interface InvoiceTableProps {
  invoices: Invoice[];
  loading?: boolean;
  onViewInvoice?: (invoice: Invoice) => void;
  onSendInvoice?: (invoice: Invoice) => void;
  onResendInvoice?: (invoice: Invoice) => void;
  onMarkPaid?: (invoice: Invoice) => void;
  onCancelInvoice?: (invoice: Invoice) => void;
  compact?: boolean;
  // Optional bulk-selection support: when both props are provided the table
  // renders a leading checkbox column and notifies the parent on toggle.
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, selected: boolean) => void;
}

export function InvoiceTable({
  invoices,
  loading = false,
  onViewInvoice,
  onSendInvoice,
  onResendInvoice,
  onMarkPaid,
  onCancelInvoice,
  compact = false,
  selectedIds,
  onToggleSelect,
}: InvoiceTableProps) {
  const selectionEnabled = !!selectedIds && !!onToggleSelect;
  const allSelected = selectionEnabled && invoices.length > 0 && invoices.every(i => selectedIds!.has(i.id));
  const someSelected = selectionEnabled && invoices.some(i => selectedIds!.has(i.id));
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
    billingApi.viewInvoicePdf(invoice.id).catch(() => {
      alert('Failed to load invoice PDF');
    });
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
    <div className="overflow-visible rounded-lg border border-slate-700">
      <table className="w-full table-fixed divide-y divide-slate-700">
        <colgroup>
          {selectionEnabled && <col className="w-[3%]" />}
          <col className="w-[14%]" />
          {!compact && <col className="w-[20%]" />}
          {!compact && <col className="w-[22%]" />}
          <col className="w-[12%]" />
          <col className="w-[8%]" />
          <col className="w-[8%]" />
          {!compact && <col className="w-[10%]" />}
          <col className="w-[6%]" />
        </colgroup>
        <thead className="bg-slate-700/50">
          <tr>
            {selectionEnabled && (
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                  onChange={(e) => {
                    const next = e.target.checked;
                    invoices.forEach(i => onToggleSelect!(i.id, next));
                  }}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-orange-500 focus:ring-orange-500"
                />
              </th>
            )}
            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Invoice
            </th>
            {!compact && (
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Customer
              </th>
            )}
            {!compact && (
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Items
              </th>
            )}
            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Subscription
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
              Status
            </th>
            <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
              Total
            </th>
            {!compact && (
              <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Due Date
              </th>
            )}
            <th className="relative px-3 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {invoices.map((invoice) => (
            <tr
              key={invoice.id}
              className={`hover:bg-slate-700/30 cursor-pointer transition-colors ${selectionEnabled && selectedIds!.has(invoice.id) ? 'bg-orange-500/5' : ''}`}
              onClick={() => handleViewInvoice(invoice)}
            >
              {selectionEnabled && (
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds!.has(invoice.id)}
                    onChange={(e) => onToggleSelect!(invoice.id, e.target.checked)}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-orange-500 focus:ring-orange-500"
                  />
                </td>
              )}
              <td className="px-3 py-3">
                <div className="truncate text-sm font-medium text-white" title={invoice.invoiceNumber}>
                  {invoice.invoiceNumber}
                </div>
                {!compact && invoice.order && (
                  <div className="truncate text-xs text-gray-500">
                    Order: {invoice.order.orderNumber}
                  </div>
                )}
              </td>
              {!compact && (
                <td className="px-3 py-3">
                  <div
                    className="truncate text-sm text-gray-300"
                    title={
                      invoice.user
                        ? `${invoice.user.first_name || ''} ${invoice.user.last_name || ''}`.trim() ||
                          invoice.user.email
                        : 'Guest'
                    }
                  >
                    {invoice.user
                      ? `${invoice.user.first_name || ''} ${invoice.user.last_name || ''}`.trim() ||
                        invoice.user.email
                      : 'Guest'}
                  </div>
                  {invoice.user && (
                    <div className="truncate text-xs text-gray-500" title={invoice.user.email}>
                      {invoice.user.email}
                      {invoice.user.meca_id && (
                        <span className="ml-2 text-orange-400">#{invoice.user.meca_id}</span>
                      )}
                    </div>
                  )}
                </td>
              )}
              {!compact && (
                <td className="px-3 py-3">
                  {invoice.items.length > 0 ? (
                    <div>
                      <div
                        className="truncate text-sm text-gray-300"
                        title={invoice.items[0].description}
                      >
                        {invoice.items[0].description}
                      </div>
                      {invoice.items.length > 1 && (
                        <div className="text-xs text-gray-500">
                          +{invoice.items.length - 1} more item{invoice.items.length > 2 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
                  )}
                </td>
              )}
              <td className="px-3 py-3">
                {invoice.metadata?.subscription_id ? (
                  <div
                    className="truncate font-mono text-xs text-blue-400"
                    title={String(invoice.metadata.subscription_id)}
                  >
                    {String(invoice.metadata.subscription_id)}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">-</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                <InvoiceStatusBadge status={invoice.status} size="sm" />
              </td>
              <td className="whitespace-nowrap px-3 py-3 text-right">
                <span className="text-sm font-medium text-white">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </td>
              {!compact && (
                <td className="whitespace-nowrap px-3 py-3">
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
              <td className="relative whitespace-nowrap px-3 py-3 text-right text-sm font-medium">
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
                      {onResendInvoice &&
                        (invoice.status === InvoiceStatus.SENT ||
                          invoice.status === InvoiceStatus.OVERDUE) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onResendInvoice(invoice);
                              setOpenMenuId(null);
                            }}
                            className="flex w-full items-center px-4 py-2 text-sm text-gray-200 hover:bg-slate-600"
                          >
                            <RefreshCw className="mr-3 h-4 w-4" />
                            Resend Invoice
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
