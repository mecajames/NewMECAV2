import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ForcePasswordChangeGuardProps {
  children: ReactNode;
}

/**
 * Guard component that redirects users to change password page
 * when they have the force_password_change flag set.
 *
 * This should wrap the main app content after authentication.
 */
export function ForcePasswordChangeGuard({ children }: ForcePasswordChangeGuardProps) {
  const { user, forcePasswordChange, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't do anything while loading or if no user
    if (loading || !user) return;

    // If user needs to change password and not already on change-password page
    if (forcePasswordChange && location.pathname !== '/change-password') {
      navigate('/change-password?forced=true', { replace: true });
    }
  }, [user, forcePasswordChange, loading, location.pathname, navigate]);

  // Allow rendering change-password page even when force is set
  // For all other pages, block rendering if force is set (will redirect)
  if (!loading && user && forcePasswordChange && location.pathname !== '/change-password') {
    // Show loading state briefly while redirecting
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Redirecting to change password...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
