import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ShieldCheck, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { userActivityApi, AdminAuditEntry } from '@/user-activity/user-activity.api-client';

export default function AdminAuditPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<AdminAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLog = useCallback(async () => {
    setLoading(true);
    try {
      const result = await userActivityApi.getAdminAuditLog({
        action: actionFilter || undefined,
        resourceType: resourceTypeFilter || undefined,
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
      console.error('Failed to fetch admin audit log:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resourceTypeFilter, searchTerm, startDate, endDate, page]);

  useEffect(() => {
    fetchLog();
  }, [actionFilter, resourceTypeFilter, page, fetchLog]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLog();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, startDate, endDate]);

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      role_change: 'bg-purple-900/50 text-purple-400',
      membership_update: 'bg-blue-900/50 text-blue-400',
      membership_cancel: 'bg-red-900/50 text-red-400',
      membership_cancel_at_renewal: 'bg-orange-900/50 text-orange-400',
      membership_reactivate: 'bg-green-900/50 text-green-400',
      membership_refund: 'bg-rose-900/50 text-rose-400',
      membership_refund_partial: 'bg-pink-900/50 text-pink-300',
      membership_pause: 'bg-amber-900/50 text-amber-300',
      membership_resume: 'bg-teal-900/50 text-teal-300',
      membership_approve: 'bg-green-900/50 text-green-400',
      user_update: 'bg-amber-900/50 text-amber-400',
      event_create: 'bg-emerald-900/50 text-emerald-400',
      event_update: 'bg-cyan-900/50 text-cyan-400',
      judge_level_change: 'bg-indigo-900/50 text-indigo-400',
      judge_approve: 'bg-green-900/50 text-green-400',
    };
    const colorClass = colors[action] || 'bg-slate-700/50 text-gray-400';
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  const renderDiff = (oldValues: Record<string, any> | null, newValues: Record<string, any> | null) => {
    if (!oldValues && !newValues) return <span className="text-gray-500 text-xs">No data</span>;

    const allKeys = new Set([
      ...Object.keys(oldValues || {}),
      ...Object.keys(newValues || {}),
    ]);

    return (
      <div className="mt-2 bg-slate-900 rounded-lg p-3 text-xs font-mono space-y-1">
        {Array.from(allKeys).map(key => {
          const oldVal = oldValues?.[key];
          const newVal = newValues?.[key];
          const changed = JSON.stringify(oldVal) !== JSON.stringify(newVal);
          if (!changed) return null;
          return (
            <div key={key}>
              <span className="text-gray-400">{key}: </span>
              {oldVal !== undefined && (
                <span className="text-red-400 line-through">{JSON.stringify(oldVal)}</span>
              )}
              {oldVal !== undefined && newVal !== undefined && <span className="text-gray-500"> → </span>}
              {newVal !== undefined && (
                <span className="text-green-400">{JSON.stringify(newVal)}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-indigo-500" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Audit Log</h1>
              <p className="text-gray-400 text-sm">Track admin actions: role changes, membership updates, and more</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search description or admin..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Actions</option>
              <option value="role_change">Role Change</option>
              <option value="membership_update">Membership Update</option>
              <option value="membership_cancel">Membership Cancel</option>
              <option value="membership_cancel_at_renewal">Membership Cancel at Renewal</option>
              <option value="membership_reactivate">Membership Reactivate</option>
              <option value="membership_refund">Membership Refund</option>
              <option value="membership_refund_partial">Membership Partial Refund</option>
              <option value="membership_pause">Membership Pause</option>
              <option value="membership_resume">Membership Resume</option>
              <option value="membership_approve">Membership Approve</option>
              <option value="user_update">User Update</option>
              <option value="event_create">Event Create</option>
              <option value="event_update">Event Update</option>
              <option value="judge_level_change">Judge Level Change</option>
              <option value="judge_approve">Judge Approve</option>
            </select>
            <select
              value={resourceTypeFilter}
              onChange={e => { setResourceTypeFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">All Resources</option>
              <option value="profile">Profile</option>
              <option value="membership">Membership</option>
              <option value="event">Event</option>
              <option value="judge">Judge</option>
              <option value="event_director">Event Director</option>
            </select>
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
            <ShieldCheck className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No admin audit log entries found</p>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Admin</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Resource</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {entries.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-white">{entry.admin_name || '-'}</div>
                        <div className="text-xs text-gray-400">{entry.admin_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {getActionBadge(entry.action)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {entry.resource_type}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 max-w-xs">
                        {entry.description || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {(entry.old_values || entry.new_values) ? (
                          <div>
                            <button
                              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                              className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
                            >
                              {expandedId === entry.id ? (
                                <><ChevronUp className="h-3 w-3" /> Hide</>
                              ) : (
                                <><ChevronDown className="h-3 w-3" /> View</>
                              )}
                            </button>
                            {expandedId === entry.id && renderDiff(entry.old_values, entry.new_values)}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">-</span>
                        )}
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
      </div>
    </div>
  );
}
