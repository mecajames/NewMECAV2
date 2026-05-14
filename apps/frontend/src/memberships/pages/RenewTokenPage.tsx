import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '@/lib/axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { AlertCircle, CheckCircle, Lock, ShieldCheck, Loader2, CreditCard } from 'lucide-react';
import { PayPalPaymentButton } from '@/shared/components/PayPalPaymentButton';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const isStripeReady =
  !!stripePublishableKey &&
  !stripePublishableKey.includes('YOUR_STRIPE') &&
  stripePublishableKey.startsWith('pk_');
const stripePromise = isStripeReady ? loadStripe(stripePublishableKey) : null;

interface RenewalContext {
  token: string;
  tokenExpiresAt: string;
  member: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    mecaId: number | null;
  };
  membership: {
    id: string;
    typeName: string;
    category: string | null;
    endDate: string;
  };
  pricing: {
    price: number;
    taxAmount: number;
    taxRate: number;
    total: number;
    currency: string;
  };
  billing: {
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
  mecaIdGrace: {
    tier: 'active' | 'soft' | 'medium' | 'admin' | 'expired';
    daysRemaining: number;
    canKeepId: boolean;
  };
}

interface BillingForm {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

function PaymentForm({
  total,
  onSuccess,
  onError,
  email,
}: {
  total: number;
  email: string;
  onSuccess: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
          receipt_email: email,
        },
        redirect: 'if_required',
      });
      if (error) {
        onError(error.message || 'Payment failed.');
        return;
      }
      if (paymentIntent) {
        if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
          onSuccess(paymentIntent.id);
        } else {
          onError(`Payment status: ${paymentIntent.status}`);
        }
      } else {
        onError('Payment did not complete.');
      }
    } catch (err: any) {
      onError(err?.message || 'Unexpected error during payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-slate-900/60 rounded-lg p-4 mb-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      <p className="flex items-center text-xs text-gray-400 mb-4">
        <Lock className="w-3.5 h-3.5 mr-1.5" />
        Your payment is processed securely by Stripe.
      </p>
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-lg transition-colors"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            Pay ${total.toFixed(2)} & Renew
          </>
        )}
      </button>
    </form>
  );
}

