/**
 * SEO slug helpers. A slug is the human-readable identifier in a URL
 * (e.g. /events/the-ohio-car-audio-show-3-2026) used instead of a raw UUID.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True if the value is a bare UUID (so callers can resolve by id vs slug). */
export function isUuid(value: string): boolean {
  return UUID_RE.test((value || '').trim());
}

/**
 * Resolve a detail-route param (UUID or slug) to the row's UUID. Returns the
 * UUID unchanged if it already is one, otherwise looks it up by slug. Returns
 * null if no row matches (so callers can throw a clean 404 instead of letting a
 * non-UUID hit a uuid column and error). `table` is a trusted constant.
 */
export async function resolveSlugToId(
  conn: { execute: (sql: string, params?: any[]) => Promise<any[]> },
  table: string,
  idOrSlug: string,
): Promise<string | null> {
  if (isUuid(idOrSlug)) return idOrSlug;
  const rows = await conn.execute(`SELECT id FROM ${table} WHERE slug = ? LIMIT 1`, [idOrSlug]);
  return rows?.[0]?.id ?? null;
}

/**
 * Turn arbitrary text into a URL-safe slug: lowercase, non-alphanumerics
 * collapsed to single dashes, trimmed, capped to a sane length.
 */
export function slugify(input: string): string {
  return (input || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, ''); // re-trim if the slice landed on a dash
}

/**
 * Build a unique slug from `base`, appending -2, -3, … until `exists` reports
 * the candidate is free. `exists` should return true if a DIFFERENT row already
 * uses that slug. Empty/blank bases fall back to `fallback`.
 */
export async function makeUniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
  fallback = 'item',
): Promise<string> {
  const root = slugify(base) || fallback;
  if (!(await exists(root))) return root;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${root}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }
  // Pathological fallback — guaranteed unique.
  return `${root}-${Date.now().toString(36)}`;
}
