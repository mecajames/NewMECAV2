import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Calendar,
  Building,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { invoicesApi, InvoiceForPayment } from '../../api-client/billing.api-client';

// Check if Stripe is configured
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const isStripeConfigured =
  !!stripePublishableKey &&
  !stripePublishableKey.includes('YOUR_STRIPE') &&
  stripePublishableKey.startsWith('pk_');

const stripePromise = isStripeConfigured ? loadStripe(stripePublishableKey) : null;

interface PaymentFormProps {
  invoice: InvoiceForPayment;
  onSuccess: (paymentIntentId: string) => void;
}

function PaymentForm({ invoice, onSuccess }: PaymentFormProps) {
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
          receipt_email: invoice.user?.email,
        },
        redirect: 'if_required',
      });

      if (error) {
        setPaymentError(error.message || 'Payment failed. Please try again.');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id);
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

      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Processing Payment...
          </span>
        ) : (
          `Pay $${parseFloat(invoice.total).toFixed(2)}`
        )}
      </button>
    </form>
  );
}

function StripePaymentWrapper({
  clientSecret,
  invoice,
  onSuccess,
}: {
  clientSecret: string;
  invoice: InvoiceForPayment;
  onSuccess: (paymentIntentId: string) => void;
}) {
  if (!stripePromise) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-400">Payment system is not configured</p>
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
      <PaymentForm invoice={invoice} onSuccess={onSuccess} />
    </Elements>
  );
}

export default function InvoicePaymentPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceForPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [creatingIntent, setCreatingIntent] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!invoiceId) {
        setError('No invoice specified');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await invoicesApi.getForPayment(invoiceId);
        setInvoice(data);
      } catch (err) {
        console.error('Error fetching invoice:', err);
        setError('Invoice not found or has expired');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  const handlePayNow = async () => {
    if (!invoice || !invoiceId) return;

    setCreatingIntent(true);
    setError(null);

    try {
      const { clientSecret: secret } = await invoicesApi.createPaymentIntent(invoiceId);
      setClientSecret(secret);
    } catch (err) {
      console.error('Error creating payment intent:', err);
      setError('Failed to initialize payment. Please try again.');
    } finally {
      setCreatingIntent(false);
    }
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    console.log('Payment successful:', paymentIntentId);
    setPaymentSuccess(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  // Error state
  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  // Already paid
  if (invoice.status === 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Already Paid</h2>
          <p className="text-gray-400 mb-6">
            Invoice {invoice.invoiceNumber} has already been paid. Thank you!
          </p>
          <Link
            to="/billing"
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            View Billing History
          </Link>
        </div>
      </div>
    );
  }

  // Cancelled or refunded
  if (invoice.status === 'cancelled' || invoice.status === 'refunded') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Invoice {invoice.status}</h2>
          <p className="text-gray-400 mb-6">
            This invoice has been {invoice.status} and cannot be paid.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Payment success
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
          <p className="text-gray-400 mb-6">
            Thank you for your payment. Your invoice {invoice.invoiceNumber} has been paid.
          </p>
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Amount Paid</span>
              <span className="text-white font-semibold">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Invoice</span>
              <span className="text-white">{invoice.invoiceNumber}</span>
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-6">
            A confirmation email will be sent to {invoice.user?.email}
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Main payment page
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with Back button */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-full mb-4">
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Pay Invoice</h1>
            <p className="text-gray-400">Invoice {invoice.invoiceNumber}</p>
          </div>
          <button
            onClick={() => navigate('/billing')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Billing
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Invoice Details */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-orange-500" />
              Invoice Details
            </h2>

            {/* Company Info */}
            {invoice.companyInfo && (
              <div className="mb-6 pb-6 border-b border-slate-700">
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">{invoice.companyInfo.name}</p>
                    {invoice.companyInfo.email && (
                      <p className="text-gray-400 text-sm">{invoice.companyInfo.email}</p>
                    )}
                    {invoice.companyInfo.website && (
                      <p className="text-gray-400 text-sm">{invoice.companyInfo.website}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Due Date */}
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-gray-400 text-sm">Due Date</p>
                <p className="text-white font-medium">{formatDate(invoice.dueDate)}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase mb-3">Items</h3>
              <div className="space-y-3">
                {invoice.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-start p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div>
                      <p className="text-white">{item.description}</p>
                      <p className="text-gray-400 text-sm">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <p className="text-white font-medium">{formatCurrency(item.total)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t border-slate-700 pt-4 space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {parseFloat(invoice.tax) > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Tax</span>
                  <span>{formatCurrency(invoice.tax)}</span>
                </div>
              )}
              {parseFloat(invoice.discount) > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Discount</span>
                  <span>-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-slate-700">
                <span>Total Due</span>
                <span className="text-orange-500">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-orange-500" />
              Payment
            </h2>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            {!clientSecret ? (
              // Show Pay Now button
              <div>
                <p className="text-gray-400 mb-6">
                  Click the button below to proceed with your payment. Your card information will
                  be securely processed via Stripe.
                </p>

                {invoice.user && (
                  <div className="mb-6 p-4 bg-slate-700/50 rounded-lg">
                    <p className="text-gray-400 text-sm mb-1">Billing Email</p>
                    <p className="text-white">{invoice.user.email}</p>
                    {(invoice.user.firstName || invoice.user.lastName) && (
                      <>
                        <p className="text-gray-400 text-sm mb-1 mt-2">Name</p>
                        <p className="text-white">
                          {[invoice.user.firstName, invoice.user.lastName]
                            .filter(Boolean)
                            .join(' ')}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <button
                  onClick={handlePayNow}
                  disabled={creatingIntent || !isStripeConfigured}
                  className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingIntent ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Initializing...
                    </span>
                  ) : !isStripeConfigured ? (
                    'Payment Not Available'
                  ) : (
                    `Pay ${formatCurrency(invoice.total)}`
                  )}
                </button>

                {!isStripeConfigured && (
                  <p className="text-yellow-500 text-sm text-center mt-4">
                    Payment processing is not configured. Please contact support.
                  </p>
                )}
              </div>
            ) : (
              // Show Stripe payment form
              <StripePaymentWrapper
                clientSecret={clientSecret}
                invoice={invoice}
                onSuccess={handlePaymentSuccess}
              />
            )}

            <div className="mt-6 pt-6 border-t border-slate-700">
              <div className="flex items-center text-sm text-gray-400">
                <Lock className="h-4 w-4 mr-2" />
                Secured by Stripe. Your payment information is encrypted.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
