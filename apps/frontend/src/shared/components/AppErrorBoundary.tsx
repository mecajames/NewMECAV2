import { Component, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { REDIRECT_STORAGE_KEY } from '@/auth/idle-timeout.constants';

// Same patterns the global handler in main.tsx watches for — a lazy chunk
// that 404s after a deploy. React routes render errors from lazy imports to
// the nearest error boundary (so main.tsx's window listeners may never fire);
// the boundary must therefore do its own reload-once for stale-chunk cases.
const CHUNK_ERROR_RE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk \d+ failed|ChunkLoadError|Failed to load module script|Unable to preload CSS for/i;

/**
 * Root error boundary. Without one, ANY uncaught render error unmounts the
 * entire React tree and the user gets a silent pure-white page (which is
 * exactly what happened on /tickets when a row carried an unmapped enum
 * value). With it, the user gets a branded "something went wrong" screen
 * with a reload button — and stale-deploy chunk failures auto-reload once.
 *
 * SESSION-TIMEOUT AWARENESS (James 2026-07-05): a page that crashes because
 * the session expired (auth-dependent data never loaded, component threw)
 * must NOT tell the member "something went wrong — open a support ticket".
 * Nothing is wrong with the site; they just timed out. When the boundary
 * catches an error, it checks the auth session: if the user HAD a session
 * and it's now dead/expired, it renders a friendly "Your session has timed
 * out" screen with a Log In button instead of the generic error.
 */
export default class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null; sessionExpired: boolean }
> {
  state = { error: null as Error | null, sessionExpired: false };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('AppErrorBoundary caught:', error);
    if (
      CHUNK_ERROR_RE.test(error?.message || '') &&
      sessionStorage.getItem('chunk-reload') !== '1'
    ) {
      sessionStorage.setItem('chunk-reload', '1');
      window.location.reload();
      return;
    }

    // Was this crash really a session timeout? Only claim so when the user
    // HAD a login (an auth token artifact exists in storage) that is now
    // gone or past its expiry — an anonymous visitor's crash on a public
    // page must still show the generic error.
    try {
      const hadAuthArtifacts = Object.keys(localStorage).some((k) =>
        /^sb-.+-auth-token$/.test(k),
      );
      if (!hadAuthArtifacts) return;
      supabase.auth
        .getSession()
        .then(({ data }) => {
          const s = data?.session;
          const dead = !s || (typeof s.expires_at === 'number' && s.expires_at * 1000 < Date.now());
          if (dead) this.setState({ sessionExpired: true });
        })
        .catch(() => this.setState({ sessionExpired: true }));
    } catch {
      // storage unavailable — keep the generic screen
    }
  }

  private goToLogin = async () => {
    // Mirror the axios 401 handler: remember where they were so logging back
    // in returns them to this page, clear the dead local session, and land
    // on the login screen that explains the timeout.
    try {
      const here =
        window.location.pathname + window.location.search + window.location.hash;
      if (here !== '/' && here !== '/login') {
        sessionStorage.setItem(REDIRECT_STORAGE_KEY, here);
      }
    } catch {
      // sessionStorage unavailable — non-fatal
    }
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    window.location.href = '/login?reason=timeout';
  };

  render() {
    if (this.state.error) {
      if (this.state.sessionExpired) {
        return (
          <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <h1 className="text-2xl font-bold text-white mb-3">Your session has timed out</h1>
              <p className="text-gray-400 mb-6">
                For your security, you were signed out after a period of
                inactivity. Nothing is wrong with the site — just log back in
                and you&apos;ll pick up right where you left off.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.goToLogin}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Log In Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        );
      }
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              An unexpected error occurred on this page. Reloading usually fixes
              it — if it keeps happening, please open a support ticket and tell
              us what page you were on.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
