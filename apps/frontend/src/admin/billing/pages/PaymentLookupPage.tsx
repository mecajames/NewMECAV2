import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Loader2, AlertTriangle, User, CreditCard, FileText,
  ExternalLink, XCircle, ShieldAlert, Receipt,
} from 'lucide-react';
import { billingApi, PaymentTraceResult } from '@/api-client/billing.api-client';
import { membershipsApi } from '@/memberships/memberships.api-client';

const TYPE_LABELS: Record<string, string> = {
  stripe_payment_intent: 'Stripe Payment Intent',
  stripe_charge: 'Stripe Charge',
  stripe_subscription: 'Stripe Subscription',
  stripe_customer: 'Stripe Customer',
  stripe_invoice: 'Stripe Invoice',
  stripe_refund: 'Stripe Refund',
  paypal_subscription: 'PayPal Subscription',
  email: 'Email Address',
  meca_id: 'MECA ID',
  invoice_or_order_number: 'Invoice / Order Number',
  unknown: 'Identifier',
};

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtMoney(n: number | string | null | undefined): string {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return v == null || isNaN(v) ? '—' : `$${v.toFixed(2)}`;
}

/**
 * Chargeback / payment trace tool: paste ANY identifier from a Stripe or
 * PayPal notification (pi_, ch_, sub_, cus_, in_, re_, I-...), an invoice or
 * order number, a MECA ID, or an email — and walk the chain back to the
 * member so their membership can be cancelled.
 */
