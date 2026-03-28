import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Calendar, Bell, XCircle, Loader2, RefreshCw, Users, UserPlus, Pencil, Car, AlertCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/auth';
import { membershipsApi, Membership, MemberCancelMembershipModal, SecondaryMembershipInfo, AddSecondaryModal, EditSecondaryModal, RELATIONSHIP_TYPES } from '@/memberships';

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
  const [secondaryMemberships, setSecondaryMemberships] = useState<SecondaryMembershipInfo[]>([]);
  const [showAddSecondaryModal, setShowAddSecondaryModal] = useState(false);
  const [editingSecondary, setEditingSecondary] = useState<SecondaryMembershipInfo | null>(null);

  useEffect(() => {
    const fetchMembershipData = async () => {
      if (!profile?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch active membership
        const active = await membershipsApi.getUserActiveMembership(profile.id);
        setActiveMembership(active);

        // Fetch secondary memberships
        try {
          const secondaries = await membershipsApi.getSecondaryMemberships();
          setSecondaryMemberships(secondaries);
        } catch { /* ignore */ }

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
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Membership</h1>
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
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Membership</h1>
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
              className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors"
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
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Membership</h1>
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

        {/* Expired Membership Warning */}
        {profile?.membership_status === 'expired' && (
          <div className="bg-red-900/30 border-2 border-red-500/50 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-8 w-8 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold text-red-400 mb-2">Your Membership Has Expired</h2>
                {profile.meca_id_invalidated_at ? (
                  <>
                    <p className="text-red-200/80 mb-3">Your MECA ID has been permanently invalidated due to expired membership. Your previous competition results are preserved for historical records.</p>
                    <p className="text-red-200/80 mb-4">You may renew your membership below, but a <strong>new MECA ID will be issued</strong>. All future results will be recorded under your new MECA ID.</p>
                  </>
                ) : (
                  <>
                    <p className="text-red-200/80 mb-3">Your account access is limited until you renew. You cannot register for events or compete.</p>
                    <p className="text-amber-300 font-semibold mb-4">Renew now to keep your same MECA ID! After the grace period, a new MECA ID will be issued.</p>
                  </>
                )}
                <button
                  onClick={() => navigate('/membership')}
                  className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors"
                >
                  Renew Membership Now
                </button>
              </div>
            </div>
          </div>
        )}

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
            {/* Expiration / Renewal Date */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">
                {subscriptionStatus?.autoRenewalStatus === 'on' ? 'Renewal Date' : 'Expiration Date'}
              </p>
              {activeMembership.endDate ? (() => {
                const endDate = new Date(activeMembership.endDate);
                const now = new Date();
                const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isExpired = daysLeft < 0;
                const isRenewing = subscriptionStatus?.autoRenewalStatus === 'on';
                return (
                  <>
                    <p className={`text-lg font-semibold ${isExpired ? 'text-red-400' : isRenewing ? 'text-green-400' : daysLeft <= 30 ? 'text-amber-400' : 'text-white'}`}>
                      {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    {!isExpired && (
                      <p className={`text-xs mt-1 ${isRenewing ? 'text-green-400/70' : daysLeft <= 30 ? 'text-amber-400/70' : 'text-gray-500'}`}>
                        {isRenewing ? `Renews in ${daysLeft} days` : `${daysLeft} days remaining`}
                      </p>
                    )}
                    {isExpired && (
                      <p className="text-xs mt-1 text-red-400/70">
                        Expired {Math.abs(daysLeft)} days ago
                      </p>
                    )}
                  </>
                );
              })() : (
                <p className="text-white text-lg font-semibold">N/A</p>
              )}
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
              {profile?.meca_id_invalidated_at ? (
                <div>
                  <p className="text-red-400 font-mono text-lg font-semibold line-through">#{profile.meca_id || 'N/A'}</p>
                  <p className="text-red-400 text-xs mt-1">Invalidated</p>
                </div>
              ) : (
                <p className="text-orange-400 font-mono text-lg font-semibold">
                  #{activeMembership.mecaId || profile?.meca_id || 'N/A'}
                </p>
              )}
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

            {/* View Membership Card */}
            <button
              onClick={() => navigate('/dashboard/mymeca?tab=card')}
              className="px-5 py-2.5 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              View Membership Card
            </button>

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

        {/* Secondary Memberships */}
        <div className="mt-6 bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              Secondary Memberships ({secondaryMemberships.length})
            </h2>
            <button
              onClick={() => setShowAddSecondaryModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Add Secondary Member
            </button>
          </div>
          {secondaryMemberships.length > 0 ? (
            <div className="space-y-3">
              {secondaryMemberships.map((secondary) => (
                <div key={secondary.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-white font-medium">{secondary.competitorName}</p>
                        {secondary.relationshipToMaster && (
                          <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                            {RELATIONSHIP_TYPES.find(r => r.value === secondary.relationshipToMaster)?.label || secondary.relationshipToMaster}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-400 text-xs">Membership</p>
                          <p className="text-gray-200">{secondary.membershipType?.name || 'Membership'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-xs">MECA ID</p>
                          <p className="text-orange-400 font-medium font-mono">{secondary.mecaId ? `#${secondary.mecaId}` : 'Pending'}</p>
                        </div>
                        {(secondary.vehicleMake || secondary.vehicleModel) && (
                          <div>
                            <p className="text-gray-400 text-xs flex items-center gap-1"><Car className="h-3 w-3" /> Vehicle</p>
                            <p className="text-gray-200">{[secondary.vehicleMake, secondary.vehicleModel].filter(Boolean).join(' ')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${secondary.paymentStatus === 'paid' ? 'bg-green-900/50 text-green-400' : 'bg-yellow-900/50 text-yellow-400'}`}>
                        {secondary.paymentStatus === 'paid' ? 'Active' : 'Payment Pending'}
                      </span>
                      <button onClick={() => setEditingSecondary(secondary)} className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No secondary memberships. Add family members or team members to your account.</p>
          )}
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

      {/* Add Secondary Modal */}
      <AddSecondaryModal
        isOpen={showAddSecondaryModal}
        onClose={() => setShowAddSecondaryModal(false)}
        onSuccess={async () => {
          setShowAddSecondaryModal(false);
          const secondaries = await membershipsApi.getSecondaryMemberships();
          setSecondaryMemberships(secondaries);
        }}
        masterMembershipId={activeMembership?.id || ''}
      />

      {/* Edit Secondary Modal */}
      {editingSecondary && (
        <EditSecondaryModal
          isOpen={true}
          onClose={() => setEditingSecondary(null)}
          onSuccess={async () => {
            setEditingSecondary(null);
            const secondaries = await membershipsApi.getSecondaryMemberships();
            setSecondaryMemberships(secondaries);
          }}
          secondary={editingSecondary}
        />
      )}
    </div>
  );
}
