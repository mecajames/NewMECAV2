import { useState } from 'react';
import { Activity, AlertTriangle, CheckCircle, RefreshCw, Wrench } from 'lucide-react';
import {
  systemDiagnosticsApi,
  MecaIdMismatchReport,
  MecaIdMismatchRow,
  ResultsHygieneReport,
} from '@/api-client/system-diagnostics.api-client';
import { membershipsApi } from '@/memberships/memberships.api-client';
import { competitionResultsApi } from '@/competition-results';

type RowMessage = { type: 'success' | 'error'; message: string };

// Surface the backend's real error message, never an opaque failure.
const errMessage = (err: unknown, fallback: string): string => {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
};

/**
 * Results & Points Diagnostic Center (Site Settings → System).
 *
 * One button scans the live database for every known way members lose points
 * or results, explains each finding in plain language, and puts the fix
 * button right next to it — no SQL, no scripts, runs on prod any time:
 *
 *  - ID MISMATCH (the Pringle case): a member's ACTIVE membership carries a
 *    different MECA ID than their profile/results. They show "not active" in
 *    Find Results and their points stay held. Fix = one click per member
 *    (super-admin password): moves the active membership onto the member's
 *    real ID, merges results, and recalculates the affected events.
 *  - HYGIENE: whitespace-damaged result IDs (Trim fix), result rows not
 *    linked to the owning member profile (Link fix), guest-stamped rows
 *    awaiting back-fill, and the current held-points total for context.
 */
