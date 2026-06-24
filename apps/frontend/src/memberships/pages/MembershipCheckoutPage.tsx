import { useState, useEffect, Suspense } from 'react';
import { lazyWithReload as lazy } from '@/shared/lazyWithReload';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import axios from '@/lib/axios';
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
  Eye,
  EyeOff,
  Newspaper,
} from 'lucide-react';
import { useAuth } from '@/auth/contexts/AuthContext';
import { useTaxRate } from '@/hooks/useTaxRate';
import { CouponInput } from '@/shared/components/CouponInput';
import { newsletterApi } from '@/newsletter';
import {
  membershipTypeConfigsApi,
  MembershipTypeConfig,
  MembershipCategory,
} from '@/membership-type-configs';
// import { membershipsApi } from '../memberships.api-client';
import { calculatePasswordStrength, MIN_PASSWORD_STRENGTH } from '@/utils/passwordUtils';
import { PasswordStrengthIndicator } from '@/shared/components/PasswordStrengthIndicator';
import { countries, getStatesForCountry, getStateLabel, getPostalCodeLabel } from '@/utils/countries';
import { PaymentMethodSelector, SelectedPaymentMethod } from '@/shared/components/PaymentMethodSelector';
import { PayPalPaymentButton } from '@/shared/components/PayPalPaymentButton';
import { paypalApi } from '@/paypal/paypal.api-client';
import { checkAccountExists, claimAccount } from '@/auth/auth.api-client';

import { isStripeConfigured } from '@/lib/stripe';

// Lazy load Stripe payment form only when configured
const LazyMembershipStripePaymentForm = isStripeConfigured
  ? lazy(() => import('@/memberships/components/MembershipStripePaymentForm'))
  : null;

/**
 * Check if team name contains any variation of "team"
 * Includes: team, Team, TEAM, t3@m, T3AM, maet (backwards), spaced variations
 */
function containsTeamWord(name: string): boolean {
  if (!name) return false;

  const normalized = name.toLowerCase().trim();

  // Direct match for "team"
  if (normalized.includes('team')) return true;

  // Backwards "team" -> "maet"
  if (normalized.includes('maet')) return true;

  // Leet speak variations: t3@m, t3am, te@m, t34m, etc.
  const leetNormalized = normalized
    .replace(/3/g, 'e')
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/\$/g, 's')
    .replace(/7/g, 't');

  if (leetNormalized.includes('team') || leetNormalized.includes('maet')) return true;

  // Check for spaced out variations: t e a m, t-e-a-m, t.e.a.m
  const noSpaces = normalized.replace(/[\s\-._]/g, '');
  const noSpacesLeet = noSpaces
    .replace(/3/g, 'e')
    .replace(/@/g, 'a')
    .replace(/4/g, 'a');

  if (noSpacesLeet.includes('team') || noSpacesLeet.includes('maet')) return true;

  return false;
}

/**
 * Pick the current active plan that best replaces a retired (deactivated) one,
 * so a member whose checkout link points at an old plan is routed to today's
 * equivalent instead of dead-ending at a 400. Narrows by category, then the
 * same manufacturer tier, then matching team-inclusion, then closest price.
 * Returns null when there is no active plan in the category to fall back to.
 */
function pickEquivalentActivePlan(
  retired: MembershipTypeConfig,
  candidates: MembershipTypeConfig[],
): MembershipTypeConfig | null {
  // Same category, standalone-purchasable (exclude upgrade-only add-ons), active.
  let pool = candidates.filter(
    (c) => c.isActive && !c.isUpgradeOnly && c.category === retired.category && c.id !== retired.id,
  );
  if (pool.length === 0) return null;

  // Prefer the same manufacturer tier when the retired plan had one
  // (undefined === undefined for the non-tiered categories).
  const sameTier = pool.filter((c) => (c.tier ?? null) === (retired.tier ?? null));
  if (sameTier.length > 0) pool = sameTier;

  // Prefer matching team-inclusion so "Competitor w/Team" maps to a w/Team plan
  // rather than a plain Competitor plan.
  const sameTeam = pool.filter((c) => !!c.includesTeam === !!retired.includesTeam);
  if (sameTeam.length > 0) pool = sameTeam;

  // Closest price wins; tie-break by display order then name for a stable pick.
  return [...pool].sort((a, b) => {
    const priceDiff = Math.abs(a.price - retired.price) - Math.abs(b.price - retired.price);
    if (priceDiff !== 0) return priceDiff;
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.name.localeCompare(b.name);
  })[0];
}

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
  // Competitor Info (for competitor memberships)
  competitorName: string;
  vehicleLicensePlate: string;
  vehicleColor: string;
  vehicleMake: string;
  vehicleModel: string;
  // Team Add-on (for competitor memberships)
  hasTeamAddon: boolean;
  // Team Info (for team memberships or competitor with team add-on)
  teamName: string;
  teamDescription: string;
  // Business Info (for retailer/manufacturer memberships)
  businessName: string;
  businessWebsite: string;
  // Auto-renewal option
  enableAutoRenewal: boolean;
  // Newsletter signup
  subscribeNewsletter: boolean;
  // Required acknowledgement (must be checked to continue)
  agreeToTerms: boolean;
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


