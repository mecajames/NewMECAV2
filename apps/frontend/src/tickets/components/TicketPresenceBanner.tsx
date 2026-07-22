import { useState, useEffect, useRef } from 'react';
import { Eye, PenLine } from 'lucide-react';
import { ticketsApi, TicketViewer } from '../tickets.api-client';

const HEARTBEAT_MS = 10_000;

/**
 * Agent-collision banner for the staff ticket view. Heartbeats the backend
 * every few seconds ("I'm viewing this ticket; I am / am not typing") and
 * shows who ELSE is on the same ticket — so two techs don't both write an
 * answer to the same question. Renders nothing when you're alone.
 */
export function TicketPresenceBanner({ ticketId, typing }: { ticketId: string; typing: boolean }) {
  const [viewers, setViewers] = useState<TicketViewer[]>([]);
  // Latest typing state readable from inside the interval without restarting it.
  const typingRef = useRef(typing);

  useEffect(() => {
    let cancelled = false;

    const beat = async () => {
      try {
        const { viewers: others } = await ticketsApi.presence(ticketId, typingRef.current);
        if (!cancelled) setViewers(others);
      } catch {
        // Presence is best-effort — never surface errors over it.
      }
    };

    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      ticketsApi.presenceLeave(ticketId).catch(() => undefined);
    };
  }, [ticketId]);

  // Push a typing-state change immediately instead of waiting for the next tick.
  useEffect(() => {
    if (typingRef.current === typing) return;
    typingRef.current = typing;
    ticketsApi
      .presence(ticketId, typing)
      .then(({ viewers: others }) => setViewers(others))
      .catch(() => undefined);
  }, [ticketId, typing]);

  if (viewers.length === 0) return null;

  const typists = viewers.filter((v) => v.typing);
  const names = (list: TicketViewer[]) => list.map((v) => v.name).join(', ');

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border mb-4 text-sm ${
        typists.length > 0
          ? 'bg-red-500/10 border-red-500/40 text-red-300'
          : 'bg-yellow-500/10 border-yellow-500/40 text-yellow-300'
      }`}
    >
      {typists.length > 0 ? (
        <>
          <PenLine className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span>
            <strong>{names(typists)}</strong> {typists.length === 1 ? 'is' : 'are'} typing a reply on
            this ticket right now — check before answering the same question.
          </span>
        </>
      ) : (
        <>
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{names(viewers)}</strong> {viewers.length === 1 ? 'is' : 'are'} also viewing this
            ticket.
          </span>
        </>
      )}
    </div>
  );
}

export default TicketPresenceBanner;
