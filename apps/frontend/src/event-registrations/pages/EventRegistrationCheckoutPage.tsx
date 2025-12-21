import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  User,
  Mail,
  Phone,
  MapPin,
  Car,
  Loader2,
  Lock,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Eye,
  EyeOff,
  Calendar,
  Tag,
  Gift,
  QrCode,
} from 'lucide-react';
import { useAuth } from '@/auth';
import { eventsApi, Event } from '@/events/events.api-client';
import { competitionClassesApi, CompetitionClass } from '@/competition-classes/competition-classes.api-client';
import {
  membershipTypeConfigsApi,
  MembershipTypeConfig,
  MembershipCategory,
} from '@/membership-type-configs';
import { eventRegistrationsApi } from '@/event-registrations/event-registrations.api-client';
import { countries, getStatesForCountry, getStateLabel, getPostalCodeLabel } from '@/utils/countries';
import { PasswordStrengthIndicator } from '@/shared/components/PasswordStrengthIndicator';
import { calculatePasswordStrength, MIN_PASSWORD_STRENGTH } from '@/utils/passwordUtils';

// Check if Stripe is configured (without loading it)
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const isStripeConfigured = !!stripePublishableKey &&
  !stripePublishableKey.includes('YOUR_STRIPE') &&
  stripePublishableKey.startsWith('pk_');

// Lazy load Stripe payment form only when configured
const LazyStripePaymentForm = isStripeConfigured
  ? lazy(() => import('@/event-registrations/components/StripePaymentForm'))
  : null;

interface FormData {
  // Contact Info
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  // Address
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  // Vehicle Info
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleInfo: string;
  // Notes
  notes: string;
}

interface SelectedClass {
  competitionClassId: string;
  format: string;
  className: string;
}

interface OrderData {
  registrationId: string;
  eventTitle: string;
  email: string;
  firstName: string;
  lastName: string;
  classes: SelectedClass[];
  total: number;
  includedMembership: boolean;
  checkInCode?: string;
  qrCodeData?: string;
}

type CheckoutStep = 'info' | 'payment' | 'confirmation';

export default function EventRegistrationCheckoutPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, profile, signUp } = useAuth();

  // Data state
  const [event, setEvent] = useState<Event | null>(null);
  const [availableClasses, setAvailableClasses] = useState<CompetitionClass[]>([]);
  const [membershipOptions, setMembershipOptions] = useState<MembershipTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<CheckoutStep>('info');

  // Selection state
  const [selectedClasses, setSelectedClasses] = useState<SelectedClass[]>([]);
  const [includeMembership, setIncludeMembership] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);

  // Stripe-related state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [creatingPaymentIntent, setCreatingPaymentIntent] = useState(false);

  // Order data saved after successful payment
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  // Account creation state (shown after payment for guests)
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    country: 'US',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleInfo: '',
    notes: '',
  });

  // Compute member status
  const isMember = profile?.membership_status === 'active';

  // Get pricing info
  const memberEntryFee = event?.member_entry_fee ?? 0;
  const nonMemberEntryFee = event?.non_member_entry_fee ?? 0;

  // Calculate pricing
  const pricing = useMemo(() => {
    const selectedMembership = membershipOptions.find(m => m.id === selectedMembershipId);
    const membershipPrice = selectedMembership?.price ?? 0;

    // Use member pricing if already a member OR if purchasing membership
    const useMemberPricing = isMember || includeMembership;
    const perClassFee = useMemberPricing ? memberEntryFee : nonMemberEntryFee;
    const classesSubtotal = selectedClasses.length * perClassFee;
    const membershipCost = includeMembership ? membershipPrice : 0;
    const total = classesSubtotal + membershipCost;

    // Calculate savings from membership
    const nonMemberTotal = selectedClasses.length * nonMemberEntryFee;
    const savings = includeMembership && !isMember ? (nonMemberTotal - classesSubtotal) : 0;

    return {
      perClassFee,
      classesSubtotal,
      membershipCost,
      total,
      savings,
      isMemberPricing: useMemberPricing,
    };
  }, [selectedClasses.length, isMember, includeMembership, selectedMembershipId, membershipOptions, memberEntryFee, nonMemberEntryFee]);

  // Group classes by format
  const classesByFormat = useMemo(() => {
    const grouped: Record<string, CompetitionClass[]> = {};
    for (const cls of availableClasses) {
      if (!grouped[cls.format]) {
        grouped[cls.format] = [];
      }
      grouped[cls.format].push(cls);
    }
    // Sort each group by display order
    for (const format of Object.keys(grouped)) {
      grouped[format].sort((a, b) => a.display_order - b.display_order);
    }
    return grouped;
  }, [availableClasses]);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) {
        setError('No event selected');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch event details
        const eventData = await eventsApi.getById(eventId);
        setEvent(eventData);

        // Fetch competition classes for the event's season
        if (eventData.season_id) {
          const classes = await competitionClassesApi.getBySeason(eventData.season_id);
          // Filter to only active classes and those matching event formats
          const eventFormats = eventData.formats || [];
          const filteredClasses = classes.filter(c =>
            c.is_active && (eventFormats.length === 0 || eventFormats.includes(c.format))
          );
          setAvailableClasses(filteredClasses);
        }

        // Fetch competitor membership options for upsell
        const memberships = await membershipTypeConfigsApi.getByCategory(MembershipCategory.COMPETITOR);
        const activeMemberships = memberships.filter(m => m.isActive && m.showOnPublicSite);
        setMembershipOptions(activeMemberships);
        if (activeMemberships.length > 0) {
          setSelectedMembershipId(activeMemberships[0].id);
        }

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
            country: profile.country || 'US',
          }));
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId, profile]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleClassSelection = (cls: CompetitionClass) => {
    setSelectedClasses(prev => {
      const exists = prev.find(c => c.competitionClassId === cls.id);
      if (exists) {
        return prev.filter(c => c.competitionClassId !== cls.id);
      }
      return [...prev, {
        competitionClassId: cls.id,
        format: cls.format,
        className: cls.name,
      }];
    });
  };

  const isClassSelected = (classId: string) => {
    return selectedClasses.some(c => c.competitionClassId === classId);
  };

  const validateInfoStep = (): boolean => {
    // Email required
    if (!formData.email) {
      setError('Email address is required');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!formData.firstName || !formData.lastName) {
      setError('First and last name are required');
      return false;
    }

    if (selectedClasses.length === 0) {
      setError('Please select at least one class to register for');
      return false;
    }

    setError(null);
    return true;
  };

  const handleContinueToPayment = async () => {
    if (!validateInfoStep() || !event) return;

    setCreatingPaymentIntent(true);
    setError(null);

    try {
      const email = user ? (profile?.email || formData.email) : formData.email;

      // Create Payment Intent via backend (with testMode if Stripe not configured)
      const result = await eventRegistrationsApi.createPaymentIntent({
        eventId: event.id,
        email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        postalCode: formData.postalCode || undefined,
        country: formData.country || 'US',
        vehicleYear: formData.vehicleYear || undefined,
        vehicleMake: formData.vehicleMake || undefined,
        vehicleModel: formData.vehicleModel || undefined,
        vehicleInfo: formData.vehicleInfo || undefined,
        notes: formData.notes || undefined,
        classes: selectedClasses,
        includeMembership: includeMembership && !isMember,
        membershipTypeConfigId: includeMembership && !isMember ? selectedMembershipId || undefined : undefined,
        userId: user?.id,
        isMember,
        testMode: !isStripeConfigured,
      });

      setClientSecret(result.clientSecret);
      setRegistrationId(result.registrationId);
      setStep('payment');
    } catch (err) {
      console.error('Error creating payment intent:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize payment. Please try again.');
    } finally {
      setCreatingPaymentIntent(false);
    }
  };

  const handlePaymentSuccess = async (_paymentIntentId: string) => {
    if (!event || !registrationId) return;

    const email = user ? (profile?.email || formData.email) : formData.email;

    try {
      // Fetch the QR code data
      const qrData = await eventRegistrationsApi.getQrCode(registrationId);

      // Save order data for confirmation page
      setOrderData({
        registrationId,
        eventTitle: event.title,
        email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        classes: selectedClasses,
        total: pricing.total,
        includedMembership: includeMembership && !isMember,
        checkInCode: qrData.checkInCode,
        qrCodeData: qrData.qrCodeData,
      });
    } catch (err) {
      console.error('Failed to fetch QR code:', err);
      // Still proceed to confirmation even if QR fetch fails
      setOrderData({
        registrationId,
        eventTitle: event.title,
        email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        classes: selectedClasses,
        total: pricing.total,
        includedMembership: includeMembership && !isMember,
      });
    }

    // Proceed to confirmation
    setStep('confirmation');

    // Show account creation prompt for guests
    if (!user) {
      setShowAccountCreation(true);
    }
  };

  const handleCreateAccount = async () => {
    if (!orderData) return;

    // Validate password strength
    const strength = calculatePasswordStrength(accountPassword);
    if (strength.score < MIN_PASSWORD_STRENGTH) {
      setAccountError(`Password is not strong enough. Current strength: ${strength.score}. Minimum required: ${MIN_PASSWORD_STRENGTH}`);
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

      // Link the registration to the new user
      if (signUpData?.user?.id) {
        try {
          await eventRegistrationsApi.linkToUser(orderData.email, signUpData.user.id);
        } catch (linkError) {
          console.error('Failed to link registration:', linkError);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            to="/events"
            className="inline-flex items-center text-orange-500 hover:text-orange-400"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  if (!event) return null;

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
              <h1 className="text-3xl font-bold text-white mb-4">Registration Complete!</h1>
              <p className="text-gray-400">
                You're registered for {event.title}. Show the QR code below at check-in.
              </p>
            </div>

            {/* QR Code */}
            {orderData?.qrCodeData && (
              <div className="bg-white rounded-xl p-6 mb-8 text-center">
                <img
                  src={orderData.qrCodeData}
                  alt="Check-in QR Code"
                  className="mx-auto mb-4"
                  style={{ maxWidth: '200px' }}
                />
                <div className="flex items-center justify-center text-slate-600">
                  <QrCode className="h-5 w-5 mr-2" />
                  <span className="font-mono font-semibold">{orderData.checkInCode}</span>
                </div>
              </div>
            )}

            {/* Order Details */}
            <div className="bg-slate-700 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Registration Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Event</span>
                  <span className="text-white">{event.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date</span>
                  <span className="text-white">
                    {new Date(event.event_date).toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Location</span>
                  <span className="text-white text-right">
                    {event.venue_name}<br />
                    <span className="text-sm text-gray-400">
                      {event.venue_city}, {event.venue_state}
                    </span>
                  </span>
                </div>
                <div className="border-t border-slate-600 pt-3">
                  <span className="text-gray-400 block mb-2">Classes Registered</span>
                  <ul className="space-y-1">
                    {orderData?.classes.map((cls, idx) => (
                      <li key={idx} className="text-white text-sm">
                        <span className="text-orange-400">{cls.format}</span> - {cls.className}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex justify-between border-t border-slate-600 pt-3">
                  <span className="text-gray-400">Amount Paid</span>
                  <span className="text-white">${orderData?.total.toFixed(2)}</span>
                </div>
                {orderData?.includedMembership && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Membership</span>
                    <span className="text-green-400">Included</span>
                  </div>
                )}
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
                      Create an account to view your registrations, access your QR code anytime, and manage your profile.
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
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Enter a strong password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {accountPassword && (
                      <div className="mt-2">
                        <PasswordStrengthIndicator
                          password={accountPassword}
                          showFeedback={true}
                          showScore={true}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Minimum strength required: {MIN_PASSWORD_STRENGTH}
                        </p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={accountConfirmPassword}
                        onChange={(e) => setAccountConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {accountConfirmPassword && accountPassword !== accountConfirmPassword && (
                      <p className="mt-1 text-xs text-red-400">Passwords do not match</p>
                    )}
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
                      Your account has been created and your registration is linked.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Skipped Account Creation Notice */}
            {!showAccountCreation && !accountCreated && !user && (
              <div className="bg-slate-700/50 rounded-xl p-6 mb-8">
                <p className="text-gray-400 text-sm">
                  A confirmation email will be sent to <span className="text-white">{orderData?.email}</span>.
                  You can create an account later using this email to access your registration.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {(user || accountCreated) ? (
                <>
                  <button
                    onClick={() => navigate('/my-registrations')}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    View My Registrations
                  </button>
                  <button
                    onClick={() => navigate('/events')}
                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Browse More Events
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/events')}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Browse More Events
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
          to={`/events/${eventId}`}
          className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Event
        </Link>

        {/* Member Pricing Banner */}
        {!isMember && !user && (
          <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center">
                <Tag className="h-5 w-5 text-orange-500 mr-3" />
                <div>
                  <span className="text-white font-semibold">Members save ${(nonMemberEntryFee - memberEntryFee).toFixed(2)} per class!</span>
                  <span className="text-gray-400 ml-2">Log in for member pricing.</span>
                </div>
              </div>
              <Link
                to="/login"
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Log In
              </Link>
            </div>
          </div>
        )}

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
                {step === 'info' ? 'Registration Details' : 'Payment Details'}
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
                          We'll send your registration confirmation and QR code to this email
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

                  {/* Address (Optional) */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <MapPin className="h-5 w-5 mr-2 text-orange-500" />
                      Address <span className="text-gray-400 text-sm font-normal ml-2">(Optional)</span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Street Address
                        </label>
                        <input
                          type="text"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="123 Main Street"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Country
                        </label>
                        <select
                          name="country"
                          value={formData.country}
                          onChange={(e) => {
                            handleInputChange(e);
                            setFormData(prev => ({ ...prev, country: e.target.value, state: '' }));
                          }}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          {countries.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            City
                          </label>
                          <input
                            type="text"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            {getStateLabel(formData.country)}
                          </label>
                          {getStatesForCountry(formData.country).length > 0 ? (
                            <select
                              name="state"
                              value={formData.state}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                              <option value="">Select</option>
                              {getStatesForCountry(formData.country).map((state) => (
                                <option key={state.code} value={state.code}>
                                  {state.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              name="state"
                              value={formData.state}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder={getStateLabel(formData.country)}
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            {getPostalCodeLabel(formData.country)}
                          </label>
                          <input
                            type="text"
                            name="postalCode"
                            value={formData.postalCode}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder={formData.country === 'US' ? '12345' : 'Postal code'}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Information */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <Car className="h-5 w-5 mr-2 text-orange-500" />
                      Vehicle Information
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Year
                          </label>
                          <input
                            type="text"
                            name="vehicleYear"
                            value={formData.vehicleYear}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="2024"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Make
                          </label>
                          <input
                            type="text"
                            name="vehicleMake"
                            value={formData.vehicleMake}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Honda"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Model
                          </label>
                          <input
                            type="text"
                            name="vehicleModel"
                            value={formData.vehicleModel}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Civic"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Additional Vehicle Info
                        </label>
                        <input
                          type="text"
                          name="vehicleInfo"
                          value={formData.vehicleInfo}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="Color, modifications, etc."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Class Selection */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <Tag className="h-5 w-5 mr-2 text-orange-500" />
                      Select Classes *
                    </h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Choose the classes you want to compete in.
                      {pricing.isMemberPricing ? (
                        <span className="text-green-400"> Member pricing: ${memberEntryFee.toFixed(2)}/class</span>
                      ) : (
                        <span> Non-member: ${nonMemberEntryFee.toFixed(2)}/class</span>
                      )}
                    </p>

                    {Object.keys(classesByFormat).length === 0 ? (
                      <div className="text-center py-8 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
                        <p className="text-amber-400 font-medium mb-2">No classes available for this event</p>
                        <p className="text-gray-400 text-sm">
                          {!event?.season_id
                            ? 'This event has not been assigned to a competition season. Please contact the event director.'
                            : 'No competition classes are configured for this season.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(classesByFormat).map(([format, classes]) => (
                          <div key={format}>
                            <h4 className="text-sm font-semibold text-orange-400 uppercase tracking-wide mb-3">
                              {format}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {classes.map((cls) => (
                                <label
                                  key={cls.id}
                                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                    isClassSelected(cls.id)
                                      ? 'bg-orange-500/20 border-orange-500'
                                      : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isClassSelected(cls.id)}
                                    onChange={() => toggleClassSelection(cls)}
                                    className="sr-only"
                                  />
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                                    isClassSelected(cls.id)
                                      ? 'bg-orange-500 border-orange-500'
                                      : 'border-slate-500'
                                  }`}>
                                    {isClassSelected(cls.id) && (
                                      <Check className="h-3 w-3 text-white" />
                                    )}
                                  </div>
                                  <span className="text-white">{cls.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Entry Fee Warning */}
                  {memberEntryFee === 0 && nonMemberEntryFee === 0 && Object.keys(classesByFormat).length > 0 && (
                    <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-amber-400 font-medium">Entry fees not configured</p>
                          <p className="text-gray-400 text-sm mt-1">
                            This event does not have entry fees set. Please contact the event director if you believe this is an error.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Membership Upsell */}
                  {!isMember && membershipOptions.length > 0 && (
                    <div className="mb-8">
                      <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6">
                        <div className="flex items-start mb-4">
                          <Gift className="h-6 w-6 text-green-500 mr-3 flex-shrink-0 mt-1" />
                          <div>
                            <h3 className="text-lg font-semibold text-white">Become a Member & Save!</h3>
                            <p className="text-gray-400 text-sm mt-1">
                              Add a membership to your order and get member pricing on this event plus all future events.
                              {nonMemberEntryFee > memberEntryFee && (
                                <span className="text-green-400"> Save ${(nonMemberEntryFee - memberEntryFee).toFixed(2)} per class!</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <label className="flex items-center p-4 bg-slate-800/50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeMembership}
                            onChange={(e) => setIncludeMembership(e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center mr-4 ${
                            includeMembership
                              ? 'bg-green-500 border-green-500'
                              : 'border-slate-500'
                          }`}>
                            {includeMembership && (
                              <Check className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-white font-medium">
                                Add Annual Membership
                              </span>
                              <span className="text-green-400 font-semibold">
                                +${membershipOptions[0]?.price.toFixed(2)}
                              </span>
                            </div>
                            {includeMembership && selectedClasses.length > 0 && pricing.savings > 0 && (
                              <p className="text-green-400 text-sm mt-1">
                                You'll save ${pricing.savings.toFixed(2)} on this event alone!
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Notes <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Any additional information or special requests..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creatingPaymentIntent || selectedClasses.length === 0}
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

              {step === 'payment' && clientSecret && isStripeConfigured && LazyStripePaymentForm && (
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                  </div>
                }>
                  <LazyStripePaymentForm
                    clientSecret={clientSecret}
                    total={pricing.total}
                    formData={formData}
                    onSuccess={handlePaymentSuccess}
                    onBack={() => setStep('info')}
                  />
                </Suspense>
              )}

              {/* Test Mode - When Stripe is not configured */}
              {step === 'payment' && !isStripeConfigured && (
                <div className="space-y-6">
                  <div className="p-4 bg-amber-500/10 border border-amber-500 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-500 font-medium">Test Mode</p>
                        <p className="text-amber-400 text-sm mt-1">
                          Stripe is not configured. You can skip payment to test the checkout flow.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Email</span>
                        <span className="text-white">{formData.email || profile?.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Name</span>
                        <span className="text-white">{formData.firstName} {formData.lastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Classes</span>
                        <span className="text-white">{selectedClasses.length} selected</span>
                      </div>
                      {includeMembership && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Membership</span>
                          <span className="text-green-400">Included</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-600 pt-2 mt-2">
                        <span className="text-gray-400">Total</span>
                        <span className="text-orange-500 font-semibold">${pricing.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep('info')}
                      className="px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePaymentSuccess('test-payment-' + Date.now())}
                      className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                    >
                      Skip Payment (Test Mode)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-2xl p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>

              {/* Event Info */}
              <div className="border-b border-slate-700 pb-4 mb-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-sm text-orange-400 uppercase tracking-wide">
                      Event Registration
                    </span>
                    <h4 className="text-white font-semibold">{event.title}</h4>
                  </div>
                </div>
                <div className="flex items-center text-gray-400 text-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  {new Date(event.event_date).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              {/* Selected Classes */}
              {selectedClasses.length > 0 && (
                <div className="border-b border-slate-700 pb-4 mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Classes ({selectedClasses.length})</h4>
                  <ul className="space-y-1">
                    {selectedClasses.map((cls, idx) => (
                      <li key={idx} className="flex items-start text-sm">
                        <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-400">
                          <span className="text-orange-400">{cls.format}</span> - {cls.className}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    {selectedClasses.length} {selectedClasses.length === 1 ? 'class' : 'classes'} × ${pricing.perClassFee.toFixed(2)}
                  </span>
                  <span className="text-white">${pricing.classesSubtotal.toFixed(2)}</span>
                </div>
                {pricing.isMemberPricing && !isMember && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">Member discount applied</span>
                    <span className="text-green-400">-${((nonMemberEntryFee - memberEntryFee) * selectedClasses.length).toFixed(2)}</span>
                  </div>
                )}
                {includeMembership && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Annual Membership</span>
                    <span className="text-white">${pricing.membershipCost.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-700 pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-white">Total</span>
                  <span className="text-lg font-bold text-orange-500">
                    ${pricing.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Member vs Non-Member Price Comparison */}
              {!isMember && !includeMembership && selectedClasses.length > 0 && (
                <div className="mt-4 p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-sm text-gray-400">
                    Members pay only <span className="text-green-400">${(selectedClasses.length * memberEntryFee).toFixed(2)}</span> for these classes.
                  </p>
                </div>
              )}

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
