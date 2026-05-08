import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  Search,
  RefreshCw,
} from 'lucide-react';
import { billingApi, FailedPaymentRow, FailedPaymentSource } from '../../../api-client/billing.api-client';

const SOURCE_LABEL: Record<FailedPaymentSource, string> = {
  membership: 'Subscription Renewal',
  event_registration: 'Event Registration',
  order: 'Order',
  invoice: 'Invoice',
  payment: 'Payment',
};

const SOURCE_BADGE: Record<FailedPaymentSource, string> = {
  membership: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  event_registration: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  order: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  invoice: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  payment: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
};

export default function FailedPaymentsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<FailedPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState(30);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<FailedPaymentSource | ''>('');

  const fetchRows = async () => {
    try {
      setLoading(true);
      const result = await billingApi.getFailedPayments(windowDays);
      setRows(result.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching failed payments:', err);
      setError('Failed to load failed payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [windowDays]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (sourceFilter && r.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        r.reference.toLowerCase().includes(q)
        || r.user.email?.toLowerCase().includes(q)
        || r.user.name?.toLowerCase().includes(q)
        || r.failureReason?.toLowerCase().includes(q)
      );
    });
  }, [rows, search, sourceFilter]);

  const totalAmount = useMemo(
    () => filtered.reduce((sum, r) => sum + parseFloat(r.amount || '0'), 0),
    [filtered],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-400" />
              Failed Payments
            </h1>
            <p className="text-gray-400">
              Subscription renewal failures, declined invoice payments, and abandoned event-registration checkouts
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchRows}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/admin/billing')}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Billing
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Failed (window)</p>
            <p className="text-white font-semibold text-3xl mt-1">{filtered.length}</p>
            <p className="text-gray-500 text-xs mt-1">of {rows.length} total in last {windowDays}d</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <p className="text-gray-400 text-xs uppercase tracking-wide">At-Risk Revenue</p>
            <p className="text-red-400 font-semibold text-3xl mt-1">${totalAmount.toFixed(2)}</p>
            <p className="text-gray-500 text-xs mt-1">sum of failed amounts</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Window</p>
            <select
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              className="mt-2 w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
              <option value={365}>Last 365 days</option>
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800 rounded-xl p-4 shadow-lg mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by member, email, reference, or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
            />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as FailedPaymentSource | '')}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
          >
            <option value="">All Sources</option>
            {Object.entries(SOURCE_LABEL).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent"></div>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={fetchRows}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-white text-lg font-semibold">No failed payments</p>
              <p className="text-gray-400 text-sm mt-1">
                {rows.length === 0
                  ? `Nothing in the last ${windowDays} days — clean slate.`
                  : 'No rows match the current filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/50 text-gray-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Source</th>
                    <th className="px-4 py-3 text-left">Member</th>
                    <th className="px-4 py-3 text-left">Reference</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Failure Reason</th>
                    <th className="px-4 py-3 text-center">Attempts / Dunning</th>
                    <th className="px-4 py-3 text-left">Last Failed</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full font-medium border px-2 py-0.5 text-xs ${SOURCE_BADGE[r.source]}`}>
                          {SOURCE_LABEL[r.source]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white">{r.user.name || '—'}</div>
                        <div className="text-gray-400 text-xs">{r.user.email || '—'}</div>
                        {r.user.meca_id && (
                          <div className="text-gray-500 text-xs">MECA #{r.user.meca_id}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-300">{r.reference}</td>
                      <td className="px-4 py-3 text-right text-white font-semibold">
                        ${r.amount} <span className="text-gray-500 text-xs">{r.currency}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 max-w-xs">
                        <div className="truncate" title={r.failureReason || undefined}>
                          {r.failureReason || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">
                        {r.attemptCount != null && (
                          <div className="text-xs">Attempt {r.attemptCount}</div>
                        )}
                        {r.dunningStep != null && r.dunningStep > 0 && (
                          <div className="text-xs text-amber-400">Dunning step {r.dunningStep}/4</div>
                        )}
                        {r.attemptCount == null && (r.dunningStep == null || r.dunningStep === 0) && '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(r.lastFailedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {r.hostedInvoiceUrl && (
                            <a
                              href={r.hostedInvoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300"
                              title="Open Stripe hosted invoice"
                            >
                              Stripe <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {r.detailUrl && (
                            <button
                              onClick={() => navigate(r.detailUrl!)}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
