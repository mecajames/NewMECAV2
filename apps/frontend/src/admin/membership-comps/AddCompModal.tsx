import { useState } from 'react';
import { X, Gift, AlertCircle } from 'lucide-react';
import {
  membershipCompsApi,
  MembershipCompType,
  MembershipComp,
} from '@/api-client/membership-comps.api-client';

interface AddCompModalProps {
  membershipId: string;
  membershipName: string;
  onClose: () => void;
  onGranted: (comp: MembershipComp) => void;
}

const COMP_TYPE_OPTIONS: Array<{
  value: MembershipCompType;
  label: string;
  description: string;
  valueLabel: string;
  valuePlaceholder: string;
  showEndsAt: boolean;
  showIndefinite: boolean;
  showMaxUses: boolean;
}> = [
  {
    value: 'free_period',
    label: 'Free Period',
    description: 'Make this membership free for a fixed number of months, or indefinitely until revoked.',
    valueLabel: 'Months free',
    valuePlaceholder: 'e.g. 12',
    showEndsAt: false,
    showIndefinite: true,
    showMaxUses: false,
  },
  {
    value: 'free_secondary_slots',
    label: 'Free Secondary Slot(s)',
    description: 'Grant N free secondary memberships under this master. Optional deadline by which they must be claimed.',
    valueLabel: 'Number of slots',
    valuePlaceholder: 'e.g. 1',
    showEndsAt: true,
    showIndefinite: false,
    showMaxUses: false,
  },
  {
    value: 'renewal_discount_pct',
    label: 'Percent Discount on Renewal',
    description: 'Apply a percent discount on the next N renewal(s). Highest-value discount wins if multiple comps active.',
    valueLabel: 'Percent off (1-100)',
    valuePlaceholder: 'e.g. 25',
    showEndsAt: true,
    showIndefinite: false,
    showMaxUses: true,
  },
  {
    value: 'renewal_discount_fixed',
    label: 'Fixed-$ Discount on Renewal',
    description: 'Apply a flat dollar discount on the next N renewal(s). Highest-value discount wins if multiple comps active.',
    valueLabel: 'Dollars off',
    valuePlaceholder: 'e.g. 25.00',
    showEndsAt: true,
    showIndefinite: false,
    showMaxUses: true,
  },
];

export default function AddCompModal({
  membershipId,
  membershipName,
  onClose,
  onGranted,
}: AddCompModalProps) {
  const [compType, setCompType] = useState<MembershipCompType>('free_period');
  const [value, setValue] = useState('');
  const [indefinite, setIndefinite] = useState(false);
  const [endsAt, setEndsAt] = useState('');
  const [maxUses, setMaxUses] = useState('1');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opt = COMP_TYPE_OPTIONS.find(o => o.value === compType)!;

  const handleSubmit = async () => {
    setError(null);
    const parsedValue = compType === 'free_period' && indefinite ? 0 : parseFloat(value);
    if (!indefinite && (!Number.isFinite(parsedValue) || parsedValue <= 0)) {
      setError(`${opt.valueLabel} must be greater than 0`);
      return;
    }
    if (compType === 'renewal_discount_pct' && parsedValue > 100) {
      setError('Percent discount cannot exceed 100');
      return;
    }
    setSubmitting(true);
    try {
      const comp = await membershipCompsApi.grant({
        membership_id: membershipId,
        comp_type: compType,
        value: parsedValue,
        ends_at: opt.showEndsAt && endsAt ? new Date(endsAt).toISOString() : null,
        indefinite: compType === 'free_period' && indefinite,
        max_uses: opt.showMaxUses ? Math.max(1, parseInt(maxUses, 10) || 1) : undefined,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onGranted(comp);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to grant comp');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Grant Comp</h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-400">
            Granting comp on{' '}
            <span className="text-orange-400 font-medium">{membershipName}</span>.
            All grants are logged to the admin audit trail.
          </div>

          {/* Comp type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
            <div className="space-y-2">
              {COMP_TYPE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setCompType(o.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    compType === o.value
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-slate-700 bg-slate-800 text-gray-300 hover:border-slate-600'
                  }`}
                >
                  <div className="font-medium">{o.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{o.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Indefinite checkbox (free_period only) */}
          {opt.showIndefinite && (
            <div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={indefinite}
                  onChange={(e) => setIndefinite(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-emerald-500"
                />
                <span>Indefinite (until-revoked) — never expires automatically</span>
              </label>
            </div>
          )}

          {/* Value */}
          {!indefinite && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {opt.valueLabel}
              </label>
              <input
                type="number"
                step={compType === 'renewal_discount_fixed' ? '0.01' : '1'}
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={opt.valuePlaceholder}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                disabled={submitting}
              />
            </div>
          )}

          {/* Ends-at */}
          {opt.showEndsAt && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Claim/Apply by (optional)
              </label>
              <input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                disabled={submitting}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Leave blank for no deadline (until-revoked).
              </p>
            </div>
          )}

          {/* Max uses (discount comps) */}
          {opt.showMaxUses && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Number of renewals this applies to
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                disabled={submitting}
              />
              <p className="text-[11px] text-gray-500 mt-1">
                e.g. 1 = next renewal only, 3 = next three renewals.
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Sponsor comp / Lifetime achievement / Promotional offer"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              disabled={submitting}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Internal notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Anything useful for future admins reviewing this grant"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 resize-none"
              disabled={submitting}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-700">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-gray-300 font-medium rounded-lg border border-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? 'Granting…' : 'Grant Comp'}
          </button>
        </div>
      </div>
    </div>
  );
}
