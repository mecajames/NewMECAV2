import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// How often (at most) we re-check the server for a newer build.
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Keeps long-lived tabs (phones/tablets especially, where users never
 * hard-refresh) on the current frontend build.
 *
 * index.html is served with no-store and its Last-Modified changes on every
 * deploy, so a cheap HEAD request tells us whether a newer build exists.
 * We check at most every 5 minutes, triggered by route navigation and by the
 * tab becoming visible again. When a new build is detected we reload ON A
 * NAVIGATION — the moment the SPA is already discarding page state — so the
 * user lands on the page they tapped, running fresh code, and never loses
 * in-progress input. (main.tsx separately handles the hard-failure case
 * where a stale tab requests a chunk the deploy deleted.)
 */
export default function AppUpdateGuard() {
  const location = useLocation();
  const baseline = useRef<string | null>(null);
  const lastCheck = useRef(0);
  const updateAvailable = useRef(false);
  const reloading = useRef(false);

  const check = async () => {
    const now = Date.now();
    if (now - lastCheck.current < CHECK_INTERVAL_MS) return;
    lastCheck.current = now;
    try {
      const res = await fetch('/', { method: 'HEAD', cache: 'no-store' });
      const stamp = res.headers.get('last-modified') || res.headers.get('etag');
      if (!stamp) return;
      if (baseline.current === null) {
        baseline.current = stamp;
      } else if (stamp !== baseline.current) {
        updateAvailable.current = true;
      }
    } catch {
      // Offline / transient failure — try again on a later trigger.
    }
  };

  // Capture the baseline for the build this tab booted with.
  useEffect(() => {
    if (import.meta.env.DEV) return;
    void check();

    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On every route change: reload now if an update was detected, otherwise
  // opportunistically re-check (throttled).
  useEffect(() => {
    if (import.meta.env.DEV) return;
    if (updateAvailable.current && !reloading.current) {
      reloading.current = true;
      // Full reload of the URL the user just navigated to — fresh build,
      // same destination.
      window.location.reload();
      return;
    }
    void check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
}
