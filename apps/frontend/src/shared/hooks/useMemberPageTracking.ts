import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '@/lib/axios';
import { useAuth } from '@/auth/contexts/AuthContext';

/**
 * First-party per-member page tracking. Fires only for logged-in members;
 * anonymous traffic continues to flow through Google Analytics 4 via the
 * separate usePageTracking hook.
 *
 *   - Sends path, page title, document.referrer, and a stable session id
 *     (kept in sessionStorage so it survives across route changes but resets
 *     when the tab/window closes — matching browser-session semantics).
 *
 *   - Fire-and-forget. Failures are swallowed; analytics never blocks
 *     navigation.
 *
 *   - The backend honors `profile.analytics_opt_out` — even though we still
 *     post here, the server discards the row when the flag is set.
 */
const SESSION_KEY = 'mecaSessionId';

function ensureSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    // sessionStorage may be blocked (Safari private mode, certain consent
    // configurations). Fall back to a per-pageload id; durations across
    // routes still work since we send referrer.
    return 'no-session';
  }
}

export function useMemberPageTracking(): void {
  const location = useLocation();
  const { user } = useAuth();
  // Track the previous path so we can pass it as the referrer of the new
  // page view — matters for "where did they go next" analytics that
  // document.referrer alone won't tell us once they're inside the SPA.
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      previousPathRef.current = null;
      return;
    }

    const path = location.pathname + location.search;
    const referrer = previousPathRef.current ?? (document.referrer || undefined);
    const sessionId = ensureSessionId();

    // Fire and forget — never await, never surface errors to the user.
    axios.post('/api/analytics/track-page', {
      pagePath: path,
      pageTitle: typeof document !== 'undefined' ? document.title : undefined,
      referrer,
      sessionId,
    }).catch(() => {
      // Swallow — analytics outages must never break navigation.
    });

    previousPathRef.current = path;
  }, [location, user?.id]);
}
