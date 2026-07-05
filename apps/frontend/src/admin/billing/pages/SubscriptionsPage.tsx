import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, RefreshCw, Repeat, AlertCircle, Layers, Zap,
} from 'lucide-react';
import {
  billingApi,
  type SubscriptionListItem,
  type LegacyConversionReport,
} from '../../../api-client/billing.api-client';

/**
 * Dedicated Subscriptions view (Stripe + PayPal). Lists every membership
 * carrying a live Stripe or PayPal subscription id or still flagged legacy,
 * with a "Convert legacy" tool
 * that links a live Stripe subscription where one exists (matched by member
 * email) and otherwise clears the legacy flag. Row click jumps to the member
 * detail page where the Assign Subscription modal lives.
 */

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function errMsg(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}

function SourceBadge({ source }: { source: 'stripe' | 'paypal' | 'legacy' }) {
  if (source === 'paypal') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-sky-500/15 text-sky-300 border-sky-500/30">
        <Repeat className="w-3 h-3" /> PayPal
      </span>
    );
  }
  return source === 'stripe' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-indigo-500/15 text-indigo-300 border-indigo-500/30">
      <Zap className="w-3 h-3" /> Stripe
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border bg-amber-500/15 text-amber-300 border-amber-500/30"
      title="Recurring in the OLD system — the original gateway (Stripe or PayPal) was never recorded in the import. Use Convert Legacy to link a live Stripe subscription by email, or the member's Record Payment → PayPal to link a PayPal subscription by its I-… id."
    >
      <Layers className="w-3 h-3" /> Legacy
    </span>
  );
}

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SubscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'' | 'stripe' | 'paypal' | 'legacy'>('');
  const [search, setSearch] = useState('');

  // Legacy-conversion tool state
  const [converting, setConverting] = useState(false);
  const [report, setReport] = useState<LegacyConversionReport | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true); setError(null);
    try {
      const data = await billingApi.getSubscriptions({
        source: sourceFilter || undefined,
        search: search.trim() || undefined,
      });
      setRows(data);
    } catch (err) {
      setError(errMsg(err, 'Failed to load subscriptions'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFilter]);

  const counts = useMemo(() => {
    let stripe = 0, paypal = 0, legacy = 0;
    for (const r of rows) {
      if (r.source === 'stripe') stripe++;
      else if (r.source === 'paypal') paypal++;
      else legacy++;
    }
    return { stripe, paypal, legacy };
  }, [rows]);

  const runConversion = async (dryRun: boolean) => {
    if (!dryRun && !window.confirm(
      'Apply legacy conversion? This will link live Stripe subscriptions where found and clear the legacy flag on the rest.',
    )) return;
    setConverting(true); setConvertError(null);
    try {
      const result = await billingApi.convertLegacy(dryRun);
      setReport(result);
      if (!dryRun) fetchRows();
    } catch (err) {
      setConvertError(errMsg(err, 'Conversion failed'));
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <button
          onClick={() => navigate('/admin/billing')}
          className="flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Billing Dashboard
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
              <Repeat className="w-7 h-7 text-orange-400" />
              Subscriptions (Stripe + PayPal)
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {counts.stripe} Stripe · {counts.paypal} PayPal · {counts.legacy} legacy. Click a row to open the member and assign/move a subscription.
            </p>
          </div>
          <button
            onClick={fetchRows}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm px-3 py-2 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Legacy conversion tool */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" /> Convert legacy memberships
              </h2>
              <p className="text-gray-400 text-xs mt-1 max-w-2xl">
                Links a live Stripe subscription where the member has one (matched by email); otherwise clears the
                legacy flag and keeps them as a regular paid membership. Always preview first.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => runConversion(true)}
                disabled={converting}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {converting ? 'Running…' : 'Preview (dry run)'}
              </button>
              <button
                onClick={() => runConversion(false)}
                disabled={converting || !report}
                title={!report ? 'Run a dry-run preview first' : 'Apply the conversion'}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Apply conversion
              </button>
            </div>
          </div>
          {convertError && <div className="text-red-400 text-sm mt-3">{convertError}</div>}
          {report && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs uppercase">Scanned</div>
                <div className="text-white text-xl font-bold">{report.scanned}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs uppercase">Linked</div>
                <div className="text-emerald-400 text-xl font-bold">{report.linked.length}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs uppercase">Reclassified</div>
                <div className="text-amber-300 text-xl font-bold">{report.reclassified.length}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs uppercase">Skipped</div>
                <div className="text-gray-300 text-xl font-bold">{report.skipped.length}</div>
              </div>
              <div className="col-span-2 sm:col-span-4 text-xs text-gray-400">
                {report.dryRun ? 'Dry run — nothing was changed. Click "Apply conversion" to commit.' : 'Conversion applied.'}
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') fetchRows(); }}
                placeholder="Search member name, email, MECA ID… (Enter)"
                className="w-full bg-slate-900 border border-slate-700 rounded pl-10 pr-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/60"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as '' | 'stripe' | 'paypal' | 'legacy')}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none"
            >
              <option value="">All sources</option>
              <option value="stripe">Stripe-linked</option>
              <option value="paypal">PayPal-linked</option>
              <option value="legacy">Legacy only</option>
            </select>
            <button
              onClick={fetchRows}
              className="bg-slate-700 hover:bg-slate-600 text-white rounded px-3 py-2 text-sm"
            >
              Apply
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-200 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 text-orange-400 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <AlertCircle className="w-8 h-8 mb-2" />
              No subscriptions match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60 text-gray-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Member</th>
                    <th className="text-left px-4 py-3">MECA ID</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Source</th>
                    <th className="text-left px-4 py-3">Subscription</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Amount</th>
                    <th className="text-left px-4 py-3">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {rows.map((r) => (
                    <tr
                      key={r.membershipId}
                      onClick={() => r.userId && navigate(`/admin/members/${r.userId}`)}
                      className="hover:bg-slate-700/30 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="text-white">{r.memberName || '—'}</div>
                        <div className="text-gray-500 text-xs">{r.email || ''}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-orange-400">{r.mecaId ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-300">{r.membershipType || '—'}</td>
                      <td className="px-4 py-3"><SourceBadge source={r.source} /></td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">
                        {r.stripeSubscriptionId || r.paypalSubscriptionId || '—'}
                        {r.cancelAtPeriodEnd && (
                          <span className="ml-2 text-amber-400">(cancels at period end)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{r.paymentStatus}</td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {r.amountPaid != null ? `$${r.amountPaid.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{formatDate(r.endDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-gray-500 text-xs mt-4">
          Need to assign or move a subscription? Open the member (click a row) and use{' '}
          <Link to="/admin/members" className="text-orange-400 hover:underline">Assign Subscription</Link>.
        </p>
      </div>
    </div>
  );
}
