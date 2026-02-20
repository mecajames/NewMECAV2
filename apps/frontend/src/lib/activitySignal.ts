type Listener = () => void;

const listeners = new Set<Listener>();

/** Emit an activity signal (called from axios response interceptor) */
export function emitActivitySignal() {
  listeners.forEach((fn) => fn());
}

/** Subscribe to activity signals. Returns an unsubscribe function. */
export function onActivitySignal(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Axios config key to mark a request as a background request.
 * Background requests do NOT reset the idle timer.
 *
 * Usage: axios.get('/api/foo', { _background: true } as any)
 */
export const BACKGROUND_REQUEST_KEY = '_background';
