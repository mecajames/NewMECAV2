import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/contexts/AuthContext';
import { isAdminUser } from '@/auth/isAdminUser';
import { hasActiveMembership } from '@/auth/permissions';
import { useMecaIdActive } from './MecaIdActiveContext';

interface Props {
  mecaId: string | null | undefined;
  /** Optional display override (e.g. "Non Member" label). Defaults to the MECA ID. */
  displayText?: string;
  /** Tailwind text-color class. Caller-controlled so a per-page color
   *  scheme (expired = red, active = green, etc.) is preserved. */
  className?: string;
}

/**
 * Renders a competitor MECA ID. Two gates are applied before the value
 * becomes a clickable link:
 *
 *   1. Viewer gate — the *viewer* must be a logged-in active member or
 *      admin. (`/results/member/:mecaId` is itself member-gated, so an
 *      anonymous viewer can never reach it.)
 *
 *   2. Target gate — when wrapped in a <MecaIdActiveProvider>, this
 *      component additionally checks whether the *target* MECA ID is
 *      currently held by an active membership. If the target is expired,
 *      retired, or `999999`, it renders as plain text (no link) even for
 *      admin viewers, because the member profile page itself returns
 *      "not active" in that state. Without a provider, the target gate is
 *      a no-op.
 *
 * Used by Results, Leaderboard, Standings, and Top 10 so the rule is
 * identical everywhere.
 */
export function MecaIdLink({ mecaId, displayText, className }: Props) {
  const { user, profile } = useAuth();

  const isRealMecaId = !!mecaId && mecaId !== '999999' && mecaId !== '0';
  const text = displayText ?? (isRealMecaId ? mecaId! : 'Non Member');

  // Active member OR admin viewer — uses centralized permission helper so
  // the rule stays consistent with the rest of the dashboard.
  const isActiveMember = hasActiveMembership(profile as any) || isAdminUser(profile);

  // Target gate — undefined means "no provider mounted, fall through" (so we
  // don't break callers that don't yet wrap their page). false means
  // "provider says target is not active". Only true unlocks the link.
  const targetActive = useMecaIdActive(mecaId);
  const targetGateOk = targetActive === undefined ? true : targetActive;

  const canLink = !!user && isActiveMember && isRealMecaId && targetGateOk;

  if (!canLink) {
    return <span className={className}>{text}</span>;
  }
  return (
    <Link
      to={`/results/member/${mecaId}`}
      className={`${className ?? ''} hover:underline hover:text-orange-400 transition-colors`}
    >
      {text}
    </Link>
  );
}

export default MecaIdLink;
