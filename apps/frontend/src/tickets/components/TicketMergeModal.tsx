import { useState } from 'react';
import { X, GitMerge, Loader2, AlertTriangle } from 'lucide-react';
import { ticketsApi } from '../tickets.api-client';

/**
 * Staff tool for de-duplicating tickets: merges the CURRENT ticket (the
 * duplicate) into another ticket from the same person. The conversation moves
 * to the target, this ticket closes with a pointer comment, and the reporter
 * is notified where the thread continues.
 */
export function TicketMergeModal({
  ticketId,
  ticketNumber,
  onClose,
  onMerged,
}: {
  ticketId: string;
  ticketNumber: string;
  onClose: () => void;
  onMerged: (targetTicketId: string) => void;
}) {
  const [target, setTarget] = useState('');
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMerge = async () => {
    setMerging(true);
    setError(null);
    try {
      const result = await ticketsApi.merge(ticketId, target.trim());
      onMerged(result.id);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Merge failed. Check the ticket number.');
      setMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-600 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="flex items-center gap-2 text-white font-semibold">
            <GitMerge className="w-5 h-5 text-cyan-400" />
            Merge Ticket
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-300 mb-4">
          Merge <strong className="text-white">{ticketNumber}</strong> into another ticket from the
          same person. This ticket's messages and attachments move to the other ticket, this one
          closes with a "merged into…" note, and the member is pointed at the surviving ticket.
        </p>

        <label className="block text-sm text-gray-400 mb-1">Merge into ticket number</label>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && target.trim() && !merging && handleMerge()}
          placeholder="MECA-20260721-0001"
          autoFocus
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
        />

        {error && (
          <div className="flex items-start gap-2 mt-3 p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-sm text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={!target.trim() || merging}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}

export default TicketMergeModal;
