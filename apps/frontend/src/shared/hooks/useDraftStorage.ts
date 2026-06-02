import { useCallback, useState } from 'react';

/**
 * Persists a form draft to sessionStorage so it survives page reloads.
 *
 * The MECA app reloads when the stale-chunk handler in main.tsx detects a
 * 404 on a lazy-loaded module — typical for tabs that were open through a
 * deploy. That reload also kicks in on accidental F5, browser crash
 * recovery, or any other unexpected refresh. Any form using plain
 * `useState` would lose its content. Wrapping the state in this hook
 * snapshots every keystroke into sessionStorage and restores it on next
 * mount, so the user gets their text back instead of starting over.
 *
 * Usage:
 *   const [comment, setComment, clearComment] =
 *     useDraftStorage<string>(`ticket-comment-${ticketId}`, '');
 *
 *   // ...later, after a successful submit:
 *   clearComment();
 *
 * Notes:
 *   - sessionStorage (not localStorage) so drafts don't leak across browser
 *     sessions — closing the tab clears them, same as the user would
 *     expect after walking away.
 *   - Empty string / null / undefined / the default value clears the
 *     stored entry to avoid stale keys piling up.
 *   - Each call must use a unique, stable key (e.g. include ticket ID).
 *   - Storage exceptions are swallowed; the hook still works as plain
 *     state in private-mode browsers where sessionStorage may throw.
 */
export function useDraftStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw === null) return defaultValue;
      // Strings are stored raw to avoid JSON quote-escaping on read
      if (typeof defaultValue === 'string') return raw as unknown as T;
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  });

  const persist = useCallback(
    (next: T) => {
      try {
        const isEmpty =
          next === null ||
          next === undefined ||
          next === defaultValue ||
          (typeof next === 'string' && next === '');
        if (isEmpty) {
          sessionStorage.removeItem(key);
        } else if (typeof next === 'string') {
          sessionStorage.setItem(key, next);
        } else {
          sessionStorage.setItem(key, JSON.stringify(next));
        }
      } catch {
        // sessionStorage may be unavailable (private mode) or full.
      }
    },
    [key, defaultValue],
  );

  // Accepts either a value or a React-style updater function so callers
  // can append to the current draft (e.g. inserting a canned response or
  // link) without threading the latest value through.
  const setAndStore = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function'
          ? (next as (p: T) => T)(prev)
          : next;
        persist(resolved);
        return resolved;
      });
    },
    [persist],
  );

  const clear = useCallback(() => {
    setValue(defaultValue);
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, [key, defaultValue]);

  return [value, setAndStore, clear];
}
