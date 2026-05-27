import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, Loader2, RefreshCw, Trophy } from 'lucide-react';
import { competitionResultsApi } from '@/competition-results/competition-results.api-client';
import { competitionClassesApi, CompetitionClass } from '@/competition-classes';

type PendingResult = Awaited<ReturnType<typeof competitionResultsApi.getPendingClassReview>>[number];

/**
 * Admin "Pending Results" queue. Lists competition results an Event Director
 * submitted whose class didn't exist in the system and was sent for review.
 * EDs can never create classes — here an admin either assigns the result to an
 * existing class, or creates the class and accepts the result into it. Either
 * action clears the pending flag and recalculates the event's points.
 */
export default function PendingResultsQueue() {
  const [pending, setPending] = useState<PendingResult[]>([]);
  const [classes, setClasses] = useState<CompetitionClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Per-row form state, keyed by result id.
  const [assignSel, setAssignSel] = useState<Record<string, string>>({});
  const [createName, setCreateName] = useState<Record<string, string>>({});
  const [createFmt, setCreateFmt] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, cls] = await Promise.all([
        competitionResultsApi.getPendingClassReview(),
        competitionClassesApi.getActive(),
      ]);
      setPending(rows);
      setClasses(cls);
      // Seed per-row defaults: suggested class for assign, entered name +
      // format for create.
      const aSel: Record<string, string> = {};
      const cName: Record<string, string> = {};
      const cFmt: Record<string, string> = {};
      for (const r of rows) {
        if (r.suggestedClass) aSel[r.id] = r.suggestedClass.id;
        cName[r.id] = r.competitionClass || '';
        cFmt[r.id] = r.format || '';
      }
      setAssignSel(aSel);
      setCreateName(cName);
      setCreateFmt(cFmt);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load pending results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Distinct formats that actually have classes, for the create-class picker.
  const formatOptions = useMemo(
    () => Array.from(new Set(classes.map((c) => c.format).filter(Boolean))).sort(),
    [classes],
  );

  // Active classes for a row, preferring the row's format. Falls back to all
  // active classes if nothing matches the format (so the admin is never stuck).
  const classesForRow = (row: PendingResult): CompetitionClass[] => {
    const f = (row.format || '').trim().toLowerCase();
    if (f) {
      const sameFormat = classes.filter((c) => (c.format || '').toLowerCase() === f);
      if (sameFormat.length > 0) return sameFormat;
    }
    return classes;
  };

  const handleAssign = async (row: PendingResult) => {
    const classId = assignSel[row.id];
    if (!classId) {
      alert('Pick a class to assign this result to.');
      return;
    }
    setBusyId(row.id);
    try {
      await competitionResultsApi.assignPendingToClass([row.id], classId);
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Failed to assign class');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateAndAccept = async (row: PendingResult) => {
    const name = (createName[row.id] || '').trim();
    const format = createFmt[row.id] || '';
    if (!name || !format) {
      alert('Enter a class name and pick a format.');
      return;
    }
    if (!row.seasonId) {
      alert('This result has no season, so a class can’t be created for it. Assign an existing class instead.');
      return;
    }
    setBusyId(row.id);
    try {
      await competitionResultsApi.createClassAndAcceptPending({
        resultIds: [row.id],
        name,
        format,
        seasonId: row.seasonId,
      });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || 'Failed to create class');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading pending results…
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-amber-400" />
          <div>
            <h3 className="text-xl font-bold text-white">Pending Results</h3>
            <p className="text-sm text-gray-400">
              Results submitted with a class that isn&rsquo;t in the system. Assign an existing class, or create the class and accept the result.
            </p>
          </div>
        </div>
        <button
          onClick={load}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {pending.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <Check className="h-10 w-10 text-green-500 mx-auto mb-3" />
          No results are waiting for class review. 🎉
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((row) => (
            <div key={row.id} className="bg-slate-900/60 border border-slate-700 rounded-lg p-4">
              <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                {/* Result details */}
                <div className="flex-1 min-w-[220px]">
                  <div className="text-white font-medium">{row.competitorName || 'Unknown competitor'}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    MECA ID: {row.mecaId || '—'} · Score: {row.score ?? '—'}
                  </div>
                  <div className="mt-2 text-sm">
                    <span className="text-gray-400">Entered class: </span>
                    <span className="text-amber-300 font-medium">{row.competitionClass || '—'}</span>
                    {row.format && <span className="text-gray-400"> ({row.format})</span>}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {row.eventTitle || 'Unknown event'}
                    {row.eventDate ? ` · ${new Date(row.eventDate).toLocaleDateString()}` : ''}
                  </div>
                </div>

                {/* Action: assign existing class */}
                <div className="lg:w-72">
                  <label className="block text-xs text-gray-400 mb-1">Assign existing class</label>
                  <div className="flex gap-2">
                    <select
                      value={assignSel[row.id] || ''}
                      onChange={(e) => setAssignSel((p) => ({ ...p, [row.id]: e.target.value }))}
                      className="flex-1 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    >
                      <option value="">Select class…</option>
                      {classesForRow(row).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.format} · {c.abbreviation} - {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssign(row)}
                      disabled={busyId === row.id || !assignSel[row.id]}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded"
                    >
                      {busyId === row.id ? '…' : 'Assign'}
                    </button>
                  </div>
                </div>

                {/* Action: create new class + accept */}
                <div className="lg:w-80">
                  <label className="block text-xs text-gray-400 mb-1">Or create the class &amp; accept</label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={createName[row.id] ?? ''}
                      onChange={(e) => setCreateName((p) => ({ ...p, [row.id]: e.target.value }))}
                      placeholder="Class name"
                      className="flex-1 min-w-[120px] px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                    <select
                      value={createFmt[row.id] ?? ''}
                      onChange={(e) => setCreateFmt((p) => ({ ...p, [row.id]: e.target.value }))}
                      className="px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    >
                      <option value="">Format…</option>
                      {formatOptions.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleCreateAndAccept(row)}
                      disabled={busyId === row.id || !createName[row.id]?.trim() || !createFmt[row.id] || !row.seasonId}
                      title={!row.seasonId ? 'No season on this result — assign an existing class instead' : undefined}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm rounded"
                    >
                      {busyId === row.id ? '…' : 'Create & Accept'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
