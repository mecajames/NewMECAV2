import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { scrollToTop } from '@/shared/utils/scrollToTop';
import { listStaff } from '../../ticket-admin.api-client';
import type { TicketStaffResponse } from '@newmeca/shared';
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
  RefreshCw,
  Eye,
  UserPlus,
  PauseCircle,
  Save,
  RotateCcw,
  Star,
  Plus,
  X,
  Share2,
  Bolt,
} from 'lucide-react';
import {
  ticketsApi,
  Ticket as TicketType,
  TicketStats,
  TicketStatus,
  TicketPriority,
  TicketListQuery,
} from '../../tickets.api-client';
import {
  savedTicketFiltersApi,
  systemFiltersApi,
  resolveSystemFilterCriteria,
  SavedTicketFilter,
  SystemFilter,
} from '../../ticket-support-tools.api-client';
import { reportError } from './error-helper';

// Map of icon names returned by the system-filters endpoint -> the
// rendered React node. Only the icons we use are included so the
// bundle stays small. Unknown icons fall back to a generic chip dot.
const SYSTEM_FILTER_ICONS: Record<string, React.ReactNode> = {
  MessageSquare: <MessageSquare className="w-3.5 h-3.5" />,
  Clock: <Clock className="w-3.5 h-3.5" />,
  Users: <Users className="w-3.5 h-3.5" />,
  AlertCircle: <AlertCircle className="w-3.5 h-3.5" />,
  PauseCircle: <PauseCircle className="w-3.5 h-3.5" />,
  CheckCircle: <CheckCircle className="w-3.5 h-3.5" />,
};

