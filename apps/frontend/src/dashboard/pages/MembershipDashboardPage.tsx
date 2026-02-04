import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Calendar, Bell, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/auth';
import { membershipsApi, Membership, MemberCancelMembershipModal } from '@/memberships';

export default function MembershipDashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [activeMembership, setActiveMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-renewal/subscription status
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    autoRenewalStatus: 'on' | 'legacy' | 'off';
    stripeSubscriptionId: string | null;
    hadLegacySubscription: boolean;
    stripeSubscription: {
      status: string;
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
    } | null;
  } | null>(null);

  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const [showDisableAutoRenewalModal, setShowDisableAutoRenewalModal] = useState(false);
  const [disableAutoRenewalLoading, setDisableAutoRenewalLoading] = useState(false);
  const [disableAutoRenewalReason, setDisableAutoRenewalReason] = useState('');
  const [showCancelMembershipModal, setShowCancelMembershipModal] = useState(false);

  useEffect(() => {
    const fetchMembershipData = async () => {
      if (!profile?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch active membership
        const active = await membershipsApi.getUserActiveMembership(profile.id);
        setActiveMembership(active);

        // Fetch subscription status if there's an active membership
        if (active) {
          try {
            const subStatus = await membershipsApi.getSubscriptionStatus(active.id);
            setSubscriptionStatus(subStatus);
          } catch (err) {
            console.error('Error fetching subscription status:', err);
            // Default to off if we can't fetch
            setSubscriptionStatus({
              autoRenewalStatus: 'off',
              stripeSubscriptionId: null,
              hadLegacySubscription: false,
              stripeSubscription: null
            });
          }
        }
      } catch (err) {
        console.error('Error fetching membership data:', err);
        setError('Failed to load membership data');
      } finally {
        setLoading(false);
      }
    };

    fetchMembershipData();
  }, [profile?.id]);

  const handleOpenBillingPortal = async () => {
    try {
      setBillingPortalLoading(true);
      const { url } = await membershipsApi.getBillingPortalUrl(window.location.href);
      window.location.href = url;
    } catch (err) {
      console.error('Error opening billing portal:', err);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setBillingPortalLoading(false);
    }
  };

  const handleDisableAutoRenewal = async () => {
    if (!activeMembership) return;

    try {
      setDisableAutoRenewalLoading(true);
      await membershipsApi.memberDisableAutoRenewal(activeMembership.id, disableAutoRenewalReason || undefined);

      // Refresh subscription status
      const subStatus = await membershipsApi.getSubscriptionStatus(activeMembership.id);
      setSubscriptionStatus(subStatus);

      setShowDisableAutoRenewalModal(false);
      setDisableAutoRenewalReason('');
    } catch (err) {
      console.error('Error disabling auto-renewal:', err);
      alert('Failed to disable auto-renewal. Please try again.');
    } finally {
      setDisableAutoRenewalLoading(false);
    }
  };

  const handleMembershipCancelled = () => {
    // Refresh the page data after cancellation
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-gray-400 text-sm">Dashboard</p>
              <h1 className="text-3xl font-bold text-white">Membership</h1>
            </div>
            <button
              onClick={() => navigate('/dashboard/mymeca?tab=profile')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!activeMembership) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-gray-400 text-sm">Dashboard</p>
              <h1 className="text-3xl font-bold text-white">Membership</h1>
            </div>
            <button
              onClick={() => navigate('/dashboard/mymeca?tab=profile')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <CreditCard className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Active Membership</h2>
            <p className="text-gray-400 mb-6">You don't have an active membership yet.</p>
            <button
              onClick={() => navigate('/membership')}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors"
            >
              View Membership Options
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-gray-400 text-sm">Dashboard</p>
            <h1 className="text-3xl font-bold text-white">Membership</h1>
            <p className="text-gray-400 mt-1">Manage your membership and billing</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/mymeca?tab=profile')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
              <CreditCard className="h-8 w-8 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{activeMembership.membershipTypeConfig?.name || 'Active Membership'}</h2>
              <p className="text-gray-400">Your current membership plan</p>
            </div>
          </div>

          {/* Membership Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Expiration Date */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Expires</p>
              <p className="text-white text-lg font-semibold">
                {activeMembership.endDate
                  ? new Date(activeMembership.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'N/A'}
              </p>
            </div>

            {/* Auto-Renewal Status */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">Auto-Renewal</p>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-semibold ${
                  subscriptionStatus?.autoRenewalStatus === 'on' ? 'text-green-400' :
                  subscriptionStatus?.autoRenewalStatus === 'legacy' ? 'text-yellow-400' :
                  'text-gray-400'
                }`}>
                  {subscriptionStatus?.autoRenewalStatus === 'on' ? 'On' :
                   subscriptionStatus?.autoRenewalStatus === 'legacy' ? 'Legacy' :
                   'Off'}
                </span>
                {subscriptionStatus?.autoRenewalStatus === 'legacy' && (
                  <span className="text-xs text-yellow-400">(needs setup)</span>
                )}
              </div>
            </div>

            {/* MECA ID */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">MECA ID</p>
              <p className="text-orange-400 font-mono text-lg font-semibold">
                #{activeMembership.mecaId || profile?.meca_id || 'N/A'}
              </p>
            </div>
          </div>

          {/* Subscription Details (if active) */}
          {subscriptionStatus?.stripeSubscription && (
            <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
              <h3 className="text-white font-semibold mb-3">Subscription Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Status: </span>
                  <span className={`font-medium ${
                    subscriptionStatus.stripeSubscription.status === 'active' ? 'text-green-400' :
                    subscriptionStatus.stripeSubscription.status === 'canceled' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {subscriptionStatus.stripeSubscription.status.charAt(0).toUpperCase() + subscriptionStatus.stripeSubscription.status.slice(1)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Next Billing: </span>
                  <span className="text-white font-medium">
                    {new Date(subscriptionStatus.stripeSubscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                {subscriptionStatus.stripeSubscription.cancelAtPeriodEnd && (
                  <div className="col-span-2">
                    <span className="text-yellow-400 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Subscription will cancel at the end of the current period
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legacy Member Notice */}
          {subscriptionStatus?.autoRenewalStatus === 'legacy' && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
              <p className="text-yellow-400 flex items-start gap-3">
                <Bell className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Action Required:</strong> Your recurring billing from our old system needs to be re-setup.
                  Contact support or enable auto-renewal during your next renewal.
                </span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {/* When auto-renewal is ON - show manage and disable options */}
            {subscriptionStatus?.autoRenewalStatus === 'on' && (
              <>
                <button
                  onClick={handleOpenBillingPortal}
                  disabled={billingPortalLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {billingPortalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Manage Billing
                </button>
                <button
                  onClick={() => setShowDisableAutoRenewalModal(true)}
                  className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Disable Auto-Renewal
                </button>
              </>
            )}

            {/* When auto-renewal is OFF or LEGACY - show info about enabling at renewal */}
            {(subscriptionStatus?.autoRenewalStatus === 'off' || subscriptionStatus?.autoRenewalStatus === 'legacy') && (
              <div className="px-5 py-2.5 bg-slate-700/50 text-gray-400 rounded-lg flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Auto-renewal can be enabled when you renew your membership
              </div>
            )}

            {/* Cancel Membership Button - always available */}
            <button
              onClick={() => setShowCancelMembershipModal(true)}
              className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Cancel Membership
            </button>
          </div>
        </div>

        {/* Renew Early Section */}
        <div className="mt-6 bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-bold text-white mb-4">Membership Options</h2>
          <p className="text-gray-400 mb-4">
            Want to upgrade your membership or explore other options?
          </p>
          <button
            onClick={() => navigate('/membership')}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-medium rounded-lg transition-colors"
          >
            View All Membership Options
          </button>
        </div>
      </div>

      {/* Disable Auto-Renewal Modal */}
      {showDisableAutoRenewalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Disable Auto-Renewal</h3>
            <p className="text-gray-400 mb-4">
              Your membership will remain active until the end of the current billing period, but will not automatically renew.
            </p>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={disableAutoRenewalReason}
                onChange={(e) => setDisableAutoRenewalReason(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="Help us improve - why are you disabling auto-renewal?"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDisableAutoRenewalModal(false);
                  setDisableAutoRenewalReason('');
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDisableAutoRenewal}
                disabled={disableAutoRenewalLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {disableAutoRenewalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Disable Auto-Renewal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Membership Modal */}
      {showCancelMembershipModal && activeMembership && (
        <MemberCancelMembershipModal
          membership={activeMembership}
          onClose={() => setShowCancelMembershipModal(false)}
          onCancelled={handleMembershipCancelled}
        />
      )}
    </div>
  );
}
