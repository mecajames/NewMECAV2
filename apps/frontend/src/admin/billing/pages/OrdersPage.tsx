import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { billingApi, Order, OrderListParams } from '../../../api-client/billing.api-client';
import { OrderTable } from '../components/OrderTable';
import { OrderStatus, OrderType } from '../billing.types';

export default function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams, _setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<OrderType | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchOrders = async (params: OrderListParams = {}) => {
    try {
      setLoading(true);
      const response = await billingApi.getOrders({
        page: params.page || pagination.page,
        limit: params.limit || pagination.limit,
        search: search || undefined,
        status: statusFilter || undefined,
        orderType: typeFilter || undefined,
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
  }, [statusFilter, typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders({ page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    fetchOrders({ page: newPage });
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
        {/* Search and Filters */}
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
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-slate-600"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                      {type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStatusFilter('');
                    setTypeFilter('');
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
        )}

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
        {!loading && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.totalItems)} of{' '}
              {pagination.totalItems} orders
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="rounded-md border border-slate-600 bg-slate-700 p-2 text-gray-300 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-gray-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="rounded-md border border-slate-600 bg-slate-700 p-2 text-gray-300 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
