import { useEffect, useState } from 'react';
import { useSiteSettings } from '@/shared/contexts/SiteSettingsContext';
import { CreditCard } from 'lucide-react';
import { paypalApi } from '@/paypal/paypal.api-client';

export type SelectedPaymentMethod = 'stripe' | 'paypal';

interface PaymentMethodSelectorProps {
  selected: SelectedPaymentMethod;
  onChange: (method: SelectedPaymentMethod) => void;
  /** Whether Stripe is configured (has publishable key) */
  stripeAvailable?: boolean;
}

/**
 * Radio button selector to choose between Stripe and PayPal.
 * Only shows options that are enabled.
 */
export function PaymentMethodSelector({
  selected,
  onChange,
  stripeAvailable = true,
}: PaymentMethodSelectorProps) {
  const { getSetting, loading } = useSiteSettings();
  const [isPayPalAvailable, setIsPayPalAvailable] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (getSetting('paypal_enabled') !== 'true') {
      setIsPayPalAvailable(false);
      return;
    }
    let cancelled = false;
    paypalApi.getClientConfig().then((config) => {
      if (!cancelled) setIsPayPalAvailable(!!config?.clientId);
    });
    return () => {
      cancelled = true;
    };
  }, [getSetting, loading]);

  if (loading) return null;

  // If only one method is available, don't show selector
  if (!isPayPalAvailable && stripeAvailable) return null;
  if (isPayPalAvailable && !stripeAvailable) return null;
  if (!isPayPalAvailable && !stripeAvailable) return null;

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-300 mb-3">
        Payment Method
      </label>
      <div className="flex flex-col sm:flex-row gap-3">
        {stripeAvailable && (
          <button
            type="button"
            onClick={() => onChange('stripe')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all flex-1 ${
              selected === 'stripe'
                ? 'border-orange-500 bg-orange-500/10 text-white'
                : 'border-slate-600 bg-slate-700 text-gray-400 hover:border-slate-500'
            }`}
          >
            <CreditCard className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Credit / Debit Card</div>
              <div className="text-xs text-gray-400">Powered by Stripe</div>
            </div>
            <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selected === 'stripe' ? 'border-orange-500' : 'border-slate-500'
            }`}>
              {selected === 'stripe' && (
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              )}
            </div>
          </button>
        )}

        {isPayPalAvailable && (
          <button
            type="button"
            onClick={() => onChange('paypal')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all flex-1 ${
              selected === 'paypal'
                ? 'border-orange-500 bg-orange-500/10 text-white'
                : 'border-slate-600 bg-slate-700 text-gray-400 hover:border-slate-500'
            }`}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
            </svg>
            <div className="text-left">
              <div className="font-medium">PayPal</div>
              <div className="text-xs text-gray-400">Pay with PayPal account</div>
            </div>
            <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selected === 'paypal' ? 'border-orange-500' : 'border-slate-500'
            }`}>
              {selected === 'paypal' && (
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              )}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
