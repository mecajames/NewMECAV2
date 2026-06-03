import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, DollarSign, Download, AlertCircle,
  ChevronDown, ChevronRight, AlertTriangle,
} from 'lucide-react';
import {
  competitionResultsApi,
  RevenueReport,
} from '@/competition-results/competition-results.api-client';
import { seasonsApi, Season } from '@/seasons/seasons.api-client';

/**
 * Admin Event-Director Revenue Report.
 *
 * Per-event entry-fee revenue (one result row = one paid score sheet) split
 * into active members vs everyone else (expired / non-member / guest),
 * grouped by event director, with a season grand total. The split and the
 * per-event numbers are computed server-side (GET /api/competition-results/
 * revenue-report) so this page just renders + exports.
 */
const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

export default function EventDirectorRevenuePage() {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<string>('');
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Load seasons, default to the current one.
  useEffect(() => {
    seasonsApi.getAll()
      .then((all) => {
        setSeasons(all);
        const current = all.find(s => s.is_current ?? s.isCurrent) || all[0];
        if (current) setSeasonId(current.id);
      })
      .catch(() => setError('Failed to load seasons'));
  }, []);

  // (Re)load the report whenever the selected season changes.
  useEffect(() => {
    if (!seasonId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    competitionResultsApi.getRevenueReport(seasonId)
      .then((r) => { if (!cancelled) setReport(r); })
      .catch((err) => { if (!cancelled) setError(err?.response?.data?.message || 'Failed to load revenue report'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [seasonId]);

  const toggle = (key: string) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

  const exportCsv = () => {
    if (!report) return;
    const header = ['Event Director', 'Event', 'Date', 'Member Sheets', 'Member Fee', 'Member Revenue', 'Non-Member Sheets', 'Non-Member Fee', 'Non-Member Revenue', 'Total Revenue'];
    const rows: string[][] = [header];
    for (const d of report.directors) {
      for (const e of d.events) {
        rows.push([
          d.director_name,
          e.title,
          new Date(e.event_date).toLocaleDateString(),
          String(e.member_count),
          e.member_fee == null ? 'not set' : e.member_fee.toFixed(2),
          e.member_revenue.toFixed(2),
          String(e.non_member_count),
          e.non_member_fee == null ? 'not set' : e.non_member_fee.toFixed(2),
          e.non_member_revenue.toFixed(2),
          e.total_revenue.toFixed(2),
        ]);
      }
    }
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-director-revenue-${seasonId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-emerald-400" />
              Event Director Revenue
            </h1>
            <p className="text-gray-400 mt-1">
              Entry-fee revenue by event director. One result (score sheet) = one paid entry,
              split into active members vs non-members / expired.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Season</label>
              <select
                value={seasonId}
                onChange={(e) => setSeasonId(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {seasons.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.year}{(s.is_current ?? s.isCurrent) ? ' (Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={exportCsv}
              disabled={!report || report.directors.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-200 rounded-lg border border-slate-600 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : !report || report.directors.length === 0 ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center text-gray-400">
            No events with results found for this season.
          </div>
        ) : (
          <>
            {/* Season summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Season Total</p>
                <p className="text-2xl font-bold text-emerald-400">{money(report.season_total)}</p>
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Events</p>
                <p className="text-2xl font-bold text-white">{report.event_count}</p>
              </div>
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Result Sheets</p>
                <p className="text-2xl font-bold text-white">{report.result_count}</p>
              </div>
            </div>

            {/* Per-director sections */}
            <div className="space-y-4">
              {report.directors.map((d) => {
                const key = d.director_id ?? '__unassigned__';
                const isCollapsed = collapsed[key];
                return (
                  <div key={key} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <button
                      onClick={() => toggle(key)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-700/40"
                    >
                      <div className="flex items-center gap-2 text-left">
                        {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        <span className="text-white font-semibold">{d.director_name}</span>
                        <span className="text-xs text-gray-400">({d.event_count} event{d.event_count === 1 ? '' : 's'})</span>
                      </div>
                      <span className="text-emerald-400 font-bold">{money(d.total_revenue)}</span>
                    </button>

                    {!isCollapsed && (
                      <div className="overflow-x-auto border-t border-slate-700">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-slate-900/40">
                              <th className="px-4 py-2 font-medium">Event</th>
                              <th className="px-4 py-2 font-medium">Date</th>
                              <th className="px-4 py-2 font-medium text-right">Members</th>
                              <th className="px-4 py-2 font-medium text-right">Non-Members</th>
                              <th className="px-4 py-2 font-medium text-right">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700/50">
                            {d.events.map((e) => (
                              <tr key={e.event_id} className="text-white">
                                <td className="px-4 py-2">
                                  {e.title}
                                  {!e.fees_set && (
                                    <span className="ml-2 inline-flex items-center gap-1 text-amber-400 text-xs" title="Entry fees not fully set on this event">
                                      <AlertTriangle className="w-3 h-3" /> fees not set
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-gray-400">{new Date(e.event_date).toLocaleDateString()}</td>
                                <td className="px-4 py-2 text-right">
                                  {e.member_count} × {e.member_fee == null ? '—' : money(e.member_fee)}
                                </td>
                                <td className="px-4 py-2 text-right">
                                  {e.non_member_count} × {e.non_member_fee == null ? '—' : money(e.non_member_fee)}
                                </td>
                                <td className="px-4 py-2 text-right font-semibold">{money(e.total_revenue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
