import { useState } from 'react';
import { CreditCard, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import axios from '@/lib/axios';
import { TicketPurchase } from '@newmeca/shared';
import { refundTicketPurchase } from '../ticket-custom-fields.api-client';

interface Props {
  purchase: TicketPurchase;
  /** Refund controls + admin deep links only render for staff. */
  isStaff?: boolean;
}

const TYPE_LABEL: Record<TicketPurchase['type'], string> = {
  membership: 'Membership',
  shop: 'Shop Order',
  event_registration: 'Event Registration',
  world_finals: 'World Finals Pre-Registration',
};

export function TicketPurchaseContextPanel({ purchase, isStaff }: Props) {
  const [showRefund, setShowRefund] = useState(false);
  const [partial, setPartial] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const purchasedAt = new Date(purchase.purchased_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const methodLabel = purchase.method === 'stripe' ? 'Card (Stripe)' : purchase.method === 'paypal' ? 'PayPal' : 'Unknown';

  const issueRefund = async () => {
    if (reason.trim().length < 5) {
      setResult({ ok: false, msg: 'Please enter a reason (at least 5 characters).' });
      return;
    }
    let amountCents: number | undefined;
    if (partial) {
      const dollars = parseFloat(amount);
      if (!dollars || dollars <= 0 || dollars > purchase.amount) {
        setResult({ ok: false, msg: `Enter a partial amount between $0.01 and $${purchase.amount.toFixed(2)}.` });
        return;
      }
      amountCents = Math.round(dollars * 100);
    }
    setSubmitting(true);
    setResult(null);
    try {
      if (purchase.type === 'membership') {
        await axios.post(`/api/memberships/${purchase.id}/admin/refund`, { reason: reason.trim(), amountCents });
      } else {
        const res = await refundTicketPurchase({ type: purchase.type, id: purchase.id, amountCents, reason: reason.trim() });
        setResult({ ok: true, msg: res.message });
        setShowRefund(false);
        return;
      }
      setResult({
        ok: true,
        msg: partial
          ? `Partial refund of $${parseFloat(amount).toFixed(2)} issued.`
          : 'Full refund issued and membership cancelled.',
      });
      setShowRefund(false);
    } catch (err: any) {
      setResult({ ok: false, msg: err?.response?.data?.message || 'Refund failed. Try the billing page.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-semibold text-gray-200">Referenced Purchase</span>
        <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-gray-300">{TYPE_LABEL[purchase.type]}</span>
        {purchase.refund_eligible ? (
          <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/40">
            Within 30-day window
          </span>
        ) : (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/40">
            Outside 30-day window ({purchase.days_since_purchase}d)
          </span>
        )}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-gray-400">Item</dt>
          <dd className="text-gray-200">{purchase.label}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Amount</dt>
          <dd className="text-gray-200">${purchase.amount.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Purchased</dt>
          <dd className="text-gray-200">{purchasedAt}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-400">Method</dt>
          <dd className="text-gray-200">{methodLabel}</dd>
        </div>
        {purchase.transaction_id && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-400">Transaction</dt>
            <dd className="text-gray-200 break-all text-xs">{purchase.transaction_id}</dd>
          </div>
        )}
      </dl>

      {isStaff && (
        <div className="mt-4 pt-3 border-t border-slate-700">
          {result && (
            <div
              className={`flex items-center gap-2 text-sm mb-3 ${result.ok ? 'text-green-400' : 'text-red-400'}`}
            >
              {result.ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {result.msg}
            </div>
          )}

          {!showRefund ? (
            <button
              onClick={() => { setShowRefund(true); setResult(null); }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-gray-200 rounded-lg border border-slate-600"
            >
              <RotateCcw className="w-4 h-4" />
              Issue Refund
            </button>
          ) : (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} className="w-4 h-4 accent-orange-500" />
                Partial refund
              </label>
              {partial && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={purchase.amount}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Up to ${purchase.amount.toFixed(2)}`}
                    className="w-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  />
                </div>
              )}
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for refund (required)"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={issueRefund}
                  disabled={submitting}
                  className="px-3 py-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Processing…' : partial ? 'Issue Partial Refund' : 'Issue Full Refund'}
                </button>
                <button onClick={() => setShowRefund(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Issues a real {methodLabel} refund{purchase.type === 'membership' ? ' and cancels the membership on a full refund' : ''}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TicketPurchaseContextPanel;