export default function MembershipCheckoutPage() {
  const { membershipId } = useParams<{ membershipId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // Set when we auto-route off a retired plan (see fetchMembership) so we can
  // explain the plan-name change instead of silently swapping it under them.
  const routedFromRetiredPlan = (location.state as { retiredPlanName?: string } | null)?.retiredPlanName;
  const { user, profile, signUp, signIn } = useAuth();

  const { taxRate, calculateTax } = useTaxRate();
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<SelectedPaymentMethod>('stripe');
  const [membership, setMembership] = useState<MembershipTypeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<CheckoutStep>('info');

  // Stripe-related state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creatingPaymentIntent, setCreatingPaymentIntent] = useState(false);

  // Order data saved after successful payment
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  // Account creation state (for guest checkout — account created before payment)
  const [accountCreated, setAccountCreated] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Classification of the entered guest email against existing accounts:
  //   'active'    — account with a CURRENT active membership → they can log in,
  //                 so we send them to log in and renew from My MECA (no password
  //                 set inline — that would be account takeover on a live account)
  //   'renewable' — EXPIRED account (or one with no current membership) → they
  //                 CANNOT log in (the expired-login gate signs them out), so we
  //                 renew inline and SET A NEW PASSWORD on their existing account.
  //                 We never email a reset link — an expired account can't reset.
  //   'blocked'   — account that cannot log in (banned) → contact support
  const [existingAccount, setExistingAccount] = useState<'active' | 'renewable' | 'blocked' | null>(null);

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
    // Competitor info
    competitorName: '',
    vehicleLicensePlate: '',
    vehicleColor: '',
    vehicleMake: '',
    vehicleModel: '',
    // Team add-on
    hasTeamAddon: false,
    teamName: '',
    teamDescription: '',
    businessName: '',
    businessWebsite: '',
    // Auto-renewal (subscription)
    enableAutoRenewal: false,
    // Newsletter signup
    subscribeNewsletter: true, // Default to checked
    // Required acknowledgement — must be explicitly checked
    agreeToTerms: false,
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

        // A retired (deactivated) plan still loads via getById — admins need to
        // view inactive configs — but create-payment-intent rejects it with a
        // 400 "This membership type is not available", which surfaced as the
        // cryptic "Request failed with status code 400" renewal tickets. Route
        // the member to today's equivalent active plan instead of dead-ending.
        if (!data.isActive) {
          let equivalent: MembershipTypeConfig | null = null;
          try {
            const candidates = await membershipTypeConfigsApi.getByCategory(data.category);
            equivalent = pickEquivalentActivePlan(data, candidates);
          } catch (lookupErr) {
            console.error('Could not look up a replacement for retired plan:', lookupErr);
          }
          if (equivalent) {
            // Re-navigate to the active plan; the effect re-runs with the new
            // id and loads it. Carry the old name so we can explain the swap.
            navigate(`/membership/checkout/${equivalent.id}`, {
              replace: true,
              state: { retiredPlanName: data.name },
            });
          } else {
            setError(
              'This membership plan is no longer available, and we couldn’t find a current equivalent. Please choose a plan from the memberships page.',
            );
          }
          return;
        }

        setMembership(data);

        // Pre-fill form from user profile if logged in
        if (profile) {
          const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
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
            // Default competitor name to user's full name
            competitorName: fullName,
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
    // Editing the email invalidates any prior account classification.
    if (name === 'email') {
      if (existingAccount) setExistingAccount(null);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Classify the guest email against existing accounts. Runs on email blur so
  // the form adapts (hide password fields, show guidance) BEFORE the member
  // fills everything in, and again authoritatively on Continue.
  const classifyGuestEmail = async (): Promise<'active' | 'renewable' | 'blocked' | null> => {
    const email = formData.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
    const { exists, canLogin, hasActiveMembership } = await checkAccountExists(email);
    if (!exists) return null;
    if (!canLogin) return 'blocked';
    return hasActiveMembership ? 'active' : 'renewable';
  };

  const handleEmailBlur = async () => {
    if (user) return;
    setExistingAccount(await classifyGuestEmail());
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

    // Password required for guests: a brand-new email creates an account; a
    // returning ('renewable') member SETS a password on their existing account
    // (their old-site password never carried over). Active/blocked accounts are
    // routed to sign-in, so no password field is shown for them.
    if (!user && existingAccount !== 'active' && existingAccount !== 'blocked') {
      if (!accountPassword) {
        setError('Password is required to create your account');
        return false;
      }
      const strength = calculatePasswordStrength(accountPassword);
      if (strength.score < MIN_PASSWORD_STRENGTH) {
        setError(`Password is not strong enough. Current strength: ${strength.score}. Minimum required: ${MIN_PASSWORD_STRENGTH}`);
        return false;
      }
      if (accountPassword !== accountConfirmPassword) {
        setError('Passwords do not match');
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

    // Team name cannot contain "team" or variations
    if (formData.teamName && containsTeamWord(formData.teamName)) {
      setError('Team name cannot contain the word "team" or variations (T3@M, TEAM, backwards, etc.). Please choose a different name.');
      return false;
    }

    // Retailer-specific validation
    if (membership?.category === MembershipCategory.RETAIL && !formData.businessName) {
      setError('Business name is required');
      return false;
    }

    // Required: the buyer must accept the Terms of Service and Privacy Policy.
    if (!formData.agreeToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return false;
    }

    setError(null);
    return true;
  };

  const handleContinueToPayment = async () => {
    if (!validateInfoStep() || !membership) return;

    // Guests only: classify the email and provision the account up front so the
    // buyer ends up authenticated for the rest of checkout. An ACTIVE membership
    // routes to sign-in; everyone else — a brand-new email OR a returning member
    // without an active membership — finishes logged in with the password they
    // typed right here (no "log in / forgot password" dead end).
    if (!user) {
      const classification = await classifyGuestEmail();
      setExistingAccount(classification);
      if (classification === 'active' || classification === 'blocked') return;

      // NOTHING is created, activated, signed in, or password-set BEFORE payment
      // — for either a brand-new email OR a returning EXPIRED member ('renewable').
      // An expired member has no usable password and must not be reactivated until
      // they pay. We simply hold the password they chose and proceed to collect
      // payment as a guest (email + billing go in the PaymentIntent metadata). The
      // account is provisioned/reactivated and the password applied ONLY AFTER
      // Stripe/PayPal confirms payment — in handlePaymentSuccess, with the webhook
      // as the guaranteed server-side backup. An incomplete payment leaves the
      // account exactly as it was: not activated, not signed in, no password set.
      setError(null);
    }

    // If Stripe is not configured or PayPal is selected, go directly to payment step
    if (!isStripeConfigured || selectedPaymentMethod === 'paypal') {
      setStep('payment');
      return;
    }

    setCreatingPaymentIntent(true);
    setError(null);

    try {
      const email = user ? (profile?.email || formData.email) : formData.email;

      // If auto-renewal is enabled, redirect to Stripe Checkout for subscription
      if (formData.enableAutoRenewal) {
        const successUrl = `${window.location.origin}/membership/checkout/${membership.id}/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = window.location.href;

        const response = await axios.post('/api/stripe/create-subscription-checkout', {
            membershipTypeConfigId: membership.id,
            email,
            userId: user?.id,
            successUrl,
            cancelUrl,
            billingFirstName: formData.firstName,
            billingLastName: formData.lastName,
        });

        const { checkoutUrl } = response.data;
        // Redirect to Stripe Checkout
        window.location.href = checkoutUrl;
        return;
      }

      // Create Payment Intent via backend (one-time payment)
      // For guests, userId is omitted — account is created after payment succeeds
      const response = await axios.post('/api/stripe/create-payment-intent', {
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
          couponCode: couponCode || undefined,
      });

      const { clientSecret: secret, stagingMode, message } = response.data;
      if (stagingMode) {
        setError(message || 'Payments are blocked in staging mode.');
        return;
      }
      setClientSecret(secret);
      setStep('payment');
    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      // Surface the backend's ACTUAL reason (e.g. "This membership type is not
      // available" for a retired plan, or a Stripe rejection). Previously this
      // used err.message — axios's opaque "Request failed with status code 400"
      // — which left members and support with no idea what actually failed.
      // NestJS validation errors return `message` as a string OR a string[].
      const backendMessage = err?.response?.data?.message;
      setError(
        (Array.isArray(backendMessage) ? backendMessage.join(' ') : backendMessage) ||
          (err instanceof Error ? err.message : null) ||
          'Failed to initialize payment. Please try again.',
      );
    } finally {
      setCreatingPaymentIntent(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!membership) return;

    const email = user ? (profile?.email || formData.email) : formData.email;
    let currentUserId = user?.id;

    // Provision/reactivate the account NOW — ONLY AFTER a successful payment —
    // for a guest who chose a password at checkout but whom we deliberately did
    // NOT activate beforehand. This is the single point where the password is set
    // and the member is signed in. The Stripe/PayPal webhook independently
    // fulfills (creates/renews the membership) as the guaranteed backup, so a
    // hiccup here never loses the paid membership — at worst the member uses
    // "Forgot Password" once their (now-active) account exists.
    if (!currentUserId && accountPassword && existingAccount !== 'active' && existingAccount !== 'blocked') {
      try {
        if (existingAccount === 'renewable') {
          // Returning EXPIRED member: set the chosen password on their EXISTING
          // account and sign them in — now that payment is confirmed.
          await claimAccount(formData.email, accountPassword);
          const { error: signInError, userId } = await signIn(formData.email, accountPassword);
          if (!signInError && userId) {
            currentUserId = userId;
            setAccountCreated(true);
          }
        } else {
          // Brand-new email: create the account now (post-payment).
          const { error: signUpError, data: signUpData } = await signUp(
            formData.email,
            accountPassword,
            formData.firstName,
            formData.lastName,
          );
          if (!signUpError && signUpData?.user?.id) {
            currentUserId = signUpData.user.id;
            setAccountCreated(true);
          }
        }
      } catch (err) {
        console.error('Post-payment account provisioning failed (webhook will fulfill):', err);
      }
    }

    // Create the membership client-side once we know who the buyer is.
    // The Stripe webhook is the backup path (idempotent on stripePaymentIntentId).
    // Without this, a missed webhook = silent data loss for logged-in buyers.
    if (currentUserId) {
      try {
        await axios.post('/api/memberships', {
          userId: currentUserId,
          membershipTypeConfigId: membership.id,
          amountPaid: membership.price,
          stripePaymentIntentId: paymentIntentId,
          transactionId: paymentIntentId,
          competitorName: formData.competitorName || undefined,
          vehicleLicensePlate: formData.vehicleLicensePlate || undefined,
          vehicleColor: formData.vehicleColor || undefined,
          vehicleMake: formData.vehicleMake || undefined,
          vehicleModel: formData.vehicleModel || undefined,
          hasTeamAddon: formData.hasTeamAddon || false,
          teamName: formData.teamName || undefined,
          teamDescription: formData.teamDescription || undefined,
          businessName: formData.businessName || undefined,
          businessWebsite: formData.businessWebsite || undefined,
          billingFirstName: formData.firstName,
          billingLastName: formData.lastName,
          billingPhone: formData.phone || undefined,
          billingAddress: formData.address,
          billingCity: formData.city,
          billingState: formData.state,
          billingPostalCode: formData.postalCode,
          billingCountry: formData.country || 'USA',
        });
      } catch (err) {
        // Webhook may have already created the membership — log but don't block
        console.error('Direct membership creation failed (webhook may handle it):', err);
      }
    }

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

    // Subscribe to newsletter if checkbox was checked
    if (formData.subscribeNewsletter && email) {
      try {
        await newsletterApi.signup({
          email,
          firstName: formData.firstName,
          lastName: formData.lastName,
        });
      } catch (err) {
        // Don't block checkout if newsletter signup fails
        console.error('Newsletter signup failed:', err);
      }
    }

    // Proceed to confirmation
    setStep('confirmation');
  };


  const getCategoryLabel = (category: MembershipCategory): string => {
    switch (category) {
      case MembershipCategory.COMPETITOR:
        return 'Competitor';
      case MembershipCategory.TEAM:
        return 'Team';
      case MembershipCategory.RETAIL:
        return 'Retailer';
      case MembershipCategory.MANUFACTURER:
        return 'Manufacturer';
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
            className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
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

            {/* Account Info */}
            {(user || accountCreated) ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-8">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Account Ready</h3>
                    <p className="text-gray-400 text-sm">
                      Your account has been created and your membership is linked. Check your email to verify your account.
                    </p>
                  </div>
                </div>
              </div>
            ) : existingAccount === 'renewable' ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-8">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-white">Membership Renewed</h3>
                    <p className="text-gray-400 text-sm">
                      Your membership has been renewed on your existing MECA account and you're
                      signed in now. From now on you'll sign in with the password you just set.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-700/50 rounded-xl p-6 mb-8">
                <p className="text-gray-400 text-sm">
                  Your payment was received and your membership is being set up for{' '}
                  <span className="text-white">{orderData?.email}</span>. To access your account, use{' '}
                  <Link to="/login" className="text-orange-400 hover:text-orange-300 underline">Forgot Password</Link>{' '}
                  on the login page to set your password.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {(user || accountCreated) ? (
                <>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => navigate('/events')}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    Browse Events
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/events')}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Browse Events
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
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
        {/* Header with Back button on right */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Membership Checkout</h1>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

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

                  {routedFromRetiredPlan && (
                    <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/40 rounded-lg">
                      <p className="text-blue-200 text-sm">
                        The plan you came in for (<span className="font-semibold">{routedFromRetiredPlan}</span>) is
                        no longer offered. We&apos;ve switched you to our current{' '}
                        <span className="font-semibold">{membership.name}</span> plan
                        {' '}(${membership.price.toFixed(2)}/year).
                      </p>
                    </div>
                  )}

                  {existingAccount === 'active' && (
                    <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500 rounded-lg">
                      <p className="text-orange-300 text-sm font-medium mb-1">
                        You already have an active membership
                      </p>
                      <p className="text-orange-200/90 text-sm">
                        There's already an active MECA membership for{' '}
                        <span className="font-semibold">{formData.email}</span>. Please log in to
                        renew or manage it from your dashboard.
                      </p>
                      <Link
                        to="/login"
                        className="mt-3 inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        Log in
                      </Link>
                    </div>
                  )}

                  {existingAccount === 'renewable' && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500 rounded-lg">
                      <p className="text-green-300 text-sm font-medium mb-1">
                        We located your account
                      </p>
                      <p className="text-green-200/90 text-sm">
                        We've located an expired account under{' '}
                        <span className="font-semibold">{formData.email}</span>. Please continue
                        filling out the form below to renew your membership, and we'll set a new
                        password on your account so you can sign in from now on. (No password reset
                        needed — just choose a new password below.)
                      </p>
                    </div>
                  )}

                  {existingAccount === 'blocked' && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg">
                      <p className="text-red-300 text-sm font-medium mb-1">
                        There's an issue with this account
                      </p>
                      <p className="text-red-200/90 text-sm">
                        The account for <span className="font-semibold">{formData.email}</span> can't
                        be renewed online. Please{' '}
                        <Link to="/support" className="underline font-semibold hover:text-white">
                          contact support
                        </Link>{' '}
                        and we'll help you out.
                      </p>
                    </div>
                  )}

                  {/* Email & Account Creation (for guests) */}
                  {!user && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Mail className="h-5 w-5 mr-2 text-orange-500" />
                        Account & Contact Information
                      </h3>
                      <p className="text-gray-400 text-sm mb-4">
                        An account is required to manage your membership, track events, and access your profile.
                      </p>
                      <div className="space-y-4">
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
                              onBlur={handleEmailBlur}
                              className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="you@example.com"
                              required
                            />
                          </div>
                        </div>
                        {/* Guests set a password here. Brand-new emails create an
                            account; returning ('renewable') members set one on
                            their EXISTING account (old-site passwords never
                            carried over). Active/blocked accounts are routed to
                            sign-in instead, so no field for them. */}
                        {existingAccount !== 'active' && existingAccount !== 'blocked' && (
                        <>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            {existingAccount === 'renewable' ? 'Set Your Password *' : 'Create Password *'}
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={accountPassword}
                              onChange={(e) => setAccountPassword(e.target.value)}
                              className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="Enter a strong password"
                              required
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
                          {!accountPassword && (
                            <p className="mt-1 text-xs text-gray-400">
                              Use a mix of letters, numbers, and symbols for a strong password
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Confirm Password *
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={accountConfirmPassword}
                              onChange={(e) => setAccountConfirmPassword(e.target.value)}
                              className="w-full pl-10 pr-12 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                              placeholder="Confirm your password"
                              required
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
                        </>
                        )}
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
                      <p className="text-xs text-gray-400">
                        Name must match the name on your credit card or PayPal.
                      </p>
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
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Country *
                        </label>
                        <select
                          name="country"
                          value={formData.country}
                          onChange={(e) => {
                            handleInputChange(e);
                            // Clear state when country changes
                            setFormData(prev => ({ ...prev, country: e.target.value, state: '' }));
                          }}
                          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          required
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
                            {getStateLabel(formData.country)} *
                          </label>
                          {getStatesForCountry(formData.country).length > 0 ? (
                            <select
                              name="state"
                              value={formData.state}
                              onChange={handleInputChange}
                              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                              required
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
                              required
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            {getPostalCodeLabel(formData.country)} *
                          </label>
                          <input
                            type="text"
                            name="postalCode"
                            value={formData.postalCode}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder={formData.country === 'US' ? '12345' : 'Postal code'}
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
                            className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                              containsTeamWord(formData.teamName) ? 'border-red-500' : 'border-slate-600'
                            }`}
                            placeholder="e.g., Thunder Audio, Bass Hunters, Sound Warriors"
                            required
                          />
                          {containsTeamWord(formData.teamName) && (
                            <p className="text-red-500 text-xs mt-1 flex items-center">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Team name cannot contain "team" or variations (T3@M, TEAM, backwards, etc.)
                            </p>
                          )}
                          <p className="text-gray-500 text-xs mt-1">
                            Note: The word "team" is not allowed in team names. Choose a unique name for your team.
                          </p>
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

                  {/* Auto-Renewal Option */}
                  <div className="mb-4 p-4 bg-slate-700/50 rounded-xl border border-slate-600">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enableAutoRenewal}
                        onChange={(e) => setFormData(prev => ({ ...prev, enableAutoRenewal: e.target.checked }))}
                        className="mt-1 w-5 h-5 text-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-orange-500 cursor-pointer"
                      />
                      <div>
                        <span className="text-white font-medium">Enable Auto-Renewal</span>
                        <p className="text-gray-400 text-sm mt-1">
                          Automatically renew your membership each year. You can cancel anytime from your dashboard.
                        </p>
                        {formData.enableAutoRenewal && (
                          <div className="mt-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <p className="text-green-400 text-xs flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              You'll be charged ${membership.price.toFixed(2)}/year. Cancel anytime.
                            </p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  {/* Newsletter Signup Option */}
                  <div className="mb-8 p-4 bg-slate-700/50 rounded-xl border border-slate-600">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.subscribeNewsletter}
                        onChange={(e) => setFormData(prev => ({ ...prev, subscribeNewsletter: e.target.checked }))}
                        className="mt-1 w-5 h-5 text-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-orange-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Newspaper className="h-4 w-4 text-orange-500" />
                          <span className="text-white font-medium">Subscribe to MECA Head Newsletter</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">
                          Get event updates, competition news, tips, and exclusive content delivered to your inbox.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Required: agree to Terms of Service + Privacy Policy. */}
                  <div className="mb-8 p-4 bg-slate-700/50 rounded-xl border border-slate-600">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.agreeToTerms}
                        onChange={(e) => setFormData(prev => ({ ...prev, agreeToTerms: e.target.checked }))}
                        className="mt-1 w-5 h-5 text-orange-500 bg-slate-700 border-slate-600 rounded focus:ring-orange-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-white font-medium">
                          I agree to the{' '}
                          <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">
                            Terms of Service
                          </a>{' '}
                          and{' '}
                          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">
                            Privacy Policy
                          </a>.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Active/blocked accounts can't proceed with a guest purchase
                      (active → emailed sign-in link; blocked → contact support),
                      so hide the dead Continue button for them. */}
                  {existingAccount !== 'active' && existingAccount !== 'blocked' && (
                    <button
                      type="submit"
                      disabled={creatingPaymentIntent || !formData.agreeToTerms}
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
                  )}
                </form>
              )}

              {step === 'payment' && (
                <div>
                  <PaymentMethodSelector
                    selected={selectedPaymentMethod}
                    onChange={(method) => {
                      setSelectedPaymentMethod(method);
                      // If switching to Stripe and no clientSecret, go back to info to create it
                      if (method === 'stripe' && !clientSecret && isStripeConfigured) {
                        setStep('info');
                      }
                    }}
                    stripeAvailable={isStripeConfigured}
                  />
                </div>
              )}

              {step === 'payment' && selectedPaymentMethod === 'stripe' && clientSecret && isStripeConfigured && LazyMembershipStripePaymentForm && (
                <Suspense fallback={
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
                  </div>
                }>
                  <LazyMembershipStripePaymentForm
                    clientSecret={clientSecret}
                    membership={membership}
                    formData={formData}
                    onSuccess={handlePaymentSuccess}
                    onBack={() => setStep('info')}
                  />
                </Suspense>
              )}

              {step === 'payment' && selectedPaymentMethod === 'paypal' && membership && (
                <div className="space-y-6">
                  <div className="bg-slate-700 rounded-xl p-6 mb-4">
                    <h3 className="text-lg font-semibold text-white mb-2">Order Summary</h3>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{membership.name}</span>
                      <span className="text-white">${membership.price.toFixed(2)}</span>
                    </div>
                    {taxRate > 0 && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-400">Tax ({(taxRate * 100).toFixed(0)}%)</span>
                        <span className="text-white">${calculateTax(membership.price).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t border-slate-600">
                      <span className="text-gray-300">Total</span>
                      <span className="text-orange-500">${(membership.price + calculateTax(membership.price)).toFixed(2)}</span>
                    </div>
                  </div>

                  <PayPalPaymentButton
                    paymentType="membership"
                    createOrderFn={async () => {
                      const email = user ? (profile?.email || formData.email) : formData.email;
                      const result = await paypalApi.createMembershipOrder({
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
                      });
                      return result.paypalOrderId;
                    }}
                    metadata={{
                      membershipTypeConfigId: membership.id,
                      email: (user ? (profile?.email || formData.email) : formData.email),
                      userId: user?.id || '',
                      billingFirstName: formData.firstName,
                      billingLastName: formData.lastName,
                    }}
                    onSuccess={(captureId) => handlePaymentSuccess(captureId)}
                    onError={(err) => setError(err)}
                  />

                  <button
                    onClick={() => setStep('info')}
                    className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    Back to information
                  </button>
                </div>
              )}

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
                        <span className="text-gray-400">Membership</span>
                        <span className="text-white">{membership.name}</span>
                      </div>
                      {taxRate > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Tax ({(taxRate * 100).toFixed(0)}%)</span>
                          <span className="text-white">${calculateTax(membership.price).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-600 pt-2 mt-2">
                        <span className="text-gray-400">Total</span>
                        <span className="text-orange-500 font-semibold">${(membership.price + calculateTax(membership.price)).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep('info')}
                      className="px-4 sm:px-6 py-2.5 sm:py-4 text-sm sm:text-base bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
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

              <div className="mb-4">
                <CouponInput
                  scope="membership"
                  subtotal={membership.price}
                  membershipTypeConfigId={membership.id}
                  userId={user?.id}
                  email={formData.email || undefined}
                  onApply={(amount, code) => {
                    setCouponDiscount(amount);
                    setCouponCode(code);
                  }}
                  onRemove={() => {
                    setCouponDiscount(0);
                    setCouponCode('');
                  }}
                />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Membership</span>
                  <span className="text-white">${membership.price.toFixed(2)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-400">Discount</span>
                    <span className="text-green-400">-${couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white">12 months</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tax ({(taxRate * 100).toFixed(0)}%)</span>
                    <span className="text-white">${calculateTax(Math.max(0, membership.price - couponDiscount)).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-700 pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-white">Total</span>
                  <span className="text-lg font-bold text-orange-500">
                    ${(Math.max(0, membership.price - couponDiscount) + calculateTax(Math.max(0, membership.price - couponDiscount))).toFixed(2)}
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
