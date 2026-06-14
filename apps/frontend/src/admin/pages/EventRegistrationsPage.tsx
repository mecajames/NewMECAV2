import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { scrollToTop } from '@/shared/utils/scrollToTop';
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
  Printer,
  Loader2,
  X,
  Trash2,
} from 'lucide-react';
import { usePermissions } from '@/auth';
import { eventsApi, Event } from '@/events/events.api-client';
import { seasonsApi, Season } from '@/seasons';
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
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [seasonFilter, setSeasonFilter] = useState(searchParams.get('seasonId') || '');
  const [eventFilter, setEventFilter] = useState(searchParams.get('eventId') || 'all');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get('paymentStatus') || 'all');
  const [checkInFilter, setCheckInFilter] = useState(searchParams.get('checkedIn') || 'all');
  // Default to Registrations (paid/real entries); admins toggle to Interests/All.
  const [registrationType, setRegistrationType] = useState(searchParams.get('registrationType') || 'registrations');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [limit] = useState(20);

  // Searchable event dropdown state
  const [eventSearchText, setEventSearchText] = useState('');
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const eventDropdownRef = useRef<HTMLDivElement>(null);

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [scoreSheetLoading, setScoreSheetLoading] = useState(false);
  // Cancel-a-paid-registration modal: offer refund-then-cancel.
  const [cancelTarget, setCancelTarget] = useState<EventRegistration | null>(null);
  const [cancelRefundFirst, setCancelRefundFirst] = useState(true);
  const [cancelProcessing, setCancelProcessing] = useState(false);

  const handleViewScoreSheets = async () => {
    if (eventFilter === 'all') return;
    setScoreSheetLoading(true);
    try {
      await eventRegistrationsApi.viewEventScoreSheets(eventFilter);
    } catch (error) {
      console.error('Error loading score sheets:', error);
      alert('Failed to load score sheets');
    } finally {
      setScoreSheetLoading(false);
    }
  };

  useEffect(() => {
    fetchSeasons();
    fetchEvents();
  }, []);

  // Re-fetch events when season changes
  useEffect(() => {
    fetchEvents();
    setEventFilter('all');
    setEventSearchText('');
  }, [seasonFilter]);

  useEffect(() => {
    if (!permLoading) {
      fetchRegistrations();
    }
  }, [permLoading, seasonFilter, eventFilter, statusFilter, paymentFilter, checkInFilter, registrationType, page, searchTerm]);

  // Close event dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(e.target as Node)) {
        setEventDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSeasons = async () => {
    try {
      const data = await seasonsApi.getAll();
      setSeasons(data);
      // Default to current season if no season selected from URL
      if (!searchParams.get('seasonId')) {
        const current = data.find((s: Season) => s.isCurrent || s.is_current);
        if (current) {
          setSeasonFilter(current.id);
        }
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const data = (seasonFilter && seasonFilter !== 'all')
        ? await eventsApi.getAllBySeason(seasonFilter)
        : await eventsApi.getAll(1, 200);
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchRegistrations = async () => {
    try {
      setLoading(true);

      const filters: any = { page, limit };

      if (seasonFilter && seasonFilter !== 'all') filters.seasonId = seasonFilter;
      if (eventFilter !== 'all') filters.eventId = eventFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (paymentFilter !== 'all') filters.paymentStatus = paymentFilter;
      if (checkInFilter !== 'all') filters.checkedIn = checkInFilter === 'checked_in';
      if (registrationType !== 'all') filters.registrationType = registrationType;
      if (searchTerm) filters.search = searchTerm;

      const result: AdminListResponse = await eventRegistrationsApi.adminList(filters);
      setRegistrations(result.registrations);
      setTotal(result.total);
      setTotalPages(result.totalPages);

      // Update URL params
      const newParams = new URLSearchParams();
      if (seasonFilter && seasonFilter !== 'all') newParams.set('seasonId', seasonFilter);
      if (eventFilter !== 'all') newParams.set('eventId', eventFilter);
      if (statusFilter !== 'all') newParams.set('status', statusFilter);
      if (paymentFilter !== 'all') newParams.set('paymentStatus', paymentFilter);
      if (checkInFilter !== 'all') newParams.set('checkedIn', checkInFilter);
      if (registrationType !== 'all') newParams.set('registrationType', registrationType);
      if (searchTerm) newParams.set('search', searchTerm);
      if (page > 1) newParams.set('page', String(page));
      setSearchParams(newParams);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
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

  // Delete an interest/registration outright (Interests "delete" action).
  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this entry? This cannot be undone.')) return;
    setActionLoading(id);
    try {
      await eventRegistrationsApi.adminDelete(id);
      await fetchRegistrations();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry');
    } finally {
      setActionLoading(null);
    }
  };

  // Confirm the cancel-a-paid-registration modal: optionally refund first
  // (which also cancels), otherwise just cancel.
  const confirmCancelPaid = async () => {
    if (!cancelTarget) return;
    setCancelProcessing(true);
    try {
      if (cancelRefundFirst && cancelTarget.paymentStatus === 'paid') {
        // processRefund refunds AND sets the registration to cancelled.
        await eventRegistrationsApi.adminRefund(cancelTarget.id);
      } else {
        await eventRegistrationsApi.adminCancel(cancelTarget.id);
      }
      setCancelTarget(null);
      await fetchRegistrations();
    } catch (error) {
      console.error('Error cancelling registration:', error);
      alert('Failed to cancel registration');
    } finally {
      setCancelProcessing(false);
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
          <div className="flex items-center gap-3">
            {eventFilter !== 'all' && (
              <button
                onClick={handleViewScoreSheets}
                disabled={scoreSheetLoading}
                className="flex items-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {scoreSheetLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Printer className="h-5 w-5" />
                )}
                Score Sheets
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-2 px-4 sm:px-6 py-2 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-slate-800 rounded-lg shadow-sm p-6 mb-6">
          <div>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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

              {/* Season Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Season
                </label>
                <select
                  value={seasonFilter}
                  onChange={(e) => {
                    setSeasonFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">All Seasons</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.year}{s.isCurrent || s.is_current ? ' (Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event Filter - Searchable Dropdown */}
              <div ref={eventDropdownRef} className="relative">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event
                </label>
                <div
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg cursor-pointer flex items-center justify-between"
                  onClick={() => setEventDropdownOpen(!eventDropdownOpen)}
                >
                  <span className="truncate text-sm">
                    {eventFilter === 'all'
                      ? 'All Events'
                      : events.find(e => e.id === eventFilter)?.title || 'Select...'}
                  </span>
                  {eventFilter !== 'all' ? (
                    <X
                      className="h-4 w-4 text-gray-400 hover:text-white flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); setEventFilter('all'); setEventSearchText(''); setPage(1); }}
                    />
                  ) : (
                    <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                </div>
                {eventDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-slate-700 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-hidden">
                    <div className="p-2 border-b border-slate-600">
                      <input
                        type="text"
                        value={eventSearchText}
                        onChange={(e) => setEventSearchText(e.target.value)}
                        placeholder="Type to search events..."
                        className="w-full px-3 py-1.5 text-sm bg-slate-600 text-white placeholder-gray-400 rounded border border-slate-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="overflow-y-auto max-h-48">
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-600 ${eventFilter === 'all' ? 'text-orange-400 bg-slate-600/50' : 'text-white'}`}
                        onClick={() => { setEventFilter('all'); setEventDropdownOpen(false); setEventSearchText(''); setPage(1); }}
                      >
                        All Events
                      </button>
                      {events
                        .filter(e => !eventSearchText || e.title.toLowerCase().includes(eventSearchText.toLowerCase()))
                        .map((event) => (
                          <button
                            type="button"
                            key={event.id}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-600 ${eventFilter === event.id ? 'text-orange-400 bg-slate-600/50' : 'text-white'}`}
                            onClick={() => { setEventFilter(event.id); setEventDropdownOpen(false); setEventSearchText(''); setPage(1); }}
                          >
                            {event.title}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
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
              <span className="text-sm font-medium text-gray-300 ml-6">Type:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setRegistrationType('all'); setPage(1); }}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    registrationType === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => { setRegistrationType('registrations'); setPage(1); }}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    registrationType === 'registrations'
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  Registrations
                </button>
                <button
                  type="button"
                  onClick={() => { setRegistrationType('interests'); setPage(1); }}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    registrationType === 'interests'
                      ? 'bg-orange-500 text-white'
                      : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  Interests
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-400">
          Showing {registrations.length} of {total} {registrationType === 'interests' ? 'interests' : registrationType === 'registrations' ? 'registrations' : 'records'}
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
                  {registrationType !== 'interests' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Payment
                    </th>
                  )}
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
                    <td colSpan={registrationType !== 'interests' ? 8 : 7} className="px-6 py-12 text-center text-gray-400">
                      No {registrationType === 'interests' ? 'interests' : 'registrations'} found matching your criteria.
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
                          {(reg.firstName || reg.lastName) && (
                            <div className="text-sm font-medium text-white">
                              {reg.userId ? (
                                <button
                                  onClick={() => navigate(`/admin/members/${reg.userId}`)}
                                  className="text-orange-400 hover:text-orange-300 hover:underline"
                                  title="View member profile"
                                >
                                  {reg.firstName} {reg.lastName}
                                </button>
                              ) : (
                                <>{reg.firstName} {reg.lastName}</>
                              )}
                            </div>
                          )}
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {reg.userId ? (
                              <button
                                onClick={() => navigate(`/admin/members/${reg.userId}`)}
                                className="hover:text-orange-300 hover:underline"
                                title="View member profile"
                              >
                                {reg.email}
                              </button>
                            ) : (
                              reg.email
                            )}
                          </div>
                          {reg.phone && (
                            <div className="text-sm text-gray-400 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {reg.phone}
                            </div>
                          )}
                          {reg.userId && (
                            <div className="text-xs text-green-400 mt-0.5">Member{reg.mecaId ? ` · #${reg.mecaId}` : ''}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">
                          {reg.event?.title || 'Unknown Event'}
                        </div>
                        {(reg.event?.eventDate || reg.event?.event_date) && (
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(reg.event.eventDate || reg.event.event_date).toLocaleDateString()}
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
                      {registrationType !== 'interests' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {reg.registrationType === 'interest' ? (
                            <span className="text-gray-500 text-sm">—</span>
                          ) : (
                            <div>
                              {/* Paid/refunded links to the order + invoice + payment in billing */}
                              {(reg.paymentStatus === 'paid' || reg.paymentStatus === 'refunded') && reg.orderId ? (
                                <button
                                  onClick={() => navigate(`/admin/billing/orders/${reg.orderId}`)}
                                  title="View order, invoice & payment"
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 hover:underline"
                                >
                                  {reg.paymentStatus === 'refunded' ? 'Refunded' : 'Paid'}
                                </button>
                              ) : (
                                getPaymentBadge(reg.paymentStatus)
                              )}
                              {reg.paymentMethod && (
                                <div className="text-xs text-gray-400 mt-1 capitalize">
                                  via {reg.paymentMethod === 'paypal' ? 'PayPal' : 'Stripe'}
                                </div>
                              )}
                              {reg.amountPaid != null && reg.amountPaid > 0 && (
                                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${reg.amountPaid.toFixed(2)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )}
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
                        {(() => {
                          const raw = reg.registeredAt || reg.createdAt || reg.created_at;
                          const d = raw ? new Date(raw) : null;
                          return d && !isNaN(d.getTime()) ? d.toLocaleDateString() : '—';
                        })()}
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

                          {reg.registrationType === 'interest' ? (
                            <>
                              {/* Interests: cancel + delete */}
                              {reg.registrationStatus !== 'cancelled' && (
                                <button
                                  onClick={() => handleCancel(reg.id)}
                                  disabled={actionLoading === reg.id}
                                  className="text-red-500 hover:text-red-400 disabled:opacity-50"
                                  title="Cancel Interest"
                                >
                                  <Ban className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(reg.id)}
                                disabled={actionLoading === reg.id}
                                className="text-red-600 hover:text-red-500 disabled:opacity-50"
                                title="Delete Interest"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : reg.registrationStatus !== 'cancelled' ? (
                            <>
                              {/* Paid registrations: refund + cancel (cancel offers refund-first) */}
                              {reg.paymentStatus === 'paid' && (
                                <button
                                  onClick={() => handleRefund(reg.id)}
                                  disabled={actionLoading === reg.id}
                                  className="text-blue-500 hover:text-blue-400 disabled:opacity-50"
                                  title="Process Refund"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (reg.paymentStatus === 'paid') {
                                    setCancelRefundFirst(true);
                                    setCancelTarget(reg);
                                  } else {
                                    handleCancel(reg.id);
                                  }
                                }}
                                disabled={actionLoading === reg.id}
                                className="text-red-500 hover:text-red-400 disabled:opacity-50"
                                title="Cancel Registration"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            </>
                          ) : null}
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
                  onClick={() => { setPage((p) => Math.max(1, p - 1)); scrollToTop(); }}
                  disabled={page === 1}
                  className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); scrollToTop(); }}
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

      {/* Cancel a PAID registration — offer to refund first, then cancel */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h2 className="text-lg font-bold text-white">Cancel Registration</h2>
              <button onClick={() => setCancelTarget(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-gray-300 text-sm">
                Cancel the registration for{' '}
                <span className="font-semibold text-white">
                  {cancelTarget.firstName} {cancelTarget.lastName}
                </span>
                {cancelTarget.event?.title ? <> in <span className="font-semibold text-white">{cancelTarget.event.title}</span></> : null}?
              </p>
              <p className="text-sm text-gray-400">
                This registration was paid
                {cancelTarget.amountPaid != null && cancelTarget.amountPaid > 0 ? ` ($${cancelTarget.amountPaid.toFixed(2)})` : ''}
                {cancelTarget.paymentMethod ? ` via ${cancelTarget.paymentMethod === 'paypal' ? 'PayPal' : 'Stripe'}` : ''}.
              </p>
              <label className="flex items-start gap-3 cursor-pointer bg-slate-700/50 border border-slate-600 rounded-lg p-3">
                <input
                  type="checkbox"
                  checked={cancelRefundFirst}
                  onChange={(e) => setCancelRefundFirst(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-500 bg-slate-600 text-orange-500 focus:ring-orange-500"
                />
                <span>
                  <span className="block text-sm font-medium text-white">Refund the payment first</span>
                  <span className="block text-xs text-gray-400 mt-0.5">
                    Processes a refund, then cancels. Uncheck to cancel WITHOUT refunding (the payment stays as-is).
                  </span>
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-700">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelProcessing}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50"
              >
                Keep Registration
              </button>
              <button
                onClick={confirmCancelPaid}
                disabled={cancelProcessing}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {cancelProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                {cancelRefundFirst ? 'Refund & Cancel' : 'Cancel Only'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
