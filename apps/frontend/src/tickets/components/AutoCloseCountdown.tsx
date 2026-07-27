import { Timer } from 'lucide-react';
import { Ticket } from '../tickets.api-client';

/**
 * When (if ever) a ticket will auto-close, from the two backend stamps:
 *  - auto_close_at: a staff-set per-reply countdown (24/48/96h). Overrides the
 *    global inactivity rule.
 *  - auto_close_warning_at: the global inactivity warning went out; the sweep
 *    closes the ticket ~24h later.
 * Returns null for tickets that aren't on a close track (or already ended).
 */
export function autoCloseTime(ticket: Pick<Ticket, 'status' | 'auto_close_at' | 'auto_close_warning_at'>): Date | null {
  if (ticket.status === 'resolved' || ticket.status === 'closed' || ticket.status === 'on_hold') return null;
  if (ticket.auto_close_at) return new Date(ticket.auto_close_at);
  if (ticket.auto_close_warning_at) {
    return new Date(new Date(ticket.auto_close_warning_at).getTime() + 24 * 60 * 60 * 1000);
  }
  return null;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'any moment';
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * "⏱ Auto-closes in 2d 4h" chip for the queue table and ticket detail.
 * Amber while there's more than 24h left, red (pulsing) inside the final 24h —
 * the "this ticket is about to close itself" flag. Renders nothing when the
 * ticket isn't on an auto-close track.
 */
export function AutoCloseCountdown({ ticket }: { ticket: Pick<Ticket, 'status' | 'auto_close_at' | 'auto_close_warning_at'> }) {
  const closesAt = autoCloseTime(ticket);
  if (!closesAt) return null;

  const remainingMs = closesAt.getTime() - Date.now();
  const urgent = remainingMs <= 24 * 60 * 60 * 1000;

  return (
    <span
      title={`Auto-closes ${closesAt.toLocaleString()} unless the customer replies`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border whitespace-nowrap ${
        urgent
          ? 'bg-red-500/10 text-red-400 border-red-500/50 animate-pulse'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/40'
      }`}
    >
      <Timer className="w-3 h-3" />
      {remainingMs <= 0 ? 'Closing…' : `Auto-closes in ${formatRemaining(remainingMs)}`}
    </span>
  );
}

export default AutoCloseCountdown;