export default function PaymentLookupPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<PaymentTraceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState<string | null>(null);

  const runTrace = async (q?: string) => {
    const term = (q ?? query).trim();
    if (term.length < 3) {
      setError('Enter at least 3 characters (e.g. pi_..., ch_..., sub_..., cus_..., an email, or a MECA ID).');
      return;
    }
    if (q) setQuery(q);
    setLoading(true);
    setError(null);
    try {
      const data = await billingApi.tracePayment(term);
      setResult(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError((Array.isArray(msg) ? msg.join(' ') : msg) || err?.message || 'Trace failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const cancelMembership = async (membershipId: string, label: string) => {
    const reason = window.prompt(
      `Cancel membership ${label} immediately?\n\nEnter the cancellation reason (e.g. "Chargeback received on Stripe charge ..."):`,
    );
    if (!reason || reason.trim().length < 5) {
      if (reason !== null) alert('A reason of at least 5 characters is required.');
      return;
    }
    setCancelBusy(membershipId);
    try {
      const res = await membershipsApi.adminCancelImmediately(membershipId, reason.trim());
      alert(res.message || 'Membership cancelled.');
      await runTrace();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      alert((Array.isArray(msg) ? msg.join(' ') : msg) || 'Cancel failed');
    } finally {
      setCancelBusy(null);
    }
  };

  const unfreezeMembership = async (membershipId: string, label: string) => {
    if (!window.confirm(
      `Unfreeze membership ${label}?\n\nThis restores the member's login. The cancelled billing subscription is NOT restored — they must resubscribe for auto-renewal.`,
    )) return;
    setCancelBusy(membershipId);
    try {
      const res = await membershipsApi.adminUnfreeze(membershipId);
      alert(res.message || 'Membership unfrozen.');
      await runTrace();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      alert((Array.isArray(msg) ? msg.join(' ') : msg) || 'Unfreeze failed');
    } finally {
      setCancelBusy(null);
    }
  };

  const stripeBlocks: Array<{ title: string; data: any }> = [];
  if (result?.stripe) {
    const s = result.stripe;
    if (s.paymentIntent) stripeBlocks.push({ title: 'Payment Intent', data: s.paymentIntent });
    if (s.charge) stripeBlocks.push({ title: 'Charge', data: s.charge });
    if (s.invoice) stripeBlocks.push({ title: 'Stripe Invoice', data: s.invoice });
    if (s.subscriptionDetails) stripeBlocks.push({ title: 'Subscription', data: s.subscriptionDetails });
    if (s.customer) stripeBlocks.push({ title: 'Customer', data: s.customer });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/admin/billing')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Billing
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Payment Lookup</h1>
          <p className="text-gray-400 text-sm max-w-3xl">
            Chargeback tracing: paste any Stripe id (pi_, ch_, sub_, cus_, in_, re_), a PayPal
            subscription (I-...), an invoice or order number, a MECA ID, or an email. The trace
            queries Stripe and our own ledger, follows every linked identifier, and resolves the
            member so you can cancel their membership.
          </p>
        </div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runTrace()}
              placeholder="pi_..., ch_..., sub_..., cus_..., in_..., I-..., invoice #, MECA ID, or email"
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
            />
          </div>
          <button
            onClick={() => runTrace()}
            disabled={loading}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            Trace
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-400">Detected:</span>
              <span className="px-2 py-1 rounded bg-slate-700 text-orange-300 font-medium">
                {TYPE_LABELS[result.detectedType] || result.detectedType}
              </span>
              {result.relatedIdentifiers.length > 0 && (
                <>
                  <span className="text-gray-500 ml-2">Linked identifiers (click to trace):</span>
                  {result.relatedIdentifiers.map((id) => (
                    <button
                      key={id}
                      onClick={() => runTrace(id)}
                      className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-gray-300 hover:text-white hover:border-orange-500 font-mono text-xs"
                    >
                      {id}
                    </button>
                  ))}
                </>
              )}
            </div>

            {result.notes.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-1">
                {result.notes.map((n, i) => (
                  <p key={i} className="text-amber-300 text-sm flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="break-all">{n}</span>
                  </p>
                ))}
              </div>
            )}

            {/* Members */}
            {result.profiles.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-orange-500" /> Members Found
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {result.profiles.map((p) => (
                    <div key={p.id} className="bg-slate-700/50 rounded-lg p-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-white font-semibold">
                          {p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || '(no name)'}
                        </p>
                        <p className="text-gray-400 text-sm">{p.email}</p>
                        <p className="text-gray-400 text-sm font-mono">
                          MECA ID: {p.meca_id || '—'} · Status: {p.membership_status || 'none'}
                          {p.login_banned ? ' · BANNED' : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/admin/members/${p.id}`)}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-lg"
                      >
                        <ExternalLink className="h-4 w-4" /> Open Member
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Memberships */}
            {result.memberships.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-400" /> Memberships
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-slate-700">
                        <th className="py-2 pr-4">Member</th>
                        <th className="py-2 pr-4">MECA ID</th>
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Term</th>
                        <th className="py-2 pr-4">Subscription</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.memberships.map((m) => {
                        const active = m.paymentStatus === 'paid' && (!m.endDate || new Date(m.endDate) > new Date()) && !m.cancelledAt;
                        return (
                          <tr key={m.id} className="border-b border-slate-700/50 text-gray-300">
                            <td className="py-2 pr-4">
                              <div className="text-white">{m.userName || m.competitorName || '—'}</div>
                              <div className="text-xs text-gray-500">{m.userEmail}</div>
                            </td>
                            <td className="py-2 pr-4 font-mono text-orange-300">{m.mecaId ?? '—'}</td>
                            <td className="py-2 pr-4">{m.membershipType ?? '—'}</td>
                            <td className="py-2 pr-4">
                              {m.frozenAt && (
                                <span
                                  className="mr-2 px-1.5 py-0.5 rounded bg-cyan-900/50 text-cyan-300 text-xs border border-cyan-700/50"
                                  title={`${m.freezeReason || 'Chargeback freeze'}${m.disputeId ? ` (dispute ${m.disputeId})` : ''}`}
                                >
                                  FROZEN
                                </span>
                              )}
                              {m.cancelledAt
                                ? <span className="text-rose-400">cancelled {fmtDate(m.cancelledAt)}</span>
                                : <span className={active ? 'text-green-400' : 'text-gray-400'}>{m.paymentStatus}{active ? ' (active)' : ''}</span>}
                            </td>
                            <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(m.startDate)} → {fmtDate(m.endDate)}</td>
                            <td className="py-2 pr-4 font-mono text-xs break-all">
                              {m.stripeSubscriptionId || m.paypalSubscriptionId || '—'}
                            </td>
                            <td className="py-2">
                              <div className="flex gap-2">
                                {m.userId && (
                                  <button
                                    onClick={() => navigate(`/admin/members/${m.userId}`)}
                                    className="inline-flex items-center gap-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-200 rounded text-xs"
                                    title="Open the member page (cancel, refund, delete, record payment)"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" /> Member
                                  </button>
                                )}
                                {active && (
                                  <button
                                    onClick={() => cancelMembership(m.id, `${m.mecaId ?? m.id} (${m.userEmail ?? 'unknown'})`)}
                                    disabled={cancelBusy === m.id}
                                    className="inline-flex items-center gap-1 px-2 py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded text-xs disabled:opacity-50"
                                    title="Cancel this membership immediately (also cancels its billing subscription)"
                                  >
                                    {cancelBusy === m.id
                                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      : <XCircle className="h-3.5 w-3.5" />}
                                    Cancel Now
                                  </button>
                                )}
                                {m.frozenAt && !m.cancelledAt && (
                                  <button
                                    onClick={() => unfreezeMembership(m.id, `${m.mecaId ?? m.id} (${m.userEmail ?? 'unknown'})`)}
                                    disabled={cancelBusy === m.id}
                                    className="inline-flex items-center gap-1 px-2 py-1.5 bg-cyan-800 hover:bg-cyan-700 text-white rounded text-xs disabled:opacity-50"
                                    title="Unfreeze (dispute won / mistaken freeze): restores login; the cancelled subscription is NOT restored"
                                  >
                                    Unfreeze
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Stripe data */}
            {stripeBlocks.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-purple-400" /> Stripe Records
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {stripeBlocks.map((b) => (
                    <div key={b.title} className="bg-slate-700/50 rounded-lg p-4">
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">{b.title}</p>
                      <pre className="text-gray-200 text-xs whitespace-pre-wrap break-all font-mono">
                        {JSON.stringify(b.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
                {(result.stripe?.subscriptions?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Customer Subscriptions</p>
                    <div className="space-y-1">
                      {result.stripe!.subscriptions!.map((s: any) => (
                        <button
                          key={s.id}
                          onClick={() => runTrace(s.id)}
                          className="block w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded text-sm text-gray-200 font-mono"
                        >
                          {s.id} — {s.status}{s.cancelAtPeriodEnd ? ' (cancels at period end)' : ''} · ends {fmtDate(s.currentPeriodEnd)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {(result.stripe?.recentCharges?.length ?? 0) > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">Recent Charges (this customer)</p>
                    <div className="space-y-1">
                      {result.stripe!.recentCharges!.map((c: any) => (
                        <button
                          key={c.id}
                          onClick={() => runTrace(c.id)}
                          className="block w-full text-left px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded text-sm text-gray-200 font-mono"
                        >
                          {c.id} — {fmtMoney(c.amount)} {c.status}
                          {c.disputed ? ' · ⚠ DISPUTED' : ''}{c.refunded ? ' · refunded' : ''} · {fmtDate(c.created)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ledger payments */}
            {result.payments.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-400" /> Our Payment Records
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-400 border-b border-slate-700">
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">Type</th>
                        <th className="py-2 pr-4">Method</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Amount</th>
                        <th className="py-2 pr-4">Member</th>
                        <th className="py-2">Gateway IDs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.payments.map((p) => (
                        <tr key={p.id} className="border-b border-slate-700/50 text-gray-300">
                          <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(p.paidAt || p.createdAt)}</td>
                          <td className="py-2 pr-4">{p.paymentType}</td>
                          <td className="py-2 pr-4">{p.paymentMethod}</td>
                          <td className="py-2 pr-4">
                            <span className={p.paymentStatus === 'refunded' ? 'text-rose-400' : ''}>{p.paymentStatus}</span>
                            {p.dispute && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 text-xs border border-red-700/50">
                                DISPUTED{p.dispute.status ? `: ${p.dispute.status}` : ''}
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-4">{fmtMoney(p.amount)}</td>
                          <td className="py-2 pr-4">
                            {p.userId ? (
                              <button onClick={() => navigate(`/admin/members/${p.userId}`)} className="text-orange-400 hover:text-orange-300">
                                {p.userEmail || p.userId}
                              </button>
                            ) : (
                              <span className="text-gray-500">{p.userEmail || 'unlinked'}</span>
                            )}
                          </td>
                          <td className="py-2 font-mono text-xs break-all text-gray-400">
                            {[p.stripePaymentIntentId, p.stripeCustomerId, p.externalPaymentId, p.paypalCaptureId, p.transactionId]
                              .filter(Boolean).join(' · ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Other matches */}
            {(result.invoices.length > 0 || result.orders.length > 0 || result.shopOrders.length > 0
              || result.eventRegistrations.length > 0 || result.refunds.length > 0 || result.webhookEvents.length > 0) && (
              <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4">Other Matches</h2>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                  {result.invoices.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Invoices</p>
                      {result.invoices.map((i: any) => (
                        <button key={i.id} onClick={() => navigate(`/admin/billing/invoices/${i.id}`)} className="block text-orange-400 hover:text-orange-300">
                          {i.invoiceNumber} — {i.status} — {fmtMoney(i.total)} ({i.userEmail || 'guest'})
                        </button>
                      ))}
                    </div>
                  )}
                  {result.orders.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Orders</p>
                      {result.orders.map((o: any) => (
                        <button key={o.id} onClick={() => navigate(`/admin/billing/orders/${o.id}`)} className="block text-orange-400 hover:text-orange-300">
                          {o.orderNumber} — {o.status} ({o.memberEmail || 'guest'})
                        </button>
                      ))}
                    </div>
                  )}
                  {result.shopOrders.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Shop Orders</p>
                      {result.shopOrders.map((s: any) => (
                        <p key={s.id} className="font-mono text-xs">{s.orderNumber || s.id} — {s.status || ''}</p>
                      ))}
                    </div>
                  )}
                  {result.eventRegistrations.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Event Registrations</p>
                      {result.eventRegistrations.map((r: any) => (
                        <p key={r.id} className="text-xs">{r.email || r.id}{r.stripeCustomerId ? ` · ${r.stripeCustomerId}` : ''}</p>
                      ))}
                    </div>
                  )}
                  {result.refunds.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Refunds</p>
                      {result.refunds.map((r: any) => (
                        <p key={r.id} className="font-mono text-xs">{r.gatewayRefundId} — {fmtMoney(r.amount)} ({r.status})</p>
                      ))}
                    </div>
                  )}
                  {result.webhookEvents.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Webhook Events</p>
                      {result.webhookEvents.map((w: any) => (
                        <p key={w.id} className="font-mono text-xs">
                          {w.eventType} — {w.processingResult}{w.errorMessage ? ` (${w.errorMessage})` : ''} · {fmtDate(w.processedAt)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
