import { useEffect, useRef, useCallback } from 'react';
import {
  IDLE_CHECK_INTERVAL_MS,
  ACTIVITY_THROTTLE_MS,
  TRACKED_EVENTS,
} from '../idle-timeout.constants';

interface UseIdleTimerOptions {
  timeoutMs: number;
  onTimeout: () => void;
  onActivity?: () => void;
  enabled: boolean;
}

/**
 * Core idle detection hook.
 * Attaches throttled DOM event listeners and checks idle status on an interval.
 */
export function useIdleTimer({ timeoutMs, onTimeout, onActivity, enabled }: UseIdleTimerOptions) {
  const lastActivityRef = useRef(Date.now());
  const onTimeoutRef = useRef(onTimeout);
  const onActivityRef = useRef(onActivity);
  const firedRef = useRef(false);

  // Keep callback refs current without re-running effects
  onTimeoutRef.current = onTimeout;
  onActivityRef.current = onActivity;

  /** Reset the idle timer (called externally by cross-tab sync) */
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    firedRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Reset on mount / re-enable
    lastActivityRef.current = Date.now();
    firedRef.current = false;

    // --- Throttled DOM listener ---
    let lastFired = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastFired < ACTIVITY_THROTTLE_MS) return;
      lastFired = now;
      lastActivityRef.current = now;
      onActivityRef.current?.();
    };

    for (const event of TRACKED_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    // --- Interval-based idle check ---
    const intervalId = setInterval(() => {
      if (!firedRef.current && Date.now() - lastActivityRef.current >= timeoutMs) {
        firedRef.current = true;
        onTimeoutRef.current();
      }
    }, IDLE_CHECK_INTERVAL_MS);

    return () => {
      for (const event of TRACKED_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
      clearInterval(intervalId);
    };
  }, [enabled, timeoutMs]);

  return { resetTimer };
}
