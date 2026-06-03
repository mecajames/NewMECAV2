import { useEffect, useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  /** Body message. Plain string or custom node. */
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red, destructive-styled confirm button. */
  destructive?: boolean;
  /** When true, a required reason field is shown and passed to onConfirm. */
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  /** Shows a spinner and disables the buttons while the action runs. */
  loading?: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/**
 * Reusable in-app confirmation modal. Replaces native window.confirm/prompt,
 * which browsers can permanently suppress for the page once the user ticks the
 * "prevent this page from creating additional dialogs" checkbox (which they only
 * offer when several dialogs fire in quick succession).
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  requireReason = false,
  reasonLabel = 'Reason',
  reasonPlaceholder = '',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  // Reset transient input whenever the dialog is (re)opened.
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setTouched(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const reasonMissing = requireReason && !reason.trim();

  const handleClose = () => {
    if (!loading) onClose();
  };

  const handleConfirm = () => {
    if (loading) return;
    if (reasonMissing) {
      setTouched(true);
      return;
    }
    onConfirm(reason.trim());
  };

  const confirmClasses = destructive
    ? 'bg-red-600 hover:bg-red-700'
    : 'bg-orange-600 hover:bg-orange-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-slate-800 rounded-xl shadow-xl w-full max-w-md border border-slate-700">
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b border-slate-700 rounded-t-xl ${
            destructive ? 'bg-red-500/10' : 'bg-amber-500/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle
              className={`h-6 w-6 ${destructive ? 'text-red-500' : 'text-amber-500'}`}
            />
            <h2 className="text-xl font-bold text-white">{title}</h2>
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
        <div className="p-6 space-y-4">
          <div className="text-gray-300 text-sm whitespace-pre-line">{message}</div>

          {requireReason && (
            <div>
              <label
                htmlFor="confirm-dialog-reason"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                {reasonLabel} <span className="text-red-400">*</span>
              </label>
              <textarea
                id="confirm-dialog-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={reasonPlaceholder}
                rows={3}
                disabled={loading}
                autoFocus
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none disabled:opacity-50"
              />
              {touched && reasonMissing && (
                <p className="text-red-400 text-sm mt-2">A reason is required.</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || reasonMissing}
            className={`px-4 py-2 ${confirmClasses} text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Working...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
