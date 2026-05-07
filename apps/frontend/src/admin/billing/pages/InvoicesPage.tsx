import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Download, Plus, CheckCircle, XCircle, Send, Bell } from 'lucide-react';
import { billingApi, invoicesApi, Invoice, InvoiceListParams } from '../../../api-client/billing.api-client';
import { InvoiceTable } from '../components/InvoiceTable';
import { InvoiceStatus } from '../billing.types';
import { Pagination } from '@/shared/components';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [searchParams, _setSearchParams] = useSearchParams();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');

  // Bulk-selection state. Cleared whenever the visible page changes so the
  // admin doesn't accidentally act on rows they can't see.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState<null | string>(null);

  const toggleSelect = (id: string, sel: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (sel) next.add(id); else next.delete(id);
      return next;
    });
  };

  // Generate years for filter (last 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Months for filter
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const fetchInvoices = async (params: InvoiceListParams = {}) => {
    try {
      setLoading(true);

      // Calculate date range based on year/month filters
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (yearFilter) {
        const year = parseInt(yearFilter);
        if (monthFilter) {
          const month = parseInt(monthFilter);
          startDate = new Date(year, month - 1, 1).toISOString();
          endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
        } else {
          startDate = new Date(year, 0, 1).toISOString();
          endDate = new Date(year, 11, 31, 23, 59, 59).toISOString();
        }
      } else if (monthFilter) {
        // Month only - use current year
        const month = parseInt(monthFilter);
        startDate = new Date(currentYear, month - 1, 1).toISOString();
        endDate = new Date(currentYear, month, 0, 23, 59, 59).toISOString();
      }

      const response = await billingApi.getInvoices({
        page: params.page || pagination.page,
        limit: params.limit || pagination.limit,
        search: search || undefined,
        status: statusFilter || undefined,
        startDate,
        endDate,
        ...params,
      });
      setInvoices(response.data);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices({ page: 1 });
  }, [statusFilter, yearFilter, monthFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices({ page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    setSelectedIds(new Set());
    fetchInvoices({ page: newPage });
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    setSelectedIds(new Set());
    setPagination(prev => ({ ...prev, limit: newLimit }));
    fetchInvoices({ page: 1, limit: newLimit });
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    if (!confirm(`Send invoice ${invoice.invoiceNumber} to ${invoice.user?.email || 'customer'}?`)) {
      return;
    }
    try {
      await billingApi.sendInvoice(invoice.id);
      fetchInvoices();
    } catch (err) {
      console.error('Error sending invoice:', err);
      alert('Failed to send invoice');
    }
  };

  const handleResendInvoice = async (invoice: Invoice) => {
    if (!confirm(`Resend invoice ${invoice.invoiceNumber} to ${invoice.user?.email || 'customer'}?`)) {
      return;
    }
    try {
      await invoicesApi.resend(invoice.id);
      fetchInvoices();
    } catch (err) {
      console.error('Error resending invoice:', err);
      alert('Failed to resend invoice');
    }
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    if (!confirm(`Mark invoice ${invoice.invoiceNumber} as paid?`)) {
      return;
    }
    try {
      await invoicesApi.markAsPaid(invoice.id);
      fetchInvoices();
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      alert('Failed to mark invoice as paid');
    }
  };

  const handleCancelInvoice = async (invoice: Invoice) => {
    const reason = prompt(`Reason for cancelling invoice ${invoice.invoiceNumber}:`);
    if (reason === null) return;
    try {
      await invoicesApi.cancel(invoice.id, reason);
      fetchInvoices();
    } catch (err) {
      console.error('Error cancelling invoice:', err);
      alert('Failed to cancel invoice');
    }
  };

  const summarize = (results: Array<{ id: string; ok: boolean; error?: string }>) => {
    const ok = results.filter(r => r.ok).length;
    const failed = results.length - ok;
    const errors = results.filter(r => !r.ok && r.error).slice(0, 3).map(r => r.error).join('; ');
    return failed > 0
      ? `${ok} succeeded, ${failed} failed${errors ? ` — ${errors}` : ''}`
      : `${ok} succeeded`;
  };

  const handleBulkMarkPaid = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Mark ${ids.length} invoice(s) as paid?`)) return;
    setBulkRunning('mark-paid');
    try {
      const result = await invoicesApi.bulkMarkPaid(ids);
      alert(summarize(result));
      setSelectedIds(new Set());
      fetchInvoices();
    } finally {
      setBulkRunning(null);
    }
  };

  const handleBulkCancel = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const reason = prompt(`Reason for cancelling ${ids.length} invoice(s):`);
    if (reason === null) return;
    setBulkRunning('cancel');
    try {
      const result = await invoicesApi.bulkCancel(ids, reason);
      alert(summarize(result));
      setSelectedIds(new Set());
      fetchInvoices();
    } finally {
      setBulkRunning(null);
    }
  };

  const handleBulkResend = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Resend ${ids.length} invoice email(s)?`)) return;
    setBulkRunning('resend');
    try {
      const result = await invoicesApi.bulkResend(ids);
      alert(summarize(result));
    } finally {
      setBulkRunning(null);
    }
  };

  const handleBulkSendReminders = async () => {
    if (!confirm('Trigger the reminder job now? This will send reminder emails to invoices that are due-soon or past-due (de-duplicated).')) return;
    setBulkRunning('reminders');
    try {
      const r = await invoicesApi.sendReminders();
      alert(`Reminder job complete — sent ${r.sent}, skipped ${r.skipped}.`);
    } finally {
      setBulkRunning(null);
    }
  };

  const handleExport = () => {
    if (invoices.length === 0) {
      alert('No invoices to export');
      return;
    }

    // Build CSV content
    const headers = [
      'Invoice Number',
      'Created Date',
      'Due Date',
      'Paid Date',
      'Customer Name',
      'Customer Email',
      'MECA ID',
      'Status',
      'Items',
      'Subtotal',
      'Tax',
      'Discount',
      'Total',
      'Currency',
    ];

    const rows = invoices.map(invoice => {
      const userName = invoice.user
        ? `${invoice.user.first_name || ''} ${invoice.user.last_name || ''}`.trim()
        : invoice.billingAddress?.name || 'Guest';

      return [
        invoice.invoiceNumber,
        invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : '',
        invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '',
        invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : '',
        userName,
        invoice.user?.email || '',
        invoice.user?.meca_id || '',
        invoice.status,
        invoice.items.map(i => i.description).join('; '),
        invoice.subtotal,
        invoice.tax,
        invoice.discount,
        invoice.total,
        invoice.currency,
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-800">
        <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Invoices</h1>
              <p className="text-sm text-gray-400">
                Manage and track all invoices
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin/billing/invoices/new')}
                className="flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                <Plus className="h-4 w-4" />
                Create Invoice
              </button>
              <button
                onClick={handleExport}
                disabled={loading || invoices.length === 0}
                className="flex items-center gap-2 rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={handleBulkSendReminders}
                disabled={bulkRunning !== null}
                className="flex items-center gap-2 rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-slate-600 disabled:opacity-50"
                title="Send due-soon and overdue reminder emails now"
              >
                <Bell className="h-4 w-4" />
                Run Reminders
              </button>
              <button
                onClick={() => navigate('/admin/billing')}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Billing
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Search */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoice #, customer, MECA ID, item, amount, due date, Stripe ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-[480px] rounded-md border border-slate-600 bg-slate-700 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              Search
            </button>
          </form>
        </div>

        {/* Filter Panel */}
        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
                className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 py-2 pl-3 pr-10 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">All Statuses</option>
                {Object.values(InvoiceStatus).map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Year
              </label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 py-2 pl-3 pr-10 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Month
              </label>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 py-2 pl-3 pr-10 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">All Months</option>
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('');
                  setYearFilter('');
                  setMonthFilter('');
                  setSearch('');
                  fetchInvoices({ page: 1 });
                }}
                className="text-sm text-orange-500 hover:text-orange-400"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-md bg-red-900/50 p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Bulk action bar — only visible when rows are selected */}
        {selectedIds.size > 0 && (
          <div className="mb-3 flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <span className="text-sm text-orange-300 font-medium">
              {selectedIds.size} selected
            </span>
            <div className="flex-1" />
            <button
              onClick={handleBulkMarkPaid}
              disabled={bulkRunning !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/15 hover:bg-green-500/25 text-green-400 text-xs font-medium rounded-md border border-green-500/30 disabled:opacity-50"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Mark Paid
            </button>
            <button
              onClick={handleBulkResend}
              disabled={bulkRunning !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-md disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              Resend
            </button>
            <button
              onClick={handleBulkCancel}
              disabled={bulkRunning !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-md border border-red-500/30 disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-gray-400 hover:text-white text-xs"
            >
              Clear
            </button>
          </div>
        )}

        {/* Invoices Table */}
        <InvoiceTable
          invoices={invoices}
          loading={loading}
          onSendInvoice={handleSendInvoice}
          onResendInvoice={handleResendInvoice}
          onMarkPaid={handleMarkPaid}
          onCancelInvoice={handleCancelInvoice}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />

        {/* Pagination */}
        {!loading && (
          <div className="mt-6 rounded-xl overflow-hidden">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              itemsPerPage={pagination.limit}
              totalItems={pagination.totalItems}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
