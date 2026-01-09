import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  ArrowLeft,
  CreditCard,
  Lock,
  Loader2,
  Package,
  ShoppingCart,
  MapPin,
} from 'lucide-react';
import { ShopAddress } from '@newmeca/shared';
import { useCart } from '../context/CartContext';
import { shopApi } from '../shop.api-client';
import { useAuth } from '@/auth/contexts/AuthContext';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = loadStripe(stripePublishableKey);

interface CheckoutFormData {
  email: string;
  shippingAddress: ShopAddress;
  billingAddress: ShopAddress;
  sameAsShipping: boolean;
}

const initialAddress: ShopAddress = {
  name: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  phone: '',
};

function PaymentForm({
  onSuccess,
  onBack,
  total,
}: {
  onSuccess: (paymentIntentId: string) => void;
  onBack: () => void;
  total: number;
}) {
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
          Payment Information
        </h3>
        <div className="bg-slate-700 rounded-lg p-4">
          <PaymentElement options={{ layout: 'tabs' }} />
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
          className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Processing Payment...
            </span>
          ) : (
            `Pay $${total.toFixed(2)}`
          )}
        </button>
      </div>
    </form>
  );
}

function AddressForm({
  address,
  onChange,
  title,
}: {
  address: ShopAddress;
  onChange: (address: ShopAddress) => void;
  title: string;
}) {
  const handleChange = (field: keyof ShopAddress, value: string) => {
    onChange({ ...address, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center">
        <MapPin className="h-5 w-5 mr-2 text-orange-500" />
        {title}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={address.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="John Doe"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Address Line 1 *
          </label>
          <input
            type="text"
            value={address.line1}
            onChange={(e) => handleChange('line1', e.target.value)}
            required
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="123 Main Street"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Address Line 2
          </label>
          <input
            type="text"
            value={address.line2 || ''}
            onChange={(e) => handleChange('line2', e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Apt, Suite, etc. (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            City *
          </label>
          <input
            type="text"
            value={address.city}
            onChange={(e) => handleChange('city', e.target.value)}
            required
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            State/Province *
          </label>
          <input
            type="text"
            value={address.state}
            onChange={(e) => handleChange('state', e.target.value)}
            required
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            ZIP/Postal Code *
          </label>
          <input
            type="text"
            value={address.postalCode}
            onChange={(e) => handleChange('postalCode', e.target.value)}
            required
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Country *
          </label>
          <select
            value={address.country}
            onChange={(e) => handleChange('country', e.target.value)}
            required
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={address.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="(555) 123-4567"
          />
        </div>
      </div>
    </div>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { items, itemCount: _itemCount, subtotal, clearCart } = useCart();
  const [step, setStep] = useState<'address' | 'payment'>('address');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CheckoutFormData>({
    email: user?.email || '',
    shippingAddress: initialAddress,
    billingAddress: initialAddress,
    sameAsShipping: true,
  });

  // Pre-fill email from user
  useEffect(() => {
    if (user?.email) {
      setFormData((prev) => ({ ...prev, email: user.email || '' }));
    }
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        shippingAddress: {
          ...prev.shippingAddress,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
          city: profile.city || '',
          state: profile.state || '',
          country: profile.country || 'US',
          phone: profile.phone || '',
        },
      }));
    }
  }, [user, profile]);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && !orderId) {
      navigate('/shop/cart');
    }
  }, [items, orderId, navigate]);

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check stock availability first
      const stockCheck = await shopApi.checkAvailability(
        items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      );

      if (!stockCheck.available) {
        const unavailable = stockCheck.unavailableItems
          .map((item) => `${item.productName} (requested: ${item.requested}, available: ${item.available})`)
          .join(', ');
        setError(`Some items are no longer available: ${unavailable}`);
        setLoading(false);
        return;
      }

      // Create payment intent
      const result = await shopApi.createPaymentIntent({
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        email: formData.email,
        shippingAddress: formData.shippingAddress,
        billingAddress: formData.sameAsShipping ? formData.shippingAddress : formData.billingAddress,
        userId: user?.id,
      });

      setClientSecret(result.clientSecret);
      setOrderId(result.orderId);
      setStep('payment');
    } catch (err) {
      console.error('Error creating payment intent:', err);
      setError('Failed to initialize checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (_paymentIntentId: string) => {
    clearCart();
    navigate(`/shop/orders/${orderId}/confirmation`);
  };

  if (items.length === 0 && !orderId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/shop/cart" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Checkout</h1>
            <p className="text-gray-400">Step {step === 'address' ? '1' : '2'} of 2</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center mb-8">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 'address' ? 'bg-orange-500' : 'bg-green-500'} text-white font-bold`}>
              1
            </div>
            <span className={`ml-3 font-medium ${step === 'address' ? 'text-white' : 'text-green-400'}`}>
              Shipping
            </span>
          </div>
          <div className="flex-1 h-1 mx-4 bg-slate-700 rounded">
            <div className={`h-full rounded ${step === 'payment' ? 'bg-green-500' : 'bg-slate-700'}`} style={{ width: step === 'payment' ? '100%' : '0%' }} />
          </div>
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step === 'payment' ? 'bg-orange-500' : 'bg-slate-700'} text-white font-bold`}>
              2
            </div>
            <span className={`ml-3 font-medium ${step === 'payment' ? 'text-white' : 'text-gray-500'}`}>
              Payment
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {step === 'address' ? (
              <form onSubmit={handleAddressSubmit}>
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
                  {/* Email */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="you@example.com"
                    />
                    <p className="text-sm text-gray-500 mt-1">Order confirmation will be sent here</p>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
                  <AddressForm
                    address={formData.shippingAddress}
                    onChange={(address) => setFormData({ ...formData, shippingAddress: address })}
                    title="Shipping Address"
                  />
                </div>

                {/* Billing Address */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
                  <label className="flex items-center mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sameAsShipping}
                      onChange={(e) => setFormData({ ...formData, sameAsShipping: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-600 text-orange-500 focus:ring-orange-500 bg-slate-700"
                    />
                    <span className="ml-3 text-gray-300">Billing address same as shipping</span>
                  </label>

                  {!formData.sameAsShipping && (
                    <AddressForm
                      address={formData.billingAddress}
                      onChange={(address) => setFormData({ ...formData, billingAddress: address })}
                      title="Billing Address"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Processing...
                    </span>
                  ) : (
                    'Continue to Payment'
                  )}
                </button>
              </form>
            ) : (
              clientSecret && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
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
                    <PaymentForm
                      onSuccess={handlePaymentSuccess}
                      onBack={() => setStep('address')}
                      total={subtotal}
                    />
                  </Elements>
                </div>
              )
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 sticky top-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-orange-500" />
                Order Summary
              </h2>

              {/* Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3">
                    <div className="w-16 h-16 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-slate-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-white font-medium">
                      ${(Number(item.product.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-700 pt-4 space-y-2">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span className="text-green-400">Free</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tax</span>
                  <span>$0.00</span>
                </div>
              </div>

              <div className="border-t border-slate-700 mt-4 pt-4">
                <div className="flex justify-between text-white">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold">${subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
