import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CreditCard, Loader2, Lock } from 'lucide-react';
import { MembershipTypeConfig } from '@/membership-type-configs';

// Initialize Stripe
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  teamName: string;
  teamDescription: string;
  businessName: string;
  businessWebsite: string;
}

interface StripePaymentFormProps {
  membership: MembershipTypeConfig;
  formData: FormData;
  onSuccess: (paymentIntentId: string) => void;
  onBack: () => void;
}

function StripePaymentForm({
  membership,
  formData,
  onSuccess,
  onBack,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    setPaymentError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
          receipt_email: formData.email,
        },
        redirect: 'if_required',
      });

      if (error) {
        // Handle specific error types
        if (error.type === 'card_error' || error.type === 'validation_error') {
          setPaymentError(error.message || 'Card validation failed. Please check your card details.');
        } else {
          setPaymentError(error.message || 'Payment failed. Please try again.');
        }
      } else if (paymentIntent) {
        // Handle different payment intent statuses
        switch (paymentIntent.status) {
          case 'succeeded':
            onSuccess(paymentIntent.id);
            break;
          case 'processing':
            // Payment is being processed asynchronously (e.g., bank debits)
            setPaymentError(
              'Your payment is being processed. You will receive a confirmation email once completed.'
            );
            // Still call onSuccess - the webhook will handle final confirmation
            onSuccess(paymentIntent.id);
            break;
          case 'requires_action':
            // 3D Secure authentication is needed - Stripe handles this automatically
            // with redirect: 'if_required', but if we get here, something went wrong
            setPaymentError(
              'Additional authentication is required. Please complete the verification process.'
            );
            break;
          case 'requires_payment_method':
            // Payment method failed, user needs to provide a new one
            setPaymentError(
              'Your payment method was declined. Please try a different card or payment method.'
            );
            break;
          case 'requires_confirmation':
            // Rare case - payment needs to be confirmed again
            setPaymentError('Please try submitting your payment again.');
            break;
          case 'canceled':
            setPaymentError('The payment was canceled. Please try again.');
            break;
          default:
            setPaymentError(`Payment status: ${paymentIntent.status}. Please contact support if this persists.`);
        }
      } else {
        setPaymentError('Payment was not completed. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setPaymentError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {paymentError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-500 text-sm">{paymentError}</p>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <CreditCard className="h-5 w-5 mr-2 text-orange-500" />
          Card Information
        </h3>
        <div className="bg-slate-700 rounded-lg p-4">
          <PaymentElement
            options={{
              layout: 'tabs',
            }}
          />
        </div>
      </div>

      <div className="flex items-center text-sm text-gray-400 mb-6">
        <Lock className="h-4 w-4 mr-2" />
        Your payment information is secure and encrypted
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || submitting}
          className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Processing Payment...
            </span>
          ) : (
            `Pay $${membership.price.toFixed(2)}`
          )}
        </button>
      </div>
    </form>
  );
}

interface StripePaymentWrapperProps {
  clientSecret: string;
  membership: MembershipTypeConfig;
  formData: FormData;
  onSuccess: (paymentIntentId: string) => void;
  onBack: () => void;
}

export default function StripePaymentWrapper({
  clientSecret,
  membership,
  formData,
  onSuccess,
  onBack,
}: StripePaymentWrapperProps) {
  if (!stripePromise) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500 rounded-lg">
        <p className="text-red-500 text-center">
          Payment system is not configured. Please contact support.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#f97316',
            colorBackground: '#334155',
            colorText: '#ffffff',
            colorDanger: '#ef4444',
            fontFamily: 'system-ui, sans-serif',
            borderRadius: '8px',
          },
        },
      }}
    >
      <StripePaymentForm
        membership={membership}
        formData={formData}
        onSuccess={onSuccess}
        onBack={onBack}
      />
    </Elements>
  );
}

export function isStripeConfigured(): boolean {
  return !!stripePublishableKey;
}
