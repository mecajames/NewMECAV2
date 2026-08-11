/**
 * MECA ID grace / amnesty configuration — DB-backed with an in-process cache.
 *
 * The grace windows (self-serve 30d / admin 45d) and the relaunch-amnesty end
 * date were hard-coded on MecaIdService. James wants them editable from the
 * admin Site Settings screen (super-admin only), so they now live in
 * `site_settings` under the keys below and are cached here as a module
 * singleton. All existing SYNC call sites (static methods on MecaIdService,
 * raw SQL cutoffs in membership-sync) read the cache via `getGraceConfig()`;
 * MecaIdService loads it at boot and refreshes on an interval, and the
 * super-admin update endpoint applies changes to the cache immediately.
 *
 * IMPORTANT: the admin window and the amnesty are UNANNOUNCED — members are
 * only ever told the self-serve number. The settings rows are stored with
 * setting_type 'secret' so the public site-settings endpoints redact them.
 */

export const GRACE_SETTING_KEYS = {
  selfServeDays: 'meca_grace_self_serve_days',
  adminDays: 'meca_grace_admin_days',
  // yyyy-mm-dd; amnesty is BLANKET through the END of this day, Pacific time.
  // An explicitly-saved empty value means "amnesty off".
  amnestyEndDate: 'meca_grace_amnesty_end_date',
} as const;

export interface GraceConfig {
  /** Advertised self-service renewal window (days). Default 30. */
  selfServeDays: number;
  /** Unannounced admin/data-preservation window (days). Default 45. */
  adminDays: number;
  /** Instant the blanket amnesty ENDS, or null when no amnesty is active/configured. */
  amnestyDeadline: Date | null;
  /** The yyyy-mm-dd the deadline was derived from (for the admin UI), or null when amnesty is off. */
  amnestyEndDate: string | null;
}

const DEFAULT_SELF_SERVE_DAYS = 30;
const DEFAULT_ADMIN_DAYS = 45;
// Relaunch amnesty default: through August 25, 2026 (end of day, Pacific).
const DEFAULT_AMNESTY_END_DATE = '2026-08-25';

const MAX_GRACE_DAYS = 3650;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "Through the end of <date> in the westernmost mainland US timezone" —
 * midnight Pacific (UTC-7) at the START of the day, plus 24h. Matches the
 * original hard-coded RELAUNCH_GRACE_DEADLINE (Aug 25 → Aug 26 07:00 UTC).
 */
export function amnestyDeadlineFromEndDate(endDate: string): Date {
  return new Date(new Date(`${endDate}T07:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000);
}

function defaults(): GraceConfig {
  return {
    selfServeDays: DEFAULT_SELF_SERVE_DAYS,
    adminDays: DEFAULT_ADMIN_DAYS,
    amnestyDeadline: amnestyDeadlineFromEndDate(DEFAULT_AMNESTY_END_DATE),
    amnestyEndDate: DEFAULT_AMNESTY_END_DATE,
  };
}

let cached: GraceConfig = defaults();

/** Current grace configuration (sync — served from the in-process cache). */
export function getGraceConfig(): GraceConfig {
  return cached;
}

/**
 * Validate a proposed configuration. Returns the normalized values or throws
 * a plain Error naming the offending field (callers wrap it in the
 * appropriate HTTP exception).
 */
export function validateGraceSettings(input: {
  selfServeDays?: unknown;
  adminDays?: unknown;
  amnestyEndDate?: unknown;
}): { selfServeDays: number; adminDays: number; amnestyEndDate: string | null } {
  const selfServeDays = Number(input.selfServeDays ?? DEFAULT_SELF_SERVE_DAYS);
  const adminDays = Number(input.adminDays ?? DEFAULT_ADMIN_DAYS);
  if (!Number.isInteger(selfServeDays) || selfServeDays < 1 || selfServeDays > MAX_GRACE_DAYS) {
    throw new Error(`Self-service grace days must be a whole number between 1 and ${MAX_GRACE_DAYS}.`);
  }
  if (!Number.isInteger(adminDays) || adminDays < selfServeDays || adminDays > MAX_GRACE_DAYS) {
    throw new Error(`Admin grace days must be a whole number between the self-service window (${selfServeDays}) and ${MAX_GRACE_DAYS}.`);
  }
  let amnestyEndDate: string | null = null;
  if (input.amnestyEndDate !== null && input.amnestyEndDate !== undefined && input.amnestyEndDate !== '') {
    if (typeof input.amnestyEndDate !== 'string' || !DATE_RE.test(input.amnestyEndDate) || isNaN(Date.parse(input.amnestyEndDate))) {
      throw new Error('Amnesty end date must be a valid date in YYYY-MM-DD format (or blank to turn the amnesty off).');
    }
    amnestyEndDate = input.amnestyEndDate;
  }
  return { selfServeDays, adminDays, amnestyEndDate };
}

/**
 * Apply raw site_settings rows to the cache. Rows that are missing keep their
 * built-in defaults; a PRESENT-but-empty amnesty date means "amnesty off".
 * Invalid stored values are ignored (defaults win) rather than crashing boot.
 */
export function applyGraceSettings(rows: Array<{ setting_key: string; setting_value: string | null }>): GraceConfig {
  const byKey = new Map(rows.map(r => [r.setting_key, r.setting_value ?? '']));
  const next = defaults();

  const selfServeRaw = byKey.get(GRACE_SETTING_KEYS.selfServeDays);
  if (selfServeRaw !== undefined) {
    const n = Number(selfServeRaw);
    if (Number.isInteger(n) && n >= 1 && n <= MAX_GRACE_DAYS) next.selfServeDays = n;
  }

  const adminRaw = byKey.get(GRACE_SETTING_KEYS.adminDays);
  if (adminRaw !== undefined) {
    const n = Number(adminRaw);
    if (Number.isInteger(n) && n >= 1 && n <= MAX_GRACE_DAYS) next.adminDays = n;
  }
  // The admin window can never be narrower than the self-serve window.
  if (next.adminDays < next.selfServeDays) next.adminDays = next.selfServeDays;

  const amnestyRaw = byKey.get(GRACE_SETTING_KEYS.amnestyEndDate);
  if (amnestyRaw !== undefined) {
    if (amnestyRaw === '') {
      next.amnestyDeadline = null;
      next.amnestyEndDate = null;
    } else if (DATE_RE.test(amnestyRaw) && !isNaN(Date.parse(amnestyRaw))) {
      next.amnestyDeadline = amnestyDeadlineFromEndDate(amnestyRaw);
      next.amnestyEndDate = amnestyRaw;
    }
  }

  cached = next;
  return cached;
}

/** Test helper — reset the cache to built-in defaults. */
export function resetGraceConfigForTests(): void {
  cached = defaults();
}
