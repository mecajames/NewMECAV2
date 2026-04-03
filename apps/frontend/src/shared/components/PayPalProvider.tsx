import { ReactNode, useEffect, useState } from 'react';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import { useSiteSettings } from '@/shared/contexts/SiteSettingsContext';

interface PayPalProviderProps {
  children: ReactNode;
}

/**
 * Wraps children with PayPal SDK provider when PayPal is enabled in site settings.
 * Only loads the PayPal SDK script when paypal_enabled is true and a client ID is configured.
 */
export function PayPalProvider({ children }: PayPalProviderProps) {
  const { getSetting, loading } = useSiteSettings();
  const [paypalConfig, setPaypalConfig] = useState<{
    clientId: string;
    sandbox: boolean;
  } | null>(null);

  useEffect(() => {
    if (loading) return;

    const enabled = getSetting('paypal_enabled');
    const clientId = getSetting('paypal_client_id');
    const sandbox = getSetting('paypal_sandbox_mode');

    if (enabled === 'true' && clientId) {
      setPaypalConfig({
        clientId,
        sandbox: sandbox === 'true',
      });
    } else {
      setPaypalConfig(null);
    }
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
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}
