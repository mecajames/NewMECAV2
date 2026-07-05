import type { TicketStatus } from './tickets.api-client';

/**
 * Two-level ticket status model (James, 2026-07-04).
 *
 * Level 1 — LIFECYCLE: a ticket is OPEN, RESOLVED, or CLOSED. Everything that
 * isn't resolved/closed — including reopened — is an open request.
 *
 * Level 2 — SUB-STATUS (only meaningful while open): where the open ticket
 * currently sits — In Queue (new, nobody grabbed it yet), In Progress,
 * Pending Customer, Pending Internal Review, Escalated, On Hold.
 *
 * The stored status values are unchanged (no migration) — this is a
 * presentation/querying layer over them.
 */

export type TicketLifecycle = 'open' | 'resolved' | 'closed';

/** Every stored status that counts as an OPEN request. */
export const OPEN_LIFECYCLE_STATUSES: TicketStatus[] = [
  'open',
  'reopened',
  'in_progress',
  'awaiting_response',
  'pending_internal_review',
  'escalated',
  'on_hold',
];

export function lifecycleOf(status: string | null | undefined): TicketLifecycle {
  if (status === 'resolved') return 'resolved';
  if (status === 'closed') return 'closed';
  return 'open';
}

export const LIFECYCLE_BADGE: Record<TicketLifecycle, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-blue-500/10 text-blue-400 border-blue-500' },
  resolved: { label: 'Resolved', className: 'bg-green-500/10 text-green-400 border-green-500' },
  closed: { label: 'Closed', className: 'bg-gray-500/10 text-gray-400 border-gray-500' },
};

/** Working-state wording shown under/next to the "Open" lifecycle badge. */
const SUB_STATUS_LABELS: Record<string, string> = {
  open: 'In Queue',
  reopened: 'Reopened — In Queue',
  in_progress: 'In Progress',
  awaiting_response: 'Pending Customer',
  pending_internal_review: 'Pending Internal Review',
  escalated: 'Escalated',
  on_hold: 'On Hold',
};

/**
 * Sub-status for an OPEN ticket ("In Queue", "Pending Customer", …).
 * Returns null for resolved/closed (the lifecycle IS the whole story there).
 * Unknown stored values fall back to a prettified form rather than throwing.
 */
export function subStatusOf(status: string | null | undefined): string | null {
  if (lifecycleOf(status) !== 'open') return null;
  const key = String(status || 'open');
  return (
    SUB_STATUS_LABELS[key] ||
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
