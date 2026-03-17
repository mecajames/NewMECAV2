import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Shield, LogIn, LogOut, AlertTriangle, Loader2, Clock, Users, Timer, Activity } from 'lucide-react';
import { userActivityApi, AuditLogEntry, SessionEntry, SessionStats } from '@/user-activity/user-activity.api-client';

type ActionFilter = 'all' | 'login' | 'logout' | 'failed_attempt';
type ViewMode = 'events' | 'sessions';

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '-';
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getReasonBadge(reason: string | null) {
  switch (reason) {
    case 'manual':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-900/50 text-blue-400">
          Manual
        </span>
      );
    case 'idle_timeout':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-amber-900/50 text-amber-400">
          <Timer className="h-3 w-3" /> Idle Timeout
        </span>
      );
    case 'session_expired':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-gray-700/50 text-gray-400">
          <Clock className="h-3 w-3" /> Expired
        </span>
      );
    default:
      return <span className="text-xs text-gray-500">-</span>;
  }
}

export default function LoginAuditPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('events');

  // Events view state
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Sessions view state
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsSearch, setSessionsSearch] = useState('');
  const [sessionsStartDate, setSessionsStartDate] = useState('');
  const [sessionsEndDate, setSessionsEndDate] = useState('');
  const [sessionsPage, setSessionsPage] = useState(1);
  const [sessionsTotalPages, setSessionsTotalPages] = useState(1);
  const [sessionsTotal, setSessionsTotal] = useState(0);

  // Stats
  const [stats, setStats] = useState<SessionStats | null>(null);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      const result = await userActivityApi.getAuditLog({
        action: actionFilter !== 'all' ? actionFilter : undefined,
        search: searchTerm || undefined,
        startDate: startDate || undefined,
        endDate: endDate ? `${endDate}T23:59:59` : undefined,
        page,
        limit: 50,
      });
      setEntries(result.items);
      setTotalPages(result.totalPages);
      setTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, searchTerm, startDate, endDate, page]);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const result = await userActivityApi.getSessions({
        search: sessionsSearch || undefined,
        startDate: sessionsStartDate || undefined,
        endDate: sessionsEndDate ? `${sessionsEndDate}T23:59:59` : undefined,
        page: sessionsPage,
        limit: 50,
      });
      setSessions(result.items);
      setSessionsTotalPages(result.totalPages);
      setSessionsTotal(result.total);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, [sessionsSearch, sessionsStartDate, sessionsEndDate, sessionsPage]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await userActivityApi.getSessionStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch session stats:', err);
    }
  }, []);

  // Events view effects
  useEffect(() => {
    if (viewMode === 'events') fetchLog();
  }, [viewMode, actionFilter, page, fetchLog]);

  useEffect(() => {
    if (viewMode !== 'events') return;
    const timer = setTimeout(() => {
      setPage(1);
      fetchLog();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, startDate, endDate]);

  // Sessions view effects
  useEffect(() => {
    if (viewMode === 'sessions') {
      fetchSessions();
      fetchStats();
    }
  }, [viewMode, sessionsPage, fetchSessions, fetchStats]);

  useEffect(() => {
    if (viewMode !== 'sessions') return;
    const timer = setTimeout(() => {
      setSessionsPage(1);
      fetchSessions();
    }, 400);
    return () => clearTimeout(timer);
  }, [sessionsSearch, sessionsStartDate, sessionsEndDate]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'login':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-900/50 text-green-400">
            <LogIn className="h-3 w-3" /> Login
          </span>
        );
      case 'logout':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-900/50 text-blue-400">
            <LogOut className="h-3 w-3" /> Logout
          </span>
        );
      case 'failed_attempt':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-900/50 text-red-400">
            <AlertTriangle className="h-3 w-3" /> Failed
          </span>
        );
      default:
        return <span className="text-xs text-gray-400">{action}</span>;
    }
  };

  const eventTabs: { key: ActionFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'login', label: 'Logins' },
    { key: 'logout', label: 'Logouts' },
    { key: 'failed_attempt', label: 'Failed Attempts' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-rose-500" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Login Audit Log</h1>
              <p className="text-gray-400 text-sm">Track login activity, sessions, and security events</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setViewMode('events')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'events'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Events View
          </button>
          <button
            onClick={() => setViewMode('sessions')}
            className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'sessions'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            Sessions View
          </button>
        </div>

        {/* Stats Cards (shown in sessions view) */}
        {viewMode === 'sessions' && stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-gray-400">Total Sessions</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalSessions.toLocaleString()}</p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-green-400" />
                <span className="text-xs text-gray-400">Avg Duration</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatDuration(stats.avgDurationSeconds)}</p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-gray-400">Active Now</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.activeSessions}</p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-gray-400">Timeout / Manual</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {stats.timeoutLogouts} / {stats.manualLogouts}
              </p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs text-gray-400">Failed (24h)</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.failedAttempts24h}</p>
              {stats.uniqueFailedIps24h > 0 && (
                <p className="text-xs text-gray-500">{stats.uniqueFailedIps24h} unique IPs</p>
              )}
            </div>
          </div>
        )}

        {/* =================== EVENTS VIEW =================== */}
        {viewMode === 'events' && (
          <>
            {/* Filters */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-6">
              <div className="flex flex-wrap gap-2 mb-4">
                {eventTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => { setActionFilter(tab.key); setPage(1); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      actionFilter === tab.key
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by email or name..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-3">{total} result{total !== 1 ? 's' : ''}</p>

            {loading ? (
              <div className="text-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
              </div>
            ) : entries.length === 0 ? (
              <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700">
                <Shield className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No audit log entries found</p>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Timestamp</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">IP Address</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {entries.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-700/30">
                          <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-white">
                            {entry.email}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300">
                            {entry.full_name || entry.first_name
                              ? `${entry.first_name || ''} ${entry.last_name || ''}`.trim()
                              : <span className="text-gray-500">-</span>}
                          </td>
                          <td className="px-4 py-3">
                            {getActionBadge(entry.action)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                            {entry.ip_address || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-400 max-w-xs truncate">
                            {entry.error_message || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                >
                  Previous
                </button>
                <span className="text-gray-400 text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* =================== SESSIONS VIEW =================== */}
        {viewMode === 'sessions' && (
          <>
            {/* Sessions Filters */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by email or name..."
                    value={sessionsSearch}
                    onChange={e => setSessionsSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <input
                  type="date"
                  value={sessionsStartDate}
                  onChange={e => setSessionsStartDate(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="date"
                  value={sessionsEndDate}
                  onChange={e => setSessionsEndDate(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-3">{sessionsTotal} session{sessionsTotal !== 1 ? 's' : ''}</p>

            {sessionsLoading ? (
              <div className="text-center py-20">
                <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="bg-slate-800 rounded-xl p-12 text-center border border-slate-700">
                <Shield className="h-12 w-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400">No sessions found</p>
              </div>
            ) : (
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-700">
                    <thead className="bg-slate-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Login Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Logout Time</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Logout Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {sessions.map(session => (
                        <tr key={session.session_id} className="hover:bg-slate-700/30">
                          <td className="px-4 py-3">
                            <div className="text-sm text-white">
                              {session.full_name || `${session.first_name || ''} ${session.last_name || ''}`.trim() || '-'}
                            </div>
                            <div className="text-xs text-gray-400">{session.email}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                            {new Date(session.login_time).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm whitespace-nowrap">
                            {session.logout_time ? (
                              <span className="text-gray-300">{new Date(session.logout_time).toLocaleString()}</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-900/50 text-emerald-400">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-300 font-mono">
                            {formatDuration(session.duration_seconds)}
                          </td>
                          <td className="px-4 py-3">
                            {session.logout_time ? getReasonBadge(session.logout_reason) : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400 font-mono">
                            {session.ip_address || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {sessionsTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setSessionsPage(p => Math.max(1, p - 1))}
                  disabled={sessionsPage <= 1}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                >
                  Previous
                </button>
                <span className="text-gray-400 text-sm">
                  Page {sessionsPage} of {sessionsTotalPages}
                </span>
                <button
                  onClick={() => setSessionsPage(p => Math.min(sessionsTotalPages, p + 1))}
                  disabled={sessionsPage >= sessionsTotalPages}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
