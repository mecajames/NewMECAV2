import { createContext } from 'react';

export interface ReCaptchaContextValue {
  isReady: boolean;
  siteKey: string | null;
  /**
   * Ask the provider to load the Google reCAPTCHA script. The script is
   * loaded LAZILY — only when a page that actually uses reCAPTCHA mounts —
   * so Google's script (and its cookies) don't run site-wide for every
   * visitor. Idempotent; safe to call repeatedly.
   */
  requestLoad: () => void;
}

export const ReCaptchaContext = createContext<ReCaptchaContextValue>({
  isReady: false,
  siteKey: null,
  requestLoad: () => {},
});
