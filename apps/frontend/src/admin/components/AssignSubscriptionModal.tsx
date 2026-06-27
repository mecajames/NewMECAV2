import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import {
  membershipsApi,
  type SubscriptionAssignmentPreview,
} from '@/memberships/memberships.api-client';
import {
  Link2, X, AlertCircle, AlertTriangle, Calendar, Search, Check, CreditCard,
} from 'lucide-react';

/**
 * Admin modal to assign (or move) a Stripe subscription to one of a member's
 * memberships. The admin pastes a Stripe subscription id; we pull the REAL
 * data from Stripe (status, product, amount, period end, customer email) for
 * confirmation, warn if the subscription is already linked to a different
 * member (it will be moved), then assign — reactivating the membership from the
 * live period end and writing an enriched billing record.
 */

interface MembershipRow {
  id: string;
  paymentStatus: string;
  endDate?: string | null;
  competitorName?: string | null;
  mecaId?: number | string | null;
  stripeSubscriptionId?: string | null;
  membershipTypeConfig?: { id: string; name?: string; category?: string } | null;
}

interface Props {
  memberId: string;
  memberName: string;
  /**
   * When opened from a specific membership card's "Manage" dropdown, the id of
   * that membership — it's pre-selected as the assignment target so the admin
   * links the subscription to exactly the card they clicked.
   */
  preselectMembershipId?: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function errMsg(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || fallback;
}

export default function AssignSubscriptionModal({ memberId, memberName, preselectMembershipId, open, onClose, onSuccess }: Props) {
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subId, setSubId] = useState('');
  const [preview, setPreview] = useState<SubscriptionAssignmentPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ moved: boolean } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null); setSuccess(null);
    // Pre-select the card the admin launched from (if any).
    setSelectedId(preselectMembershipId ?? null);
    setSubId(''); setPreview(null);
    axios.get(`/api/memberships/user/${memberId}/all`)
      .then(res => {
        const rows: MembershipRow[] = Array.isArray(res.data) ? res.data : (res.data?.memberships ?? []);
        setMemberships(rows);
      })
      .catch(err => setError(err.response?.data?.message || err.message || 'Failed to load memberships'))
      .finally(() => setLoading(false));
  }, [open, memberId, preselectMembershipId]);

  if (!open) return null;

  async function handleLookup() {
    const id = subId.trim();
    if (!id) { setError('Enter a Stripe subscription ID (sub_…).'); return; }
    setPreviewing(true); setError(null); setPreview(null);
    try {
      const result = await membershipsApi.adminPreviewSubscription(id);
      setPreview(result);
    } catch (err) {
      setError(errMsg(err, 'Could not find that subscription in Stripe'));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleAssign() {
    if (!selectedId) { setError('Select which membership to assign this subscription to.'); return; }
    if (!preview) { setError('Look up the subscription first.'); return; }
    setSubmitting(true); setError(null);
    try {
      const result = await membershipsApi.adminAssignSubscription(selectedId, subId.trim());
      setSuccess({ moved: !!result.movedFromMembershipId });
      onSuccess?.();
    } catch (err) {
      setError(errMsg(err, 'Failed to assign subscription'));
    } finally {
      setSubmitting(false);
    }
  }

  const b = preview?.bundle;
  // The subscription is currently on a DIFFERENT membership than the one picked.
  const willMove = !!preview?.currentMembership
    && preview.currentMembership.membershipId !== selectedId;
  const liveStatus = b ? ['active', 'trialing', 'past_due'].includes(b.status) : false;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl flex items-center gap-2">
              <Link2 className="h-5 w-5 text-orange-500" />
              Assign Stripe Subscription
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">For {memberName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {success ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                <Check className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-white font-semibold text-lg">Subscription assigned</h3>
              <p className="text-slate-300 text-sm mt-1">
                {success.moved
                  ? 'The subscription was moved to this membership and it has been reactivated from the live Stripe period.'
                  : 'The membership is now linked to the subscription and reactivated from the live Stripe period.'}
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium"
              >
                Done
              </button>
            </div>
          ) : loading ? (
            <div className="text-slate-400 text-sm py-12 text-center">Loading memberships…</div>
          ) : (
            <>
              {/* Step 1: enter + look up the subscription */}
              <div className="mb-4">
                <label className="text-slate-300 text-sm font-medium block mb-1.5">
                  Stripe subscription ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subId}
                    onChange={e => { setSubId(e.target.value); setPreview(null); }}
                    placeholder="sub_1ABC…"
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  <button
                    onClick={handleLookup}
                    disabled={previewing || !subId.trim()}
                    className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    <Search className={`h-4 w-4 ${previewing ? 'animate-pulse' : ''}`} />
                    {previewing ? 'Looking up…' : 'Look up'}
                  </button>
                </div>
              </div>

              {/* Real Stripe data preview */}
              {b && (
                <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 mb-4">
                  <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-orange-400" /> From Stripe
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider">Status</div>
                      <div className={`mt-0.5 font-medium ${liveStatus ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {b.status}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider">Plan</div>
                      <div className="text-white mt-0.5">{b.productName || '—'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider">Amount</div>
                      <div className="text-white mt-0.5">
                        {b.amount != null ? `$${b.amount.toFixed(2)}` : '—'}
                        {b.interval ? ` / ${b.interval}` : ''}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400 text-xs uppercase tracking-wider">Current period ends</div>
                      <div className="text-white mt-0.5 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        {formatDate(b.currentPeriodEnd)}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-slate-400 text-xs uppercase tracking-wider">Stripe customer</div>
                      <div className="text-slate-300 mt-0.5">{b.customerEmail || b.customerId || '—'}</div>
                    </div>
                  </div>

                  {preview?.currentMembership && (
                    <div className="mt-3 text-xs text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        This subscription is currently linked to{' '}
                        <strong>
                          {preview.currentMembership.memberName || 'another member'}
                          {preview.currentMembership.mecaId ? ` (#${preview.currentMembership.mecaId})` : ''}
                        </strong>
                        . Assigning it here will <strong>move</strong> it off that membership.
                      </span>
                    </div>
                  )}
                  {!liveStatus && (
                    <div className="mt-2 text-xs text-amber-300 flex items-start gap-2">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        This subscription is not in a live state ({b.status}); the membership will be
                        linked but not reactivated.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: pick the target membership */}
              {b && (
                <div className="mb-2">
                  <label className="text-slate-300 text-sm font-medium block mb-2">
                    Assign to which membership?
                  </label>
                  {memberships.length === 0 ? (
                    <div className="bg-slate-700/40 border border-slate-600 rounded-lg p-4 text-slate-400 text-sm flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>No memberships on this account. Create one first via the Memberships tab.</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {memberships.map(m => {
                        const isSelected = selectedId === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setSelectedId(m.id)}
                            className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${isSelected
                              ? 'border-orange-500 bg-orange-500/10'
                              : 'border-slate-600 hover:border-slate-500 bg-slate-700/40'}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-white font-semibold">
                                    {m.membershipTypeConfig?.name || 'Membership'}
                                  </span>
                                  {m.mecaId && <span className="text-orange-400 font-mono text-sm">#{m.mecaId}</span>}
                                  <span className="text-[10px] px-1.5 py-0.5 bg-slate-600 text-slate-200 rounded uppercase">
                                    {m.paymentStatus}
                                  </span>
                                </div>
                                <div className="text-slate-400 text-xs mt-1 flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3" /> expires {formatDate(m.endDate)}
                                  {m.stripeSubscriptionId && (
                                    <span className="ml-2 text-slate-500 font-mono">· sub linked</span>
                                  )}
                                </div>
                              </div>
                              {isSelected && <Check className="h-5 w-5 text-orange-500 flex-shrink-0" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {error && <div className="text-red-400 text-sm mt-3">{error}</div>}
            </>
          )}
        </div>

        {!success && (
          <div className="p-5 border-t border-slate-700 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!preview || !selectedId || submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Link2 className="h-4 w-4" />
              {submitting ? 'Assigning…' : willMove ? 'Move & Assign' : 'Assign Subscription'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
