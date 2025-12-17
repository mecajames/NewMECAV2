import { useState, useEffect } from 'react';
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
  BarChart3,
  Users,
  TrendingUp,
  Calendar,
  RefreshCw,
  Eye,
  UserPlus,
} from 'lucide-react';
import {
  ticketsApi,
  Ticket as TicketType,
  TicketStats,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  TicketDepartment,
  TicketListQuery,
} from '../../tickets.api-client';

// Status configurations
const statusConfig: Record<TicketStatus, { label: string; className: string; icon: React.ReactNode }> = {
  open: { label: 'Open', className: 'bg-blue-500/10 text-blue-400 border-blue-500', icon: <AlertCircle className="w-4 h-4" /> },
  in_progress: { label: 'In Progress', className: 'bg-orange-500/10 text-orange-400 border-orange-500', icon: <Clock className="w-4 h-4" /> },
  awaiting_response: { label: 'Awaiting', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500', icon: <MessageSquare className="w-4 h-4" /> },
  resolved: { label: 'Resolved', className: 'bg-green-500/10 text-green-400 border-green-500', icon: <CheckCircle className="w-4 h-4" /> },
  closed: { label: 'Closed', className: 'bg-gray-500/10 text-gray-400 border-gray-500', icon: <XCircle className="w-4 h-4" /> },
};

const priorityConfig: Record<TicketPriority, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-500/10 text-red-400 border-red-500' },
  high: { label: 'High', className: 'bg-orange-500/10 text-orange-400 border-orange-500' },
  medium: { label: 'Medium', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500' },
  low: { label: 'Low', className: 'bg-blue-500/10 text-blue-400 border-blue-500' },
};

interface TicketManagementProps {
  currentUserId: string;
}

export function TicketManagement({ currentUserId }: TicketManagementProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'unassigned' | 'critical'>('all');
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | ''>('');
  const [departmentFilter, setDepartmentFilter] = useState<TicketDepartment | ''>('');

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await ticketsApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const query: TicketListQuery = {
        page,
        limit: 15,
        sort_by: 'created_at',
        sort_order: 'desc',
      };

      if (searchQuery) query.search = searchQuery;
      if (statusFilter) query.status = statusFilter;
      if (priorityFilter) query.priority = priorityFilter;
      if (departmentFilter) query.department = departmentFilter;

      // Tab-specific filters
      if (activeTab === 'assigned') {
        query.assigned_to_id = currentUserId;
      } else if (activeTab === 'critical') {
        query.priority = 'critical';
        query.status = 'open';
      }

      const result = await ticketsApi.getAll(query);

      // For unassigned tab, filter client-side (API doesn't support null filter easily)
      let filteredData = result.data;
      if (activeTab === 'unassigned') {
        filteredData = result.data.filter((t) => !t.assigned_to_id);
      }

      setTickets(filteredData);
      setTotal(activeTab === 'unassigned' ? filteredData.length : result.total);
      setTotalPages(activeTab === 'unassigned' ? 1 : result.total_pages);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, statusFilter, priorityFilter, departmentFilter]);

  useEffect(() => {
    fetchTickets();
  }, [page, activeTab, statusFilter, priorityFilter, departmentFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchTickets();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleQuickAssign = async (ticketId: string) => {
    try {
      await ticketsApi.assign(ticketId, currentUserId);
      fetchTickets();
      fetchStats();
    } catch (err) {
      console.error('Failed to assign ticket:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getReporterName = (ticket: TicketType) => {
    if (ticket.reporter) {
      const { first_name, last_name, email } = ticket.reporter;
      if (first_name || last_name) return `${first_name || ''} ${last_name || ''}`.trim();
      return email.split('@')[0];
    }
    return 'Unknown';
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
            <h1 className="text-2xl font-bold text-white">Ticket Management</h1>
            <p className="text-gray-400 text-sm">Manage and respond to support tickets</p>
          </div>
        </div>
        <button
          onClick={() => { fetchTickets(); fetchStats(); }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs uppercase">Total</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats?.total || 0}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs uppercase">Open</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{stats?.open || 0}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-orange-500/30">
          <div className="flex items-center gap-2 text-orange-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs uppercase">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-orange-400">{stats?.in_progress || 0}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs uppercase">Awaiting</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats?.awaiting_response || 0}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs uppercase">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats?.resolved || 0}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs uppercase">Avg Time</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats?.average_resolution_time_hours
              ? `${stats.average_resolution_time_hours}h`
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Priority Distribution */}
      {stats && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Priority Distribution</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-sm text-gray-300">Critical: {stats.by_priority.critical}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span className="text-sm text-gray-300">High: {stats.by_priority.high}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className="text-sm text-gray-300">Medium: {stats.by_priority.medium}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span className="text-sm text-gray-300">Low: {stats.by_priority.low}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-700 overflow-x-auto">
        {[
          { id: 'all', label: 'All Tickets', icon: <Ticket className="w-4 h-4" /> },
          { id: 'assigned', label: 'Assigned to Me', icon: <User className="w-4 h-4" /> },
          { id: 'unassigned', label: 'Unassigned', icon: <Users className="w-4 h-4" /> },
          { id: 'critical', label: 'Critical', icon: <AlertCircle className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-colors ${
            showFilters ? 'bg-orange-600 text-white' : 'bg-slate-800 border border-slate-700 text-gray-300 hover:bg-slate-700'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TicketStatus | '')}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All</option>
              {Object.entries(statusConfig).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | '')}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All</option>
              {Object.entries(priorityConfig).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Department</label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value as TicketDepartment | '')}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All</option>
              <option value="general_support">General Support</option>
              <option value="membership_services">Membership Services</option>
              <option value="event_operations">Event Operations</option>
              <option value="technical_support">Technical Support</option>
              <option value="billing">Billing</option>
              <option value="administration">Administration</option>
            </select>
          </div>
        </div>
      )}

      {/* Tickets Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-12">
            <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No tickets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Ticket</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Reporter</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Assigned</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-slate-700/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                  >
                    <td className="px-4 py-4">
                      <div>
                        <span className="text-xs font-mono text-orange-400">{ticket.ticket_number}</span>
                        <p className="text-white font-medium truncate max-w-xs">{ticket.title}</p>
                        <p className="text-xs text-gray-500 capitalize">{ticket.category.replace(/_/g, ' ')}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${statusConfig[ticket.status].className}`}>
                        {statusConfig[ticket.status].icon}
                        {statusConfig[ticket.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${priorityConfig[ticket.priority].className}`}>
                        {priorityConfig[ticket.priority].label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-300 text-sm">{getReporterName(ticket)}</span>
                    </td>
                    <td className="px-4 py-4">
                      {ticket.assigned_to ? (
                        <span className="text-gray-300 text-sm">
                          {ticket.assigned_to.first_name || ticket.assigned_to.email.split('@')[0]}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-400 text-sm">{formatDate(ticket.created_at)}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {!ticket.assigned_to_id && (
                          <button
                            onClick={() => handleQuickAssign(ticket.id)}
                            className="p-2 text-gray-400 hover:text-orange-400 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Assign to me"
                          >
                            <UserPlus className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/admin/tickets/${ticket.id}`)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
            <p className="text-sm text-gray-400">
              Page {page} of {totalPages} ({total} tickets)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TicketManagement;
