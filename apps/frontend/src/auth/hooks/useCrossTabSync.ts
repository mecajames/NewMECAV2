import { useEffect, useRef, useCallback } from 'react';
import {
  BROADCAST_CHANNEL_NAME,
  ACTIVITY_STORAGE_KEY,
  ACTIVITY_THROTTLE_MS,
} from '../idle-timeout.constants';

type MessageType = 'activity' | 'logout';

interface CrossTabMessage {
  type: MessageType;
  timestamp: number;
}

interface UseCrossTabSyncOptions {
  onRemoteActivity: () => void;
  onRemoteLogout: () => void;
  enabled: boolean;
}

/**
 * Cross-tab synchronization for idle timeout.
 * Uses BroadcastChannel as primary transport with localStorage + visibilitychange as fallback.
 */
export function useCrossTabSync({ onRemoteActivity, onRemoteLogout, enabled }: UseCrossTabSyncOptions) {
  const onRemoteActivityRef = useRef(onRemoteActivity);
  const onRemoteLogoutRef = useRef(onRemoteLogout);
  const channelRef = useRef<BroadcastChannel | null>(null);

  onRemoteActivityRef.current = onRemoteActivity;
  onRemoteLogoutRef.current = onRemoteLogout;

  /** Broadcast activity to other tabs */
  const broadcastActivity = useCallback(() => {
    const now = Date.now();
    try {
      localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
    } catch {
      // localStorage may be full or unavailable
    }
    try {
      channelRef.current?.postMessage({ type: 'activity', timestamp: now } satisfies CrossTabMessage);
    } catch {
      // Channel may be closed
    }
  }, []);

  /** Broadcast logout to other tabs */
  const broadcastLogout = useCallback(() => {
    const now = Date.now();
    try {
      channelRef.current?.postMessage({ type: 'logout', timestamp: now } satisfies CrossTabMessage);
    } catch {
      // Channel may be closed
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // --- BroadcastChannel ---
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event: MessageEvent<CrossTabMessage>) => {
        const { type } = event.data;
        if (type === 'activity') {
          onRemoteActivityRef.current();
        } else if (type === 'logout') {
          onRemoteLogoutRef.current();
        }
      };
    } catch {
      // BroadcastChannel not supported (e.g. some older browsers)
    }

    // --- localStorage fallback via visibilitychange ---
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
        if (stored) {
          const storedTime = Number(stored);
          // Only treat as remote activity if the timestamp is recent (within 2x throttle window)
          if (Date.now() - storedTime < ACTIVITY_THROTTLE_MS * 2) {
            onRemoteActivityRef.current();
          }
        }
      } catch {
        // localStorage unavailable
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      try {
        channel?.close();
      } catch {
        // Already closed
      }
      channelRef.current = null;
    };
  }, [enabled]);

  return { broadcastActivity, broadcastLogout };
}
