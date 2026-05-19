import { loadStripe } from '@stripe/stripe-js';

// Stripe.js must be loaded exactly once per page. Centralizing here prevents
// multiple `<Elements>` providers from each instantiating their own Stripe
// controller iframe, which causes intermittent duplicate-`Access-Control-Allow-Origin`
// CORS failures from r.stripe.com.
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

export const isStripeConfigured =
  !!stripePublishableKey &&
  !stripePublishableKey.includes('YOUR_STRIPE') &&
  stripePublishableKey.startsWith('pk_');

export const stripePromise = isStripeConfigured ? loadStripe(stripePublishableKey) : null;
