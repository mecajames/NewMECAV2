import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  RefreshCw,
  CreditCard,
  AlertCircle,
  CheckCircle,
  RotateCcw,
  Clock,
  XCircle,
} from 'lucide-react';
import { billingApi, AllPaymentRow } from '../../../api-client/billing.api-client';

/**
 * Unified admin "All Payments" view — every Stripe + PayPal payment row
 * regardless of status. Drives both the deep-link from the bell-icon
 * notification (?status=failed) and general payment reconciliation work.
 *
 * Filters supported (server-side):
 *   - status      paid | failed | refunded | pending | cancelled | inactive
 *   - method      stripe | paypal | manual | …
 *   - type        membership | event_registration | other
 *   - search      member name / email / MECA ID / transaction id
 *   - windowDays  default 90, capped at 365
 */

const STATUS_BADGE: Record<string, { cls: string; icon: typeof CheckCircle; label: string }> = {
  paid: { cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle, label: 'Paid' },
  failed: { cls: 'bg-red-500/15 text-red-300 border-red-500/30', icon: AlertCircle, label: 'Failed' },
  refunded: { cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30', icon: RotateCcw, label: 'Refunded' },
  pending: { cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: Clock, label: 'Pending' },
  cancelled: { cls: 'bg-gray-500/15 text-gray-300 border-gray-500/30', icon: XCircle, label: 'Cancelled' },
  inactive: { cls: 'bg-gray-500/15 text-gray-300 border-gray-500/30', icon: XCircle, label: 'Inactive' },
};

const METHOD_BADGE: Record<string, string> = {
  stripe: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  paypal: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  manual: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}
    >
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  const cls = METHOD_BADGE[method] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/30';
  const label = method === 'stripe' ? 'Stripe' : method === 'paypal' ? 'PayPal' : method;
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs border ${cls}`}>{label}</span>;
}

export default function AllPaymentsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [rows, setRows] = useState<AllPaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusFilter = params.get('status') ?? '';
  const methodFilter = params.get('method') ?? '';
  const typeFilter = params.get('type') ?? '';
  const search = params.get('search') ?? '';
  const windowDays = Number(params.get('windowDays')) || 90;

  const limit = 100;
  const offset = Number(params.get('offset')) || 0;

  const updateParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    next.delete('offset'); // reset pagination on filter change
    setParams(next, { replace: true });
  };

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await billingApi.getAllPayments({
        status: statusFilter || undefined,
        method: methodFilter || undefined,
        type: typeFilter || undefined,
        search: search || undefined,
        windowDays,
        limit,
        offset,
      });
      setRows(r.data);
      setTotal(r.total);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, methodFilter, typeFilter, search, windowDays, offset]);

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalAmount = 0;
    for (const r of rows) {
      counts[r.paymentStatus] = (counts[r.paymentStatus] ?? 0) + 1;
      if (r.paymentStatus === 'paid') totalAmount += Number(r.amount);
    }
    return { counts, totalAmount };
  }, [rows]);

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
              <CreditCard className="w-7 h-7 text-orange-400" />
              All Payments
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Unified Stripe + PayPal payment ledger — last {windowDays} days. {total.toLocaleString()} total payment{total === 1 ? '' : 's'} matching your filters.
            </p>
          </div>
          <button
            onClick={fetchRows}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm px-3 py-2 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => updateParam('search', e.target.value)}
                placeholder="Search member name, email, MECA ID, transaction…"
                className="w-full bg-slate-900 border border-slate-700 rounded pl-10 pr-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500/60"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => updateParam('status', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none"
            >
              <option value="">All statuses</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={methodFilter}
              onChange={(e) => updateParam('method', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none"
            >
              <option value="">All methods</option>
              <option value="stripe">Stripe</option>
              <option value="paypal">PayPal</option>
              <option value="manual">Manual</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="wire">Wire</option>
              <option value="other">Other</option>
            </select>
            <select
              value={String(windowDays)}
              onChange={(e) => updateParam('windowDays', e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm focus:outline-none"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last 12 months</option>
            </select>
          </div>
        </div>

        {/* KPIs at a glance */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {['paid', 'failed', 'refunded', 'pending', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => updateParam('status', statusFilter === s ? '' : s)}
              className={`bg-slate-800/60 border rounded-lg p-3 text-left transition-colors ${
                statusFilter === s ? 'border-orange-500/50' : 'border-slate-700/60 hover:border-slate-600'
              }`}
            >
              <p className="text-xs text-gray-400 uppercase tracking-wide">{STATUS_BADGE[s]?.label ?? s}</p>
              <p className="text-2xl font-bold text-white mt-0.5">{summary.counts[s] ?? 0}</p>
              {s === 'paid' && (
                <p className="text-xs text-emerald-300 mt-0.5">${summary.totalAmount.toFixed(2)} collected</p>
              )}
            </button>
          ))}
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
            <div className="py-16 text-center text-gray-400">
              No payments match these filters in the last {windowDays} days.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/60 text-gray-400 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left p-3">Date</th>
                    <th className="text-left p-3">Member</th>
                    <th className="text-left p-3">MECA ID</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Method</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-right p-3">Amount</th>
                    <th className="text-left p-3">Transaction</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-slate-700/40 hover:bg-slate-800/40">
                      <td className="p-3 text-gray-300 whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString()}
                        <div className="text-[10px] text-gray-500">
                          {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-3">
                        {r.member.id ? (
                          <Link
                            to={`/admin/members/${r.member.id}`}
                            className="text-orange-300 hover:text-orange-200 font-medium"
                          >
                            {r.member.name || r.member.email || '(no name)'}
                          </Link>
                        ) : (
                          <span className="text-gray-400 italic">{r.member.name || r.member.email || 'Guest / unknown'}</span>
                        )}
                        {r.member.email && r.member.name && (
                          <div className="text-xs text-gray-500">{r.member.email}</div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs text-gray-300">
                        {r.member.mecaId ? `#${r.member.mecaId}` : '—'}
                      </td>
                      <td className="p-3 text-gray-300 capitalize">
                        {r.paymentType.replace(/_/g, ' ')}
                        {r.membership?.typeName && (
                          <div className="text-xs text-gray-500">{r.membership.typeName}</div>
                        )}
                      </td>
                      <td className="p-3"><MethodBadge method={r.paymentMethod} /></td>
                      <td className="p-3"><StatusBadge status={r.paymentStatus} /></td>
                      <td className="p-3 text-right font-mono text-white">
                        ${Number(r.amount).toFixed(2)}
                        <div className="text-[10px] text-gray-500">{r.currency}</div>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-gray-400 max-w-[180px] truncate" title={r.transactionId ?? ''}>
                        {r.transactionId ?? '—'}
                        {r.failureReason && (
                          <div className="text-[10px] text-red-400 not-italic whitespace-normal mt-0.5">{r.failureReason}</div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {r.member.id && (
                          <Link
                            to={`/admin/members/${r.member.id}`}
                            className="text-xs text-orange-400 hover:text-orange-300"
                          >
                            View member →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
            <span>
              Showing {offset + 1}–{Math.min(offset + rows.length, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => updateParam('offset', String(Math.max(0, offset - limit)))}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-gray-600 disabled:cursor-not-allowed rounded text-white"
              >
                Previous
              </button>
              <button
                disabled={offset + limit >= total}
                onClick={() => updateParam('offset', String(offset + limit))}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-gray-600 disabled:cursor-not-allowed rounded text-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
