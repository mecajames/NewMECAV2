import { useState } from 'react';
import { Mail, Lock, Clock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { requestLoginRecovery } from '../auth.api-client';
import { REDIRECT_STORAGE_KEY } from '../idle-timeout.constants';
import { useSiteLogo } from '@/shared/contexts';

// Google OAuth icon
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function LoginPage() {
  const navigate = useNavigate();
  const siteLogo = useSiteLogo();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const timeoutReason = searchParams.get('reason') === 'timeout';

  // Resolve redirect: query param > sessionStorage (from timeout) > /dashboard
  const resolveRedirect = (): string => {
    const storedRedirect = sessionStorage.getItem(REDIRECT_STORAGE_KEY);
    const target = redirectParam || storedRedirect || '/dashboard';
    // L3 fix: Decode and validate to prevent open redirect via encoded characters
    let decoded: string;
    try {
      decoded = decodeURIComponent(target);
    } catch {
      return '/dashboard';
    }
    if (decoded.startsWith('/') && !decoded.includes('://') && !decoded.startsWith('//')) {
      return target;
    }
    return '/dashboard';
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { signIn, resetPassword, signInWithOAuth } = useAuth();

  // Browser autofill on a full page load (the idle-timeout redirect is the
  // only member-facing one) fills the inputs WITHOUT firing React onChange,
  // so submitting right away sends empty state to Supabase and the member
  // gets "Invalid login credentials" despite seeing filled fields. Read the
  // live DOM values at submit time so autofilled credentials are honored.
  const liveFieldValue = (form: HTMLFormElement, id: string, fallback: string): string => {
    const field = form.elements.namedItem(id);
    return field instanceof HTMLInputElement ? field.value : fallback;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const liveEmail = liveFieldValue(e.currentTarget, 'email', email);
    const livePassword = liveFieldValue(e.currentTarget, 'password', password);
    if (liveEmail !== email) setEmail(liveEmail);
    if (livePassword !== password) setPassword(livePassword);

    const { error } = await signIn(liveEmail, livePassword);

    if (error) {
      // Only probe for a "migrated account that never set a password" when the
      // failure is a genuine CREDENTIAL rejection. A transient failure — rate
      // limit (429), server 5xx, a network drop, or brief server clock skew
      // that makes a freshly issued token look invalid — must NOT auto-send a
      // set-password email or show the "set your password" message: doing so
      // turns a momentary blip into the "I have to reset my password every
      // single time I log in" loop. On a transient error, surface the real
      // message instead so the member isn't pushed into a needless reset.
      const looksLikeBadCredentials =
        error.status === 400 ||
        error.code === 'invalid_credentials' ||
        /invalid login credentials/i.test(error.message ?? '');

      if (looksLikeBadCredentials) {
        // A member migrated from the old site may have an account they never set
        // a password for — a password login can never succeed for them. Detect
        // that and auto-send a set-password link instead of a dead-end error.
        const passwordSetupRequired = await requestLoginRecovery(liveEmail);
        if (passwordSetupRequired) {
          setError('');
          setSuccess(
            "Welcome back! It looks like you haven't set a password since our website upgrade. " +
              "We've emailed you a link to set your password — please check your inbox (and spam folder).",
          );
          setLoading(false);
          return;
        }
      }

      setError(error.message);
      setLoading(false);
    } else {
      // Clean up timeout redirect storage
      sessionStorage.removeItem(REDIRECT_STORAGE_KEY);
      navigate(resolveRedirect());
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const liveEmail = liveFieldValue(e.currentTarget, 'email', email);
    if (liveEmail !== email) setEmail(liveEmail);

    if (!liveEmail) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    const { error } = await resetPassword(liveEmail);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess('Password reset email sent! Check your inbox for instructions.');
      setLoading(false);
      setTimeout(() => {
        setShowForgotPassword(false);
        setSuccess('');
      }, 3000);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setOauthLoading(true);

    const { error } = await signInWithOAuth('google');

    if (error) {
      setError(error.message);
      setOauthLoading(false);
    }
    // If successful, the page will redirect to Google
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6 sm:mb-8">
            <img
              src={siteLogo}
              alt="MECA"
              className="mx-auto h-10 sm:h-12 w-auto mb-4"
            />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400 text-sm sm:text-base">Sign in to your My MECA Membership Account</p>
          </div>

          {timeoutReason && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500 rounded-lg flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-500 text-sm">Your session has expired due to inactivity. Please sign in again.</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500 rounded-lg">
              <p className="text-green-500 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={showForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {!showForgotPassword && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            )}

            {!showForgotPassword && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-orange-500 hover:text-orange-400"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? (showForgotPassword ? 'Sending...' : 'Signing in...')
                : (showForgotPassword ? 'Send Reset Email' : 'Sign In')
              }
            </button>

            {showForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setSuccess('');
                }}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Back to Sign In
              </button>
            )}
          </form>

          {!showForgotPassword && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800 text-gray-400">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || oauthLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {oauthLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-r-transparent"></div>
                ) : (
                  <GoogleIcon />
                )}
                <span>Continue with Google</span>
              </button>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/membership')}
                className="text-orange-500 hover:text-orange-400 font-semibold"
              >
                Become a Member
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
