import { useState, useEffect } from 'react';
import { UserCog, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUserName, setImpersonatedUserName] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    // Check if currently impersonating
    const impersonating = localStorage.getItem('isImpersonating') === 'true';
    const userName = localStorage.getItem('impersonatedUserName') || '';

    setIsImpersonating(impersonating);
    setImpersonatedUserName(userName);
  }, []);

  const handleReturnToAdmin = async () => {
    setIsRestoring(true);

    try {
      // Get stored admin session
      const adminSessionStr = localStorage.getItem('adminSession');
      if (!adminSessionStr) {
        throw new Error('No admin session found');
      }

      const adminSession = JSON.parse(adminSessionStr);

      // Sign out of current session first
      await supabase.auth.signOut();

      // Restore admin session
      const { error } = await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });

      if (error) {
        throw error;
      }

      // Clear impersonation state
      localStorage.removeItem('adminSession');
      localStorage.removeItem('isImpersonating');
      localStorage.removeItem('impersonatedUserId');
      localStorage.removeItem('impersonatedUserName');

      // Navigate to admin members page
      window.location.href = '/admin/members';
    } catch (error) {
      console.error('Error restoring admin session:', error);
      alert('Failed to restore admin session. Please log in again.');

      // Clear everything and redirect to login
      localStorage.removeItem('adminSession');
      localStorage.removeItem('isImpersonating');
      localStorage.removeItem('impersonatedUserId');
      localStorage.removeItem('impersonatedUserName');

      await supabase.auth.signOut();
      window.location.href = '/login';
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isImpersonating) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-purple-600 text-white py-2 px-4 z-[100] shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCog className="h-5 w-5" />
          <span className="font-medium">
            Viewing as: <span className="font-bold">{impersonatedUserName}</span>
          </span>
        </div>

        <button
          onClick={handleReturnToAdmin}
          disabled={isRestoring}
          className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
        >
          {isRestoring ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Restoring...
            </>
          ) : (
            <>
              <ArrowLeft className="h-4 w-4" />
              Return to Admin
            </>
          )}
        </button>
      </div>
    </div>
  );
}
