import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth';
import { REDIRECT_STORAGE_KEY } from '../idle-timeout.constants';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { ensureProfileExists } = useAuth();
  const handled = useRef(false);

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
    if (handled.current) return;
    handled.current = true;

    // Listen for auth state changes - this is the recommended way to handle OAuth callbacks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          await ensureProfileExists(session.user);
          navigate(resolveRedirect(), { replace: true });
        } catch (err) {
          console.error('Profile creation error:', err);
          setError('An unexpected error occurred. Please try again.');
          setTimeout(() => navigate('/login'), 3000);
        }
      }
    });

    // Fallback: if no auth event fires within 10 seconds, show error
    const timeout = setTimeout(async () => {
      // One last check for an existing session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await ensureProfileExists(session.user);
        navigate(resolveRedirect(), { replace: true });
      } else {
        setError('Authentication failed. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate, searchParams, ensureProfileExists]);

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
