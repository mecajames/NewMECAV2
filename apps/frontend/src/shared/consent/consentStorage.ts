// Cookie-consent choice storage. Pure module (no React) so it can be read
// before the app mounts (gtag consent defaults) and from non-component code.

export interface ConsentState {
  /** Analytics cookies (GA4) allowed. */
  analytics: boolean;
  /** Functional/preference cookies allowed (reserved — nothing uses it yet). */
  functional: boolean;
  choice: 'accepted_all' | 'necessary_only' | 'custom';
  timestamp: string; // ISO
  version: number;
}

const CONSENT_KEY = 'meca_cookie_consent_v1';
const VISITOR_KEY = 'meca_visitor_id';
export const CONSENT_VERSION = 1;

export function getStoredConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.analytics !== 'boolean' || !parsed?.choice) return null;
    return parsed as ConsentState;
  } catch {
    return null;
  }
}

export function saveConsent(state: Omit<ConsentState, 'timestamp' | 'version'>): ConsentState {
  const full: ConsentState = { ...state, timestamp: new Date().toISOString(), version: CONSENT_VERSION };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(full));
  } catch {
    // Storage unavailable (private mode quota etc.) — consent still applies
    // for this page load; the banner will simply reappear next visit.
  }
  return full;
}

/** Stable anonymous per-browser id for the consent audit log. */
export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return 'unknown';
  }
}
