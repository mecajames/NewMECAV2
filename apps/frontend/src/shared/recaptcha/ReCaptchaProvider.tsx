import { useCallback, useRef, ReactNode, useState } from 'react';
import { ReCaptchaContext } from './ReCaptchaContext';

interface ReCaptchaProviderProps {
  children: ReactNode;
  version?: 'v2' | 'v3';
}

/**
 * ReCaptchaProvider — provides lazy, on-demand loading of the Google
 * reCAPTCHA script. The script is NOT loaded when the provider mounts;
 * it loads the first time a consumer calls requestLoad() (the v2 widget and
 * the useRecaptcha hook do this automatically on mount). This keeps Google's
 * script off the ~95% of pages that have no protected form — a privacy
 * (CIPA/GDPR footprint) and performance win. reCAPTCHA itself is classified
 * as strictly-necessary (fraud/abuse prevention), so it does not wait for
 * cookie-banner consent.
 * @param version - 'v2' for checkbox widget, 'v3' for invisible (default: 'v2')
 */
export function ReCaptchaProvider({ children, version = 'v2' }: ReCaptchaProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const loadRequested = useRef(false);
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const requestLoad = useCallback(() => {
    if (loadRequested.current) return;
    loadRequested.current = true;

    if (!siteKey) {
      console.warn('VITE_RECAPTCHA_SITE_KEY is not configured. reCAPTCHA will not work.');
      return;
    }

    // Script already present (e.g. hot reload) — just wait for readiness.
    const existingScript = document.querySelector('script[src*="recaptcha"]');
    if (existingScript) {
      if (typeof window.grecaptcha !== 'undefined') {
        window.grecaptcha.ready(() => setIsReady(true));
      }
      return;
    }

    const script = document.createElement('script');
    if (version === 'v3') {
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    } else {
      // v2 - loads with explicit rendering
      script.src = 'https://www.google.com/recaptcha/api.js';
    }
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (typeof window.grecaptcha !== 'undefined') {
        window.grecaptcha.ready(() => setIsReady(true));
      }
    };
    script.onerror = () => {
      console.error('Failed to load reCAPTCHA script');
      loadRequested.current = false; // allow a retry
    };

    document.head.appendChild(script);
  }, [siteKey, version]);

  return (
    <ReCaptchaContext.Provider value={{ isReady, siteKey: siteKey || null, requestLoad }}>
      {children}
    </ReCaptchaContext.Provider>
  );
}
