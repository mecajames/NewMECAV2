import { useState } from 'react';
import { X, AlertTriangle, XCircle, DollarSign, Loader2, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { membershipsApi } from '../../../memberships/memberships.api-client';

export type CancelRefundMode = 'cancel' | 'refund';

export interface CancelRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  membershipId: string;
  membershipType: string;
  totalAmount: string;
  endDate?: string;
  hasStripePayment: boolean;
  mode: CancelRefundMode;
}

export default function CancelRefundModal({
  isOpen,
  onClose,
  onSuccess,
  membershipId,
  membershipType,
  totalAmount,
  endDate,
  hasStripePayment,
  mode,
}: CancelRefundModalProps) {
  const [cancelType, setCancelType] = useState<'immediate' | 'at_renewal'>('immediate');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (reason.trim().length < 5) {
      setError('Please provide a reason (at least 5 characters)');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'refund') {
        // Refund: Cancel immediately + Stripe refund + email
        const result = await membershipsApi.adminRefund(membershipId, reason.trim());
        setSuccess(result.message);
      } else {
        // Cancel mode
        if (cancelType === 'immediate') {
          const result = await membershipsApi.adminCancelImmediately(membershipId, reason.trim());
          setSuccess(result.message);
        } else {
          const result = await membershipsApi.adminCancelAtRenewal(membershipId, reason.trim());
          setSuccess(result.message);
        }
      }

      // Wait a moment to show success message, then close
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Cancel/Refund error:', err);
      setError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setCancelType('immediate');
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-xl shadow-xl w-full max-w-lg border border-slate-700">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-slate-700 ${
          mode === 'refund' ? 'bg-red-500/10' : 'bg-amber-500/10'
        } rounded-t-xl`}>
          <div className="flex items-center gap-3">
            {mode === 'refund' ? (
              <DollarSign className="h-6 w-6 text-red-500" />
            ) : (
              <XCircle className="h-6 w-6 text-amber-500" />
            )}
            <h2 className="text-xl font-bold text-white">
              {mode === 'refund' ? 'Refund Membership' : 'Cancel Membership'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-green-400">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Membership Info */}
          <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
            <p className="text-gray-400 text-sm">Membership</p>
            <p className="text-white font-medium">{membershipType}</p>
            <p className="text-gray-400 text-sm mt-2">Amount Paid</p>
            <p className="text-white font-medium">{formatCurrency(totalAmount)}</p>
            {endDate && (
              <>
                <p className="text-gray-400 text-sm mt-2">Expires</p>
                <p className="text-white font-medium">{formatDate(endDate)}</p>
              </>
            )}
          </div>

          {/* Cancel Mode Options */}
          {mode === 'cancel' && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300">Cancellation Type</label>

              <label className="flex items-start gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-orange-500/50 transition-colors has-[:checked]:border-orange-500">
                <input
                  type="radio"
                  name="cancelType"
                  value="immediate"
                  checked={cancelType === 'immediate'}
                  onChange={() => setCancelType('immediate')}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-white font-medium">Cancel Immediately</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Deactivate the membership right now. The member will lose access immediately.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer border-2 border-transparent hover:border-orange-500/50 transition-colors has-[:checked]:border-orange-500">
                <input
                  type="radio"
                  name="cancelType"
                  value="at_renewal"
                  checked={cancelType === 'at_renewal'}
                  onChange={() => setCancelType('at_renewal')}
                  className="mt-1"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-white font-medium">Cancel at Renewal</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Keep membership active until {endDate ? formatDate(endDate) : 'the end of the current period'}. It will not auto-renew.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Refund Mode Warning */}
          {mode === 'refund' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-400 font-medium">This action will:</p>
                <ul className="text-amber-400/80 text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>Cancel the membership immediately</li>
                  {hasStripePayment ? (
                    <li>Process a full refund of {formatCurrency(totalAmount)} via Stripe</li>
                  ) : (
                    <li className="text-gray-400">No Stripe payment found - no automatic refund will be processed</li>
                  )}
                  <li>Send a cancellation/refund notification email to the member</li>
                </ul>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-2">
              Reason for {mode === 'refund' ? 'Refund' : 'Cancellation'} *
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Enter the reason for this ${mode === 'refund' ? 'refund' : 'cancellation'}...`}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              rows={3}
              required
              minLength={5}
              disabled={loading || !!success}
            />
            <p className="text-xs text-gray-500 mt-1">
              This reason will be recorded for administrative purposes.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {success ? 'Close' : 'Cancel'}
            </button>
            {!success && (
              <button
                type="submit"
                disabled={loading || reason.trim().length < 5}
                className={`flex-1 px-4 py-3 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  mode === 'refund'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </span>
                ) : mode === 'refund' ? (
                  `Refund ${formatCurrency(totalAmount)}`
                ) : cancelType === 'immediate' ? (
                  'Cancel Now'
                ) : (
                  'Schedule Cancellation'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
