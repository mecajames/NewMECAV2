import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, RefreshCw, Link2, ExternalLink, X } from 'lucide-react';
import { competitionResultsApi } from '@/competition-results';
import { competitionClassesApi, CompetitionClass } from '@/competition-classes';

/**
 * Admin tool: list every CompetitionResult that can't be resolved to
 * an active class (orphan class_id + text fallback also failed). For
 * each row, admin picks a target class from a dropdown and clicks
 * Link to repoint it. Bulk-link rows that share the same
 * competition_class text (so 8 "M4" results can be fixed in one
 * action instead of eight).
 */
type OrphanRow = Awaited<ReturnType<typeof competitionResultsApi.getOrphanResults>>[number];

export default function ResultsNeedingClassPage() {
  const navigate = useNavigate();
  const [orphans, setOrphans] = useState<OrphanRow[]>([]);
  const [classes, setClasses] = useState<CompetitionClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkBusy, setLinkBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Per-group selected target class. Keyed by the group key (format
  // ::competition_class text), so picking once links every result in
  // the group.
  const [groupTarget, setGroupTarget] = useState<Record<string, string>>({});
  // Free-form per-row selection. Admin can pick rows across groups,
  // then bulk-link them via the sticky toolbar — useful when the
  // groups need different target classes (e.g. some "X" rows go to
  // SPL Extreme and others to SQL Extreme).
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [bulkTargetClassId, setBulkTargetClassId] = useState<string>('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const toggleRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const setRowsSelected = (ids: string[], selected: boolean) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (selected) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };
  const clearSelection = () => setSelectedRowIds(new Set());

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, c] = await Promise.all([
        competitionResultsApi.getOrphanResults(),
        competitionClassesApi.getAll(),
      ]);
      setOrphans(o);
      setClasses(c);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load orphan results');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetch(); }, []);

  // Group orphans by (format, competition_class text) so admins can
  // bulk-link rows that all reference the same misspelled/missing
  // class instead of clicking through them individually.
  const groups = useMemo(() => {
    const m = new Map<string, {
      key: string;
      format: string;
      competitionClass: string;
      rows: OrphanRow[];
      suggestedClass: OrphanRow['suggestedClass'];
    }>();
    for (const r of orphans) {
      const key = `${(r.format || '∅').toLowerCase()}::${(r.competitionClass || '∅').toLowerCase()}`;
      const existing = m.get(key);
      if (existing) {
        existing.rows.push(r);
      } else {
        m.set(key, {
          key,
          format: r.format || '',
          competitionClass: r.competitionClass || '',
          rows: [r],
          suggestedClass: r.suggestedClass,
        });
      }
    }
    return Array.from(m.values()).sort((a, b) => b.rows.length - a.rows.length);
  }, [orphans]);

  const handleLinkGroup = async (group: typeof groups[number]) => {
    const classId = groupTarget[group.key];
    if (!classId) {
      alert('Pick a target class first.');
      return;
    }
    const ok = window.confirm(
      `Link ${group.rows.length} result${group.rows.length === 1 ? '' : 's'} for "${group.competitionClass}" to the selected class?\n\n` +
      `This updates each row's class_id and re-syncs its format / class-name text fields.`,
    );
    if (!ok) return;
    setLinkBusy(group.key);
    try {
      const r = await competitionResultsApi.repointToClass(group.rows.map(x => x.id), classId);
      alert(`Linked ${r.updated} result(s).`);
      await fetch();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Link failed');
    } finally {
      setLinkBusy(null);
    }
  };

  /**
   * Bulk link only the rows the admin has checked in the table. Lets
   * them mix groups in a single action (e.g. select some "X (SPL)"
   * rows + some standalone rows that should all go to the same
   * target class). After success, clears the selection.
   */
  const handleLinkSelected = async () => {
    if (!bulkTargetClassId) {
      alert('Pick a target class for the selected rows.');
      return;
    }
    const ids = Array.from(selectedRowIds);
    if (ids.length === 0) return;
    const cls = classes.find(c => c.id === bulkTargetClassId);
    const label = cls ? `${cls.name} (${cls.abbreviation}, ${cls.format})` : 'the selected class';
    const ok = window.confirm(
      `Link ${ids.length} selected result${ids.length === 1 ? '' : 's'} to ${label}?\n\n` +
      `This updates each row's class_id and re-syncs its format / class-name text fields.`,
    );
    if (!ok) return;
    setBulkBusy(true);
    try {
      const r = await competitionResultsApi.repointToClass(ids, bulkTargetClassId);
      alert(`Linked ${r.updated} result(s).`);
      clearSelection();
      setBulkTargetClassId('');
      await fetch();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Link failed');
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-7 w-7 text-amber-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Results Needing Class Assignment</h1>
              <p className="text-sm text-gray-400">
                These results reference a class that no longer exists (or is inactive AND no text-fallback match). They're hidden from public results until you link each group to a class.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : orphans.length === 0 ? (
          <div className="py-16 text-center bg-slate-800 rounded-xl border border-slate-700">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-green-500/60" />
            <p className="text-gray-300">No orphan results — every result resolves to an active class.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              <strong>{orphans.length}</strong> result{orphans.length === 1 ? '' : 's'} across <strong>{groups.length}</strong> group{groups.length === 1 ? '' : 's'}. Pick a target class for each group and click Link.
            </p>
            {groups.map((g) => (
              <div key={g.key} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold">
                      "{g.competitionClass || '(no class text)'}"
                      {g.format && <span className="text-gray-400 font-normal text-sm"> · format: {g.format}</span>}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {g.rows.length} result{g.rows.length === 1 ? '' : 's'} affected
                      {g.suggestedClass && (
                        <> · suggestion: <span className="text-orange-300">{g.suggestedClass.name}</span> ({g.suggestedClass.abbreviation}, {g.suggestedClass.format}{!g.suggestedClass.isActive && ', inactive'})</>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={groupTarget[g.key] || g.suggestedClass?.id || ''}
                      onChange={(e) => setGroupTarget((p) => ({ ...p, [g.key]: e.target.value }))}
                      className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 max-w-xs"
                    >
                      <option value="">Link to class…</option>
                      {classes
                        .slice()
                        .sort((a, b) => `${a.format} ${a.name}`.localeCompare(`${b.format} ${b.name}`))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            [{c.format}] {c.name} ({c.abbreviation}){!c.is_active ? ' · inactive' : ''}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => handleLinkGroup(g)}
                      disabled={linkBusy === g.key || !(groupTarget[g.key] || g.suggestedClass?.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      <Link2 className="h-4 w-4" />
                      {linkBusy === g.key ? 'Linking…' : `Link ${g.rows.length}`}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  {(() => {
                    // Group-level "select all" tri-state: checked when
                    // every row in the group is selected, indeterminate
                    // when some are, unchecked otherwise.
                    const groupIds = g.rows.map(r => r.id);
                    const allChecked = groupIds.every(id => selectedRowIds.has(id));
                    const someChecked = !allChecked && groupIds.some(id => selectedRowIds.has(id));
                    return (
                      <table className="w-full text-sm">
                        <thead className="bg-slate-700/40">
                          <tr>
                            <th className="px-3 py-2 text-left w-10">
                              <input
                                type="checkbox"
                                checked={allChecked}
                                ref={(el) => { if (el) el.indeterminate = someChecked; }}
                                onChange={(e) => setRowsSelected(groupIds, e.target.checked)}
                                className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-orange-500 focus:ring-orange-500"
                                title="Select all rows in this group"
                              />
                            </th>
                            <th className="px-4 py-2 text-left font-medium text-gray-300">Event</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-300">Competitor</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-300">MECA ID</th>
                            <th className="px-4 py-2 text-right font-medium text-gray-300">Score</th>
                            <th className="px-4 py-2 text-right font-medium text-gray-300">Place</th>
                            <th className="px-4 py-2 text-left font-medium text-gray-300">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                          {g.rows.map((r) => {
                            const selected = selectedRowIds.has(r.id);
                            return (
                              <tr
                                key={r.id}
                                className={`${selected ? 'bg-orange-500/10' : 'hover:bg-slate-700/20'} transition-colors`}
                              >
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() => toggleRow(r.id)}
                                    className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-orange-500 focus:ring-orange-500"
                                  />
                                </td>
                                <td className="px-4 py-2 text-gray-200">
                                  {r.eventTitle ? (
                                    <a
                                      href={`/results?eventId=${r.eventId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1"
                                    >
                                      {r.eventTitle}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ) : '—'}
                                </td>
                                <td className="px-4 py-2 text-gray-200">{r.competitorName || '—'}</td>
                                <td className="px-4 py-2 text-gray-300">{r.mecaId || '—'}</td>
                                <td className="px-4 py-2 text-right text-gray-200">{r.score ?? '—'}</td>
                                <td className="px-4 py-2 text-right text-gray-200">{r.placement ?? '—'}</td>
                                <td className="px-4 py-2 text-gray-400 text-xs">
                                  {new Date(r.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sticky bulk-link toolbar — appears whenever the admin has
            at least one row checked. Lets them mix groups (e.g. some
            "X (SPL)" rows + some standalone rows) and link the
            selection in a single action. Doesn't replace the per-
            group fast button above; it's an additional path. */}
        {selectedRowIds.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-800 border-t border-slate-600 shadow-2xl">
            <div className="mx-auto max-w-screen-2xl px-4 py-3 sm:px-6 lg:px-8 flex flex-wrap items-center gap-3">
              <div className="text-white font-semibold">
                {selectedRowIds.size} selected
              </div>
              <select
                value={bulkTargetClassId}
                onChange={(e) => setBulkTargetClassId(e.target.value)}
                className="flex-1 min-w-[14rem] max-w-md px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Link selected rows to class…</option>
                {classes
                  .slice()
                  .sort((a, b) => `${a.format} ${a.name}`.localeCompare(`${b.format} ${b.name}`))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.format}] {c.name} ({c.abbreviation}){!c.is_active ? ' · inactive' : ''}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleLinkSelected}
                disabled={bulkBusy || !bulkTargetClassId}
                className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Link2 className="h-4 w-4" />
                {bulkBusy ? 'Linking…' : `Link ${selectedRowIds.size}`}
              </button>
              <button
                onClick={clearSelection}
                disabled={bulkBusy}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-gray-300 hover:text-white text-sm font-medium rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
