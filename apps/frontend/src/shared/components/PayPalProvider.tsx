import { ReactNode, useEffect, useState } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useSiteSettings } from '@/shared/contexts/SiteSettingsContext';
import { paypalApi } from '@/paypal/paypal.api-client';

interface PayPalProviderProps {
  children: ReactNode;
}

/**
 * Wraps children with PayPal SDK provider when PayPal is enabled.
 * Client ID comes from the backend (env var), gated by the paypal_enabled site setting.
 */
export function PayPalProvider({ children }: PayPalProviderProps) {
  const { getSetting, loading } = useSiteSettings();
  const [paypalConfig, setPaypalConfig] = useState<{
    clientId: string;
    sandbox: boolean;
  } | null>(null);

  useEffect(() => {
    if (loading) return;

    if (getSetting('paypal_enabled') !== 'true') {
      setPaypalConfig(null);
      return;
    }

    let cancelled = false;
    paypalApi.getClientConfig().then((config) => {
      if (!cancelled) setPaypalConfig(config);
    });
    return () => {
      cancelled = true;
    };
  }, [getSetting, loading]);

  // If PayPal is not enabled or still loading, render children without provider
  if (!paypalConfig) {
    return <>{children}</>;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalConfig.clientId,
        currency: 'USD',
        intent: 'capture',
        disableFunding: 'paylater',
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}
