import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  Tag,
  Building,
} from 'lucide-react';
import {
  ticketsApi,
  Ticket as TicketType,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketDepartment,
  TicketListQuery,
} from '../../api-client/tickets.api-client';

// Status badge styling
const statusConfig: Record<TicketStatus, { label: string; className: string; icon: React.ReactNode }> = {
  open: {
    label: 'Open',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-orange-500/10 text-orange-400 border-orange-500',
    icon: <Clock className="w-3 h-3" />,
  },
  awaiting_response: {
    label: 'Awaiting Response',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500',
    icon: <MessageSquare className="w-3 h-3" />,
  },
  resolved: {
    label: 'Resolved',
    className: 'bg-green-500/10 text-green-400 border-green-500',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-500/10 text-gray-400 border-gray-500',
    icon: <XCircle className="w-3 h-3" />,
  },
};

// Priority badge styling
const priorityConfig: Record<TicketPriority, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-500/10 text-red-400 border-red-500' },
  high: { label: 'High', className: 'bg-orange-500/10 text-orange-400 border-orange-500' },
  medium: { label: 'Medium', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500' },
  low: { label: 'Low', className: 'bg-blue-500/10 text-blue-400 border-blue-500' },
};

// Category badge styling
const categoryConfig: Record<TicketCategory, { label: string; className: string }> = {
  general: { label: 'General', className: 'bg-gray-500/10 text-gray-400' },
  membership: { label: 'Membership', className: 'bg-purple-500/10 text-purple-400' },
  event_registration: { label: 'Event Registration', className: 'bg-blue-500/10 text-blue-400' },
  payment: { label: 'Payment', className: 'bg-green-500/10 text-green-400' },
  technical: { label: 'Technical', className: 'bg-pink-500/10 text-pink-400' },
  competition_results: { label: 'Competition Results', className: 'bg-yellow-500/10 text-yellow-400' },
  event_hosting: { label: 'Event Hosting', className: 'bg-orange-500/10 text-orange-400' },
  account: { label: 'Account', className: 'bg-indigo-500/10 text-indigo-400' },
  other: { label: 'Other', className: 'bg-gray-500/10 text-gray-400' },
};

interface TicketListProps {
  userId?: string;
  showFilters?: boolean;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
  mode?: 'all' | 'my-tickets' | 'assigned';
}

export function TicketList({
  userId,
  showFilters = true,
  showCreateButton = true,
  onCreateClick,
  mode = 'all',
}: TicketListProps) {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | ''>('');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at' | 'priority'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'my-tickets' && userId) {
        const data = await ticketsApi.getMyTickets(userId);
        setTickets(data);
        setTotal(data.length);
        setTotalPages(1);
      } else if (mode === 'assigned' && userId) {
        const data = await ticketsApi.getAssignedTickets(userId);
        setTickets(data);
        setTotal(data.length);
        setTotalPages(1);
      } else {
        const query: TicketListQuery = {
          page,
          limit,
          sort_by: sortBy,
          sort_order: sortOrder,
        };
        if (searchQuery) query.search = searchQuery;
        if (statusFilter) query.status = statusFilter;
        if (priorityFilter) query.priority = priorityFilter;
        if (categoryFilter) query.category = categoryFilter;

        const result = await ticketsApi.getAll(query);
        setTickets(result.data);
        setTotal(result.total);
        setTotalPages(result.total_pages);
      }
    } catch (err) {
      setError('Failed to load tickets');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [page, statusFilter, priorityFilter, categoryFilter, sortBy, sortOrder, userId, mode]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mode === 'all') {
        setPage(1);
        fetchTickets();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getReporterName = (ticket: TicketType) => {
    if (ticket.reporter) {
      const { first_name, last_name, email } = ticket.reporter;
      if (first_name || last_name) {
        return `${first_name || ''} ${last_name || ''}`.trim();
      }
      return email;
    }
    return 'Unknown';
  };

  const getAssigneeName = (ticket: TicketType) => {
    if (ticket.assigned_to) {
      const { first_name, last_name, email } = ticket.assigned_to;
      if (first_name || last_name) {
        return `${first_name || ''} ${last_name || ''}`.trim();
      }
      return email;
    }
    return 'Unassigned';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 rounded-xl">
            <Ticket className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {mode === 'my-tickets' ? 'My Tickets' : mode === 'assigned' ? 'Assigned Tickets' : 'Support Tickets'}
            </h2>
            <p className="text-gray-400 text-sm">{total} ticket{total !== 1 ? 's' : ''} found</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showFilters && mode === 'all' && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showFilterPanel ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilterPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          {showCreateButton && (
            <button
              onClick={onCreateClick}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Ticket className="w-4 h-4" />
              New Ticket
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      {showFilters && mode === 'all' && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets by title, description, or ticket number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      )}

      {/* Filter Panel */}
      {showFilterPanel && showFilters && mode === 'all' && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Statuses</option>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | '')}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Priorities</option>
                {Object.entries(priorityConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as TicketCategory | '')}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Categories</option>
                {Object.entries(categoryConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'created_at' | 'updated_at' | 'priority')}
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="created_at">Created</option>
                  <option value="updated_at">Updated</option>
                  <option value="priority">Priority</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white hover:bg-slate-600 transition-colors"
                >
                  {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400">{error}</p>
          <button
            onClick={fetchTickets}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && tickets.length === 0 && (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <Ticket className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No tickets found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery || statusFilter || priorityFilter || categoryFilter
              ? 'Try adjusting your filters'
              : 'Create a new ticket to get started'}
          </p>
          {showCreateButton && (
            <button
              onClick={onCreateClick}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Create First Ticket
            </button>
          )}
        </div>
      )}

      {/* Ticket List */}
      {!loading && !error && tickets.length > 0 && (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => navigate(`/tickets/${ticket.id}`)}
              className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/10 transition-all cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Left: Main Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-mono text-orange-400">{ticket.ticket_number}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${statusConfig[ticket.status].className}`}>
                      {statusConfig[ticket.status].icon}
                      {statusConfig[ticket.status].label}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${priorityConfig[ticket.priority].className}`}>
                      {priorityConfig[ticket.priority].label}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-2 truncate">{ticket.title}</h3>

                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">{ticket.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      <span className={`px-2 py-0.5 rounded text-xs ${categoryConfig[ticket.category].className}`}>
                        {categoryConfig[ticket.category].label}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      {getReporterName(ticket)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(ticket.created_at)}
                    </span>
                  </div>
                </div>

                {/* Right: Assignee & Meta */}
                <div className="flex flex-col items-end gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Building className="w-4 h-4" />
                    <span className="capitalize">{ticket.department.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Assigned to:</span>
                    <span className={ticket.assigned_to ? 'text-white' : 'text-gray-500 italic'}>
                      {getAssigneeName(ticket)}
                    </span>
                  </div>
                  {ticket.event && (
                    <div className="text-xs text-gray-500">
                      Event: {ticket.event.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && mode === 'all' && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-gray-400">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} tickets
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-white">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketList;