export default function ResultsDiagnosticCenter() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState<MecaIdMismatchReport | null>(null);
  const [hygiene, setHygiene] = useState<ResultsHygieneReport | null>(null);

  // Per-member mismatch fixes are super-admin-password gated (same gate as
  // the MECA ID Override tool — this IS that tool, pre-filled).
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [fixingMembershipId, setFixingMembershipId] = useState<string | null>(null);
  const [rowMessages, setRowMessages] = useState<Record<string, RowMessage>>({});

  const [trimming, setTrimming] = useState(false);
  const [linking, setLinking] = useState(false);
  const [hygieneMessage, setHygieneMessage] = useState<RowMessage | null>(null);

  // Full realignment: recalc placements + points for EVERY event.
  const [recalcingAll, setRecalcingAll] = useState(false);
  const [recalcAllMessage, setRecalcAllMessage] = useState<RowMessage | null>(null);

  const runDiagnostics = async () => {
    setRunning(true);
    setError(null);
    try {
      const [mm, hg] = await Promise.all([
        systemDiagnosticsApi.mecaIdMismatch(),
        systemDiagnosticsApi.resultsHygiene(),
      ]);
      setMismatch(mm);
      setHygiene(hg);
    } catch (err) {
      setError(errMessage(err, 'Diagnostic scan failed'));
    } finally {
      setRunning(false);
    }
  };

  const fixMismatch = async (row: MecaIdMismatchRow) => {
    const targetId = parseInt(String(row.profile_meca_id).trim(), 10);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      setRowMessages(prev => ({
        ...prev,
        [row.active_membership_id]: { type: 'error', message: `Profile MECA ID "${row.profile_meca_id}" is not a valid number — fix manually via the membership's MECA ID Override tool.` },
      }));
      return;
    }
    if (!superAdminPassword.trim()) {
      setRowMessages(prev => ({
        ...prev,
        [row.active_membership_id]: { type: 'error', message: 'Enter the super admin password above first.' },
      }));
      return;
    }
    setFixingMembershipId(row.active_membership_id);
    try {
      const result = await membershipsApi.superAdminOverrideMecaId(
        row.active_membership_id,
        targetId,
        superAdminPassword,
        `Diagnostic Center: active membership carried ${row.active_membership_meca_id} but the member's profile/results are on ${row.profile_meca_id} — aligning the membership to the member's real ID.`,
        true, // confirmReassign: reclaiming the member's OWN id is the expected path
        false,
      );
      if (result.success) {
        setRowMessages(prev => ({
          ...prev,
          [row.active_membership_id]: { type: 'success', message: result.message },
        }));
        // Re-scan so the fixed member drops off the list.
        await runDiagnostics();
      } else {
        // other_user conflict (someone ELSE holds the id) — a takeover is too
        // consequential for one click; send the admin to the full tool.
        setRowMessages(prev => ({
          ...prev,
          [row.active_membership_id]: {
            type: 'error',
            message: `${result.message} Use the MECA ID Override tool on the membership to review and confirm.`,
          },
        }));
      }
    } catch (err) {
      setRowMessages(prev => ({
        ...prev,
        [row.active_membership_id]: { type: 'error', message: errMessage(err, 'Fix failed') },
      }));
    } finally {
      setFixingMembershipId(null);
    }
  };

  const runTrim = async () => {
    setTrimming(true);
    setHygieneMessage(null);
    try {
      const result = await competitionResultsApi.trimMecaIds();
      setHygieneMessage({
        type: 'success',
        message: result.updated > 0
          ? `Trimmed whitespace off ${result.updated} result MECA ID${result.updated === 1 ? '' : 's'}.`
          : 'Nothing to trim — all result MECA IDs are already clean.',
      });
      await runDiagnostics();
    } catch (err) {
      setHygieneMessage({ type: 'error', message: errMessage(err, 'Trim failed') });
    } finally {
      setTrimming(false);
    }
  };

  const runLink = async () => {
    setLinking(true);
    setHygieneMessage(null);
    try {
      const result = await competitionResultsApi.linkCompetitors();
      setHygieneMessage({
        type: 'success',
        message: result.linked > 0
          ? `Linked ${result.linked} result row${result.linked === 1 ? '' : 's'} to member profiles (${result.noMatch} had no matching member).`
          : `Nothing to link (${result.noMatch} rows have no matching member).`,
      });
      await runDiagnostics();
    } catch (err) {
      setHygieneMessage({ type: 'error', message: errMessage(err, 'Link failed') });
    } finally {
      setLinking(false);
    }
  };

  const runRecalcAll = async () => {
    if (!confirm(
      'Recalculate placements and points for EVERY event with results?\n\n' +
      'This re-sorts placements, awards points per the season config, releases holds for members who are active again, and stamps a reason on every zero. ' +
      'Safe to run any time, but it touches every event and can take several minutes — leave the page open.',
    )) {
      return;
    }
    setRecalcingAll(true);
    setRecalcAllMessage(null);
    try {
      const result = await competitionResultsApi.recalculateAllPlacements();
      setRecalcAllMessage({
        type: result.errors > 0 ? 'error' : 'success',
        message: `Recalculated ${result.processed} event(s)` + (result.errors > 0 ? ` — ${result.errors} event(s) FAILED (check backend logs).` : '.'),
      });
      await runDiagnostics();
    } catch (err) {
      setRecalcAllMessage({ type: 'error', message: errMessage(err, 'Full recalculation failed') });
    } finally {
      setRecalcingAll(false);
    }
  };

  const hasScanned = mismatch !== null || hygiene !== null;
  const mismatchClean = mismatch !== null && mismatch.mismatchCount === 0 && mismatch.strandedHeldResults.length === 0;

  return (
    <div className="bg-slate-800 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-slate-700 pb-3">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-orange-500" />
          <div>
            <h3 className="text-xl font-semibold text-white">Results &amp; Points Diagnostic Center</h3>
            <p className="text-sm text-gray-400">
              Scans for every known cause of missing points and results — membership/profile MECA ID
              mismatches, held points stuck under the wrong ID, whitespace-damaged IDs, and unlinked
              result rows — and gives you the fix button for each. Read-only until you click a fix.
            </p>
          </div>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={running}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap"
        >
          {running ? (
            <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" /> Scanning…</>
          ) : (
            <><RefreshCw className="h-4 w-4" /> Run Diagnostics</>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-300">{error}</div>
      )}

      {/* ------------------- MECA ID mismatches ------------------- */}
      {mismatch && (
        <div className={`rounded-lg p-4 ${mismatchClean ? 'bg-green-900/20 border border-green-800' : 'bg-red-900/30 border border-red-700'}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {mismatchClean ? (
              <><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-green-300">MECA IDs OK — every active membership matches its member's profile ID, and no held points are stranded under a mismatched ID.</span></>
            ) : (
              <><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-red-300">{mismatch.mismatchCount} member{mismatch.mismatchCount === 1 ? '' : 's'} with an active membership on the WRONG MECA ID.</span></>
            )}
          </div>

          {mismatch.mismatchCount > 0 && (
            <>
              <p className="mt-2 text-sm text-gray-300">
                These members' active memberships carry a different MECA ID than their profile and results,
                so Find Results reports them "not active" and their points stay held. The fix moves the
                active membership onto the member's real ID, merges any stray results, and recalculates the
                affected events — the same super-admin MECA ID Override, pre-filled.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="password"
                  value={superAdminPassword}
                  onChange={e => setSuperAdminPassword(e.target.value)}
                  placeholder="Super admin password (required to fix)"
                  className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm w-72 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase">
                    <tr>
                      <th className="py-2 pr-3">Member</th>
                      <th className="py-2 pr-3">Profile / results ID</th>
                      <th className="py-2 pr-3">Active membership ID</th>
                      <th className="py-2 pr-3">Results</th>
                      <th className="py-2 pr-3">Held</th>
                      <th className="py-2 pr-3">Active until</th>
                      <th className="py-2" />
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    {mismatch.mismatchedMembers.map(row => (
                      <tr key={row.active_membership_id} className="border-t border-slate-700/60 align-top">
                        <td className="py-2 pr-3">
                          <div>{row.member || '—'}</div>
                          <div className="text-xs text-gray-400">{row.email}</div>
                        </td>
                        <td className="py-2 pr-3 font-mono">{row.profile_meca_id}</td>
                        <td className="py-2 pr-3 font-mono text-red-300">{row.active_membership_meca_id}</td>
                        <td className="py-2 pr-3">{row.results_on_profile_id}</td>
                        <td className={`py-2 pr-3 ${row.held_results_on_profile_id > 0 ? 'text-amber-300 font-semibold' : ''}`}>{row.held_results_on_profile_id}</td>
                        <td className="py-2 pr-3 text-xs">{row.active_until ? new Date(row.active_until).toLocaleDateString() : '—'}</td>
                        <td className="py-2">
                          <button
                            onClick={() => fixMismatch(row)}
                            disabled={fixingMembershipId !== null}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
                          >
                            {fixingMembershipId === row.active_membership_id ? (
                              <><div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-r-transparent" /> Fixing…</>
                            ) : (
                              <><Wrench className="h-3 w-3" /> Fix → {row.profile_meca_id}</>
                            )}
                          </button>
                          {rowMessages[row.active_membership_id] && (
                            <div className={`mt-1 text-xs max-w-xs ${rowMessages[row.active_membership_id].type === 'success' ? 'text-green-300' : 'text-red-300'}`}>
                              {rowMessages[row.active_membership_id].message}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {mismatch.strandedHeldResults.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-700/60">
              <div className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Held results stranded under an ID whose owner IS active on a different ID
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Usually the same members as above — fixing the membership above releases these on recalc.
                Any left over: use Find Results to assign the rows to the member's current ID.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-gray-200">
                {mismatch.strandedHeldResults.map(r => (
                  <li key={`${r.result_meca_id}-${r.email}`} className="font-mono text-xs">
                    {r.held_results} held result{r.held_results === 1 ? '' : 's'} on {r.result_meca_id} — {r.email} is active on {r.active_membership_meca_id}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ------------------- Result-row hygiene ------------------- */}
      {hygiene && (
        <div className="rounded-lg p-4 bg-slate-700/40 space-y-3">
          <div className="text-sm font-semibold text-white">Result-row hygiene</div>
          {hygieneMessage && (
            <div className={`text-sm ${hygieneMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>{hygieneMessage.message}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className={`rounded-lg p-3 flex items-center justify-between gap-3 ${hygiene.whitespaceIds > 0 ? 'bg-amber-900/20 border border-amber-800' : 'bg-green-900/10 border border-green-900/40'}`}>
              <div>
                <div className={hygiene.whitespaceIds > 0 ? 'text-amber-300 font-semibold' : 'text-green-300'}>
                  {hygiene.whitespaceIds > 0 ? `${hygiene.whitespaceIds} result ID${hygiene.whitespaceIds === 1 ? '' : 's'} with stray whitespace` : 'Result IDs clean — no stray whitespace'}
                </div>
                <div className="text-xs text-gray-400">Whitespace breaks ID matching (points, My MECA, Find Results).</div>
              </div>
              {hygiene.whitespaceIds > 0 && (
                <button onClick={runTrim} disabled={trimming} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white text-xs font-semibold rounded-lg whitespace-nowrap flex items-center gap-1.5">
                  {trimming ? 'Trimming…' : <><Wrench className="h-3 w-3" /> Trim IDs</>}
                </button>
              )}
            </div>
            <div className={`rounded-lg p-3 flex items-center justify-between gap-3 ${hygiene.unlinkedResults > 0 ? 'bg-amber-900/20 border border-amber-800' : 'bg-green-900/10 border border-green-900/40'}`}>
              <div>
                <div className={hygiene.unlinkedResults > 0 ? 'text-amber-300 font-semibold' : 'text-green-300'}>
                  {hygiene.unlinkedResults > 0 ? `${hygiene.unlinkedResults} result${hygiene.unlinkedResults === 1 ? '' : 's'} not linked to the owning member` : 'All matchable results are linked to member profiles'}
                </div>
                <div className="text-xs text-gray-400">Unlinked rows are invisible on the member's My MECA page.</div>
              </div>
              {hygiene.unlinkedResults > 0 && (
                <button onClick={runLink} disabled={linking} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white text-xs font-semibold rounded-lg whitespace-nowrap flex items-center gap-1.5">
                  {linking ? 'Linking…' : <><Wrench className="h-3 w-3" /> Link Results</>}
                </button>
              )}
            </div>
            <div className="rounded-lg p-3 bg-slate-700/50">
              <div className="text-gray-200">{hygiene.guestStamped} guest-stamped row{hygiene.guestStamped === 1 ? '' : 's'} awaiting back-fill</div>
              <div className="text-xs text-gray-400">Rows stamped 999999 with the real ID stashed — restored automatically when the member renews, or via Find Results.</div>
            </div>
            <div className="rounded-lg p-3 bg-slate-700/50">
              <div className="text-gray-200">{hygiene.heldResults} result{hygiene.heldResults === 1 ? '' : 's'} currently holding points</div>
              <div className="text-xs text-gray-400">Normal for lapsed members — holds release on renewal, amnesty, or recalc. Only a problem when the owner IS active (see mismatch section).</div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------- Full realignment ------------------- */}
      {hasScanned && (
        <div className="rounded-lg p-4 bg-slate-700/40 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-white">Full realignment — recalculate every event</div>
            <p className="text-xs text-gray-400 mt-1">
              The finishing move after fixes above: re-sorts placements, awards points per the season
              config, releases holds for members who are active again, and stamps a reason on every zero —
              across ALL events. Safe any time; can take several minutes.
            </p>
            {recalcAllMessage && (
              <div className={`mt-2 text-sm ${recalcAllMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>{recalcAllMessage.message}</div>
            )}
          </div>
          <button
            onClick={runRecalcAll}
            disabled={recalcingAll}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap"
          >
            {recalcingAll ? (
              <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" /> Recalculating…</>
            ) : (
              <><RefreshCw className="h-4 w-4" /> Recalculate All Events</>
            )}
          </button>
        </div>
      )}

      {!hasScanned && !running && !error && (
        <p className="text-sm text-gray-500">Click Run Diagnostics to scan the live database. The scan is read-only.</p>
      )}
    </div>
  );
}
