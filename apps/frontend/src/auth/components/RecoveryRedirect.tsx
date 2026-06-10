import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/**
 * Password-reset safety net.
 *
 * GoTrue redirects a recovery link to its SITE_URL root (e.g. mecacaraudio.com)
 * instead of /reset-password unless the reset URL is in GOTRUE_URI_ALLOW_LIST.
 * When that happens the recovery token lands on the homepage, where nothing
 * processes it and the password reset dead-ends ("link not working").
 *
 * The Supabase client (detectSessionInUrl) still establishes the recovery
 * session from the URL hash wherever the user lands and fires PASSWORD_RECOVERY.
 * We listen for that and route the user to /reset-password so they can actually
 * set a new password. This is a no-op once the token lands on /reset-password
 * directly (i.e. after the GoTrue allow-list is corrected), and it never fires
 * during normal app use — only a real recovery link emits PASSWORD_RECOVERY.
 *
 * Must be rendered INSIDE the router (uses useNavigate). Client-side navigation
 * preserves the in-memory recovery session regardless of persistSession.
 */
export function RecoveryRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/reset-password') {
        navigate('/reset-password', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
}
