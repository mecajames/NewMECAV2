import { useEffect, useRef, useCallback } from 'react';
import { UserRole } from '@newmeca/shared';
import { useAuth } from '../contexts/AuthContext';
import { useIdleTimer } from './useIdleTimer';
import { useCrossTabSync } from './useCrossTabSync';
import { onActivitySignal } from '@/lib/activitySignal';
import {
  IDLE_TIMEOUT_MS,
  DEFAULT_TIMEOUT_MS,
  REDIRECT_STORAGE_KEY,
  ACTIVITY_STORAGE_KEY,
} from '../idle-timeout.constants';

/**
 * Orchestrator hook that wires together idle timer, cross-tab sync,
 * role-based configuration, and sign-out behavior.
 */
export function useIdleTimeout() {
  const { user, profile, signOut } = useAuth();
  const enabled = !!user && !!profile;

  // L2 fix: When impersonating, use admin timeout so admins aren't kicked while debugging
  const isImpersonating = sessionStorage.getItem('isImpersonating') === 'true';
  const effectiveRole = isImpersonating ? UserRole.ADMIN : (profile?.role as UserRole);

  const timeoutMs = effectiveRole
    ? (IDLE_TIMEOUT_MS[effectiveRole] ?? DEFAULT_TIMEOUT_MS)
    : DEFAULT_TIMEOUT_MS;

  // Refs to break circular dependency between idle timer and cross-tab sync
  const broadcastActivityRef = useRef<() => void>(() => {});
  const broadcastLogoutRef = useRef<() => void>(() => {});
  const resetTimerRef = useRef<() => void>(() => {});

  const handleTimeout = useCallback(() => {
    // M5 fix: Store full path including hash fragment
    const currentPath = window.location.pathname + window.location.search + window.location.hash;
    if (currentPath !== '/login' && currentPath !== '/') {
      try {
        sessionStorage.setItem(REDIRECT_STORAGE_KEY, currentPath);
      } catch {
        // sessionStorage unavailable
      }
    }

    // M4 fix: Broadcast logout via ref to avoid stale closure
    broadcastLogoutRef.current();

    // Clean up activity timestamp
    try {
      localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    } catch {
      // localStorage unavailable
    }

    // Sign out and redirect
    signOut().finally(() => {
      window.location.href = '/login?reason=timeout';
    });
  }, [signOut]);

  const handleRemoteLogout = useCallback(() => {
    // Another tab timed out — sign out locally too
    try {
      localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    } catch {
      // localStorage unavailable
    }

    signOut().finally(() => {
      window.location.href = '/login?reason=timeout';
    });
  }, [signOut]);

  // Wire idle timer
  const { resetTimer } = useIdleTimer({
    timeoutMs,
    onTimeout: handleTimeout,
    onActivity: () => broadcastActivityRef.current(),
    enabled,
  });

  // Wire cross-tab sync
  const { broadcastActivity, broadcastLogout } = useCrossTabSync({
    onRemoteActivity: () => resetTimerRef.current(),
    onRemoteLogout: handleRemoteLogout,
    enabled,
  });

  // Keep refs current
  broadcastActivityRef.current = broadcastActivity;
  broadcastLogoutRef.current = broadcastLogout;
  resetTimerRef.current = resetTimer;

  // Subscribe to API activity signals
  useEffect(() => {
    if (!enabled) return;
    return onActivitySignal(() => {
      resetTimer();
      broadcastActivity();
    });
  }, [enabled, resetTimer, broadcastActivity]);

  // M2 fix: Clean up activity storage key when hook disables (user logs out normally)
  useEffect(() => {
    if (enabled) return;
    try {
      localStorage.removeItem(ACTIVITY_STORAGE_KEY);
    } catch {
      // localStorage unavailable
    }
  }, [enabled]);
}
