import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ALLOWED_PREFIXES = [
  '/billing',
  '/change-password',
  '/login',
  '/auth',
  '/logout',
];

/**
 * Mode-B "pay-to-activate" provisioning guard. When an admin provisions a
 * profile via the Security Audit page in pay-to-activate mode, the server
 * sets `profiles.restricted_to_billing = true`. Until that user pays the
 * outstanding invoice (which auto-clears the flag on the server), this guard
 * pins them to /billing and a small set of safe routes — they can pay, sign
 * out, or change password, but every other route redirects to /billing.
 *
 * Impersonation skips the guard so admins can still inspect the account.
 */
export function BillingRestrictedGuard({ children }: { children: ReactNode }) {
  const { user, restrictedToBilling, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isImpersonating = sessionStorage.getItem('isImpersonating') === 'true';
  const path = location.pathname;
  const isAllowedPath = ALLOWED_PREFIXES.some(prefix => path.startsWith(prefix));

  useEffect(() => {
    if (loading || !user) return;
    if (isImpersonating) return;
    if (!restrictedToBilling) return;
    if (isAllowedPath) return;
    navigate('/billing', { replace: true });
  }, [user, restrictedToBilling, loading, path, isAllowedPath, isImpersonating, navigate]);

  if (
    !isImpersonating
    && !loading
    && user
    && restrictedToBilling
    && !isAllowedPath
  ) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 font-medium">Redirecting to billing…</p>
          <p className="text-gray-500 text-sm mt-2">
            Your account has an outstanding invoice. Please complete payment to access the rest of the site.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
