import { useEffect, useState } from 'react';
import { competitionFormatsApi } from './competition-formats.api-client';

/**
 * Lookup keyed by format name → display_order. Lets any page sort its
 * format-related UI by the same admin-editable order used on /admin/formats
 * and the Results page.
 *
 * Usage:
 *   const formatOrder = useFormatOrder();
 *   const sorted = [...names].sort((a, b) => {
 *     const oa = formatOrder.get(a) ?? Number.POSITIVE_INFINITY;
 *     const ob = formatOrder.get(b) ?? Number.POSITIVE_INFINITY;
 *     return oa - ob || a.localeCompare(b);
 *   });
 *
 * The fetch runs once per component mount. competition_formats is a tiny
 * table (~6 rows) so we don't bother with module-level memoization.
 */
export function useFormatOrder(): Map<string, number> {
  const [order, setOrder] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;
    competitionFormatsApi
      .getActive()
      .then(list => {
        if (cancelled) return;
        setOrder(new Map(list.map(f => [f.name, f.display_order])));
      })
      .catch(err => console.error('Error fetching competition formats:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  return order;
}

/**
 * Comparator built off useFormatOrder. Sorts unknown formats to the end
 * with alpha as the tiebreaker.
 */
export function compareFormatNames(
  order: Map<string, number>,
  a: string,
  b: string,
): number {
  const oa = order.get(a) ?? Number.POSITIVE_INFINITY;
  const ob = order.get(b) ?? Number.POSITIVE_INFINITY;
  return oa - ob || a.localeCompare(b);
}
