import { Injectable } from '@nestjs/common';

/**
 * Lightweight in-memory agent-collision tracker: which staff members are
 * currently viewing (or typing a reply on) a ticket. Fed by a heartbeat the
 * admin ticket view POSTs every few seconds; entries expire after a short TTL
 * so a closed tab drops off on its own. Intentionally in-memory — presence is
 * ephemeral by nature and the backend runs as a single instance, so losing it
 * on restart is fine.
 */

export interface TicketViewerEntry {
  profileId: string;
  name: string;
  typing: boolean;
  lastSeen: number;
}

const PRESENCE_TTL_MS = 45_000;

@Injectable()
export class TicketPresenceService {
  private byTicket = new Map<string, Map<string, TicketViewerEntry>>();

  /**
   * Record that `profileId` is looking at `ticketId` right now, and return
   * the OTHER active viewers of the same ticket.
   */
  heartbeat(ticketId: string, profileId: string, name: string, typing: boolean): TicketViewerEntry[] {
    const now = Date.now();
    let viewers = this.byTicket.get(ticketId);
    if (!viewers) {
      viewers = new Map();
      this.byTicket.set(ticketId, viewers);
    }
    viewers.set(profileId, { profileId, name, typing, lastSeen: now });

    for (const [key, entry] of viewers) {
      if (now - entry.lastSeen > PRESENCE_TTL_MS) {
        viewers.delete(key);
      }
    }
    if (viewers.size === 0) {
      this.byTicket.delete(ticketId);
    }

    return [...viewers.values()].filter((entry) => entry.profileId !== profileId);
  }

  /** Explicit removal when the viewer navigates away (best-effort; TTL covers the rest). */
  leave(ticketId: string, profileId: string): void {
    const viewers = this.byTicket.get(ticketId);
    if (!viewers) return;
    viewers.delete(profileId);
    if (viewers.size === 0) {
      this.byTicket.delete(ticketId);
    }
  }
}
