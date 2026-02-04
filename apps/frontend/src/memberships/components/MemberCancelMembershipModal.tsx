import { useState } from 'react';
import { X, AlertTriangle, Calendar, Loader2, AlertCircle, CheckCircle, MessageSquare, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { membershipsApi } from '../memberships.api-client';

interface MemberCancelMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  membershipId: string;
  membershipType: string;
  endDate?: string;
}

export default function MemberCancelMembershipModal({
  isOpen,
  onClose,
  onSuccess,
  membershipId,
  membershipType,
  endDate,
}: MemberCancelMembershipModalProps) {
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; effectiveEndDate: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!confirmed) {
      setError('Please confirm that you understand your membership will be cancelled');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await membershipsApi.cancelMembership(membershipId, reason.trim() || undefined);
      setSuccess({
        message: result.message,
        effectiveEndDate: result.effectiveEndDate,
      });

      // Wait a moment to show success, then trigger refresh
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      console.error('Cancellation error:', err);
      setError(err.response?.data?.message || err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setReason('');
      setConfirmed(false);
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  const handleContactSupport = () => {
    handleClose();
    navigate('/tickets');
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
        <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-amber-500/10 rounded-t-xl">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl font-bold text-white">Cancel Membership</h2>
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
        <div className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-400 font-medium">Cancellation Confirmed</p>
                  <p className="text-green-400/80 text-sm mt-1">{success.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Important Notice */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-amber-400 font-medium">Important Information</p>
                    <p className="text-amber-400/80 text-sm mt-2">
                      When you cancel your membership:
                    </p>
                    <ul className="text-amber-400/80 text-sm mt-2 space-y-1 list-disc list-inside">
                      <li>Your membership will remain <strong>active until {endDate ? formatDate(endDate) : 'your current expiration date'}</strong></li>
                      <li>You will continue to have full access until that date</li>
                      <li>Your membership will <strong>not auto-renew</strong></li>
                      <li>You can rejoin at any time after cancellation</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Membership Info */}
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <p className="text-gray-400 text-sm">Membership Type</p>
                <p className="text-white font-medium">{membershipType}</p>
                {endDate && (
                  <>
                    <p className="text-gray-400 text-sm mt-3">Active Until</p>
                    <p className="text-white font-medium">{formatDate(endDate)}</p>
                  </>
                )}
              </div>

              {/* Immediate Cancellation Notice */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-400 font-medium">Need Immediate Cancellation?</p>
                    <p className="text-blue-400/80 text-sm mt-1">
                      If you need your membership cancelled immediately (with a possible refund), please contact our support team.
                    </p>
                    <button
                      type="button"
                      onClick={handleContactSupport}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-medium rounded-lg transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Create Support Ticket
                    </button>
                  </div>
                </div>
              </div>

              {/* Reason (Optional) */}
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-300 mb-2">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Help us improve by sharing why you're cancelling..."
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={3}
                  disabled={loading}
                />
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start gap-3 p-4 bg-slate-700/50 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => {
                    setConfirmed(e.target.checked);
                    if (e.target.checked) setError(null);
                  }}
                  className="mt-1 h-4 w-4 text-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-orange-500"
                  disabled={loading}
                />
                <span className="text-sm text-gray-300">
                  I understand that my membership will be cancelled at the end of my current billing period ({endDate ? formatDate(endDate) : 'expiration date'}) and will not auto-renew.
                </span>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Keep My Membership
                </button>
                <button
                  type="submit"
                  disabled={loading || !confirmed}
                  className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </span>
                  ) : (
                    'Cancel Membership'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* After Success - Show Close Button */}
          {success && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
