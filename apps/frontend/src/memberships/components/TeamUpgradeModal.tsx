import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { CreditCard, Lock, Loader2, Users, X, AlertCircle, Check, Calendar, DollarSign } from 'lucide-react';
import { membershipsApi, TeamUpgradeDetails } from '../memberships.api-client';

// Initialize Stripe
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = loadStripe(stripePublishableKey);

interface TeamUpgradeModalProps {
  membershipId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function PaymentForm({
  upgradeDetails,
  teamName: _teamName,
  teamDescription: _teamDescription,
  onSuccess,
  onBack,
}: {
  upgradeDetails: TeamUpgradeDetails;
  teamName: string;
  teamDescription: string;
  onSuccess: () => void;
  onBack: () => void;
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
        // Payment succeeded - the webhook will apply the upgrade
        onSuccess();
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
          <p className="text-red-500 text-sm flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            {paymentError}
          </p>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <CreditCard className="h-5 w-5 mr-2 text-orange-500" />
          Payment Information
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
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || submitting}
          className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <span className="flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Processing Payment...
            </span>
          ) : (
            `Pay $${upgradeDetails.proRatedPrice.toFixed(2)}`
          )}
        </button>
      </div>
    </form>
  );
}

export default function TeamUpgradeModal({
  membershipId,
  onClose,
  onSuccess,
}: TeamUpgradeModalProps) {
  const [loading, setLoading] = useState(true);
  const [upgradeDetails, setUpgradeDetails] = useState<TeamUpgradeDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [step, setStep] = useState<'details' | 'payment'>('details');
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creatingPaymentIntent, setCreatingPaymentIntent] = useState(false);

  // Load upgrade details on mount
  useEffect(() => {
    loadUpgradeDetails();
  }, [membershipId]);

  const loadUpgradeDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const details = await membershipsApi.getTeamUpgradeDetails(membershipId);

      if (!details) {
        setError('Unable to load upgrade details. Please try again.');
        return;
      }

      if (!details.eligible) {
        setError(details.reason || 'You are not eligible for this upgrade.');
        return;
      }

      setUpgradeDetails(details);
    } catch (err: any) {
      console.error('Error loading upgrade details:', err);
      setError(err.response?.data?.message || 'Failed to load upgrade details');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if team name contains any variation of "team"
   * Includes: team, Team, TEAM, t3@m, T3AM, maet (backwards), spaced variations
   */
  const containsTeamWord = (name: string): boolean => {
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
  };

  const handleProceedToPayment = async () => {
    const trimmedName = teamName.trim();

    if (!trimmedName) {
      setError('Please enter a team name');
      return;
    }

    if (containsTeamWord(trimmedName)) {
      setError('Team name cannot contain the word "team" or variations (T3@M, TEAM, backwards, etc.). Please choose a different name.');
      return;
    }

    try {
      setCreatingPaymentIntent(true);
      setError(null);

      const result = await membershipsApi.createTeamUpgradePaymentIntent({
        membershipId,
        teamName: trimmedName,
        teamDescription: teamDescription.trim() || undefined,
      });

      setClientSecret(result.clientSecret);
      setStep('payment');
    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      setError(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setCreatingPaymentIntent(false);
    }
  };

  const handlePaymentSuccess = () => {
    onSuccess();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Render loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-xl max-w-md w-full p-8">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-4" />
            <p className="text-gray-300">Loading upgrade details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render error state (not eligible or error loading)
  if (error && !upgradeDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-xl max-w-md w-full p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Unable to Upgrade</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!upgradeDetails) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Upgrade to Team</h3>
              <p className="text-sm text-gray-400">Add team functionality to your membership</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {step === 'details' ? (
            <>
              {/* Pricing Info */}
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-4 mb-6">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-purple-400" />
                  Pro-Rated Pricing
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Full team upgrade price:</span>
                    <span className="text-gray-300 line-through">${upgradeDetails.originalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Days remaining in membership:</span>
                    <span className="text-gray-300">{upgradeDetails.daysRemaining} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Membership expires:</span>
                    <span className="text-gray-300 flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(upgradeDetails.membershipEndDate)}
                    </span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-white font-semibold">Your pro-rated price:</span>
                      <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                        ${upgradeDetails.proRatedPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Details Form */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Team Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g., Thunder Audio, Bass Hunters, Sound Warriors"
                    className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      containsTeamWord(teamName) ? 'border-red-500' : 'border-slate-600'
                    }`}
                  />
                  {containsTeamWord(teamName) && (
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
                  <label className="text-sm font-medium text-gray-300 mb-2 block">
                    Team Description <span className="text-gray-500">(optional)</span>
                  </label>
                  <textarea
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    placeholder="Tell others about your team..."
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                </div>
              </div>

              {/* Benefits List */}
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">What you'll get:</h4>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-400">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Create and manage your own competition team
                  </li>
                  <li className="flex items-center text-sm text-gray-400">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Invite other members to join your team
                  </li>
                  <li className="flex items-center text-sm text-gray-400">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Team page on the MECA website
                  </li>
                  <li className="flex items-center text-sm text-gray-400">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    Track team statistics and results
                  </li>
                </ul>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg">
                  <p className="text-red-500 text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    {error}
                  </p>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceedToPayment}
                  disabled={!teamName.trim() || creatingPaymentIntent}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingPaymentIntent ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Preparing Payment...
                    </span>
                  ) : (
                    `Continue to Payment ($${upgradeDetails.proRatedPrice.toFixed(2)})`
                  )}
                </button>
              </div>
            </>
          ) : (
            // Payment Step
            clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: 'night',
                    variables: {
                      colorPrimary: '#a855f7',
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
                  upgradeDetails={upgradeDetails}
                  teamName={teamName.trim()}
                  teamDescription={teamDescription}
                  onSuccess={handlePaymentSuccess}
                  onBack={() => setStep('details')}
                />
              </Elements>
            )
          )}
        </div>
      </div>
    </div>
  );
}
