import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageSquare, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { listStaffRatings, StaffRatingSummary } from '../../ticket-admin.api-client';

/**
 * Admin view of customer-satisfaction data captured by the member-side
 * "Close & rate" flow. One card per agent who has at least one rated
 * ticket; expanding the card shows recent feedback comments with deep
 * links to the underlying tickets.
 *
 * Sourced from a server-side aggregate (GET /api/tickets/admin/staff/ratings),
 * not derived client-side, so per-agent averages stay consistent across the
 * full ticket history rather than just what the queue page happens to load.
 */
export function TicketStaffRatings() {
  const [rows, setRows] = useState<StaffRatingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchRatings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listStaffRatings();
      setRows(data);
    } catch (err) {
      console.error('Failed to load staff ratings:', err);
      setError('Failed to load staff ratings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  const toggleExpanded = (profileId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Support Agent Ratings</h2>
          <p className="text-gray-400 text-sm">
            Customer ratings captured when a member closes their ticket with feedback.
          </p>
        </div>
        <button
          onClick={fetchRatings}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center text-red-300">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 border border-slate-700 text-center">
          <Star className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-300">No customer ratings yet.</p>
          <p className="text-gray-500 text-sm mt-1">
            Ratings appear here once a member closes a ticket and submits a rating.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const isOpen = expanded.has(row.profile_id);
            return (
              <div
                key={row.profile_id}
                className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleExpanded(row.profile_id)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-700/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium truncate">{row.full_name}</span>
                      <span className="text-gray-500 text-xs truncate">{row.email}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            className={`w-4 h-4 ${
                              value <= Math.round(row.average_rating)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-600'
                            }`}
                          />
                        ))}
                      </span>
                      <span className="text-sm text-gray-200 font-medium">
                        {row.average_rating.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {row.rating_count} {row.rating_count === 1 ? 'rating' : 'ratings'}
                      </span>
                      {row.five_star > 0 && (
                        <span className="text-xs text-green-400">
                          {row.five_star} × 5★
                        </span>
                      )}
                      {row.one_star > 0 && (
                        <span className="text-xs text-red-400">
                          {row.one_star} × 1★
                        </span>
                      )}
                    </div>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="border-t border-slate-700 px-5 py-4 space-y-3 bg-slate-900/30">
                    <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Recent Ratings
                    </h4>
                    {row.recent.length === 0 ? (
                      <p className="text-gray-500 text-sm">No ratings to show.</p>
                    ) : (
                      <ul className="space-y-3">
                        {row.recent.map((r) => (
                          <li
                            key={r.ticket_id}
                            className="bg-slate-700/40 rounded-lg p-3 border border-slate-600"
                          >
                            <div className="flex items-center justify-between gap-3 mb-1">
                              <Link
                                to={`/admin/tickets/${r.ticket_id}`}
                                className="text-orange-400 hover:text-orange-300 text-sm font-mono"
                              >
                                {r.ticket_number}
                              </Link>
                              <span className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <Star
                                    key={value}
                                    className={`w-3.5 h-3.5 ${
                                      value <= r.rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-600'
                                    }`}
                                  />
                                ))}
                              </span>
                            </div>
                            <p className="text-gray-200 text-sm truncate">{r.title}</p>
                            {r.feedback && (
                              <p className="text-gray-300 text-sm mt-2 flex gap-2">
                                <MessageSquare className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                                <span className="whitespace-pre-wrap">{r.feedback}</span>
                              </p>
                            )}
                            <p className="text-gray-500 text-xs mt-2">
                              Closed {formatDate(r.closed_at)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TicketStaffRatings;
