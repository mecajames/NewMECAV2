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

      const renderRecaptcha = () => {
        if (!containerRef.current || typeof window.grecaptcha === 'undefined') {
          return;
        }

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
      };

      // Wait for grecaptcha to be ready
      if (typeof window.grecaptcha !== 'undefined') {
        window.grecaptcha.ready(renderRecaptcha);
      } else {
        // Poll for grecaptcha to become available
        const interval = setInterval(() => {
          if (typeof window.grecaptcha !== 'undefined') {
            window.grecaptcha.ready(renderRecaptcha);
            clearInterval(interval);
          }
        }, 100);

        // Cleanup after 10 seconds
        setTimeout(() => clearInterval(interval), 10000);

        return () => clearInterval(interval);
      }
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