export default function RenewTokenPage() {
  const { token } = useParams<{ token: string }>();
  const [ctx, setCtx] = useState<RenewalContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [billing, setBilling] = useState<BillingForm>({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
  });

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [piError, setPiError] = useState<string | null>(null);
  const [creatingPi, setCreatingPi] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  useEffect(() => {
    if (!token) return;
    axios
      .get(`/api/memberships/renew/token/${encodeURIComponent(token)}`)
      .then((r) => {
        const data: RenewalContext = r.data;
        setCtx(data);
        setBilling((prev) => ({
          ...prev,
          firstName: data.billing.firstName ?? data.member.firstName ?? '',
          lastName: data.billing.lastName ?? data.member.lastName ?? '',
          phone: data.billing.phone ?? '',
          address: data.billing.address ?? '',
          city: data.billing.city ?? '',
          state: data.billing.state ?? '',
          postalCode: data.billing.postalCode ?? '',
          country: data.billing.country ?? 'USA',
        }));
      })
      .catch((err) => setError(err?.response?.data?.message || 'This renewal link is no longer valid.'))
      .finally(() => setLoading(false));
  }, [token]);

  const greetName = useMemo(() => {
    if (!ctx) return 'there';
    return ctx.member.firstName?.trim() || ctx.member.email || 'there';
  }, [ctx]);

  const graceLabel = useMemo(() => {
    if (!ctx || ctx.mecaIdGrace.tier === 'active') return null;
    if (ctx.mecaIdGrace.canKeepId) {
      return `You have ${ctx.mecaIdGrace.daysRemaining} day${ctx.mecaIdGrace.daysRemaining === 1 ? '' : 's'} left to renew and keep MECA ID #${ctx.member.mecaId}.`;
    }
    return `Your MECA ID #${ctx.member.mecaId} has retired. A new MECA ID will be issued when you renew. If you believe this is an error, contact support.`;
  }, [ctx]);

  const handleStartPayment = async () => {
    if (!ctx || !token) return;
    setPiError(null);
    setCreatingPi(true);
    try {
      const r = await axios.post(`/api/memberships/renew/token/${encodeURIComponent(token)}/payment-intent`, {
        billing,
      });
      setClientSecret(r.data.clientSecret);
    } catch (err: any) {
      setPiError(err?.response?.data?.message || 'Could not start payment. Please try again.');
    } finally {
      setCreatingPi(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-r-transparent" />
      </div>
    );
  }

  if (error || !ctx) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="bg-slate-800/70 border border-red-700/40 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Renewal link invalid</h1>
            <p className="text-gray-300 mb-6">{error ?? 'We could not load this renewal page.'}</p>
            <Link
              to="/renew-expired"
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg"
            >
              Get a new renewal link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (succeeded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="bg-slate-800/80 border border-emerald-700/40 rounded-xl p-8 text-center">
            <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Payment received — thank you!</h1>
            <p className="text-gray-300 mb-2">
              Your renewal is being processed. We'll send a confirmation email to{' '}
              <span className="text-white font-semibold">{ctx.member.email}</span> as soon as your membership is reactivated.
            </p>
            <p className="text-gray-500 text-sm mb-6">
              You can sign in to MyMECA in a few minutes once the confirmation email arrives.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium px-5 py-2.5 rounded-lg"
            >
              Continue to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const expiredStr = new Date(ctx.membership.endDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 md:p-8 shadow-xl">
          <div className="flex items-center gap-2 text-orange-400 text-sm uppercase tracking-wide mb-2">
            <ShieldCheck className="w-4 h-4" />
            Renewal verified
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
            Hi {greetName}, let's renew your MECA membership.
          </h1>
          <p className="text-gray-400 mb-6">
            Your <span className="text-orange-300 font-semibold">{ctx.membership.typeName}</span> expired on{' '}
            <span className="text-white font-semibold">{expiredStr}</span>.
          </p>

          {graceLabel && (
            <div
              className={`mb-6 rounded-lg border p-3 text-sm ${
                ctx.mecaIdGrace.canKeepId
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-red-500/10 border-red-500/30 text-red-200'
              }`}
            >
              {graceLabel}
            </div>
          )}

          {/* Pricing summary */}
          <div className="bg-slate-900/50 border border-slate-700/60 rounded-lg p-4 mb-6 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">{ctx.membership.typeName}</span>
              <span className="text-white">${ctx.pricing.price.toFixed(2)}</span>
            </div>
            {ctx.pricing.taxAmount > 0 && (
              <div className="flex justify-between mt-1">
                <span className="text-gray-400">Tax</span>
                <span className="text-white">${ctx.pricing.taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between mt-2 pt-2 border-t border-slate-700/60">
              <span className="text-white font-semibold">Total</span>
              <span className="text-white font-semibold">${ctx.pricing.total.toFixed(2)}</span>
            </div>
          </div>

          {!clientSecret ? (
            <>
              {/* PayPal lane — token-gated PayPal order. Capture webhook
                  fires the same fulfillment path as Stripe, which marks
                  the renewal token used. */}
              <div className="mb-6">
                <h2 className="text-base font-semibold text-white mb-2">Pay with PayPal</h2>
                <PayPalPaymentButton
                  paymentType="membership"
                  createOrderFn={async () => {
                    const r = await axios.post(
                      `/api/memberships/renew/token/${encodeURIComponent(token!)}/paypal-order`,
                      { billing },
                    );
                    return r.data.paypalOrderId;
                  }}
                  onSuccess={() => setSucceeded(true)}
                  onError={(msg) => setPiError(msg)}
                />
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700/60"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-slate-800/80 px-2 text-gray-500">or pay with card</span>
                </div>
              </div>

              <h2 className="text-base font-semibold text-white mb-3">Billing information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                {(
                  [
                    ['firstName', 'First name'],
                    ['lastName', 'Last name'],
                    ['phone', 'Phone'],
                    ['address', 'Street address'],
                    ['city', 'City'],
                    ['state', 'State'],
                    ['postalCode', 'Postal code'],
                    ['country', 'Country'],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="block">
                    <span className="text-xs text-gray-400">{label}</span>
                    <input
                      type="text"
                      value={(billing as any)[k]}
                      onChange={(e) => setBilling((p) => ({ ...p, [k]: e.target.value }))}
                      className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500/60"
                    />
                  </label>
                ))}
              </div>
              {piError && (
                <div className="mb-3 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded p-3">
                  {piError}
                </div>
              )}
              <button
                onClick={handleStartPayment}
                disabled={creatingPi || !isStripeReady}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 text-white font-semibold px-5 py-3 rounded-lg transition-colors"
              >
                {creatingPi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparing payment…
                  </>
                ) : (
                  <>Continue to payment</>
                )}
              </button>
              {!isStripeReady && (
                <p className="text-xs text-red-400 mt-2">
                  Stripe is not configured. Contact memberships@mecacaraudio.com to renew.
                </p>
              )}
            </>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#f97316',
                    colorBackground: '#0f172a',
                    colorText: '#ffffff',
                    fontFamily: 'system-ui, sans-serif',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <PaymentForm
                total={ctx.pricing.total}
                email={ctx.member.email ?? ''}
                onSuccess={() => setSucceeded(true)}
                onError={(msg) => setPiError(msg)}
              />
            </Elements>
          )}

          {piError && clientSecret && (
            <p className="mt-3 text-sm text-red-300">{piError}</p>
          )}
        </div>

        <p className="text-center text-xs text-gray-500 mt-4">
          This renewal link expires {new Date(ctx.tokenExpiresAt).toLocaleDateString()}.
        </p>
      </div>
    </div>
  );
}