// Admin-facing status pill. The pill name itself now says "who has the ball"
// (Pending Customer vs In Progress vs Escalated, etc.) so the old separate
// Waiting On column is gone — no more duplicated badges.
const statusConfig: Record<TicketStatus, { label: string; className: string; icon: React.ReactNode }> = {
  open: { label: 'New', className: 'bg-blue-500/10 text-blue-400 border-blue-500', icon: <AlertCircle className="w-4 h-4" /> },
  in_progress: { label: 'In Progress', className: 'bg-orange-500/10 text-orange-400 border-orange-500', icon: <Clock className="w-4 h-4" /> },
  awaiting_response: { label: 'Pending Customer', className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500', icon: <MessageSquare className="w-4 h-4" /> },
  pending_internal_review: { label: 'Pending Internal Review', className: 'bg-indigo-500/10 text-indigo-400 border-indigo-500', icon: <MessageSquare className="w-4 h-4" /> },
  escalated: { label: 'Escalated', className: 'bg-red-500/10 text-red-400 border-red-500', icon: <AlertCircle className="w-4 h-4" /> },
  on_hold: { label: 'On Hold', className: 'bg-purple-500/10 text-purple-400 border-purple-500', icon: <PauseCircle className="w-4 h-4" /> },
  resolved: { label: 'Resolved', className: 'bg-green-500/10 text-green-400 border-green-500', icon: <CheckCircle className="w-4 h-4" /> },
  reopened: { label: 'Reopened', className: 'bg-pink-500/10 text-pink-400 border-pink-500', icon: <RefreshCw className="w-4 h-4" /> },
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

/**
 * Click-to-toggle multi-select dropdown used by the admin ticket filter
 * bar. Each option has a checkbox; the trigger button shows "All" when
 * nothing is selected, the single label when one option is checked, or
 * "N selected" when more. Closes on outside click via mousedown listener.
 */
function MultiSelectDropdown<T extends string>({
  label,
  options,
  value,
  onChange,
  emptyLabel = 'All',
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T[];
  onChange: (next: T[]) => void;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  const toggle = (v: T) => {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  const displayText =
    value.length === 0
      ? emptyLabel
      : value.length === 1
      ? options.find((o) => o.value === value[0])?.label ?? `${value.length} selected`
      : `${value.length} selected`;

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-left focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center justify-between"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className="w-4 h-4 ml-2 flex-shrink-0 opacity-70" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full max-h-64 overflow-y-auto bg-slate-700 border border-slate-600 rounded-lg shadow-xl">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">No options available.</div>
          ) : (
            options.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-slate-600 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={value.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="rounded accent-orange-500"
                />
                <span className="truncate">{opt.label}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function TicketManagement({ currentUserId }: TicketManagementProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'assigned' | 'unassigned' | 'critical' | 'on_hold'>('all');
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [_statsLoading, setStatsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // All filters are now multi-select. Empty array = no filter on that
  // field. Status defaults to the 7 "non-terminal" values (matches the
  // legacy 'active' synthetic group) so the admin queue doesn't show
  // Resolved/Closed unless the admin explicitly opts in.
  const ACTIVE_STATUSES: TicketStatus[] = [
    'open', 'in_progress', 'awaiting_response',
    'pending_internal_review', 'escalated', 'on_hold', 'reopened',
  ];
  const [statusFilter, setStatusFilter] = useState<TicketStatus[]>(ACTIVE_STATUSES);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string[]>([]);
  // Assignee filter — UUIDs of assigned staff, plus the sentinel
  // 'unassigned' for tickets with no assignee. Empty = no filter.
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  // "Who replied last" filter. Single-select since the three buckets
  // (staff, customer, none) are mutually exclusive on any given
  // ticket. Empty string = no filter.
  const [lastReplyFilter, setLastReplyFilter] = useState<'' | 'staff' | 'customer' | 'none'>('');
  // Staff list for the Assignee dropdown — fetched once on mount.
  const [staffList, setStaffList] = useState<TicketStaffResponse[]>([]);
  // Transient feedback after Save / Reset / Apply preset actions.
  const [savedFilterMsg, setSavedFilterMsg] = useState<string | null>(null);

  // Saved filter presets - server-backed via saved_ticket_filters
  // table. Each agent gets up to 20 named filter combinations that
  // sync across devices. Optionally shareable team-wide (other staff
  // see them read-only). Default preset auto-loads on mount.
  const MAX_PRESETS = 20;
  const [presets, setPresets] = useState<SavedTicketFilter[]>([]);
  const [defaultPresetId, setDefaultPresetId] = useState<string | null>(null);

  // Standard system filters - hardcoded server-side, returned via
  // /api/tickets/system-filters. Rendered as chips above the saved
  // filters strip. Clicking one resolves '$me' placeholders to the
  // current user's id and applies the filter to the queue.
  const [systemFilters, setSystemFilters] = useState<SystemFilter[]>([]);
  const [activeSystemFilterId, setActiveSystemFilterId] = useState<string | null>(null);
  // Filter by the derived waiting_on enum ('customer'|'staff'|'nobody').
  // Set by system filter chips that include it; can also be set
  // explicitly via the filter panel.
  const [waitingOnFilter, setWaitingOnFilter] = useState<'' | 'customer' | 'staff' | 'nobody'>('');

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await ticketsApi.getStats();
      setStats(data);
    } catch (err) {
      reportError(err, 'load ticket stats');
    } finally {
      setStatsLoading(false);
    }
  };

  // Bumped on every fetchTickets invocation. Only the latest invocation
  // is allowed to write state — earlier in-flight responses are
  // discarded. Fixes the race where the initial render's fetch and the
  // localStorage-loaded fetch arrive out of order on mount, leaving the
  // list looking empty even though the filter would match tickets.
  const fetchTicketsRequestRef = useRef(0);

  const fetchTickets = async () => {
    const requestToken = ++fetchTicketsRequestRef.current;
    setLoading(true);
    try {
      const query: TicketListQuery = {
        page,
        limit: 15,
        sort_by: 'created_at',
        sort_order: 'desc',
      };

      if (searchQuery) query.search = searchQuery;
      // Multi-select → array (empty = no filter). Backend joins with $in.
      if (statusFilter.length > 0) query.status = statusFilter as any;
      if (priorityFilter.length > 0) query.priority = priorityFilter as any;
      if (departmentFilter.length > 0) query.department = departmentFilter as any;
      if (assigneeFilter.length > 0) query.assigned_to_id = assigneeFilter;
      if (lastReplyFilter) query.last_reply_by = lastReplyFilter;
      if (waitingOnFilter) query.waiting_on = waitingOnFilter;

      // Tab-specific filters. These pin the relevant fields regardless of
      // the filter-panel selections so e.g. the "On Hold" tab always shows
      // on_hold tickets even if the Status dropdown is on something else.
      if (activeTab === 'assigned') {
        query.assigned_to_id = currentUserId;
      } else if (activeTab === 'critical') {
        query.priority = 'critical';
        query.status = 'open';
      } else if (activeTab === 'on_hold') {
        query.status = 'on_hold';
      } else if (activeTab === 'unassigned') {
        // Backend now supports the 'unassigned' sentinel directly — no
        // more client-side filtering needed.
        query.assigned_to_id = 'unassigned';
      }

      const result = await ticketsApi.getAll(query);
      if (requestToken !== fetchTicketsRequestRef.current) return; // stale
      setTickets(result.data);
      setTotal(result.total);
      setTotalPages(result.total_pages);
    } catch (err) {
      if (requestToken !== fetchTicketsRequestRef.current) return;
      reportError(err, 'load tickets');
    } finally {
      if (requestToken === fetchTicketsRequestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // One-time on mount: load the staff list (for the Assignee filter
  // dropdown), the server-backed saved presets, and the standard
  // system filters. If a saved preset is marked default, apply it
  // immediately so the queue opens to the agent's preferred view. The
  // fetchTicketsRequestRef token-guard above ensures the initial-
  // render fetch and this preset-application fetch don't race - only
  // the latest response gets written to state.
  useEffect(() => {
    listStaff().then(setStaffList).catch(() => { /* non-fatal */ });
    systemFiltersApi.list().then(setSystemFilters).catch(() => { /* non-fatal */ });
    savedTicketFiltersApi.list().then((rows) => {
      setPresets(rows);
      const def = rows.find((r) => r.is_default && r.is_owner);
      if (def) {
        setDefaultPresetId(def.id);
        applyPresetCriteria(def);
      }
    }).catch(() => { /* non-fatal */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  /**
   * Apply a saved preset's criteria to the current filter state. The
   * criteria shape mirrors what the ticket-list endpoint accepts, but
   * the multi-select UI uses arrays so we coerce strings to single-
   * element arrays where needed.
   */
  const applyPresetCriteria = (preset: SavedTicketFilter) => {
    const c = preset.criteria as Record<string, unknown>;
    const asArray = (v: unknown): string[] => {
      if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
      if (typeof v === 'string' && v) return v.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    };
    setStatusFilter(asArray(c.status) as TicketStatus[]);
    setPriorityFilter(asArray(c.priority) as TicketPriority[]);
    setDepartmentFilter(asArray(c.department));
    setAssigneeFilter(asArray(c.assigned_to_id));
    setLastReplyFilter((c.last_reply_by as any) || '');
    setActiveTab('all');
    setActiveSystemFilterId(null);
  };

  const applyPreset = (preset: SavedTicketFilter) => {
    applyPresetCriteria(preset);
    setSavedFilterMsg(`Applied "${preset.name}"`);
    setTimeout(() => setSavedFilterMsg(null), 2000);
  };

  /**
   * Apply a system filter chip. Resolves the '$me' placeholder, sets
   * the local filter state, and tracks the active system-filter id so
   * the chip can be highlighted.
   */
  const applySystemFilter = (filter: SystemFilter) => {
    const resolved = resolveSystemFilterCriteria(filter.criteria, currentUserId);
    setStatusFilter(resolved.status ? [resolved.status as TicketStatus] : []);
    setPriorityFilter(resolved.priority ? [resolved.priority as TicketPriority] : []);
    setDepartmentFilter(resolved.department ? [resolved.department] : []);
    setAssigneeFilter(resolved.assigned_to_id ? [resolved.assigned_to_id] : []);
    setLastReplyFilter('');
    setWaitingOnFilter((resolved.waiting_on as any) || '');
    setActiveTab('all');
    setActiveSystemFilterId(filter.id);
    setPage(1);
    setSavedFilterMsg(`Applied "${filter.label}"`);
    setTimeout(() => setSavedFilterMsg(null), 2000);
  };

  const handleSavePreset = async () => {
    if (presets.filter(p => p.is_owner).length >= MAX_PRESETS) {
      alert(`You can save up to ${MAX_PRESETS} filter presets. Delete one first.`);
      return;
    }
    const name = window.prompt('Name this filter:');
    if (!name || !name.trim()) return;
    try {
      const created = await savedTicketFiltersApi.create({
        name: name.trim().slice(0, 60),
        criteria: {
          status: statusFilter,
          priority: priorityFilter,
          department: departmentFilter,
          assigned_to_id: assigneeFilter,
          last_reply_by: lastReplyFilter || undefined,
        },
      });
      setPresets((prev) => [...prev, created]);
      setSavedFilterMsg(`Saved "${created.name}"`);
      setTimeout(() => setSavedFilterMsg(null), 2000);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save preset');
    }
  };

  const handleDeletePreset = async (id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (!preset || !preset.is_owner) return;
    if (!window.confirm(`Delete saved filter "${preset.name}"?`)) return;
    try {
      await savedTicketFiltersApi.delete(id);
      setPresets((prev) => prev.filter((p) => p.id !== id));
      if (defaultPresetId === id) setDefaultPresetId(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to delete preset');
    }
  };

  const handleToggleDefault = async (id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (!preset || !preset.is_owner) return;
    const next = defaultPresetId === id ? false : true;
    try {
      const updated = await savedTicketFiltersApi.update(id, { is_default: next });
      setPresets((prev) => prev.map((p) =>
        p.id === id ? updated : (next ? { ...p, is_default: false } : p)
      ));
      setDefaultPresetId(next ? id : null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to toggle default');
    }
  };

  const handleToggleShare = async (id: string) => {
    const preset = presets.find((p) => p.id === id);
    if (!preset || !preset.is_owner) return;
    try {
      const updated = await savedTicketFiltersApi.update(id, { is_shared_with_team: !preset.is_shared_with_team });
      setPresets((prev) => prev.map((p) => p.id === id ? updated : p));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to toggle share');
    }
  };

  useEffect(() => {
    setPage(1);
  }, [activeTab, statusFilter, priorityFilter, departmentFilter, assigneeFilter, waitingOnFilter]);

  useEffect(() => {
    fetchTickets();
  }, [page, activeTab, statusFilter, priorityFilter, departmentFilter, assigneeFilter, lastReplyFilter, waitingOnFilter]);

  const handleResetFilter = () => {
    setStatusFilter(ACTIVE_STATUSES);
    setPriorityFilter([]);
    setDepartmentFilter([]);
    setLastReplyFilter('');
    setWaitingOnFilter('');
    setAssigneeFilter([]);
    setActiveSystemFilterId(null);
    setSavedFilterMsg('Filter reset.');
    setTimeout(() => setSavedFilterMsg(null), 2000);
  };

  /**
   * Full clear from the top bar: search box, active tab, and every filter
   * back to the default working view (active statuses, nothing else). Broader
   * than handleResetFilter, which is scoped to the filter-panel dropdowns and
   * leaves the search box / tab alone.
   */
  const handleClearAllFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
    setStatusFilter(ACTIVE_STATUSES);
    setPriorityFilter([]);
    setDepartmentFilter([]);
    setAssigneeFilter([]);
    setLastReplyFilter('');
    setWaitingOnFilter('');
    setActiveSystemFilterId(null);
    setPage(1);
    setSavedFilterMsg('Filters cleared.');
    setTimeout(() => setSavedFilterMsg(null), 2000);
  };

  // True when anything deviates from the default view — gates the "Clear
  // filters" button so it only appears when there's actually something to
  // clear. Status counts as "filtered" only when it differs from the default
  // active-status set.
  const statusIsDefault =
    statusFilter.length === ACTIVE_STATUSES.length &&
    ACTIVE_STATUSES.every((s) => statusFilter.includes(s));
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    activeTab !== 'all' ||
    priorityFilter.length > 0 ||
    departmentFilter.length > 0 ||
    assigneeFilter.length > 0 ||
    lastReplyFilter !== '' ||
    waitingOnFilter !== '' ||
    activeSystemFilterId !== null ||
    !statusIsDefault;

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
      reportError(err, 'assign ticket');
    }
  };

  // Full month/day/year, e.g. "Dec 12, 2025". Used by the Created and
  // Closed columns where the year matters (tickets can carry over) and
  // there's no advantage to the relative "Xh ago" framing.
  const formatFullDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getReporterName = (ticket: TicketType) => {
    if (ticket.reporter) {
      const { first_name, last_name, email } = ticket.reporter;
      if (first_name || last_name) return `${first_name || ''} ${last_name || ''}`.trim();
      return email.split('@')[0];
    }
    // Guest-flow tickets have no linked reporter — use the guest fields,
    // same as the ticket detail page does.
    if (ticket.guest_name) return ticket.guest_name;
    if (ticket.guest_email) return ticket.guest_email.split('@')[0];
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
            <span className="text-xs uppercase">Awaiting Response</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats?.awaiting_response || 0}</p>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <PauseCircle className="w-4 h-4" />
            <span className="text-xs uppercase">On Hold</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{stats?.on_hold || 0}</p>
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
          { id: 'on_hold', label: `Tickets on Hold${stats?.on_hold ? ` (${stats.on_hold})` : ''}`, icon: <PauseCircle className="w-4 h-4" /> },
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
        {hasActiveFilters && (
          <button
            onClick={handleClearAllFilters}
            title="Clear the search box, active tab, and all filters"
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
            Clear filters
          </button>
        )}
      </div>

      {/* System filter chips - hardcoded server-side, identical for
          every agent. Replaces the legacy localStorage button strip
          ("My Open Requests", "New and Client Replied", etc) so the
          labels are consistent and the criteria are guaranteed to
          actually match the label semantics. */}
      {systemFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 mr-1 flex items-center gap-1">
            <Bolt className="w-3 h-3" />
            Quick filters:
          </span>
          {systemFilters.map((f) => {
            const isActive = activeSystemFilterId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => applySystemFilter(f)}
                title={f.description}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-colors border ${
                  isActive
                    ? 'bg-orange-500 text-white border-orange-400'
                    : 'bg-slate-700 hover:bg-slate-600 text-gray-200 border-slate-600'
                }`}
              >
                {SYSTEM_FILTER_ICONS[f.icon] ?? <span className="w-2 h-2 rounded-full bg-current" />}
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Saved filter presets - server-backed via saved_ticket_filters.
          Each agent gets up to MAX_PRESETS named combinations that
          sync across devices. Owners can star a default (auto-loads
          on mount), toggle team-share (other staff see it read-only),
          or delete. Shared filters from other agents appear too but
          are read-only and badged with their owner's name. */}
      {(presets.length > 0 || showFilters) && (
        <div className="flex flex-wrap items-center gap-2">
          {presets.length > 0 && (
            <span className="text-xs text-gray-400 mr-1">Saved filters:</span>
          )}
          {presets.map((preset) => {
            const isDefault = preset.is_default && preset.is_owner;
            const ownerLabel = !preset.is_owner && preset.owner
              ? ` (by ${preset.owner.first_name || preset.owner.email || 'staff'})`
              : '';
            return (
              <div
                key={preset.id}
                className="group inline-flex items-center bg-slate-700 hover:bg-slate-600 rounded-full pl-2 pr-1 py-1 text-xs text-white border border-slate-600 transition-colors"
              >
                {preset.is_owner ? (
                  <button
                    type="button"
                    onClick={() => handleToggleDefault(preset.id)}
                    title={isDefault ? 'Default (auto-loads on page open). Click to unset.' : 'Set as default - auto-loads next time you open this page.'}
                    className="mr-1.5 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${isDefault ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                    />
                  </button>
                ) : (
                  <Share2 className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                )}
                <button
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-1 font-medium"
                  title="Apply this filter"
                >
                  {preset.name}{ownerLabel}
                </button>
                {preset.is_owner && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleToggleShare(preset.id)}
                      title={preset.is_shared_with_team ? 'Shared with team - click to make private' : 'Private - click to share with team'}
                      className="ml-1 p-0.5 rounded hover:bg-slate-500 text-gray-400 hover:text-blue-400 transition-colors"
                    >
                      <Share2 className={`w-3 h-3 ${preset.is_shared_with_team ? 'text-blue-400' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(preset.id)}
                      title="Delete saved filter"
                      className="ml-1 p-0.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
          {showFilters && presets.filter(p => p.is_owner).length < MAX_PRESETS && (
            <button
              type="button"
              onClick={handleSavePreset}
              className="inline-flex items-center gap-1 bg-orange-600 hover:bg-orange-700 rounded-full px-3 py-1 text-xs text-white transition-colors"
              title="Save the current filter selections as a named preset"
            >
              <Plus className="w-3 h-3" />
              Save current as preset
            </button>
          )}
          {/* Per-tech Signature and Canned Responses now live in the
              "My Tools" tab of this page. */}
          {savedFilterMsg && (
            <span className="text-xs text-gray-400 ml-auto">{savedFilterMsg}</span>
          )}
        </div>
      )}

      {/* Filter Panel — multi-select on every dimension. The pill row
          above this panel persists named presets; this panel just edits
          the currently-applied filter set. */}
      {showFilters && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MultiSelectDropdown<TicketStatus>
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={Object.entries(statusConfig).map(([key, { label }]) => ({
                value: key as TicketStatus,
                label,
              }))}
            />
            <MultiSelectDropdown<TicketPriority>
              label="Priority"
              value={priorityFilter}
              onChange={setPriorityFilter}
              options={Object.entries(priorityConfig).map(([key, { label }]) => ({
                value: key as TicketPriority,
                label,
              }))}
            />
            <MultiSelectDropdown<string>
              label="Department"
              value={departmentFilter}
              onChange={setDepartmentFilter}
              options={[
                { value: 'general_support', label: 'General Support' },
                { value: 'membership_services', label: 'Membership Services' },
                { value: 'event_operations', label: 'Event Operations' },
                { value: 'technical_support', label: 'Technical Support' },
                { value: 'billing', label: 'Billing' },
                { value: 'administration', label: 'Administration' },
              ]}
            />
            <MultiSelectDropdown<string>
              label="Assigned To"
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              options={[
                { value: 'unassigned', label: '— Unassigned —' },
                ...staffList.map((s) => ({
                  value: s.profile_id,
                  label:
                    `${s.profile?.first_name || ''} ${s.profile?.last_name || ''}`.trim() ||
                    s.profile?.email ||
                    'Unknown',
                })),
              ]}
            />
            {/* Single-select dropdown — the buckets are mutually exclusive
                so a multi-select would be misleading. Most useful in
                practice: "Customer replied last" (admin needs to respond)
                vs "Staff replied last" (waiting on customer). */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Last Reply By</label>
              <select
                value={lastReplyFilter}
                onChange={(e) => setLastReplyFilter(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Anyone</option>
                <option value="customer">Customer replied last</option>
                <option value="staff">Staff replied last</option>
                <option value="none">No replies yet</option>
              </select>
            </div>
          </div>
          {/* Footer actions: Reset (clear all back to defaults) and
              Save-as-preset (only shown here too for discoverability;
              the same button lives in the pill row above). */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
            <button
              type="button"
              onClick={handleSavePreset}
              disabled={presets.length >= MAX_PRESETS}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
              title={presets.length >= MAX_PRESETS ? `You've saved the max of ${MAX_PRESETS} filters.` : 'Name and save the current filter selections'}
            >
              <Save className="w-3.5 h-3.5" />
              Save as preset ({presets.length}/{MAX_PRESETS})
            </button>
            <button
              type="button"
              onClick={handleResetFilter}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Last Reply</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Closed</th>
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
                      {!ticket.reporter && (ticket.guest_name || ticket.guest_email) && (
                        <span className="ml-1.5 text-[10px] uppercase bg-slate-700 text-gray-400 px-1.5 py-0.5 rounded">
                          Guest
                        </span>
                      )}
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
                      {ticket.last_reply ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-300 text-sm truncate max-w-[10rem]" title={ticket.last_reply.author_name}>
                            {ticket.last_reply.author_name}
                          </span>
                          <span
                            className={`inline-flex w-fit items-center px-1.5 py-0.5 text-[10px] font-medium rounded uppercase tracking-wide ${
                              ticket.last_reply.author_kind === 'staff'
                                ? 'bg-blue-500/15 text-blue-300'
                                : ticket.last_reply.author_kind === 'customer'
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : ticket.last_reply.author_kind === 'guest'
                                    ? 'bg-purple-500/15 text-purple-300'
                                    : 'bg-slate-500/15 text-slate-300'
                            }`}
                            title={`Latest non-internal comment on ${formatFullDate(ticket.last_reply.created_at)}`}
                          >
                            {ticket.last_reply.author_kind}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-600 text-xs italic">No replies</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-400 text-sm">{formatFullDate(ticket.created_at)}</span>
                    </td>
                    <td className="px-4 py-4">
                      {ticket.closed_at ? (
                        <span className="text-gray-400 text-sm">{formatFullDate(ticket.closed_at)}</span>
                      ) : (
                        <span className="text-gray-600 text-xs">—</span>
                      )}
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
                onClick={() => { setPage(Math.max(1, page - 1)); scrollToTop(); }}
                disabled={page === 1}
                className="px-3 py-1 bg-slate-700 text-gray-300 rounded hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => { setPage(Math.min(totalPages, page + 1)); scrollToTop(); }}
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
