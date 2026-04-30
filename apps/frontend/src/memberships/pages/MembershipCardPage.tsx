import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import { useAuth } from '@/auth/contexts/AuthContext';
import { membershipsApi, MembershipCard, type CardData } from '@/memberships';

export default function MembershipCardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await membershipsApi.getMyCardData();
        if (!cancelled) setCardData(data);
      } catch (err) {
        console.error('Failed to load membership card:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-400">Digital Membership Card</h2>
          <button
            onClick={() => navigate('/membership-billing')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">My Membership Card</h1>
        <p className="text-gray-400 mb-8">Show this at MECA events for verification.</p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : !cardData ? (
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <CreditCard className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Active Membership</h3>
            <p className="text-slate-400 mb-6">
              You need an active MECA membership to view your digital ID card.
            </p>
            <button
              onClick={() => navigate('/membership')}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
            >
              Get a Membership
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Your Digital Membership Card</h3>
              <p className="text-slate-400 text-sm mb-6">
                This is your official MECA membership card. You can print it or show it on your phone at events.
              </p>
              <div className="flex justify-center">
                <MembershipCard
                  memberName={cardData.memberName}
                  mecaId={cardData.mecaId}
                  memberSince={cardData.memberSince}
                  expirationDate={cardData.expirationDate}
                  membershipId={cardData.membershipId}
                />
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <h4 className="text-md font-semibold text-white mb-3">Card Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Name</p>
                  <p className="text-white">{cardData.memberName}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">MECA ID</p>
                  <p className="text-orange-400 font-bold">{cardData.mecaId ?? 'Pending'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Membership Type</p>
                  <p className="text-white">{cardData.membershipType}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase tracking-wider">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    cardData.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {cardData.isActive ? 'Active' : 'Expired'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
