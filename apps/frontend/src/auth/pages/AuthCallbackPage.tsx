import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/auth';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const { ensureProfileExists } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash (Supabase OAuth callback)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setError(sessionError.message);
          return;
        }

        if (session?.user) {
          // Ensure profile exists for OAuth users
          await ensureProfileExists(session.user);

          // Get redirect URL from query params or default to dashboard
          const redirectTo = searchParams.get('redirect') || '/dashboard';
          navigate(redirectTo, { replace: true });
        } else {
          // No session found, redirect to login
          setError('Authentication failed. Please try again.');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('An unexpected error occurred. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
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
