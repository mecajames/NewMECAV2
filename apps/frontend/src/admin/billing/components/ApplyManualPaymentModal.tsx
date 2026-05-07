import { useState } from 'react';
import { X, Banknote, AlertCircle } from 'lucide-react';
import {
  invoicesApi,
  ApplyManualPaymentDto,
  ManualPaymentMethod,
  Invoice,
} from '../../../api-client/billing.api-client';

interface ApplyManualPaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onApplied: (updated: Invoice) => void;
}

const METHOD_OPTIONS: { value: ManualPaymentMethod; label: string; helper: string }[] = [
  { value: 'cash', label: 'Cash', helper: 'Walk-in payment' },
  { value: 'check', label: 'Check', helper: 'Personal or business check' },
  { value: 'wire', label: 'Wire Transfer', helper: 'Bank wire' },
  { value: 'money_order', label: 'Money Order', helper: 'Postal or bank money order' },
  { value: 'comp', label: 'Complimentary', helper: 'Free / waived' },
  { value: 'other', label: 'Other', helper: 'Trade, barter, etc.' },
];

export default function ApplyManualPaymentModal({
  invoice,
  onClose,
  onApplied,
}: ApplyManualPaymentModalProps) {
  const [method, setMethod] = useState<ManualPaymentMethod>('check');
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState(invoice.total);
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (val: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency || 'USD',
    }).format(parseFloat(val) || 0);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (method === 'check' && !reference.trim()) {
      setError('Check number is required for check payments.');
      return;
    }
    if (method === 'wire' && !reference.trim()) {
      setError('Wire confirmation reference is required.');
      return;
    }
    setSubmitting(true);
    try {
      const dto: ApplyManualPaymentDto = {
        method,
        reference: reference.trim() || undefined,
        amount,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
      };
      const updated = await invoicesApi.applyManualPayment(invoice.id, dto);
      onApplied(updated);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to apply payment');
    } finally {
      setSubmitting(false);
    }
  };

  const referenceLabel = (() => {
    switch (method) {
      case 'check': return 'Check Number *';
      case 'wire': return 'Wire Confirmation # *';
      case 'money_order': return 'Money Order #';
      case 'cash': return 'Receipt # (optional)';
      case 'comp': return 'Authorized By';
      case 'other': return 'Reference';
      default: return 'Reference';
    }
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Apply Manual Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={submitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-400">
            Recording a payment received outside Stripe (cash, check, wire, etc.) for invoice{' '}
            <span className="text-orange-400 font-medium">{invoice.invoiceNumber}</span>{' '}
            ({formatCurrency(invoice.total)} total). The invoice will be marked PAID and
            the linked order COMPLETED.
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {METHOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMethod(opt.value)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    method === opt.value
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-slate-700 bg-slate-800 text-gray-300 hover:border-slate-600'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-gray-500">{opt.helper}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {referenceLabel}
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={
                method === 'check' ? 'e.g. 1042'
                  : method === 'wire' ? 'e.g. FED-AB123456'
                  : method === 'comp' ? 'e.g. James Ryan'
                  : ''
              }
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              disabled={submitting}
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Amount Received
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Payment Date
              </label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                disabled={submitting}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Received at WF check-in table"
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
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-gray-300 font-medium rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? 'Recording…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
