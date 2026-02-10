import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  Search,
  Filter,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Ban,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { usePermissions } from '@/auth';
import { eventsApi, Event } from '@/events/events.api-client';
import {
  eventRegistrationsApi,
  EventRegistration,
  AdminListResponse,
} from '@/event-registrations';

export default function EventRegistrationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission, loading: permLoading } = usePermissions();

  // Data state
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [eventFilter, setEventFilter] = useState(searchParams.get('eventId') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get('paymentStatus') || 'all');
  const [checkInFilter, setCheckInFilter] = useState(searchParams.get('checkedIn') || 'all');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [limit] = useState(20);

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!permLoading) {
      fetchRegistrations();
    }
  }, [permLoading, eventFilter, statusFilter, paymentFilter, checkInFilter, page, searchTerm]);

  const fetchEvents = async () => {
    try {
      const data = await eventsApi.getAll(1, 100);
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchRegistrations = async () => {
    try {
      setLoading(true);

      const filters: {
        eventId?: string;
        status?: string;
        paymentStatus?: string;
        checkedIn?: boolean;
        search?: string;
        page: number;
        limit: number;
      } = {
        page,
        limit,
      };

      if (eventFilter !== 'all') filters.eventId = eventFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (paymentFilter !== 'all') filters.paymentStatus = paymentFilter;
      if (checkInFilter !== 'all') filters.checkedIn = checkInFilter === 'checked_in';
      if (searchTerm) filters.search = searchTerm;

      const result: AdminListResponse = await eventRegistrationsApi.adminList(filters);
      setRegistrations(result.registrations);
      setTotal(result.total);
      setTotalPages(result.totalPages);

      // Update URL params
      const newParams = new URLSearchParams();
      if (eventFilter !== 'all') newParams.set('eventId', eventFilter);
      if (statusFilter !== 'all') newParams.set('status', statusFilter);
      if (paymentFilter !== 'all') newParams.set('paymentStatus', paymentFilter);
      if (checkInFilter !== 'all') newParams.set('checkedIn', checkInFilter);
      if (searchTerm) newParams.set('search', searchTerm);
      if (page > 1) newParams.set('page', String(page));
      setSearchParams(newParams);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRegistrations();
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this registration?')) return;

    setActionLoading(id);
    try {
      await eventRegistrationsApi.adminCancel(id);
      await fetchRegistrations();
    } catch (error) {
      console.error('Error canceling registration:', error);
      alert('Failed to cancel registration');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefund = async (id: string) => {
    if (!confirm('Are you sure you want to refund this registration? This will process a refund via Stripe.')) return;

    setActionLoading(id);
    try {
      await eventRegistrationsApi.adminRefund(id);
      await fetchRegistrations();
    } catch (error) {
      console.error('Error refunding registration:', error);
      alert('Failed to process refund');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Paid
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case 'refunded':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Refunded
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (permLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-400">Loading registrations...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission('manage_events')) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <ClipboardList className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">You don't have permission to view event registrations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2">Event Registrations</h1>
            <p className="text-gray-400">
              Manage competitor registrations for all events
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Dashboard
          </button>
        </div>

        {/* Filters and Search */}
        <div className="bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, email, or check-in code..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Event Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event
                </label>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <select
                    value={eventFilter}
                    onChange={(e) => {
                      setEventFilter(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent appearance-none"
                  >
                    <option value="all">All Events</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Payment Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment
                </label>
                <select
                  value={paymentFilter}
                  onChange={(e) => {
                    setPaymentFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All Payments</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            {/* Check-In Filter */}
            <div className="mt-4 flex items-center gap-4">
              <span className="text-sm font-medium text-gray-300">Check-In:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCheckInFilter('all');
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    checkInFilter === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCheckInFilter('checked_in');
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    checkInFilter === 'checked_in'
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  Checked In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCheckInFilter('not_checked_in');
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    checkInFilter === 'not_checked_in'
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  Not Checked In
                </button>
              </div>
              <button
                type="submit"
                className="ml-auto px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                Search
              </button>
            </div>
          </form>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-400">
          Showing {registrations.length} of {total} registrations
        </div>

        {/* Registrations Table */}
        <div className="bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Competitor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Classes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Payment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Check-In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-slate-800 divide-y divide-slate-700">
                {registrations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      No registrations found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  registrations.map((reg) => (
                    <tr
                      key={reg.id}
                      className="hover:bg-slate-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-white">
                            {reg.firstName} {reg.lastName}
                          </div>
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {reg.email}
                          </div>
                          {reg.phone && (
                            <div className="text-sm text-gray-400 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {reg.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">
                          {reg.event?.title || 'Unknown Event'}
                        </div>
                        {reg.event?.event_date && (
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(reg.event.event_date).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {reg.classes && reg.classes.length > 0 ? (
                          <div className="text-sm text-white">
                            {reg.classes.length} {reg.classes.length === 1 ? 'class' : 'classes'}
                            <div className="text-xs text-gray-400 mt-1">
                              {reg.classes.slice(0, 2).map((c, i) => (
                                <span key={i}>
                                  {i > 0 && ', '}
                                  <span className="text-orange-400">{c.format}</span> {c.className}
                                </span>
                              ))}
                              {reg.classes.length > 2 && (
                                <span> +{reg.classes.length - 2} more</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(reg.registrationStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          {getPaymentBadge(reg.paymentStatus)}
                          {reg.amountPaid && (
                            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${reg.amountPaid.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {reg.checkedIn ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Checked In
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Not Yet
                          </span>
                        )}
                        {reg.checkedIn && reg.checkedInAt && (
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(reg.checkedInAt).toLocaleTimeString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {reg.registeredAt
                          ? new Date(reg.registeredAt).toLocaleDateString()
                          : new Date(reg.created_at || '').toLocaleDateString()
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/admin/event-registrations/${reg.id}`)}
                            className="text-orange-500 hover:text-orange-400"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {reg.registrationStatus !== 'cancelled' && (
                            <button
                              onClick={() => handleCancel(reg.id)}
                              disabled={actionLoading === reg.id}
                              className="text-red-500 hover:text-red-400 disabled:opacity-50"
                              title="Cancel Registration"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                          {reg.paymentStatus === 'paid' && reg.registrationStatus !== 'cancelled' && (
                            <button
                              onClick={() => handleRefund(reg.id)}
                              disabled={actionLoading === reg.id}
                              className="text-blue-500 hover:text-blue-400 disabled:opacity-50"
                              title="Process Refund"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-slate-700 px-6 py-4 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
