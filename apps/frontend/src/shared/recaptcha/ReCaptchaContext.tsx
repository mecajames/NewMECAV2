import { createContext } from 'react';

export interface ReCaptchaContextValue {
  isReady: boolean;
  siteKey: string | null;
}

export const ReCaptchaContext = createContext<ReCaptchaContextValue>({
  isReady: false,
  siteKey: null,
});
