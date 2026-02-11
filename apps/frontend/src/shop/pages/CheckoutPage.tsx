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
  Truck,
} from 'lucide-react';
import { ShopAddress } from '@newmeca/shared';
import { useCart } from '../context/CartContext';
import { shopApi, ShippingRate } from '../shop.api-client';
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
          className="px-4 sm:px-6 py-2.5 sm:py-4 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || submitting}
          className="flex-1 py-2.5 sm:py-4 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        {/* Country first */}
        <div className="sm:col-span-2">
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

  // Shipping state
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<'standard' | 'priority'>('standard');
  const [loadingRates, setLoadingRates] = useState(false);
  const [lastZipChecked, setLastZipChecked] = useState('');

  const [formData, setFormData] = useState<CheckoutFormData>({
    email: user?.email || '',
    shippingAddress: initialAddress,
    billingAddress: initialAddress,
    sameAsShipping: true,
  });

  // Get the selected shipping rate
  const selectedRate = shippingRates.find((r) => r.method === selectedShippingMethod);
  const shippingCost = selectedRate?.price || 0;
  const orderTotal = subtotal + shippingCost;

  // Pre-fill address from user profile
  useEffect(() => {
    if (user?.email) {
      setFormData((prev) => ({ ...prev, email: user.email || '' }));
    }
    if (profile) {
      const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

      // Pre-populate shipping address (prefer shipping_* fields, fallback to main address)
      const shippingAddress: ShopAddress = {
        name: fullName,
        line1: profile.shipping_street || profile.address || '',
        line2: '',
        city: profile.shipping_city || profile.city || '',
        state: profile.shipping_state || profile.state || '',
        postalCode: profile.shipping_zip || profile.postal_code || '',
        country: profile.shipping_country || profile.country || 'US',
        phone: profile.phone || '',
      };

      // Pre-populate billing address (prefer billing_* fields, fallback to main address)
      const billingAddress: ShopAddress = {
        name: fullName,
        line1: profile.billing_street || profile.address || '',
        line2: '',
        city: profile.billing_city || profile.city || '',
        state: profile.billing_state || profile.state || '',
        postalCode: profile.billing_zip || profile.postal_code || '',
        country: profile.billing_country || profile.country || 'US',
        phone: profile.phone || '',
      };

      setFormData((prev) => ({
        ...prev,
        shippingAddress,
        billingAddress,
      }));
    }
  }, [user, profile]);

  // Fetch shipping rates when zip code changes
  useEffect(() => {
    const zip = formData.shippingAddress.postalCode;
    const country = formData.shippingAddress.country;

    // Only fetch if we have a valid 5-digit zip and it's different from last checked
    if (zip && zip.length >= 5 && zip !== lastZipChecked && items.length > 0) {
      const fetchRates = async () => {
        setLoadingRates(true);
        try {
          const rates = await shopApi.getShippingRates({
            items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
            destinationZip: zip,
            destinationCountry: country,
          });
          setShippingRates(rates);
          setLastZipChecked(zip);
          // Default to standard if not already set
          if (rates.length > 0 && !rates.find((r) => r.method === selectedShippingMethod)) {
            setSelectedShippingMethod(rates[0].method as 'standard' | 'priority');
          }
        } catch (err) {
          console.error('Error fetching shipping rates:', err);
          // Use default rates if API fails
          setShippingRates([
            { method: 'standard', name: 'USPS Ground Advantage', description: '2-5 business days', price: 6.50, estimatedDays: '2-5 business days' },
            { method: 'priority', name: 'USPS Priority Mail', description: '1-3 business days', price: 10.50, estimatedDays: '1-3 business days' },
          ]);
        } finally {
          setLoadingRates(false);
        }
      };
      fetchRates();
    }
  }, [formData.shippingAddress.postalCode, formData.shippingAddress.country, items, lastZipChecked, selectedShippingMethod]);

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

      // Create payment intent with shipping
      const result = await shopApi.createPaymentIntent({
        items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
        email: formData.email,
        shippingAddress: formData.shippingAddress,
        billingAddress: formData.sameAsShipping ? formData.shippingAddress : formData.billingAddress,
        userId: user?.id,
        shippingMethod: selectedShippingMethod,
        shippingAmount: shippingCost,
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

                {/* Shipping Method Selection */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Truck className="h-5 w-5 mr-2 text-orange-500" />
                    Shipping Method
                  </h3>

                  {loadingRates ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                      <span className="ml-2 text-gray-400">Calculating shipping rates...</span>
                    </div>
                  ) : shippingRates.length === 0 ? (
                    <p className="text-gray-400 text-sm">
                      Enter your ZIP code above to see shipping options
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {shippingRates.map((rate) => (
                        <label
                          key={rate.method}
                          className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedShippingMethod === rate.method
                              ? 'border-orange-500 bg-orange-500/10'
                              : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          <input
                            type="radio"
                            name="shippingMethod"
                            value={rate.method}
                            checked={selectedShippingMethod === rate.method}
                            onChange={() => setSelectedShippingMethod(rate.method)}
                            className="w-4 h-4 text-orange-500 border-slate-600 focus:ring-orange-500 bg-slate-700"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-white font-medium">{rate.name}</span>
                              <span className="text-white font-semibold">${rate.price.toFixed(2)}</span>
                            </div>
                            <p className="text-gray-400 text-sm">{rate.estimatedDays}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 sm:py-4 text-sm sm:text-base bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
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
                      total={orderTotal}
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
                  {loadingRates ? (
                    <span className="text-gray-500">Calculating...</span>
                  ) : shippingCost > 0 ? (
                    <span>${shippingCost.toFixed(2)}</span>
                  ) : (
                    <span className="text-gray-500">Select address</span>
                  )}
                </div>
                {selectedRate && (
                  <div className="flex justify-between text-gray-500 text-sm">
                    <span>{selectedRate.name}</span>
                    <span>{selectedRate.estimatedDays}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400">
                  <span>Tax</span>
                  <span>$0.00</span>
                </div>
              </div>

              <div className="border-t border-slate-700 mt-4 pt-4">
                <div className="flex justify-between text-white">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold">${orderTotal.toFixed(2)}</span>
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
