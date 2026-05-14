import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import axios from '@/lib/axios';

/**
 * Page-scoped context that tells children whether each MECA ID currently
 * belongs to an active paid membership. Used by `<MecaIdLink>` on Results,
 * Standings, Top 10, and any other page that renders many MECA IDs — so a
 * row whose target member is currently expired renders the ID as a plain
 * label, not a link.
 *
 * Pages opt-in by wrapping their result list in <MecaIdActiveProvider
 * mecaIds={[...]}>. The provider fetches once per unique set; results are
 * memoized in a module-level cache so navigating between pages that share
 * MECA IDs doesn't re-fetch.
 *
 * Falling back gracefully: when no provider is mounted, `useMecaIdActive`
 * returns `undefined` for every ID, which `MecaIdLink` treats as
 * "don't know — defer to viewer-side gating only."
 */

type ActiveLookup = (mecaId: string | null | undefined) => boolean | undefined;

const MecaIdActiveContext = createContext<ActiveLookup>(() => undefined);

// Module-level cache keyed by MECA ID; values are stable booleans once
// fetched. Cleared by reload but persisted across re-renders within a SPA.
const cache = new Map<string, boolean>();
// In-flight de-dupe so a flurry of mounts only triggers one network call
// per unique set.
const inflight = new Map<string, Promise<void>>();

async function fetchActive(ids: string[]) {
  if (ids.length === 0) return;
  // Strip everything already cached or in-flight individually.
  const need = ids.filter((id) => !cache.has(id));
  if (need.length === 0) return;

  const key = need.slice().sort().join(',');
  if (inflight.has(key)) {
    await inflight.get(key);
    return;
  }
  const promise = (async () => {
    try {
      const r = await axios.post('/api/memberships/active-meca-ids', { mecaIds: need });
      const activeSet = new Set<string>(r.data?.activeMecaIds ?? []);
      for (const id of need) {
        cache.set(id, activeSet.has(id));
      }
    } catch {
      // On error, default to "unknown" — mark each as not-active so we err
      // toward un-linking (privacy-safe) rather than over-linking.
      for (const id of need) {
        if (!cache.has(id)) cache.set(id, false);
      }
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, promise);
  await promise;
}

export function MecaIdActiveProvider({
  mecaIds,
  children,
}: {
  mecaIds: Array<string | number | null | undefined>;
  children: ReactNode;
}) {
  // Stable key from the set of IDs (sorted, deduped, sanitized)
  const normalized = useMemo(() => {
    const set = new Set<string>();
    for (const raw of mecaIds) {
      if (raw == null) continue;
      const s = String(raw).trim();
      if (!s || s === '999999' || s === '0') continue;
      set.add(s);
    }
    return Array.from(set);
  }, [mecaIds]);

  const lastKeyRef = useRef<string>('');
  const [, forceRender] = useState(0);

  useEffect(() => {
    const key = normalized.slice().sort().join(',');
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    let mounted = true;
    fetchActive(normalized).then(() => {
      if (mounted) forceRender((n) => n + 1);
    });
    return () => {
      mounted = false;
    };
  }, [normalized]);

  const lookup = useCallback<ActiveLookup>((mecaId) => {
    if (mecaId == null) return undefined;
    const s = String(mecaId).trim();
    if (!s || s === '999999' || s === '0') return false;
    return cache.get(s);
  }, []);

  return <MecaIdActiveContext.Provider value={lookup}>{children}</MecaIdActiveContext.Provider>;
}

export function useMecaIdActive(mecaId: string | number | null | undefined): boolean | undefined {
  const lookup = useContext(MecaIdActiveContext);
  return lookup(mecaId == null ? undefined : String(mecaId));
}
