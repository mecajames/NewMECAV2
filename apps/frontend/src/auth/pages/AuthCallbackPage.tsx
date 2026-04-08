import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { REDIRECT_STORAGE_KEY } from '../idle-timeout.constants';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { ensureProfileExists } = useAuth();
  const ensureProfileRef = useRef(ensureProfileExists);
  ensureProfileRef.current = ensureProfileExists;
  const redirected = useRef(false);

  /** Resolve redirect: query param > sessionStorage (from idle timeout) > /dashboard */
  const resolveRedirect = (): string => {
    const paramRedirect = searchParams.get('redirect');
    const storedRedirect = sessionStorage.getItem(REDIRECT_STORAGE_KEY);
    const target = paramRedirect || storedRedirect || '/dashboard';
    sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
    if (target.startsWith('/') && !target.includes('://')) {
      return target;
    }
    return '/dashboard';
  };

  useEffect(() => {
    if (redirected.current) return;

    const doRedirect = (target: string) => {
      if (redirected.current) return;
      redirected.current = true;
      navigate(target, { replace: true });
    };

    const completeSignIn = async (user: import('@supabase/supabase-js').User) => {
      // Try to ensure profile exists, but don't let it block redirect
      try {
        await Promise.race([
          ensureProfileRef.current(user),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
        ]);
      } catch (err) {
        // Profile setup failed or timed out — still redirect, profile will be fetched on next page
        console.warn('Profile setup during callback failed/timed out, redirecting anyway:', err);
      }
      doRedirect(resolveRedirect());
    };

    // Poll for session — handles both immediate availability and delayed token processing
    let attempts = 0;
    const maxAttempts = 20; // 20 * 500ms = 10 seconds

    const checkSession = async () => {
      if (redirected.current) return;
      attempts++;

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        completeSignIn(session.user);
        return;
      }

      if (attempts >= maxAttempts) {
        setError('Authentication failed. Please try again.');
        setTimeout(() => doRedirect('/login'), 3000);
        return;
      }

      // Try again in 500ms
      setTimeout(checkSession, 500);
    };

    // Also listen for auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        completeSignIn(session.user);
      }
    });

    // Start polling
    checkSession();

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 text-center">
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
              <p className="text-red-500">{error}</p>
            </div>
            <p className="text-gray-400">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 text-center">
          <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Completing Sign In</h2>
          <p className="text-gray-400">Please wait while we set up your account...</p>
        </div>
      </div>
    </div>
  );
}
