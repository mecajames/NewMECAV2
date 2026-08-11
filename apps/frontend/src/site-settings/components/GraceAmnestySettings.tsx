import { useEffect, useState } from 'react';
import { Save, ShieldCheck, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { membershipsApi, GraceConfigResponse } from '@/memberships/memberships.api-client';

/**
 * Site Settings → Grace & Amnesty (SUPER-ADMIN ONLY — James/Mick).
 *
 * Edits the MECA ID grace windows and the blanket-amnesty end date. These
 * values are intentionally NEVER shown to members or regular admins: members
 * are only ever told the self-service number, and the wider admin window and
 * amnesty are unannounced. The backend enforces the super-admin gate; the
 * parent component additionally hides the tab from non-super-admins.
 */
export default function GraceAmnestySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [current, setCurrent] = useState<GraceConfigResponse | null>(null);

  const [amnestyEndDate, setAmnestyEndDate] = useState('');
  const [selfServeDays, setSelfServeDays] = useState('30');
  const [adminDays, setAdminDays] = useState('45');

  useEffect(() => {
    membershipsApi.getGraceConfig()
      .then((cfg) => {
        setCurrent(cfg);
        setAmnestyEndDate(cfg.amnestyEndDate ?? '');
        setSelfServeDays(String(cfg.selfServeDays));
        setAdminDays(String(cfg.adminDays));
      })
      .catch((err) => {
        setLoadError(err?.response?.data?.message || 'Failed to load the grace configuration.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setResult(null);
    const selfServe = Number(selfServeDays);
    const admin = Number(adminDays);
    if (!Number.isInteger(selfServe) || selfServe < 1) {
      setResult({ type: 'error', message: 'Self-service days must be a whole number of at least 1.' });
      return;
    }
    if (!Number.isInteger(admin) || admin < selfServe) {
      setResult({ type: 'error', message: `Admin days must be a whole number of at least ${selfServe} (the self-service window).` });
      return;
    }
    setSaving(true);
    try {
      const updated = await membershipsApi.updateGraceConfig({
        selfServeDays: selfServe,
        adminDays: admin,
        amnestyEndDate: amnestyEndDate || null,
      });
      setCurrent(updated);
      setResult({
        type: 'success',
        message: `Saved. Amnesty is ${updated.amnestyActive ? `ACTIVE through ${updated.amnestyEndDate}` : updated.amnestyEndDate ? `set to end ${updated.amnestyEndDate} (already passed)` : 'OFF'}; windows: ${updated.selfServeDays} / ${updated.adminDays} days. Takes effect immediately.`,
      });
    } catch (err: any) {
      setResult({ type: 'error', message: err?.response?.data?.message || 'Failed to save the grace configuration.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 flex items-center gap-3 text-gray-300">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading grace configuration…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-slate-800 rounded-xl p-6 text-red-400 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" /> {loadError}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={`rounded-xl p-4 flex items-center gap-3 ${current?.amnestyActive ? 'bg-emerald-900/40 border border-emerald-700' : 'bg-slate-800 border border-slate-700'}`}>
        <ShieldCheck className={`h-6 w-6 ${current?.amnestyActive ? 'text-emerald-400' : 'text-gray-400'}`} />
        <div>
          <div className="text-white font-semibold">
            {current?.amnestyActive
              ? `Blanket amnesty is ACTIVE through ${current.amnestyEndDate} (end of day, Pacific)`
              : current?.amnestyEndDate
                ? `Amnesty ended ${current.amnestyEndDate} — normal grace windows apply`
                : 'No amnesty configured — normal grace windows apply'}
          </div>
          <div className="text-sm text-gray-400">
            While the amnesty is active, ANY lapsed member who renews keeps their MECA ID and held points,
            no matter how long ago they expired — and nothing is invalidated or stripped by the nightly jobs.
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 space-y-6">
        <h3 className="text-xl font-semibold text-white border-b border-slate-700 pb-3">
          Grace &amp; Amnesty Configuration
        </h3>
        <p className="text-sm text-amber-400/90 -mt-2 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          Super-admin only. Members are ONLY ever told the self-service number — the admin window and the
          amnesty are unannounced. Do not publish these values anywhere member-facing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Amnesty end date</label>
            <input
              type="date"
              value={amnestyEndDate}
              onChange={(e) => setAmnestyEndDate(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
            />
            <p className="text-xs text-gray-400 mt-2">
              Blanket amnesty runs through the END of this day (Pacific time). Clear the field to turn the
              amnesty off entirely.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Self-service window (days)</label>
            <input
              type="number"
              min={1}
              value={selfServeDays}
              onChange={(e) => setSelfServeDays(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
            />
            <p className="text-xs text-gray-400 mt-2">
              The ADVERTISED window (default 30): a member renewing on their own within this many days of
              expiring keeps their MECA ID and held points automatically.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Admin window (days)</label>
            <input
              type="number"
              min={1}
              value={adminDays}
              onChange={(e) => setAdminDays(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
            />
            <p className="text-xs text-gray-400 mt-2">
              The UNANNOUNCED data-preservation window (default 45): held results and IDs survive this long
              so you or Mick can manually restore a member past the self-service range.
            </p>
          </div>
        </div>

        {result && (
          <div className={`rounded-lg p-3 flex items-start gap-2 text-sm ${result.type === 'success' ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
            {result.type === 'success' ? <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
            {result.message}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving…' : 'Save Grace Configuration'}
        </button>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 space-y-3">
        <h3 className="text-lg font-semibold text-white border-b border-slate-700 pb-3">
          What these settings control
        </h3>
        <ul className="text-sm text-gray-300 space-y-2 list-disc list-inside">
          <li><span className="text-white">Keep MECA ID on renewal</span> — a lapsed member renewing within the window (or any time during an amnesty) keeps their original ID; beyond it a new ID is minted.</li>
          <li><span className="text-white">Held competition points</span> — results earned while lapsed are held and released with full points when the member renews inside the window.</li>
          <li><span className="text-white">Result entry stamping</span> — results entered for an expired ID inside the window are parked under guest 999999 and automatically restored to the member when they renew.</li>
          <li><span className="text-white">Nightly ID invalidation &amp; held-result stripping</span> — profiles/results are only permanently invalidated or stripped once the lapse exceeds the ADMIN window; both jobs pause entirely while an amnesty is active.</li>
          <li><span className="text-white">Renewal email link lifetime</span> — the tokenized renewal link stays valid for the ADMIN window past the membership end date (never the amnesty-extended value).</li>
          <li><span className="text-white">"Restore MECA ID &amp; Points" button</span> — offered on the member page when a renewal minted a new ID inside the self-service→admin gap.</li>
          <li><span className="text-white">Renewal-page grace messaging</span> — the tier (keep ID vs. new ID) shown on the tokenized renewal page follows these windows.</li>
        </ul>
        <p className="text-xs text-gray-500 pt-2">
          Changes apply immediately to the running site — no deploy or restart needed. All changes are logged.
        </p>
      </div>
    </div>
  );
}
