import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Download, Plus } from 'lucide-react';
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
    fetchInvoices({ page: newPage });
  };

  const handleItemsPerPageChange = (newLimit: number) => {
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
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search and Export */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-md border border-slate-600 bg-slate-700 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              Search
            </button>
          </form>

          <button
            onClick={handleExport}
            disabled={loading || invoices.length === 0}
            className="flex items-center gap-2 rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
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

        {/* Invoices Table */}
        <InvoiceTable
          invoices={invoices}
          loading={loading}
          onSendInvoice={handleSendInvoice}
          onMarkPaid={handleMarkPaid}
          onCancelInvoice={handleCancelInvoice}
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
