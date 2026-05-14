import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hard expired-member gate. See docs/features/MEMBERSHIP_LIFECYCLE.md §4.
 *
 * If the signed-in profile has `membership_status === 'expired'` and is not
 * role-exempt (admin / staff / event_director / judge), the user is signed
 * out and redirected to `/renew-expired` (or `/renew/:token` if they came
 * in from an email link). They never reach any member-only page.
 *
 * This is the FRONTEND half of the gate. The backend `ActiveMembershipGuard`
 * is the actual security boundary — this component is UX.
 */
export function ExpiredMembershipGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isImpersonating = sessionStorage.getItem('isImpersonating') === 'true';

  // Routes that an expired-and-logging-out user is allowed to render
  // without being redirected. Keeps the renewal flow itself reachable.
  const expiredAllowedPrefix = ['/renew', '/login', '/auth/', '/'];
  const isOnAllowedPath = expiredAllowedPrefix.some((p) =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p),
  );

  const isRoleExempt =
    !!profile &&
    (profile.is_staff === true ||
      profile.role === 'admin' ||
      profile.role === 'event_director' ||
      profile.role === 'judge');

  const isExpired =
    !loading && !!user && !!profile && profile.membership_status === 'expired' && !isRoleExempt;

  useEffect(() => {
    if (loading || !user || isImpersonating) return;
    if (!isExpired) return;
    if (isOnAllowedPath) return;

    // Hard policy: expired members do not stay signed in. Sign them out,
    // then route to the public renewal landing.
    (async () => {
      try {
        await signOut('membership-expired');
      } catch {
        // ignore — we still want to redirect
      }
      navigate('/renew-expired', { replace: true });
    })();
  }, [user, isExpired, isOnAllowedPath, loading, isImpersonating, signOut, navigate]);

  if (!isImpersonating && isExpired && !isOnAllowedPath) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Signing you out — your membership has expired.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
