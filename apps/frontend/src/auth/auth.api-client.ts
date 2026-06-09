import axios from '@/lib/axios';

/**
 * Called after a failed password sign-in. Asks the backend whether this email
 * belongs to a migrated account that never set a password (the 2026-03 V1
 * import left ~4,000 of these). If so, the backend emails a set-password link
 * and returns true, so the login page can show a helpful "check your inbox"
 * message instead of a dead-end "Invalid login credentials".
 *
 * Returns false for everyone else (mistyped password, no account, banned) and
 * on any error — callers should fall back to the normal error in that case.
 */
export const requestLoginRecovery = async (email: string): Promise<boolean> => {
  try {
    const { data } = await axios.post<{ passwordSetupRequired: boolean }>(
      '/api/auth/login-recovery',
      { email, redirectTo: `${window.location.origin}/reset-password` },
    );
    return !!data?.passwordSetupRequired;
  } catch {
    return false;
  }
};

/**
 * Checks whether a login account already exists for an email. Used by the
 * membership signup form to stop a returning member from re-registering (and
 * paying) before being sent to log in / reset their password. Returns
 * { exists: false } on any error so a transient failure never blocks signup.
 */
export const checkAccountExists = async (
  email: string,
): Promise<{ exists: boolean; canLogin: boolean }> => {
  try {
    const { data } = await axios.post<{ exists: boolean; canLogin: boolean }>(
      '/api/auth/account-exists',
      { email },
    );
    return { exists: !!data?.exists, canLogin: !!data?.canLogin };
  } catch {
    return { exists: false, canLogin: false };
  }
};
