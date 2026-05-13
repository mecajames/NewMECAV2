import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/contexts/AuthContext';
import { isAdminUser } from '@/auth/isAdminUser';

interface Props {
  mecaId: string | null | undefined;
  /** Optional display override (e.g. "Non Member" label). Defaults to the MECA ID. */
  displayText?: string;
  /** Tailwind text-color class. Caller-controlled so a per-page color
   *  scheme (expired = red, active = green, etc.) is preserved. */
  className?: string;
}

/**
 * Renders a competitor MECA ID. Links to /results/member/:mecaId when the
 * viewer is a logged-in active MECA member (or an admin); falls back to
 * plain text otherwise — which matches the gating the member profile page
 * itself enforces (you can't view another member's results unless you're
 * an active member yourself). Used by Standings, Top 10, and Results so
 * the rule is identical everywhere.
 */
export function MecaIdLink({ mecaId, displayText, className }: Props) {
  const { user, profile } = useAuth();

  // Treat 999999 / 0 / missing as non-member rows — never linked, no
  // route to navigate to.
  const isRealMecaId =
    !!mecaId && mecaId !== '999999' && mecaId !== '0';
  const text = displayText ?? (isRealMecaId ? mecaId! : 'Non Member');

  const isActiveMember =
    !!profile &&
    ((profile as any).membership_status === 'active' || isAdminUser(profile));
  const canLink = !!user && isActiveMember && isRealMecaId;

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
