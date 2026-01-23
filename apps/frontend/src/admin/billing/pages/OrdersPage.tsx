import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Download } from 'lucide-react';
import { billingApi, Order, OrderListParams } from '../../../api-client/billing.api-client';
import { OrderTable } from '../components/OrderTable';
import { OrderStatus, OrderType } from '../billing.types';
import { seasonsApi, Season } from '@/seasons';
import { Pagination } from '@/shared/components';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams, _setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
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
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<OrderType | ''>('');
  const [yearFilter, setYearFilter] = useState<string>('');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [seasonFilter, setSeasonFilter] = useState<string>('');
  const [seasons, setSeasons] = useState<Season[]>([]);

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

  // Fetch seasons
  useEffect(() => {
    const fetchSeasons = async () => {
      try {
        const data = await seasonsApi.getAll();
        setSeasons(data);
      } catch (err) {
        console.error('Error fetching seasons:', err);
      }
    };
    fetchSeasons();
  }, []);

  const fetchOrders = async (params: OrderListParams = {}) => {
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

      const response = await billingApi.getOrders({
        page: params.page || pagination.page,
        limit: params.limit || pagination.limit,
        search: search || undefined,
        status: statusFilter || undefined,
        orderType: typeFilter || undefined,
        startDate,
        endDate,
        ...params,
      });
      setOrders(response.data);
      setPagination(response.pagination);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders({ page: 1 });
  }, [statusFilter, typeFilter, yearFilter, monthFilter, seasonFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders({ page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    fetchOrders({ page: newPage });
  };

  const handleItemsPerPageChange = (newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit }));
    fetchOrders({ page: 1, limit: newLimit });
  };

  const handleCancelOrder = async (order: Order) => {
    if (!confirm(`Are you sure you want to cancel order ${order.orderNumber}?`)) {
      return;
    }
    try {
      await billingApi.getOrder(order.id); // TODO: Call cancel endpoint
      fetchOrders();
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert('Failed to cancel order');
    }
  };

  const handleExport = () => {
    if (orders.length === 0) {
      alert('No orders to export');
      return;
    }

    // Build CSV content
    const headers = [
      'Order Number',
      'Date',
      'Customer Name',
      'Customer Email',
      'MECA ID',
      'Order Type',
      'Status',
      'Items',
      'Subtotal',
      'Tax',
      'Discount',
      'Total',
      'Currency',
    ];

    const rows = orders.map(order => {
      const userName = order.user
        ? `${order.user.first_name || ''} ${order.user.last_name || ''}`.trim()
        : order.billingAddress?.name || 'Guest';

      return [
        order.orderNumber,
        order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '',
        userName,
        order.user?.email || '',
        order.user?.meca_id || '',
        order.orderType,
        order.status,
        order.items.map(i => i.description).join('; '),
        order.subtotal,
        order.tax,
        order.discount,
        order.total,
        order.currency,
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
    link.setAttribute('download', `orders-export-${new Date().toISOString().split('T')[0]}.csv`);
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
              <h1 className="text-2xl font-bold text-white">Orders</h1>
              <p className="text-sm text-gray-400">
                Manage and track all orders
              </p>
            </div>
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

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search and Export */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by order number..."
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
            disabled={loading || orders.length === 0}
            className="flex items-center gap-2 rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>

        {/* Filter Panel */}
        <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
                className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 py-2 pl-3 pr-10 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">All Statuses</option>
                {Object.values(OrderStatus).map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Order Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as OrderType | '')}
                className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 py-2 pl-3 pr-10 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">All Types</option>
                {Object.values(OrderType).map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                Season
              </label>
              <select
                value={seasonFilter}
                onChange={(e) => setSeasonFilter(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-600 bg-slate-700 py-2 pl-3 pr-10 text-sm text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">All Seasons</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
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
                  setTypeFilter('');
                  setYearFilter('');
                  setMonthFilter('');
                  setSeasonFilter('');
                  setSearch('');
                  fetchOrders({ page: 1 });
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

        {/* Orders Table */}
        <OrderTable
          orders={orders}
          loading={loading}
          onCancelOrder={handleCancelOrder}
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
