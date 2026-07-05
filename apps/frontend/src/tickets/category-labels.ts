import { useEffect, useState } from 'react';
import axios from '@/lib/axios';

/**
 * key → label lookup for DISPLAYING stored ticket categories.
 *
 * tickets.category stores the managed category KEY (e.g. 'ma_renewal' —
 * department-prefixed), and prettifying the key rendered nonsense like
 * "Ma Renewal". This loads the admin-defined labels once (module cache,
 * public endpoint, includes inactive categories since old tickets keep
 * their key forever) and falls back to the prettified key for legacy enum
 * values that have no managed row.
 */

let cached: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

async function fetchLabels(): Promise<Record<string, string>> {
  if (cached) return cached;
  if (!inflight) {
    inflight = axios
      .get('/api/tickets/admin/categories/labels')
      .then((r) => {
        const map: Record<string, string> = {};
        for (const row of r.data || []) {
          if (row?.key && row?.label) map[row.key] = row.label;
        }
        cached = map;
        return map;
      })
      .catch(() => ({}) as Record<string, string>)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function prettifyCategoryKey(key?: string | null): string {
  const k = String(key || '').trim();
  if (!k) return '—';
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Returns a resolver: (key) => admin label, or the prettified key. */
export function useTicketCategoryLabels(): (key?: string | null) => string {
  const [map, setMap] = useState<Record<string, string>>(cached || {});

  useEffect(() => {
    let mounted = true;
    fetchLabels().then((m) => {
      if (mounted) setMap(m);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (key) => (key && map[key]) || prettifyCategoryKey(key);
}
