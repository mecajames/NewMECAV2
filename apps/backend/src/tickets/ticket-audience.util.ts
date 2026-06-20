/**
 * Audience + role visibility for ticket departments and categories.
 *
 * Shared by the department + category services so the form shows the right
 * options to guests vs logged-in members, and reserves role-gated items
 * (Event Director / Judge) for members who hold one of the required roles.
 *
 * This only controls what the FORM OFFERS — it grants no privilege — so it is
 * safe to drive role filtering from client-supplied roles.
 */
export type TicketViewerKind = 'guest' | 'member';

export interface TicketAudienceViewer {
  kind: TicketViewerKind;
  /** The member's roles (e.g. ['event_director']). Empty for guests. */
  roles?: string[];
}

export function isVisibleToViewer(
  audience: string | null | undefined,
  requiredRoles: string[] | null | undefined,
  viewer: TicketAudienceViewer,
): boolean {
  const aud = audience || 'all';

  // Audience gate.
  if (viewer.kind === 'guest' && aud === 'members') return false;
  if (viewer.kind === 'member' && aud === 'guests') return false;

  // Role gate — only members can satisfy it; a role-gated item is never shown
  // to guests.
  const roles = Array.isArray(requiredRoles) ? requiredRoles.filter(Boolean) : [];
  if (roles.length > 0) {
    if (viewer.kind !== 'member') return false;
    const viewerRoles = viewer.roles ?? [];
    if (!roles.some((r) => viewerRoles.includes(r))) return false;
  }

  return true;
}

/** Build a viewer from raw query params (?audience=guest|member&roles=a,b). */
export function viewerFromQuery(audience?: string, roles?: string): TicketAudienceViewer {
  return {
    kind: audience === 'guest' ? 'guest' : 'member',
    roles: roles ? roles.split(',').map((r) => r.trim()).filter(Boolean) : [],
  };
}
