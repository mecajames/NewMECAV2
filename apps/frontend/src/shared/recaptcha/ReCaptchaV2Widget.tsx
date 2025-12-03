import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

// Window.grecaptcha type is already declared in apiHooks.ts
// No need to redeclare here

export interface ReCaptchaV2Ref {
  getToken: () => string | null;
  reset: () => void;
}

interface ReCaptchaV2WidgetProps {
  onVerify?: (token: string) => void;
  onExpired?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
}

/**
 * ReCAPTCHA v2 Checkbox Widget
 * Displays the "I'm not a robot" checkbox
 */
export const ReCaptchaV2Widget = forwardRef<ReCaptchaV2Ref, ReCaptchaV2WidgetProps>(
  ({ onVerify, onExpired, onError, theme = 'dark', size = 'normal' }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<number | null>(null);
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    useImperativeHandle(ref, () => ({
      getToken: () => {
        if (widgetIdRef.current !== null && typeof window.grecaptcha !== 'undefined') {
          return window.grecaptcha.getResponse(widgetIdRef.current);
        }
        return null;
      },
      reset: () => {
        if (widgetIdRef.current !== null && typeof window.grecaptcha !== 'undefined') {
          window.grecaptcha.reset(widgetIdRef.current);
        }
      },
    }));

    useEffect(() => {
      if (!siteKey) {
        console.warn('VITE_RECAPTCHA_SITE_KEY is not configured');
        return;
      }

      let intervalId: ReturnType<typeof setInterval> | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let isMounted = true;

      const renderRecaptcha = () => {
        if (!isMounted || !containerRef.current || typeof window.grecaptcha === 'undefined') {
          return;
        }

        // Skip if already rendered in this element
        if (widgetIdRef.current !== null) {
          return;
        }

        // Check if element already has a reCAPTCHA widget rendered
        if (containerRef.current.hasChildNodes()) {
          return;
        }

        try {
          // Render the reCAPTCHA widget
          widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
            sitekey: siteKey,
            theme,
            size,
            callback: (token: string) => {
              console.log('reCAPTCHA v2 verified');
              onVerify?.(token);
            },
            'expired-callback': () => {
              console.log('reCAPTCHA v2 expired');
              onExpired?.();
            },
            'error-callback': () => {
              console.error('reCAPTCHA v2 error');
              onError?.();
            },
          });
        } catch (error) {
          // Silently handle "already rendered" errors
          if (error instanceof Error && !error.message.includes('already been rendered')) {
            console.error('reCAPTCHA render error:', error);
          }
        }
      };

      // Wait for grecaptcha to be ready
      if (typeof window.grecaptcha !== 'undefined') {
        window.grecaptcha.ready(renderRecaptcha);
      } else {
        // Poll for grecaptcha to become available
        intervalId = setInterval(() => {
          if (typeof window.grecaptcha !== 'undefined') {
            window.grecaptcha.ready(renderRecaptcha);
            if (intervalId) clearInterval(intervalId);
          }
        }, 100);

        // Cleanup after 10 seconds
        timeoutId = setTimeout(() => {
          if (intervalId) clearInterval(intervalId);
        }, 10000);
      }

      return () => {
        isMounted = false;
        if (intervalId) clearInterval(intervalId);
        if (timeoutId) clearTimeout(timeoutId);
        // Reset widget on unmount so it can be re-rendered if remounted
        if (widgetIdRef.current !== null && typeof window.grecaptcha !== 'undefined') {
          try {
            window.grecaptcha.reset(widgetIdRef.current);
          } catch (e) {
            // Ignore reset errors on unmount
          }
        }
        widgetIdRef.current = null;
      };
    }, [siteKey, theme, size, onVerify, onExpired, onError]);

    if (!siteKey) {
      return (
        <div className="text-red-500 text-sm">
          reCAPTCHA site key not configured
        </div>
      );
    }

    return <div ref={containerRef} className="inline-block" />;
  }
);

ReCaptchaV2Widget.displayName = 'ReCaptchaV2Widget';
