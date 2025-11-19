import { useState, useCallback, useEffect, useContext } from 'react';
import { recaptchaApi } from '../../api-client/recaptcha.api-client';
import { ReCaptchaContext } from './ReCaptchaContext';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      render: (
        container: string | HTMLElement,
        parameters: {
          sitekey: string;
          theme?: 'light' | 'dark';
          size?: 'normal' | 'compact';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
    };
  }
}

/**
 * Hook to execute reCAPTCHA and verify the token
 * @param action - The action name for this reCAPTCHA execution
 */
export function useRecaptcha(action: string) {
  const { isReady, siteKey } = useContext(ReCaptchaContext);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error when reCAPTCHA becomes ready
  useEffect(() => {
    if (isReady && error === 'reCAPTCHA is not loaded') {
      setError(null);
    }
  }, [isReady, error]);

  const executeRecaptcha = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      if (!siteKey) {
        console.error('reCAPTCHA site key not configured');
        setError('reCAPTCHA is not configured');
        setIsLoading(false);
        return false;
      }

      // Wait for reCAPTCHA to be ready (with timeout)
      if (!isReady || typeof window.grecaptcha === 'undefined') {
        console.log('Waiting for reCAPTCHA to load...');
        
        // Wait up to 5 seconds for reCAPTCHA to load
        const waitForRecaptcha = new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            resolve(false);
          }, 5000);

          const checkReady = () => {
            if (typeof window.grecaptcha !== 'undefined') {
              window.grecaptcha.ready(() => {
                clearTimeout(timeout);
                resolve(true);
              });
            } else {
              setTimeout(checkReady, 100);
            }
          };
          checkReady();
        });

        const loaded = await waitForRecaptcha;
        if (!loaded) {
          console.error('reCAPTCHA script not loaded');
          setError('reCAPTCHA is not loaded');
          setIsLoading(false);
          return false;
        }
      }

      // Execute reCAPTCHA
      const token = await new Promise<string>((resolve, reject) => {
        window.grecaptcha.ready(() => {
          window.grecaptcha
            .execute(siteKey, { action })
            .then(resolve)
            .catch(reject);
        });
      });

      // Verify token with backend
      const result = await recaptchaApi.verify(token, action);
      
      setIsLoading(false);
      return result.success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'reCAPTCHA verification failed';
      console.error('reCAPTCHA error:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, [action, siteKey, isReady]);

  return {
    executeRecaptcha,
    isLoading,
    error,
  };
}

/**
 * Hook to check if reCAPTCHA is ready to use
 */
export function useRecaptchaReady() {
  const { isReady } = useContext(ReCaptchaContext);
  return isReady;
}
