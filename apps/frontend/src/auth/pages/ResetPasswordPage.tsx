import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Lock, Eye, EyeOff, CheckCircle, AlertTriangle, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Phase = 'verifying' | 'ready' | 'invalid' | 'success';

/**
 * Handles the password-reset link from the "forgot password" email.
 *
 * The email's redirectTo points here (see AuthContext.resetPassword). With the
 * Supabase client configured as implicit flow + detectSessionInUrl, landing on
 * this page with `#access_token=...&type=recovery` makes Supabase establish a
 * short-lived recovery session and fire PASSWORD_RECOVERY. We wait for that
 * session, then let the user set a new password via supabase.auth.updateUser.
 *
 * This route is exempted from the app guards (maintenance / expired-membership
 * / billing-restricted / force-password-change) so a recovery session can't be
 * bounced away before the user finishes resetting.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidReason, setInvalidReason] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const settledRef = useRef(false);

  // Detect the recovery session Supabase creates from the email link.
  useEffect(() => {
    const settle = (p: Phase, reason?: string) => {
      if (!settledRef.current) {
        settledRef.current = true;
        if (reason) setInvalidReason(reason);
        setPhase(p);
      }
    };

    // Supabase reports expired/used links via the URL hash, e.g.
    //   #error=access_denied&error_code=otp_expired&error_description=...
    const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const hashError = hashParams.get('error_description') || hashParams.get('error');
    const hasRecoveryToken =
      hashParams.has('access_token') || hashParams.get('type') === 'recovery';

    if (hashError) {
      settle('invalid', hashError.replace(/\+/g, ' '));
      return;
    }

    // The token may already have been processed before this effect runs.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) settle('ready');
    });

    // detectSessionInUrl processes the hash asynchronously and fires
    // PASSWORD_RECOVERY (or SIGNED_IN) once the recovery session is ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (!!session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED'))) {
        settle('ready');
      }
    });

    // Wait generously when a recovery token is present (slow networks must not
    // produce a false "invalid link"); fail fast only when there's no token at
    // all (the page was opened without a real reset link).
    const timer = setTimeout(() => settle('invalid'), hasRecoveryToken ? 20000 : 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setError(updateErr.message || 'Failed to update password. Please request a new reset link.');
        setSubmitting(false);
        return;
      }
      // Drop the temporary recovery session so they sign in fresh with the
      // new password.
      await supabase.auth.signOut();
      setPhase('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8">{children}</div>
      </div>
    </div>
  );

  if (phase === 'verifying') {
    return shell(
      <div className="text-center">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Verifying your reset link…</h2>
        <p className="text-gray-400">One moment while we confirm your request.</p>
      </div>
    );
  }

  if (phase === 'invalid') {
    return shell(
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mb-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Reset link invalid or expired</h2>
        <p className="text-gray-400 mb-6">
          {invalidReason
            ? `${invalidReason}. `
            : 'This password reset link is no longer valid. '}
          Reset links expire after a short time and can only be used once. Please request a new one
          from the “Forgot password?” link on the sign-in page.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center justify-center gap-2 w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
        >
          Back to Sign In
        </Link>
      </div>
    );
  }

  if (phase === 'success') {
    return shell(
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-4">
          <CheckCircle className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Password updated</h2>
        <p className="text-gray-400 mb-6">
          Your password has been changed. You can now sign in with your new password.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login', { replace: true })}
          className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  // phase === 'ready'
  return shell(
    <>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/10 rounded-full mb-4">
          <KeyRound className="h-8 w-8 text-orange-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Set a new password</h2>
        <p className="text-gray-400">Choose a new password for your MECA account.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">New password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full pl-12 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              tabIndex={-1}
            >
              {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Confirm new password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter your new password"
              className="w-full pl-12 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              autoComplete="new-password"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
          Update Password
        </button>
      </form>
    </>
  );
}
