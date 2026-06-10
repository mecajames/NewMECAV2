import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/**
 * Password-reset safety net.
 *
 * GoTrue redirects a recovery link to its SITE_URL root (mecacaraudio.com)
 * instead of /reset-password (the admin generate_link flow ignores redirect_to),
 * so the recovery token lands on the homepage. Without intervention the
 * force-password-change guard then bounces the now-signed-in recovery session to
 * /change-password — which requires the CURRENT password the user doesn't know.
 * We instead route them to /reset-password, where they can set a new password
 * with no current-password prompt (and which is exempt from that guard).
 *
 * IMPORTANT: the Supabase client's detectSessionInUrl fires PASSWORD_RECOVERY
 * very early (during client init), often BEFORE this component subscribes — a
 * listener alone misses it. So we ALSO capture the recovery hash synchronously
 * at module load (before detectSessionInUrl consumes and clears the URL) and act
 * on it the moment we mount, which is what reliably wins the race against the
 * force-password-change guard. The event listener stays as a backstop.
 *
 * No-op once the token lands on /reset-password directly, and it never fires
 * during normal app use — only a real recovery link carries type=recovery.
 */
const ARRIVED_VIA_RECOVERY =
  typeof window !== 'undefined' && window.location.hash.includes('type=recovery');

export function RecoveryRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const goToReset = () => {
      if (window.location.pathname !== '/reset-password') {
        navigate('/reset-password', { replace: true });
      }
    };

    // Primary: synchronous flag captured before the hash was cleared.
    if (ARRIVED_VIA_RECOVERY) goToReset();

    // Backstop: catch the event if the session is established slightly later.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') goToReset();
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
}
