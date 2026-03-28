import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ExpiredMembershipGuardProps {
  children: ReactNode;
}

// Routes that expired members ARE allowed to access
const ALLOWED_PATHS = [
  '/dashboard/membership',
  '/membership',
  '/billing',
  '/change-password',
  '/logout',
  '/pay/',
];

/**
 * Guard that blocks expired members from accessing the app until they renew.
 * Redirects them to the membership renewal page.
 * Admins, staff, and users who never had a membership are not affected.
 */
export function ExpiredMembershipGuard({ children }: ExpiredMembershipGuardProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isImpersonating = sessionStorage.getItem('isImpersonating') === 'true';

  const isExpired = !loading && user && profile
    && profile.membership_status === 'expired'
    && !profile.is_staff
    && profile.role !== 'admin';

  const isAllowedPath = ALLOWED_PATHS.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    if (loading || !user || isImpersonating) return;

    if (isExpired && !isAllowedPath) {
      navigate('/dashboard/membership', { replace: true });
    }
  }, [user, profile, loading, location.pathname, navigate, isImpersonating, isExpired, isAllowedPath]);

  if (!isImpersonating && isExpired && !isAllowedPath) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Redirecting to membership renewal...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
