import axios from 'axios';
import { supabase } from './supabase';
import { emitActivitySignal, BACKGROUND_REQUEST_KEY } from './activitySignal';
import { REDIRECT_STORAGE_KEY } from '@/auth/idle-timeout.constants';

// Store for the current user ID
let currentUserId: string | null = null;

// Once we detect a genuinely-dead session we bounce the user exactly once;
// this guard stops a burst of in-flight 401s from each firing a redirect.
let handlingSessionExpiry = false;

// Set up axios interceptor to add x-user-id and Authorization headers
axios.interceptors.request.use(
  async (config) => {
    if (currentUserId) {
      config.headers['x-user-id'] = currentUserId;
    }

    // Get current session and add Authorization header
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        config.headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      // Silently fail - request will proceed without auth header
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Signal activity on successful API responses (resets idle timer)
// Skip background requests (e.g., polling, heartbeats) — they should not keep sessions alive
axios.interceptors.response.use(
  (response) => {
    if (!(response.config as any)[BACKGROUND_REQUEST_KEY]) {
      emitActivitySignal();
    }
    return response;
  },
  async (error) => {
    // CATCH-ALL for an expired/invalid session. A 401 from the API means the
    // backend rejected our token. Rather than dump the user onto a now-broken
    // member page (the "I got logged out / it threw an error" tickets), clear
    // the dead session and hard-reload to the login screen that explains what
    // happened. This covers every miss the idle timer can't catch on its own:
    // a tab left open for hours (background timers throttle), a token that
    // failed to refresh, returning to a stale tab, etc.
    const status = error?.response?.status;
    const hadAuth = !!(error?.config?.headers && (error.config.headers as any).Authorization);
    if (status === 401 && hadAuth && !handlingSessionExpiry) {
      const path = window.location.pathname;
      // Skip the auth pages themselves so we never loop.
      const onAuthPage =
        path === '/login' ||
        path.startsWith('/reset-password') ||
        path.startsWith('/auth') ||
        path.startsWith('/renew');
      if (!onAuthPage) {
        // Only bounce if the session is ACTUALLY gone. A transient backend 401
        // on a still-valid client session must NOT kick an actively-working
        // user out — in that case let the original caller handle the error.
        let sessionDead = false;
        try {
          const { data } = await supabase.auth.getSession();
          sessionDead = !data?.session;
        } catch {
          sessionDead = true;
        }
        if (sessionDead) {
          handlingSessionExpiry = true;
          // Remember where they were so re-login returns them there.
          try {
            const here = path + window.location.search + window.location.hash;
            if (here !== '/' && here !== '/login') {
              sessionStorage.setItem(REDIRECT_STORAGE_KEY, here);
            }
          } catch {
            // sessionStorage unavailable — non-fatal
          }
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          window.location.href = '/login?reason=timeout';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Function to update the current user ID (called by AuthContext)
export function setAxiosUserId(userId: string | null) {
  currentUserId = userId;
}

export default axios;
