import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Trophy, CheckCircle, AlertTriangle, UserCheck, Loader2, RotateCcw } from 'lucide-react';
import { competitionResultsApi } from '@/competition-results';
import { seasonsApi, Season } from '@/seasons/seasons.api-client';

/**
 * Admin "Find Results" (/admin/find-results — Event Management → below Enter
 * Results). Search every competition result that could belong to a member by
 * NAME, EMAIL, or ANY MECA ID they've ever held (active, expired, historical,
 * or guest-stamped), select rows, and assign them to a specific MECA ID.
 *
 * Built for the renewal case: a member lapsed, renewed (sometimes under a new
 * ID), and their old results no longer show in My MECA. The assignment moves
 * the rows to the target ID, links the owner's profile, and recalculates the
 * affected events so held points release immediately.
 */
export default function AdminFindResultsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  // Season scoping: none selected = search ALL seasons; toggle any number.
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<Set<string>>(new Set());
  const [rows, setRows] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetMecaId, setTargetMecaId] = useState('');
  const [owner, setOwner] = useState<{ found: boolean; name?: string; email?: string; active?: boolean } | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const search = async () => {
    if (query.trim().length < 2) {
      setMessage({ type: 'error', text: 'Enter at least 2 characters (a name, email, or MECA ID).' });
      return;
    }
    setLoading(true);
    setMessage(null);
    setSelected(new Set());
    try {
      const data = await competitionResultsApi.adminSearchResults(query.trim(), [...selectedSeasons]);
      setRows(data);
      setSearched(true);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Search failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    seasonsApi.getAll().then(setSeasons).catch(() => setSeasons([]));
  }, []);

  // Reset everything back to a fresh page: query, seasons, results, selection,
  // target ID, and any messages.
  const resetAll = () => {
    setQuery('');
    setSelectedSeasons(new Set());
    setRows([]);
    setSearched(false);
    setSelected(new Set());
    setTargetMecaId('');
    setOwner(null);
    setMessage(null);
  };

  const toggleSeason = (id: string) => {
    setSelectedSeasons(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const seasonName = (id?: string | null) => (id ? seasons.find(s => s.id === id)?.name ?? '—' : '—');

  // Live owner preview while typing the target MECA ID.
  useEffect(() => {
    const id = targetMecaId.trim();
    if (!/^\d{3,}$/.test(id)) { setOwner(null); return; }
    const t = setTimeout(() => {
      competitionResultsApi.adminMecaIdOwner(id).then(setOwner).catch(() => setOwner(null));
    }, 350);
    return () => clearTimeout(t);
  }, [targetMecaId]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(prev => (prev.size === rows.length ? new Set() : new Set(rows.map(r => r.id))));
  };

  const assign = async () => {
    if (selected.size === 0 || !owner?.found) return;
    if (!confirm(
      `Assign ${selected.size} result(s) to MECA ID ${targetMecaId.trim()} (${owner.name})?\n\n` +
      `The rows will be linked to their profile and the affected events recalculated.`,
    )) return;
    setAssigning(true);
    setMessage(null);
    try {
      const result = await competitionResultsApi.adminAssignResults([...selected], targetMecaId.trim());
      setMessage({
        type: 'success',
        text: `Assigned ${result.updated} result(s) to ${result.owner} (MECA ID ${targetMecaId.trim()}) and recalculated ${result.eventsRecalculated} event(s). Their My MECA results are up to date.`,
      });
      setSelected(new Set());
      await search();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Assignment failed' });
    } finally {
      setAssigning(false);
    }
  };

  const rowFlag = (r: any): { label: string; cls: string } | null => {
    if (r.meca_id === '999999') return { label: r.pending_back_fill ? 'guest-stamped (awaiting renewal)' : 'guest', cls: 'bg-amber-900/50 text-amber-300' };
    if (!r.meca_id) return { label: 'no MECA ID', cls: 'bg-red-900/50 text-red-300' };
    if (r.points_held_for_renewal) return { label: 'points held', cls: 'bg-purple-900/50 text-purple-300' };
    if (!r.competitor_id) return { label: 'not linked to a profile', cls: 'bg-slate-600 text-gray-300' };
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="text-gray-400 hover:text-white"><ArrowLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="h-6 w-6 text-orange-500" /> Find Results
            </h1>
            <p className="text-sm text-gray-400">
              Search a member's results by name, email, or ANY MECA ID they've held — then assign the selected rows to their current MECA ID.
            </p>
          </div>
        </div>

        {message && (
          <div className={`rounded-lg p-3 text-sm flex items-start gap-2 ${message.type === 'success' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
            {message.text}
          </div>
        )}

        {/* Search bar */}
        <div className="bg-slate-800 rounded-xl p-4 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="Member name, email address, or MECA ID…"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
          <button onClick={search} disabled={loading} className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg flex items-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
          </button>
          <button onClick={resetAll} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 text-sm font-medium rounded-lg flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>

          {/* Season scoping: none selected = all seasons; pick any number. */}
          {seasons.length > 0 && (
            <div className="w-full flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400">Seasons:</span>
              <button
                onClick={() => setSelectedSeasons(new Set())}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedSeasons.size === 0 ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
              >
                All seasons
              </button>
              {seasons.map(s => (
                <button
                  key={s.id}
                  onClick={() => toggleSeason(s.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedSeasons.has(s.id) ? 'bg-orange-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'}`}
                >
                  {s.name}
                </button>
              ))}
              {selectedSeasons.size > 0 && (
                <span className="text-xs text-gray-500">searching {selectedSeasons.size} season{selectedSeasons.size === 1 ? '' : 's'}</span>
              )}
            </div>
          )}
        </div>

        {/* Assignment bar — appears once rows are selected */}
        {rows.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-3 sticky top-2 z-10 border border-slate-700">
            <span className="text-sm text-gray-300">{selected.size} of {rows.length} selected</span>
            <div className="flex items-center gap-2 flex-1 min-w-[260px] justify-end">
              <label className="text-sm text-gray-400">Assign to MECA ID:</label>
              <input
                value={targetMecaId}
                onChange={e => setTargetMecaId(e.target.value)}
                placeholder="e.g. 701567"
                className="w-32 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              />
              <button
                onClick={assign}
                disabled={assigning || selected.size === 0 || !owner?.found}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg flex items-center gap-2"
              >
                {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                Assign {selected.size > 0 ? selected.size : ''} Result{selected.size === 1 ? '' : 's'}
              </button>
            </div>
            {targetMecaId.trim().length >= 3 && (
              <div className="w-full text-sm">
                {owner?.found ? (
                  <span className={owner.active ? 'text-emerald-400' : 'text-amber-400'}>
                    ✓ {targetMecaId.trim()} belongs to <strong>{owner.name}</strong>{owner.email ? ` (${owner.email})` : ''} — {owner.active ? 'ACTIVE member' : 'NOT currently active (held points will stay held until they renew)'}
                  </span>
                ) : (
                  <span className="text-red-400">✗ No member holds MECA ID {targetMecaId.trim()}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Results table */}
        {searched && rows.length === 0 && !loading && (
          <div className="bg-slate-800 rounded-xl p-8 text-center text-gray-400">No results matched "{query}".</div>
        )}
        {rows.length > 0 && (
          <div className="bg-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-slate-700">
                  <th className="p-3"><input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={toggleAll} className="accent-orange-500" /></th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Season</th>
                  <th className="p-3">Event</th>
                  <th className="p-3">Competitor</th>
                  <th className="p-3">MECA ID</th>
                  <th className="p-3">Format / Class</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Points</th>
                  <th className="p-3">Flags</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const flag = rowFlag(r);
                  return (
                    <tr key={r.id} onClick={() => toggle(r.id)} className={`border-b border-slate-700/60 cursor-pointer transition-colors ${selected.has(r.id) ? 'bg-orange-900/20' : 'hover:bg-slate-750'}`}>
                      <td className="p-3"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} onClick={e => e.stopPropagation()} className="accent-orange-500" /></td>
                      <td className="p-3 text-gray-300 whitespace-nowrap">{r.event_date ? new Date(r.event_date).toLocaleDateString() : '—'}</td>
                      <td className="p-3 text-gray-400 whitespace-nowrap">{seasonName(r.season_id)}</td>
                      <td className="p-3 text-white">{r.event_title ?? '—'}</td>
                      <td className="p-3 text-gray-300">
                        {r.competitor_name || '—'}
                        {(r.linked_first_name || r.linked_last_name) && (
                          <div className="text-xs text-gray-500">linked: {[r.linked_first_name, r.linked_last_name].filter(Boolean).join(' ')}{r.linked_email ? ` · ${r.linked_email}` : ''}</div>
                        )}
                      </td>
                      <td className="p-3 text-gray-300 font-mono">
                        {r.meca_id ?? '—'}
                        {r.original_meca_id && <div className="text-xs text-gray-500">was: {r.original_meca_id}</div>}
                      </td>
                      <td className="p-3 text-gray-300">{r.format ?? '—'} / {r.competition_class ?? '—'}</td>
                      <td className="p-3 text-gray-300">{r.score ?? '—'}</td>
                      <td className="p-3 text-orange-400 font-medium">
                        <span title={r.points_reason || undefined} className={r.points_reason ? 'cursor-help' : undefined}>{r.points_earned ?? 0}</span>
                      </td>
                      <td className="p-3">
                        {flag && <span className={`text-xs px-2 py-0.5 rounded-full ${flag.cls}`}>{flag.label}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length >= 500 && (
              <div className="p-3 text-xs text-amber-400">Showing the first 500 matches — narrow the search if what you need isn't here.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
