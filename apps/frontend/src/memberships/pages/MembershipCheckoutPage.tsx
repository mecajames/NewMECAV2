import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Loader2,
  Lock,
  AlertCircle,
  CheckCircle,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/auth';
import {
  membershipTypeConfigsApi,
  MembershipTypeConfig,
  MembershipCategory,
} from '@/membership-type-configs';
import { membershipsApi } from '@/memberships';

// Check if Stripe is configured without loading the Stripe library
const isStripeConfigured = !!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// Lazy load Stripe components only when needed
const StripePaymentWrapper = lazy(() => import('../components/StripePaymentWrapper'));

// US States for dropdown
const US_STATES = [
  { value: '', label: 'Select State' },
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

interface FormData {
  // Contact Info
  email: string;
  // Personal Info
  firstName: string;
  lastName: string;
  phone: string;
  // Address
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  // Team Info (for team memberships)
  teamName: string;
  teamDescription: string;
  // Business Info (for retailer memberships)
  businessName: string;
  businessWebsite: string;
}

interface OrderData {
  membershipId: string;
  membershipName: string;
  category: MembershipCategory;
  price: number;
  email: string;
  firstName: string;
  lastName: string;
}

type CheckoutStep = 'info' | 'payment' | 'confirmation';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function MembershipCheckoutPage() {
  const { membershipId } = useParams<{ membershipId: string }>();
  const navigate = useNavigate();
  const { user, profile, signUp } = useAuth();

  const [membership, setMembership] = useState<MembershipTypeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<CheckoutStep>('info');

  // Stripe-related state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creatingPaymentIntent, setCreatingPaymentIntent] = useState(false);

  // Order data saved after successful payment
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  // Account creation state (shown after payment for guests)
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
  const [accountError, setAccountError] = useState<string | null>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
    teamName: '',
    teamDescription: '',
    businessName: '',
    businessWebsite: '',
  });

  useEffect(() => {
    const fetchMembership = async () => {
      if (!membershipId) {
        setError('No membership selected');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await membershipTypeConfigsApi.getById(membershipId);
        setMembership(data);

        // Pre-fill form from user profile if logged in
        if (profile) {
          setFormData((prev) => ({
            ...prev,
            email: profile.email || '',
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            phone: profile.phone || '',
            address: profile.address || '',
            city: profile.city || '',
            state: profile.state || '',
            postalCode: profile.postal_code || '',
            country: profile.country || 'USA',
          }));
        }
      } catch (err) {
        console.error('Error fetching membership:', err);
        setError('Failed to load membership details');
      } finally {
        setLoading(false);
      }
    };

    fetchMembership();
  }, [membershipId, profile]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateInfoStep = (): boolean => {
    // Email required for guests
    if (!user && !formData.email) {
      setError('Email address is required');
      return false;
    }

    // Validate email format
    if (!user && formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return false;
      }
    }

    if (!formData.firstName || !formData.lastName) {
      setError('First and last name are required');
      return false;
    }

    if (!formData.address || !formData.city || !formData.state || !formData.postalCode) {
      setError('Complete address is required');
      return false;
    }

    // Team-specific validation
    if (membership?.category === MembershipCategory.TEAM && !formData.teamName) {
      setError('Team name is required');
      return false;
    }

    // Retailer-specific validation
    if (membership?.category === MembershipCategory.RETAIL && !formData.businessName) {
      setError('Business name is required');
      return false;
    }

    setError(null);
    return true;
  };

  const handleContinueToPayment = async () => {
    if (!validateInfoStep() || !membership) return;

    setCreatingPaymentIntent(true);
    setError(null);

    try {
      const email = user ? (profile?.email || formData.email) : formData.email;

      // Create Payment Intent via backend
      const response = await fetch(`${API_URL}/api/stripe/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          membershipTypeConfigId: membership.id,
          email,
          userId: user?.id,
          billingFirstName: formData.firstName,
          billingLastName: formData.lastName,
          billingPhone: formData.phone || undefined,
          billingAddress: formData.address,
          billingCity: formData.city,
          billingState: formData.state,
          billingPostalCode: formData.postalCode,
          billingCountry: formData.country || 'USA',
          teamName: formData.teamName || undefined,
          teamDescription: formData.teamDescription || undefined,
          businessName: formData.businessName || undefined,
          businessWebsite: formData.businessWebsite || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initialize payment');
      }

      const { clientSecret: secret } = await response.json();
      setClientSecret(secret);
      setStep('payment');
    } catch (err) {
      console.error('Error creating payment intent:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize payment. Please try again.');
    } finally {
      setCreatingPaymentIntent(false);
    }
  };

  const handlePaymentSuccess = async (_paymentIntentId: string) => {
    if (!membership) return;

    const email = user ? (profile?.email || formData.email) : formData.email;

    // Save order data for confirmation page
    setOrderData({
      membershipId: membership.id,
      membershipName: membership.name,
      category: membership.category,
      price: membership.price,
      email,
      firstName: formData.firstName,
      lastName: formData.lastName,
    });

    // Proceed to confirmation
    setStep('confirmation');

    // Show account creation prompt for guests
    if (!user) {
      setShowAccountCreation(true);
    }
  };

  const handleCreateAccount = async () => {
    if (!orderData) return;

    // Validate passwords
    if (accountPassword.length < 6) {
      setAccountError('Password must be at least 6 characters');
      return;
    }
    if (accountPassword !== accountConfirmPassword) {
      setAccountError('Passwords do not match');
      return;
    }

    setCreatingAccount(true);
    setAccountError(null);

    try {
      // Create the account
      const { error, data: signUpData } = await signUp(
        orderData.email,
        accountPassword,
        orderData.firstName,
        orderData.lastName
      );

      if (error) {
        setAccountError(error.message || 'Failed to create account');
        return;
      }

      // Link the membership to the new user
      if (signUpData?.user?.id) {
        try {
          await membershipsApi.linkMembershipsToUser({
            email: orderData.email,
            userId: signUpData.user.id,
          });
        } catch (linkError) {
          console.error('Failed to link membership:', linkError);
          // Don't fail the account creation if linking fails
        }
      }

      setAccountCreated(true);
      setShowAccountCreation(false);
    } catch (err) {
      console.error('Account creation error:', err);
      setAccountError('Failed to create account. Please try again.');
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleSkipAccountCreation = () => {
    setShowAccountCreation(false);
  };

  const getCategoryLabel = (category: MembershipCategory): string => {
    switch (category) {
      case MembershipCategory.COMPETITOR:
        return 'Competitor';
      case MembershipCategory.TEAM:
        return 'Team';
      case MembershipCategory.RETAIL:
        return 'Retailer';
      default:
        return category;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error && !membership) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            to="/membership"
            className="inline-flex items-center text-orange-500 hover:text-orange-400"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Memberships
          </Link>
        </div>
      </div>
    );
  }

  if (!membership) return null;

  // Confirmation step
  if (step === 'confirmation') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-slate-800 rounded-2xl p-8">
            {/* Success Message */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-4">Payment Successful!</h1>
              <p className="text-gray-400">
                Thank you for your purchase. Your {membership.name} is now active.
              </p>
            </div>

            {/* Order Details */}
            <div className="bg-slate-700 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Order Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Membership Type</span>
                  <span className="text-white">{membership.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Category</span>
                  <span className="text-white">{getCategoryLabel(membership.category)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount Paid</span>
                  <span className="text-white">${membership.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Valid Until</span>
                  <span className="text-white">
                    {new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                  </span>
                </div>
                {orderData && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email</span>
                    <span className="text-white">{orderData.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Account Creation Section (for guests) */}
            {showAccountCreation && !accountCreated && (
              <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-xl p-6 mb-8">
                <div className="flex items-start mb-4">
                  <UserPlus className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Create Your Account</h3>
                    <p className="text-gray-400 text-sm mt-1">
                      Create an account to access your membership, track events, and manage your profile.
                    </p>
                  </div>
                </div>

                {accountError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg">
                    <p className="text-red-500 text-sm">{accountError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={orderData?.email || ''}
                      disabled
                      className="w-full px-4 py-3 bg-slate-600 border border-slate-500 rounded-lg text-gray-300 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Create Password
                    </label>
                    <input
                      type="password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="••••••••"
                      minLength={6}
                    />
                    <p className="mt-1 text-xs text-gray-400">Must be at least 6 characters</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={accountConfirmPassword}
                      onChange={(e) => setAccountConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateAccount}
                      disabled={creatingAccount}
                      className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {creatingAccount ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Creating Account...
                        </span>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                    <button
                      onClick={handleSkipAccountCreation}
                      className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Account Created Success */}
            {accountCreated && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-8">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Account Created!</h3>
                    <p className="text-gray-400 text-sm">
                      Your account has been created and your membership is linked.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Skipped Account Creation Notice */}
            {!showAccountCreation && !accountCreated && !user && (
              <div className="bg-slate-700/50 rounded-xl p-6 mb-8">
                <p className="text-gray-400 text-sm">
                  A confirmation email has been sent to <span className="text-white">{orderData?.email}</span>.
                  You can create an account later using this email to access your membership.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {(user || accountCreated) ? (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/events')}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Browse Events
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/events')}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Browse Events
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Return to Home
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Back button */}
        <Link
          to="/membership"
          className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Memberships
        </Link>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step === 'info' ? 'bg-orange-500' : 'bg-green-500'
              }`}
            >
              {step === 'info' ? (
                <span className="text-white font-semibold">1</span>
              ) : (
                <Check className="h-5 w-5 text-white" />
              )}
            </div>
            <div
              className={`w-24 h-1 ${step === 'payment' ? 'bg-orange-500' : 'bg-slate-600'}`}
            />
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step === 'payment' ? 'bg-orange-500' : 'bg-slate-600'
              }`}
            >
              <span className="text-white font-semibold">2</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-6">
                {step === 'info' ? 'Your Information' : 'Payment Details'}
              </h2>

              {step === 'info' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleContinueToPayment();
                  }}
                >
                  {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
                      <p className="text-red-500 text-sm">{error}</p>
                    </div>
                  )}

                  {/* Email (for guests) */}
                  {!user && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Mail className="h-5 w-5 mr-2 text-orange-500" />
                        Contact Information
                      </h3>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="you@example.com"
                            required
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-400">
                          We'll send your membership confirmation to this email
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Personal Information */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2 text-orange-500" />
                      Personal Information
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            First Name *
                          </label>
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="John"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Doe"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-orange-500" />
                      Address
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Street Address *
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="123 Main Street"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            City *
                          </label>
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="City"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            State *
                          </label>
                          <select
                            name="state"
                            value={formData.state}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            required
                          >
                            {US_STATES.map((state) => (
                              <option key={state.value} value={state.value}>
                                {state.value || 'Select'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            ZIP Code *
                          </label>
                          <input
                            type="text"
                            name="postalCode"
                            value={formData.postalCode}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="12345"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Team Information (for team memberships) */}
                  {membership.category === MembershipCategory.TEAM && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Building className="h-5 w-5 mr-2 text-orange-500" />
                        Team Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Team Name *
                          </label>
                          <input
                            type="text"
                            name="teamName"
                            value={formData.teamName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Your Team Name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Team Description
                          </label>
                          <textarea
                            name="teamDescription"
                            value={formData.teamDescription}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Tell us about your team..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Business Information (for retailer memberships) */}
                  {membership.category === MembershipCategory.RETAIL && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Building className="h-5 w-5 mr-2 text-orange-500" />
                        Business Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Business Name *
                          </label>
                          <input
                            type="text"
                            name="businessName"
                            value={formData.businessName}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Your Business Name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Business Website
                          </label>
                          <input
                            type="url"
                            name="businessWebsite"
                            value={formData.businessWebsite}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="https://www.yourbusiness.com"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={creatingPaymentIntent}
                    className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingPaymentIntent ? (
                      <span className="flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Initializing Payment...
                      </span>
                    ) : (
                      'Continue to Payment'
                    )}
                  </button>
                </form>
              )}

              {step === 'payment' && clientSecret && isStripeConfigured && (
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                    </div>
                  }
                >
                  <StripePaymentWrapper
                    clientSecret={clientSecret}
                    membership={membership}
                    formData={formData}
                    onSuccess={handlePaymentSuccess}
                    onBack={() => setStep('info')}
                  />
                </Suspense>
              )}

              {step === 'payment' && !isStripeConfigured && (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Payment Not Available</h3>
                  <p className="text-gray-400 mb-6">
                    Online payments are not currently configured. Please contact support for alternative payment options.
                  </p>
                  <button
                    onClick={() => setStep('info')}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-2xl p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>

              <div className="border-b border-slate-700 pb-4 mb-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-sm text-orange-400 uppercase tracking-wide">
                      {getCategoryLabel(membership.category)}
                    </span>
                    <h4 className="text-white font-semibold">{membership.name}</h4>
                  </div>
                </div>
                <p className="text-gray-400 text-sm">{membership.description}</p>
              </div>

              {membership.benefits && membership.benefits.length > 0 && (
                <div className="border-b border-slate-700 pb-4 mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Includes:</h4>
                  <ul className="space-y-2">
                    {membership.benefits.slice(0, 4).map((benefit, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-400">{benefit}</span>
                      </li>
                    ))}
                    {membership.benefits.length > 4 && (
                      <li className="text-sm text-gray-500">
                        +{membership.benefits.length - 4} more benefits
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Membership</span>
                  <span className="text-white">${membership.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white">12 months</span>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-white">Total</span>
                  <span className="text-lg font-bold text-orange-500">
                    ${membership.price.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-slate-700/50 rounded-lg">
                <div className="flex items-center text-sm text-gray-400">
                  <Lock className="h-4 w-4 mr-2" />
                  <span>Secure checkout powered by Stripe</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
