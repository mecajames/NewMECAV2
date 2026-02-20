import { UserRole } from '@newmeca/shared';

/** Per-role idle timeout in milliseconds */
export const IDLE_TIMEOUT_MS: Record<UserRole, number> = {
  [UserRole.USER]: 60 * 60 * 1000,           // 1 hour
  [UserRole.RETAILER]: 60 * 60 * 1000,       // 1 hour
  [UserRole.JUDGE]: 60 * 60 * 1000,          // 1 hour
  [UserRole.ADMIN]: 4 * 60 * 60 * 1000,      // 4 hours
  [UserRole.EVENT_DIRECTOR]: 4 * 60 * 60 * 1000, // 4 hours
};

/** Fallback timeout if role not found */
export const DEFAULT_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

/** How often to check if the user is idle */
export const IDLE_CHECK_INTERVAL_MS = 15_000; // 15 seconds

/** Throttle interval for DOM event listeners */
export const ACTIVITY_THROTTLE_MS = 30_000; // 30 seconds

/** BroadcastChannel name for cross-tab sync */
export const BROADCAST_CHANNEL_NAME = 'meca-idle-timeout';

/** localStorage key for cross-tab activity timestamp */
export const ACTIVITY_STORAGE_KEY = 'meca-last-activity';

/** sessionStorage key for storing redirect path after timeout */
export const REDIRECT_STORAGE_KEY = 'meca-timeout-redirect';

/** DOM events that count as user activity */
export const TRACKED_EVENTS: (keyof DocumentEventMap)[] = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
];
