import { useEffect, useState } from 'react';
import axios from '@/lib/axios';
import { membershipsApi } from '@/memberships/memberships.api-client';
import {
  RefreshCw, X, AlertCircle, Calendar, Car, Building2, Users, DollarSign, Check,
} from 'lucide-react';

/**
 * Dedicated manual-renewal modal opened from the member detail page header.
 *
 * Different from the Add Membership wizard — this is a one-shot, focused
 * action on an EXISTING active membership. Shows the admin which membership
 * they're renewing (name, vehicle, primary/secondary), the current
 * expiration, and the new expiration the renewal will produce. Then
 * captures cash/check details and submits.
 */

interface MembershipRow {
  id: string;
  paymentStatus: string;
  startDate?: string | null;
  endDate?: string | null;
  competitorName?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleColor?: string | null;
  vehicleLicensePlate?: string | null;
  businessName?: string | null;
  hasTeamAddon?: boolean;
  teamName?: string | null;
  accountType?: string | null;
  mecaId?: number | string | null;
  membershipTypeConfig?: {
    id: string;
    name?: string;
    price?: number | string;
    teamAddonPrice?: number | string | null;
    category?: string;
  } | null;
  cancelledAt?: string | null;
}

function formatDate(iso?: string | null): string {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function dayAfter(iso?: string | null): Date | null {
  if (!iso) return null;
  return new Date(new Date(iso).getTime() + 24 * 60 * 60 * 1000);
}

function plusOneYear(d: Date | null): Date | null {
  if (!d) return null;
  const r = new Date(d);
  r.setFullYear(r.getFullYear() + 1);
  return r;
}

interface Props {
  memberId: string;
  memberName: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ManualRenewalModal({ memberId, memberName, open, onClose, onSuccess }: Props) {
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check'>('cash');
  const [reference, setReference] = useState('');
  const [amountOverride, setAmountOverride] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ newEndDate: string; total: number; orderId: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    setSelectedId(null);
    setReference(''); setAmountOverride(''); setNotes(''); setPaymentMethod('cash');
    // Pull every membership for this member; we filter to renewable ones below.
    axios.get(`/api/memberships/user/${memberId}/all`)
      .then(res => {
        const rows: MembershipRow[] = Array.isArray(res.data) ? res.data : (res.data?.memberships ?? []);
        setMemberships(rows);
      })
      .catch(err => setError(err.response?.data?.message || err.message || 'Failed to load memberships'))
      .finally(() => setLoading(false));
  }, [open, memberId]);

  if (!open) return null;

  // Renewable = PAID, not cancelled, has an end date in the past or future.
  // We allow expired memberships to be renewed manually too — admin discretion.
  const renewable = memberships.filter(m =>
    m.paymentStatus === 'paid'
    && !m.cancelledAt
    && m.endDate,
  );
  const selected = renewable.find(m => m.id === selectedId) || null;

  // Compute the new expiration preview based on what's selected.
  const previewNewEnd = selected ? plusOneYear(dayAfter(selected.endDate)) : null;
  const previewNewStart = selected ? dayAfter(selected.endDate) : null;
  const isExpired = selected?.endDate ? new Date(selected.endDate).getTime() < Date.now() : false;

  // For expired memberships, the new term should start today (not a year ago).
  // Backend handles this for cancelMembership/etc — for symmetry we display
  // an informational note here, but the backend manualRenewMembership method
  // always uses currentEnd + 1 day. Owners can use the Add Membership wizard
  // for expired-renewals if "start today" is required.
  const price = selected?.membershipTypeConfig?.price !== undefined
    ? Number(selected.membershipTypeConfig.price) : 0;
  const teamAddon = selected?.hasTeamAddon
    ? Number(selected.membershipTypeConfig?.teamAddonPrice ?? 0) : 0;
  const defaultTotal = price + teamAddon;

  async function handleSubmit() {
    if (!selected) return;
    if (paymentMethod === 'check' && !reference.trim()) {
      setError('Check number is required for check payments.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await membershipsApi.adminManualRenewMembership(selected.id, {
        paymentMethod,
        checkNumber: paymentMethod === 'check' ? reference.trim() : undefined,
        cashReceiptNumber: paymentMethod === 'cash' ? reference.trim() || undefined : undefined,
        amountOverride: amountOverride ? parseFloat(amountOverride) : undefined,
        notes: notes.trim() || undefined,
      });
      setSuccess({
        newEndDate: result.newEndDate,
        total: amountOverride ? parseFloat(amountOverride) : defaultTotal,
        orderId: result.orderId,
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record renewal');
    } finally {
      setSubmitting(false);
    }
  }

  // Subcomponent: a single membership card in the picker list.
  function MembershipCard({ m }: { m: MembershipRow }) {
    const isSelected = selectedId === m.id;
    const isCompetitor = m.membershipTypeConfig?.category === 'competitor';
    const isBusiness = m.membershipTypeConfig?.category === 'retail'
      || m.membershipTypeConfig?.category === 'manufacturer';
    return (
      <button
        onClick={() => setSelectedId(m.id)}
        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${isSelected
          ? 'border-orange-500 bg-orange-500/10'
          : 'border-slate-600 hover:border-slate-500 bg-slate-700/40'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-white font-semibold">{m.membershipTypeConfig?.name || 'Membership'}</span>
              {m.accountType === 'secondary' && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-700/40 text-purple-200 rounded uppercase tracking-wide">
                  Secondary
                </span>
              )}
              {m.mecaId && (
                <span className="text-orange-400 font-mono text-sm">#{m.mecaId}</span>
              )}
            </div>
            {isCompetitor && m.vehicleMake && (
              <div className="text-slate-300 text-sm flex items-center gap-1.5">
                <Car className="h-3.5 w-3.5 text-slate-400" />
                {m.vehicleColor} {m.vehicleMake} {m.vehicleModel}
                {m.vehicleLicensePlate && (
                  <span className="text-slate-500 ml-1">· plate {m.vehicleLicensePlate}</span>
                )}
              </div>
            )}
            {isBusiness && m.businessName && (
              <div className="text-slate-300 text-sm flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {m.businessName}
              </div>
            )}
            {m.competitorName && !m.vehicleMake && (
              <div className="text-slate-400 text-sm">For: {m.competitorName}</div>
            )}
            {m.hasTeamAddon && (
              <div className="text-emerald-400 text-xs flex items-center gap-1.5 mt-1">
                <Users className="h-3 w-3" /> Team add-on{m.teamName ? `: ${m.teamName}` : ''}
              </div>
            )}
            <div className="text-slate-400 text-xs mt-1.5 flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Currently expires {formatDate(m.endDate)}
            </div>
          </div>
          {isSelected && (
            <Check className="h-5 w-5 text-orange-500 flex-shrink-0" />
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-orange-500" />
              Manual Renewal
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
              <h3 className="text-white font-semibold text-lg">Renewal recorded</h3>
              <p className="text-slate-300 text-sm mt-1">
                ${success.total.toFixed(2)} {paymentMethod} payment recorded.
                New expiration: <strong>{formatDate(success.newEndDate)}</strong>
              </p>
              <p className="text-slate-400 text-xs mt-2">
                An order and invoice were created and the member's expiration has been updated.
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
              {/* Membership picker */}
              <div className="mb-4">
                <label className="text-slate-300 text-sm font-medium block mb-2">
                  Which membership are you renewing?
                </label>
                {renewable.length === 0 ? (
                  <div className="bg-slate-700/40 border border-slate-600 rounded-lg p-4 text-slate-400 text-sm flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      No paid memberships on this account. To create a brand-new membership for this member,
                      use the <strong>Assign Membership</strong> button on the Memberships tab instead.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {renewable.map(m => <MembershipCard key={m.id} m={m} />)}
                  </div>
                )}
              </div>

              {/* Confirmation block + payment fields, only when something is picked */}
              {selected && (
                <>
                  <div className="bg-slate-900/50 border border-slate-600 rounded-lg p-4 mb-4">
                    <h3 className="text-white font-semibold text-sm mb-3">Renewal preview</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider">Current expiration</div>
                        <div className={`mt-0.5 ${isExpired ? 'text-red-400' : 'text-white'}`}>
                          {formatDate(selected.endDate)}
                          {isExpired && <span className="ml-2 text-xs text-red-400">(expired)</span>}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider">After renewal</div>
                        <div className="text-emerald-400 font-medium mt-0.5">
                          {previewNewEnd ? formatDate(previewNewEnd.toISOString()) : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider">New term starts</div>
                        <div className="text-slate-300 mt-0.5">
                          {previewNewStart ? formatDate(previewNewStart.toISOString()) : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider">Default amount</div>
                        <div className="text-slate-300 mt-0.5">${defaultTotal.toFixed(2)}</div>
                      </div>
                    </div>
                    {isExpired && (
                      <div className="mt-3 text-xs text-amber-300 flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <span>
                          This membership has already expired. The new term will still pick up the day after the
                          previous expiration — the member will technically have a gap. If you want the new term
                          to start today instead, use the Assign Membership wizard.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-slate-300 text-sm font-medium block mb-1.5">Payment method *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setPaymentMethod('cash')}
                          className={`px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 ${paymentMethod === 'cash'
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                          <DollarSign className="h-4 w-4" /> Cash
                        </button>
                        <button
                          onClick={() => setPaymentMethod('check')}
                          className={`px-3 py-2.5 rounded-lg text-sm font-medium ${paymentMethod === 'check'
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                          Check
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-slate-300 text-sm font-medium block mb-1.5">
                        {paymentMethod === 'check' ? 'Check number *' : 'Cash receipt number (optional)'}
                      </label>
                      <input
                        type="text"
                        value={reference}
                        onChange={e => setReference(e.target.value)}
                        placeholder={paymentMethod === 'check' ? '1234' : 'leave blank for auto-generated'}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 text-sm font-medium block mb-1.5">Amount override (optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={amountOverride}
                        onChange={e => setAmountOverride(e.target.value)}
                        placeholder={`Defaults to $${defaultTotal.toFixed(2)}`}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-300 text-sm font-medium block mb-1.5">Notes (optional)</label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                        placeholder="e.g. Paid at March 15 event to ED Smith"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-y"
                      />
                    </div>
                    {error && <div className="text-red-400 text-sm">{error}</div>}
                  </div>
                </>
              )}
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
              onClick={handleSubmit}
              disabled={!selected || submitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
              {submitting ? 'Recording…' : 'Record Renewal'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
