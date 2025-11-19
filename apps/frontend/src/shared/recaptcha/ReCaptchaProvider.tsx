import { useEffect, ReactNode, useState } from 'react';
import { ReCaptchaContext } from './ReCaptchaContext';

interface ReCaptchaProviderProps {
  children: ReactNode;
  version?: 'v2' | 'v3';
}

/**
 * ReCaptchaProvider component that loads the Google reCAPTCHA script
 * Add this at the root of your app (typically in App.tsx or main.tsx)
 * @param version - 'v2' for checkbox widget, 'v3' for invisible (default: 'v2')
 */
export function ReCaptchaProvider({ children, version = 'v2' }: ReCaptchaProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    if (!siteKey) {
      console.warn('VITE_RECAPTCHA_SITE_KEY is not configured. reCAPTCHA will not work.');
      return;
    }

    // Check if script is already loaded
    const existingScript = document.querySelector('script[src*="recaptcha"]');
    if (existingScript) {
      // Script exists, check if grecaptcha is ready
      if (typeof window.grecaptcha !== 'undefined') {
        window.grecaptcha.ready(() => {
          console.log('reCAPTCHA already loaded and ready');
          setIsReady(true);
        });
      }
      return;
    }

    // Load reCAPTCHA script
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
      console.log(`reCAPTCHA ${version} script loaded`);
      if (typeof window.grecaptcha !== 'undefined') {
        window.grecaptcha.ready(() => {
          console.log(`reCAPTCHA ${version} ready`);
          setIsReady(true);
        });
      }
    };
    
    script.onerror = () => {
      console.error('Failed to load reCAPTCHA script');
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Note: We don't remove the script on unmount as it may be needed elsewhere
      // The script is small and can stay loaded
    };
  }, [siteKey, version]);

  return (
    <ReCaptchaContext.Provider value={{ isReady, siteKey: siteKey || null }}>
      {children}
    </ReCaptchaContext.Provider>
  );
}
