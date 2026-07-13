import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert, Wrench } from 'lucide-react';
import { billingApi, ReconciliationReport, ReconCheck, ReconSeverity } from '../../../api-client/billing.api-client';

const SEVERITY_STYLES: Record<ReconSeverity, { badge: string; icon: string }> = {
  critical: { badge: 'bg-red-500/15 text-red-300 border-red-500/30', icon: 'text-red-400' },
  warning: { badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: 'text-amber-400' },
  info: { badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30', icon: 'text-blue-400' },
};

type ReconMode = 'ledger' | 'gateway';

/** Show the "Fix records the truth…" hint only for remediable checks that have at least one fixable (non-note) row. */
function canFixHint(remediable: Record<string, string>, check: ReconCheck): boolean {
  return !!remediable[check.key] && check.sample.some((r) => !r.note);
}

export default function ReconciliationPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<ReconMode>('ledger');
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState(30);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [remediable, setRemediable] = useState<Record<string, string>>({});
  const [fixingRow, setFixingRow] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async (m: ReconMode = mode) => {
    try {
      setLoading(true);
      const data = m === 'gateway' ? await billingApi.getLiveReconciliation() : await billingApi.getReconciliation();
      setReport(data);
      setError(null);
    } catch (err) {
      console.error('Error loading reconciliation report:', err);
      setError('Failed to load reconciliation report');
    } finally {
      setLoading(false);
    }
  };

  const runNow = async () => {
    try {
      setRunning(true);
      const data = mode === 'gateway'
        ? await billingApi.runLiveReconciliation(Math.min(windowDays, 31))
        : await billingApi.runReconciliation(windowDays);
      setReport(data);
      setError(null);
    } catch (err) {
      console.error('Error running reconciliation:', err);
      setError('Failed to run reconciliation');
    } finally {
      setRunning(false);
    }
  };

  const switchMode = (m: ReconMode) => {
    if (m === mode) return;
    setMode(m);
    setReport(null);
    setExpanded({});
    if (m === 'gateway' && windowDays > 31) setWindowDays(7);
    load(m);
  };

  useEffect(() => {
    load('ledger');
    billingApi.getRemediableChecks().then(setRemediable).catch(() => setRemediable({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bulk remediation: run the same per-row Fix over every fixable row in a
  // check (sequentially — each back-fill is audited individually). The list
  // shows up to 25 rows per pass, so large sets may need a re-run.
  const [fixingAll, setFixingAll] = useState<string | null>(null);
  const [fixAllProgress, setFixAllProgress] = useState<{ done: number; total: number; failed: number } | null>(null);

  const handleFixAll = async (check: ReconCheck) => {
    const fixable = check.sample.filter((r) => !r.note);
    if (fixable.length === 0) return;
    const label = remediable[check.key] || 'Apply this fix?';
    if (!window.confirm(
      `${label}\n\nApply this fix to ALL ${fixable.length} listed rows? Each one back-fills or syncs a record — no money is moved. ` +
      `(The list shows up to 25 rows per pass — re-run afterwards if more remain.)`,
    )) {
      return;
    }
    setFixingAll(check.key);
    setActionMsg(null);
    let ok = 0;
    let failed = 0;
    for (const row of fixable) {
      try {
        const res = await billingApi.remediateReconciliation(check.key, row);
        if (res.success) ok++; else failed++;
      } catch {
        failed++;
      }
      setFixAllProgress({ done: ok + failed, total: fixable.length, failed });
    }
    setFixingAll(null);
    setFixAllProgress(null);
    setActionMsg({
      ok: failed === 0,
      text: `Fix all complete: ${ok} fixed, ${failed} failed${failed > 0 ? ' — use the per-row Fix buttons on the remaining rows to see each error' : ''}.`,
    });
    await load(mode);
  };

  const handleFix = async (checkKey: string, row: Record<string, any>, rowKey: string) => {
    const label = remediable[checkKey] || 'Apply this fix?';
    if (!window.confirm(`${label}\n\nThis records the confirmed truth in the database (no money is moved). Continue?`)) {
      return;
    }
    try {
      setFixingRow(rowKey);
      setActionMsg(null);
      const res = await billingApi.remediateReconciliation(checkKey, row);
      setActionMsg({ ok: res.success, text: res.message });
      if (res.success) await load(mode);
    } catch (err: any) {
      setActionMsg({ ok: false, text: err?.response?.data?.message || 'Remediation failed' });
    } finally {
      setFixingRow(null);
    }
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Never';
    return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const columnsFor = (check: ReconCheck): string[] => {
    const keys = new Set<string>();
    for (const row of check.sample) Object.keys(row).forEach((k) => keys.add(k));
    return Array.from(keys);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/admin/billing')}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Billing
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-orange-500" />
              Billing Reconciliation
            </h1>
            <p className="text-gray-400 mt-1">
              {mode === 'gateway'
                ? 'Live verification against the real Stripe & PayPal accounts — finds money the database never recorded (and vice-versa). Runs daily.'
                : 'Cross-ledger consistency checks (orders ↔ invoices ↔ payments ↔ refunds) and gateway webhook errors. Runs nightly.'}
            </p>
          </div>
        </div>

        {/* Controls — ONE row (James 2026-07-05): mode toggle · window ·
            Run Now on the left, last-run timestamp pinned to the far right
            so it can't push the controls around. Wraps on small screens. */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="inline-flex rounded-lg bg-slate-800 border border-slate-700 p-1">
            <button
              onClick={() => switchMode('ledger')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'ledger' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Ledger (internal)
            </button>
            <button
              onClick={() => switchMode('gateway')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'gateway' ? 'bg-orange-600 text-white' : 'text-gray-300 hover:text-white'
              }`}
            >
              Gateway (live)
            </button>
          </div>
          <label className="text-sm text-gray-400">Window:</label>
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(parseInt(e.target.value, 10))}
            className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            {mode === 'gateway' ? (
              <>
                <option value={14}>Last 14 days</option>
                <option value={31}>Last 31 days</option>
              </>
            ) : (
              <>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last 365 days</option>
              </>
            )}
          </select>
          <button
            onClick={runNow}
            disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Running…' : 'Run Now'}
          </button>
          {report?.generatedAt && (
            <span className="ml-auto text-xs text-gray-500 whitespace-nowrap">
              Last run: {formatDateTime(report.generatedAt)}
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-700 rounded-lg p-4 mb-6 text-red-300 text-sm">{error}</div>
        )}

        {actionMsg && (
          <div
            className={`rounded-lg p-4 mb-6 text-sm border ${
              actionMsg.ok
                ? 'bg-green-950/40 border-green-700/50 text-green-300'
                : 'bg-amber-950/40 border-amber-700/50 text-amber-300'
            }`}
          >
            {actionMsg.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500"></div>
          </div>
        ) : !report || !report.generatedAt ? (
          <div className="bg-slate-800 rounded-xl p-10 text-center text-gray-400">
            No reconciliation has run yet. Click <span className="text-orange-400 font-semibold">Run Now</span> to generate the first report.
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-800 rounded-xl p-5">
                <p className="text-gray-400 text-xs uppercase">Total Issues</p>
                <p className={`text-3xl font-bold mt-1 ${report.totalIssues > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                  {report.totalIssues}
                </p>
              </div>
              <div className="bg-slate-800 rounded-xl p-5">
                <p className="text-gray-400 text-xs uppercase">Critical</p>
                <p className={`text-3xl font-bold mt-1 ${report.criticalIssues > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {report.criticalIssues}
                </p>
              </div>
              <div className="bg-slate-800 rounded-xl p-5">
                <p className="text-gray-400 text-xs uppercase">Window</p>
                <p className="text-3xl font-bold mt-1 text-white">{report.windowDays}d</p>
              </div>
            </div>

            {report.totalIssues === 0 && (
              <div className="bg-green-950/40 border border-green-700/50 rounded-xl p-5 mb-6 flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-400" />
                <p className="text-green-300">No discrepancies found in the selected window. The ledgers reconcile.</p>
              </div>
            )}

            {/* Checks */}
            <div className="space-y-4">
              {report.checks.map((check) => {
                const styles = SEVERITY_STYLES[check.severity];
                const isOpen = expanded[check.key];
                const clean = check.count === 0;
                return (
                  <div key={check.key} className="bg-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpanded((p) => ({ ...p, [check.key]: !p[check.key] }))}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {clean ? (
                          <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className={`h-5 w-5 ${styles.icon} flex-shrink-0`} />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-semibold">{check.label}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase ${styles.badge}`}>
                              {check.severity}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mt-0.5">{check.description}</p>
                        </div>
                      </div>
                      <span className={`text-2xl font-bold ${clean ? 'text-green-400' : styles.icon}`}>{check.count}</span>
                    </button>

                    {isOpen && check.sample.length > 0 && (
                      <div className="border-t border-slate-700 overflow-x-auto">
                        {/* Bulk fix bar — remediable checks with 2+ fixable rows */}
                        {!!remediable[check.key] && check.sample.filter((r) => !r.note).length > 1 && (
                          <div className="px-4 py-2 border-b border-slate-700/60 flex items-center justify-between gap-3">
                            <span className="text-xs text-gray-500">
                              {fixingAll === check.key && fixAllProgress
                                ? `Fixing ${fixAllProgress.done}/${fixAllProgress.total}${fixAllProgress.failed > 0 ? ` (${fixAllProgress.failed} failed)` : ''}…`
                                : `${check.sample.filter((r) => !r.note).length} fixable rows listed`}
                            </span>
                            <button
                              onClick={() => handleFixAll(check)}
                              disabled={fixingAll !== null || fixingRow !== null}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-xs font-semibold rounded-md transition-colors"
                            >
                              <Wrench className="h-3.5 w-3.5" />
                              {fixingAll === check.key ? 'Fixing…' : `Fix All (${check.sample.filter((r) => !r.note).length})`}
                            </button>
                          </div>
                        )}
                        {(() => {
                          const canFix = !!remediable[check.key];
                          return (
                            <table className="min-w-full text-sm">
                              <thead className="bg-slate-700/40">
                                <tr>
                                  {columnsFor(check).map((col) => (
                                    <th key={col} className="text-left px-4 py-2 text-gray-400 font-medium whitespace-nowrap">
                                      {col}
                                    </th>
                                  ))}
                                  {canFix && <th className="text-left px-4 py-2 text-gray-400 font-medium">Action</th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-700/60">
                                {check.sample.map((row, i) => {
                                  const rowKey = `${check.key}:${i}`;
                                  return (
                                    <tr key={i} className="hover:bg-slate-700/20">
                                      {columnsFor(check).map((col) => (
                                        <td key={col} className="px-4 py-2 text-gray-300 whitespace-nowrap font-mono text-xs">
                                          {row[col] === null || row[col] === undefined ? '—' : String(row[col])}
                                        </td>
                                      ))}
                                      {canFix && (
                                        <td className="px-4 py-2 whitespace-nowrap">
                                          {row.note ? (
                                            <span className="text-gray-500 text-xs">—</span>
                                          ) : (
                                            <button
                                              onClick={() => handleFix(check.key, row, rowKey)}
                                              disabled={fixingRow === rowKey}
                                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-xs font-medium rounded-md transition-colors"
                                            >
                                              <Wrench className="h-3 w-3" />
                                              {fixingRow === rowKey ? 'Fixing…' : 'Fix'}
                                            </button>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          );
                        })()}
                        {canFixHint(remediable, check) && (
                          <p className="px-4 py-2 text-xs text-gray-500 border-t border-slate-700/60">
                            “Fix” records the confirmed truth in the database (back-fills a missing record or syncs a status). No money is moved.
                          </p>
                        )}
                        {check.count >= 25 && (
                          <p className="px-4 py-2 text-xs text-gray-500">
                            Showing the first 25 rows. Narrow the window or investigate directly for the full set.
                          </p>
                        )}
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
